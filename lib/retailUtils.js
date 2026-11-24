import { ref, runTransaction, get, update, remove } from 'firebase/database';
import { database } from './firebase';
import { recordStockMovement, recordRetailStockMovement } from './stockUtils';
import { logActivity } from './activityLog';

/**
 * প্রতিবার কল করলে একটা নতুন, ইউনিক, ক্রমিক খুচরা বিক্রয় নম্বর দেবে।
 * যেমন: RTL-2026-0001, RTL-2026-0002 ... (দোলার ইনভয়েসের নম্বর থেকে আলাদা সিরিজ)
 */
export async function getNextRetailSaleNumber() {
  const counterRef = ref(database, 'retail_sale_counter/last_number');
  const result = await runTransaction(counterRef, (current) => (current || 0) + 1);
  const nextNumber = result.snapshot.val();
  const year = new Date().getFullYear();
  const padded = String(nextNumber).padStart(4, '0');
  return `RTL-${year}-${padded}`;
}

/**
 * একটা খুচরা বিক্রয় ডিলিট করে এবং তার সব প্রভাব উল্টিয়ে দেয়:
 * ১) কোম্পানি/খুচরা পণ্যের বিক্রি হওয়া স্টক ফেরত যোগ করে (ম্যানুয়াল আইটেমের কোনো স্টক নেই, তাই স্কিপ)
 * ২) নির্দিষ্ট কাস্টমার হলে তার total_purchase/total_paid/balance সমন্বয় করে
 * ৩) অটো-তৈরি হওয়া আয়ের ঠালি খাতা এন্ট্রি থাকলে সেটাও মুছে দেয়
 * ৪) বিক্রয়টা মুছে ফেলে এবং অ্যাক্টিভিটি লগে রাখে
 */
export async function deleteRetailSaleWithReversal({ sale, userId }) {
  // ধাপ ১: স্টক ফেরত (কোম্পানি ও খুচরা পণ্যের জন্য, ম্যানুয়াল আইটেম বাদে)
  for (const item of sale.items || []) {
    if (item.source === 'company') {
      await recordStockMovement({
        companyId: item.company_id,
        productId: item.product_id,
        type: 'adjustment',
        qty: item.qty,
        reason: `খুচরা বিক্রয় ${sale.sale_no} ডিলিট — স্টক ফেরত`,
        recordedBy: userId || '',
      });
    } else if (item.source === 'retail') {
      await recordRetailStockMovement({
        productId: item.product_id,
        type: 'adjustment',
        qty: item.qty,
        reason: `খুচরা বিক্রয় ${sale.sale_no} ডিলিট — স্টক ফেরত`,
        recordedBy: userId || '',
      });
    }
  }

  // ধাপ ২: নির্দিষ্ট কাস্টমার হলে হিসাব সমন্বয়
  if (sale.customer_id) {
    const customerSnap = await get(ref(database, `retail_customers/${sale.customer_id}`));
    if (customerSnap.exists()) {
      const customer = customerSnap.val();
      const newTotalPurchase = (customer.total_purchase || 0) - (sale.total || 0);
      const newTotalPaid = (customer.total_paid || 0) - (sale.paid_amount || 0);
      const newBalance = newTotalPurchase - newTotalPaid;

      await update(ref(database, `retail_customers/${sale.customer_id}`), {
        total_purchase: Math.max(0, newTotalPurchase),
        total_paid: Math.max(0, newTotalPaid),
        balance: newBalance,
      });
    }
  }

  // ধাপ ৩: সংশ্লিষ্ট অটো-আয় এন্ট্রি মুছে ফেলা
  if (sale.ledger_entry_id) {
    await remove(ref(database, `ledger/${sale.ledger_entry_id}`));
  }

  // ধাপ ৪: বিক্রয়টা মুছে ফেলা
  await remove(ref(database, `retail_sales/${sale.id}`));

  // ধাপ ৫: লগ রাখা
  await logActivity({
    userId,
    action: 'খুচরা বিক্রয় ডিলিট',
    target: `${sale.sale_no} — ৳${sale.total}`,
  });
}

/**
 * একটা খুচরা বিক্রয়ের প্রফিট বের করে — দোলার ইনভয়েসের মতো কমিশন-বণ্টনের
 * জটিলতা নেই এখানে (খুচরা বিক্রয়ে কোনো কমিশন কনসেপ্ট নেই), তাই সরাসরি
 * (বিক্রয়মূল্য − ক্রয়মূল্য) × পরিমাণ হিসাব করলেই চলে।
 *
 * উৎস অনুযায়ী ক্রয়মূল্য কোথা থেকে আসবে:
 * - company  → companies[company_id].products[product_id].cost_price
 * - retail   → retailProducts[product_id].cost_price
 * - manual   → কোনো ক্রয়মূল্য জানা নেই, তাই প্রফিট হিসাবে ধরা হয় না (0 ধরা হয়,
 *              বিক্রয়মূল্য পুরোটাই "প্রফিট" হিসেবে গণনা করলে বিভ্রান্তিকর হতো)
 */
export function calculateRetailSaleProfit(sale, companies, retailProducts) {
  let totalProfit = 0;
  let hasUnknownCost = false;

  const items = (sale.items || []).map((item) => {
    let costPrice = 0;
    const savedCost = item.cost_price;
    if (savedCost !== undefined && savedCost !== null && savedCost !== '' && item.source !== 'manual') {
      // বিক্রির সময়ে সংরক্ষিত ক্রয়মূল্য — পরে দাম বদলালেও এটা অপরিবর্তিত থাকে
      costPrice = Number(savedCost) || 0;
    } else if (item.source === 'company') {
      costPrice =
        Number(companies?.[item.company_id]?.products?.[item.product_id]?.cost_price) || 0;
    } else if (item.source === 'retail') {
      costPrice = Number(retailProducts?.[item.product_id]?.cost_price) || 0;
    } else {
      hasUnknownCost = true;
    }

    const qty = Number(item.qty) || 0;
    const salePrice = Number(item.price) || 0;
    const profitPerUnit = item.source === 'manual' ? 0 : salePrice - costPrice;
    const itemProfit = profitPerUnit * qty;
    totalProfit += itemProfit;

    return { ...item, cost_price: costPrice, profit_per_unit: profitPerUnit, item_profit: itemProfit };
  });

  return { items, totalProfit, hasUnknownCost };
}

/**
 * একগুচ্ছ খুচরা বিক্রয়ের মোট প্রফিট বের করে
 */
export function calculateTotalRetailProfit(sales, companies, retailProducts) {
  return sales.reduce(
    (sum, sale) => sum + calculateRetailSaleProfit(sale, companies, retailProducts).totalProfit,
    0
  );
                                                    }

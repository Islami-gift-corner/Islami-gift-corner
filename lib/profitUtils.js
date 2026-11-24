// প্রফিট হিসাবের মূল যুক্তি:
// প্রতিটা পণ্যের প্রফিট = (বিক্রয় মূল্য − ক্রয় মূল্য) × পরিমাণ
// ক্রয় মূল্য কোম্পানি/প্রোডাক্ট ডেটা থেকে বর্তমান cost_price ব্যবহার করে বের করা হয়
// নতুন ইনভয়েসে বিক্রির সময়ের cost_price আইটেমের সাথেই সংরক্ষিত থাকে, তাই পরে দাম বদলালেও
// পুরনো প্রফিট বদলায় না (শুধু cost_price ছাড়া পুরনো ইনভয়েসে বর্তমান দাম ধরা হয়)

export function isToday(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
}

export function isThisMonth(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

export function isInRange(dateStr, fromDate, toDate) {
  const d = new Date(dateStr).setHours(0, 0, 0, 0);
  if (fromDate && d < new Date(fromDate).setHours(0, 0, 0, 0)) return false;
  if (toDate && d > new Date(toDate).setHours(0, 0, 0, 0)) return false;
  return true;
}

// একটা ইনভয়েসের প্রতিটা পণ্যের প্রফিট বিস্তারিত + মোট প্রফিট বের করে
//
// গুরুত্বপূর্ণ: প্রফিট বের করতে আসল বিক্রয়মূল্য (item.price, যেটা সাধারণত MRP)
// ব্যবহার করলে ভুল হয় — কারণ পার্টিকে কমিশন দেওয়ার পর আসলে যে টাকা পাওয়া যায়
// (নিয়মিত কমিশন + অতিরিক্ত কমিশন দুটোই বাদ দিয়ে), সেটাই আসল বিক্রয়মূল্য।
// যেমন: ৮০ টাকায় কেনা পণ্য ১০০ টাকা MRP-তে ১০% কমিশনে বিক্রি করলে পার্টির কাছ
// থেকে আসলে পাওয়া যায় ৯০ টাকা, তাই প্রফিট হবে ৯০-৮০=১০ টাকা — MRP (১০০) থেকে
// কস্ট বাদ দিয়ে ২০ বা তার বেশি দেখানো ভুল।
export function calculateInvoiceProfit(invoice, companies) {
  const items = invoice.items || [];

  // ধাপ ১: প্রতিটা আইটেমের নিজস্ব (নিয়মিত) কমিশন বাদ দেওয়ার পর কত থাকে
  const itemsWithBase = items.map((item) => {
    const lineSubtotal = (Number(item.price) || 0) * (Number(item.qty) || 0);
    const baseCommissionAmt = (lineSubtotal * (Number(item.commission_percent) || 0)) / 100;
    const afterBase = lineSubtotal - baseCommissionAmt;
    return { item, afterBase };
  });

  const totalAfterBase = itemsWithBase.reduce((sum, x) => sum + x.afterBase, 0);

  // ধাপ ২: ইনভয়েস লেভেলের "অতিরিক্ত কমিশন" প্রতিটা আইটেমে তার ভাগ অনুযায়ী বণ্টন
  // করা হচ্ছে, যাতে সব আইটেম মিলিয়ে যোগফল ঠিক ইনভয়েসের মোট অতিরিক্ত কমিশনের
  // সমান হয় (আলাদা আলাদা % থাকলেও হিসাব সঠিক থাকে)
  const extraTotal = Number(invoice.commission?.extra_amount) || 0;

  let totalProfit = 0;
  const resultItems = itemsWithBase.map(({ item, afterBase }) => {
    const share = totalAfterBase > 0 ? afterBase / totalAfterBase : 0;
    const netLineAmount = afterBase - extraTotal * share;

    const product = companies?.[item.company_id]?.products?.[item.product_id];
    // ইনভয়েস তৈরির সময় সংরক্ষিত ক্রয়মূল্য থাকলে সেটাই ব্যবহার হবে (পরে দাম বদলালেও
    // প্রফিট একই থাকবে)। শুধু পুরনো ইনভয়েস (যেগুলোতে cost_price সেভ নেই) বর্তমান দাম থেকে হিসাব হবে।
    const savedCost = item.cost_price;
    const costPrice =
      savedCost !== undefined && savedCost !== null && savedCost !== ''
        ? Number(savedCost) || 0
        : Number(product?.cost_price) || 0;
    const qty = Number(item.qty) || 0;
    const lineCost = costPrice * qty;
    const itemProfit = netLineAmount - lineCost;

    totalProfit += itemProfit;

    return {
      ...item,
      cost_price: costPrice,
      net_line_amount: netLineAmount,
      profit_per_unit: qty > 0 ? itemProfit / qty : 0,
      item_profit: itemProfit,
    };
  });

  return { items: resultItems, totalProfit };
}

// একগুচ্ছ ইনভয়েসের মোট প্রফিট বের করে
export function calculateTotalProfit(invoices, companies) {
  return invoices.reduce((sum, inv) => sum + calculateInvoiceProfit(inv, companies).totalProfit, 0);
}

import { ref, runTransaction, get, update, remove } from 'firebase/database';
import { database } from './firebase';
import { recordStockMovement } from './stockUtils';
import { logActivity } from './activityLog';

/**
 * প্রতিবার কল করলে একটা নতুন, ইউনিক, ক্রমিক ইনভয়েস নম্বর দেবে।
 * যেমন: INV-2026-0001, INV-2026-0002 ...
 * Firebase Transaction ব্যবহার করা হয়েছে যাতে দুইজন একসাথে ইনভয়েস বানালেও
 * নম্বর কখনো ডুপ্লিকেট না হয়।
 */
export async function getNextInvoiceNumber() {
  const counterRef = ref(database, 'invoice_counter/last_number');

  const result = await runTransaction(counterRef, (current) => (current || 0) + 1);

  const nextNumber = result.snapshot.val();
  const year = new Date().getFullYear();
  const padded = String(nextNumber).padStart(4, '0');

  return `INV-${year}-${padded}`;
}

/**
 * একটা ইনভয়েস ডিলিট করে এবং তার সব প্রভাব উল্টিয়ে দেয়:
 * ১) বিক্রি হওয়া স্টক ফেরত যোগ করে
 * ২) রেজিস্টার্ড পার্টি হলে তার total_purchase/total_paid/balance সমন্বয় করে
 * ৩) অটো-তৈরি হওয়া আয়ের ঠালি খাতা এন্ট্রি থাকলে সেটাও মুছে দেয়
 * ৪) ইনভয়েসটা মুছে ফেলে এবং অ্যাক্টিভিটি লগে রাখে
 *
 * InvoiceList ও PartyLedger — দুই জায়গা থেকেই এই একই ফাংশন কল হয়,
 * যাতে ডিলিট লজিক দুই জায়গায় আলাদা করে লিখতে না হয়।
 */
export async function deleteInvoiceWithReversal({ invoice, userId }) {
  // ধাপ ১: স্টক ফেরত
  for (const item of invoice.items || []) {
    await recordStockMovement({
      companyId: item.company_id,
      productId: item.product_id,
      type: 'adjustment',
      qty: item.qty,
      reason: `ইনভয়েস ${invoice.invoice_no} ডিলিট — স্টক ফেরত`,
      recordedBy: userId || '',
    });
  }

  // ধাপ ২: রেজিস্টার্ড পার্টি হলে হিসাব সমন্বয় (Walk-in হলে দরকার নেই)
  // — পার্টির হিসাবে যোগ হয়েছিল নেট অ্যামাউন্ট (কমিশন বাদ দেওয়ার পর), তাই
  // ফেরত নেওয়ার সময়ও একই নেট অ্যামাউন্টই বাদ দিতে হবে, পুরো সাবটোটাল না
  if (invoice.party_id) {
    const partySnap = await get(ref(database, `parties/${invoice.party_id}`));
    if (partySnap.exists()) {
      const party = partySnap.val();
      const netAmount = (invoice.subtotal || 0) - (invoice.commission?.total || 0);
      const newTotalPurchase = (party.total_purchase || 0) - netAmount;
      const paidWas = invoice.status === 'paid' ? netAmount : 0;
      const newTotalPaid = (party.total_paid || 0) - paidWas;
      const newBalance = newTotalPurchase - newTotalPaid;

      await update(ref(database, `parties/${invoice.party_id}`), {
        total_purchase: Math.max(0, newTotalPurchase),
        total_paid: Math.max(0, newTotalPaid),
        balance: newBalance,
      });

      // নগদ ইনভয়েসের সাথে তৈরি হওয়া কালেকশন এন্ট্রিটাও মুছতে হবে — না মুছলে
      // স্টেটমেন্ট ও "আজকের কালেকশন"-এ মুছে ফেলা ইনভয়েসের টাকা থেকে যেত
      const paymentsSnap = await get(ref(database, `parties/${invoice.party_id}/payments`));
      if (paymentsSnap.exists()) {
        const payments = paymentsSnap.val();
        for (const [payId, pay] of Object.entries(payments)) {
          if (pay.note === `ইনভয়েস ${invoice.invoice_no}`) {
            await remove(ref(database, `parties/${invoice.party_id}/payments/${payId}`));
          }
        }
      }
    }
  }

  // ধাপ ৩: সংশ্লিষ্ট অটো-আয় এন্ট্রি মুছে ফেলা
  if (invoice.ledger_entry_id) {
    await remove(ref(database, `ledger/${invoice.ledger_entry_id}`));
  }

  // ধাপ ৪: ইনভয়েসটা মুছে ফেলা
  await remove(ref(database, `invoices/${invoice.id}`));

  // ধাপ ৫: লগ রাখা
  await logActivity({
    userId,
    action: 'ইনভয়েস ডিলিট',
    target: `${invoice.invoice_no} — ৳${invoice.subtotal}`,
  });
}

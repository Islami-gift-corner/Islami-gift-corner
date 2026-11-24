import { ref, push, set, get, update } from 'firebase/database';
import { database } from './firebase';
import { logActivity } from './activityLog';

/**
 * স্টকের প্রতিটা ধরনের মুভমেন্ট স্টকে যোগ (+) হবে না বিয়োগ (-) হবে তার নিয়ম।
 * 'adjustment' এর জন্য আলাদা নিয়ম নেই — qty নিজেই +/- হিসেবে দেওয়া হবে।
 */
const MOVEMENT_SIGN = {
  inward: 1, // কোম্পানি থেকে ক্রয় → স্টক বাড়ে
  return: 1, // পার্টি থেকে ফেরত → স্টক বাড়ে
  outward: -1, // বিক্রয় → স্টক কমে
  damage: -1, // নষ্ট/ক্ষতি → স্টক কমে
  company_return: -1, // কোম্পানিতে ফেরত → স্টক কমে
};

/**
 * একটা প্রোডাক্টের স্টক পরিবর্তন করে এবং stock_movements এ হিস্ট্রি এন্ট্রি রাখে।
 * পুরো অ্যাপে স্টক বদলানোর একমাত্র জায়গা এটাই — যেকোনো মডিউল (ইনভয়েস, রিটার্ন,
 * ড্যামেজ) এই একই ফাংশন কল করবে, যাতে হিসাবের ভুল বা ডুপ্লিকেট লজিক না হয়।
 *
 * @param {Object} params
 * @param {string} params.companyId
 * @param {string} params.productId
 * @param {'inward'|'outward'|'return'|'damage'|'company_return'|'adjustment'} params.type
 * @param {number} params.qty - সবসময় পজিটিভ সংখ্যা দিন (adjustment ছাড়া)
 * @param {string} [params.reason]
 * @param {string} [params.recordedBy] - যে ইউজার এই কাজ করলো তার UID/নাম
 * @param {string} [params.refId] - সংশ্লিষ্ট ইনভয়েস/ক্লেইম আইডি (থাকলে)
 * @returns {Promise<number>} - নতুন স্টক পরিমাণ
 */
export async function recordStockMovement({
  companyId,
  productId,
  type,
  qty,
  reason = '',
  recordedBy = '',
  refId = '',
}) {
  if (!companyId || !productId) {
    throw new Error('companyId এবং productId আবশ্যক');
  }
  if (qty === undefined || qty === null || isNaN(qty)) {
    throw new Error('সঠিক পরিমাণ (qty) দিন');
  }

  const productRef = ref(database, `companies/${companyId}/products/${productId}`);
  const snapshot = await get(productRef);

  if (!snapshot.exists()) {
    throw new Error('এই প্রোডাক্ট খুঁজে পাওয়া যায়নি');
  }

  const currentStock = Number(snapshot.val().stock_qty) || 0;

  let delta;
  if (type === 'adjustment') {
    // adjustment এর ক্ষেত্রে qty নিজেই +5 বা -3 এর মতো signed সংখ্যা হবে
    delta = Number(qty);
  } else {
    const sign = MOVEMENT_SIGN[type];
    if (sign === undefined) {
      throw new Error(`অজানা মুভমেন্ট টাইপ: ${type}`);
    }
    delta = sign * Math.abs(Number(qty));
  }

  const newStock = currentStock + delta;

  // ধাপ ১: প্রোডাক্টের স্টক আপডেট করা
  await update(productRef, { stock_qty: newStock });

  // ধাপ ২: হিস্ট্রি এন্ট্রি রাখা (stock_movements)
  const movementRef = push(ref(database, 'stock_movements'));
  await set(movementRef, {
    type,
    company_id: companyId,
    product_id: productId,
    qty: Math.abs(Number(qty)),
    delta,
    reason,
    recorded_by: recordedBy,
    ref_id: refId,
    date: new Date().toISOString(),
  });

  // ধাপ ৩: সাধারণ অ্যাক্টিভিটি লগেও একটা এন্ট্রি রাখা (accountability এর জন্য)
  const typeLabels = {
    inward: 'স্টক ইনওয়ার্ড',
    outward: 'স্টক আউটওয়ার্ড (বিক্রয়)',
    return: 'পার্টি রিটার্ন',
    damage: 'স্টক ড্যামেজ',
    company_return: 'ওয়্যারেন্টি ক্লেইম',
    adjustment: 'স্টক অ্যাডজাস্টমেন্ট',
  };
  await logActivity({
    userId: recordedBy,
    action: typeLabels[type] || 'স্টক পরিবর্তন',
    target: `${Math.abs(Number(qty))} ইউনিট ${reason ? `— ${reason}` : ''}`,
  });

  return newStock;
}

/**
 * recordStockMovement()-এর মতোই, কিন্তু কোম্পানির প্রোডাক্টের বদলে খুচরা পণ্যের
 * (retail_products) স্টক পরিবর্তনের জন্য। একই stock_movements নোডে হিস্ট্রি রাখা হয়,
 * শুধু company_id ফাঁকা রেখে source: 'retail' চিহ্নিত করা হয়।
 *
 * @param {Object} params
 * @param {string} params.productId
 * @param {'inward'|'outward'|'damage'|'adjustment'} params.type
 * @param {number} params.qty
 * @param {string} [params.reason]
 * @param {string} [params.recordedBy]
 * @param {string} [params.refId]
 * @returns {Promise<number>} নতুন স্টক পরিমাণ
 */
export async function recordRetailStockMovement({
  productId,
  type,
  qty,
  reason = '',
  recordedBy = '',
  refId = '',
}) {
  if (!productId) {
    throw new Error('productId আবশ্যক');
  }
  if (qty === undefined || qty === null || isNaN(qty)) {
    throw new Error('সঠিক পরিমাণ (qty) দিন');
  }

  const productRef = ref(database, `retail_products/${productId}`);
  const snapshot = await get(productRef);

  if (!snapshot.exists()) {
    throw new Error('এই খুচরা পণ্য খুঁজে পাওয়া যায়নি');
  }

  const currentStock = Number(snapshot.val().stock_qty) || 0;

  let delta;
  if (type === 'adjustment') {
    delta = Number(qty);
  } else {
    const sign = MOVEMENT_SIGN[type];
    if (sign === undefined) {
      throw new Error(`অজানা মুভমেন্ট টাইপ: ${type}`);
    }
    delta = sign * Math.abs(Number(qty));
  }

  const newStock = currentStock + delta;

  await update(productRef, { stock_qty: newStock });

  const movementRef = push(ref(database, 'stock_movements'));
  await set(movementRef, {
    type,
    source: 'retail',
    company_id: null,
    product_id: productId,
    qty: Math.abs(Number(qty)),
    delta,
    reason,
    recorded_by: recordedBy,
    ref_id: refId,
    date: new Date().toISOString(),
  });

  const typeLabels = {
    inward: 'খুচরা স্টক ইনওয়ার্ড',
    outward: 'খুচরা স্টক আউটওয়ার্ড (বিক্রয়)',
    damage: 'খুচরা স্টক ড্যামেজ',
    adjustment: 'খুচরা স্টক অ্যাডজাস্টমেন্ট',
  };
  await logActivity({
    userId: recordedBy,
    action: typeLabels[type] || 'খুচরা স্টক পরিবর্তন',
    target: `${Math.abs(Number(qty))} ইউনিট ${reason ? `— ${reason}` : ''}`,
  });

  return newStock;
}
// কোন ফিচার চালু থাকবে — Vercel এর Environment Variables থেকে নিয়ন্ত্রিত।
//
// NEXT_PUBLIC_ENABLE_SHOPS : "false" দিলে দোকান/সেলসম্যান সিস্টেম বন্ধ (আগের পাইকারি/SR মোড)। ডিফল্ট: চালু
// NEXT_PUBLIC_ENABLE_SR    : "true" দিলে SR মেনু দেখা যাবে। ডিফল্ট: দোকান চালু থাকলে বন্ধ, নইলে চালু
export const SHOPS_ENABLED = process.env.NEXT_PUBLIC_ENABLE_SHOPS !== 'false';

const srEnv = process.env.NEXT_PUBLIC_ENABLE_SR;
export const SR_ENABLED = srEnv ? srEnv === 'true' : !SHOPS_ENABLED;

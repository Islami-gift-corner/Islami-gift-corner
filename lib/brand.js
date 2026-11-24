// ============================================================
// ব্র্যান্ড কনফিগ — এক জায়গা থেকেই পুরো অ্যাপের নাম/রঙ/লোগো নিয়ন্ত্রণ হয়।
// নতুন প্রতিষ্ঠানের জন্য শুধু .env.local ফাইলের মান বদলান (দেখুন .env.example)।
//
// গুরুত্বপূর্ণ: Next.js এ NEXT_PUBLIC_* ভ্যারিয়েবল সরাসরি লিখতে হয়
// (process.env[key] লিখলে কাজ করবে না), তাই নিচে আলাদা আলাদা করে লেখা।
// ============================================================

const pick = (value, fallback) => (value && String(value).trim()) || fallback;

export const brand = {
  // লগইন/স্প্ল্যাশ স্ক্রিন, ব্রাউজার ট্যাব, ইনস্টল করা অ্যাপের নাম
  name: pick(process.env.NEXT_PUBLIC_BRAND_NAME, 'আমার ব্যবসা'),
  // হোম স্ক্রিনে আইকনের নিচে ছোট নাম
  shortName: pick(process.env.NEXT_PUBLIC_BRAND_SHORT_NAME, pick(process.env.NEXT_PUBLIC_BRAND_NAME, 'আমার ব্যবসা')),
  description: pick(process.env.NEXT_PUBLIC_BRAND_DESCRIPTION, 'ব্যবসা ম্যানেজমেন্ট অ্যাপ'),
  // ইংরেজি ছোট হাতের, স্পেস ছাড়া — localStorage কী, ব্যাকআপ ফাইলের নামে ব্যবহার হয়
  slug: pick(process.env.NEXT_PUBLIC_BRAND_SLUG, 'business-app'),
  // মূল রঙ (hex)। বাকি সব শেড (হালকা/গাঢ়/ব্যাকগ্রাউন্ড/ডার্ক মোড) এটা থেকেই তৈরি হয়
  themeColor: pick(process.env.NEXT_PUBLIC_THEME_COLOR, '#0F7938'),
  // ডিফল্ট লোগো (public ফোল্ডারে)। অ্যাডমিন চাইলে বিজনেস প্রোফাইল থেকে নিজের লোগো আপলোড করতে পারবেন
  logo: pick(process.env.NEXT_PUBLIC_BRAND_LOGO, '/logo.svg'),
};

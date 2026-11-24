/**
 * একটা লম্বা তালিকাকে A4 পেজে ভাগ করে (প্রতি পেজে কতগুলো সারি ধরবে তার হিসাব অনুযায়ী)।
 *
 * @param {Array} items - সব সারি
 * @param {Object} opts
 * @param {number} opts.firstCapacity - প্রথম পেজে কত "ওজন" (সাধারণত সারির সংখ্যা) ধরবে
 * @param {number} opts.nextCapacity - পরের পেজগুলোতে কত ধরবে
 * @param {number} [opts.lastReserve=0] - শেষ পেজে সারির নিচে সারসংক্ষেপ/স্বাক্ষরের জন্য কতটা জায়গা রাখতে হবে
 * @param {(item:any)=>number} [opts.weight] - একটা সারির ওজন (লম্বা নাম দুই লাইনে গেলে ২ ইত্যাদি)
 * @returns {Array<Array>} পেজ অনুযায়ী সারির তালিকা (কমপক্ষে একটা পেজ থাকবেই)
 */
export function paginate(items, { firstCapacity, nextCapacity, lastReserve = 0, weight = () => 1 }) {
  const pages = [[]];
  let used = 0;
  const capOf = (pageIndex) => (pageIndex === 0 ? firstCapacity : nextCapacity);

  items.forEach((item) => {
    const w = weight(item);
    const idx = pages.length - 1;
    if (used + w > capOf(idx) && pages[idx].length > 0) {
      pages.push([]);
      used = 0;
    }
    pages[pages.length - 1].push(item);
    used += w;
  });

  // শেষ পেজে সারসংক্ষেপের জায়গা না থাকলে শেষের কয়েকটা সারি পরের নতুন পেজে সরানো হয়
  const lastIdx = pages.length - 1;
  const lastPage = pages[lastIdx];
  const lastCap = capOf(lastIdx);
  let lastUsed = lastPage.reduce((s, it) => s + weight(it), 0);
  if (lastUsed + lastReserve > lastCap) {
    const moved = [];
    while (lastPage.length > 0 && lastUsed + lastReserve > lastCap) {
      const it = lastPage.pop();
      lastUsed -= weight(it);
      moved.unshift(it);
    }
    pages.push(moved);
  }

  return pages;
}

import { ref, runTransaction } from 'firebase/database';
import { database } from './firebase';

// ---------- বারকোড ----------

// EAN-13 এর শেষ (চেক) অংক বের করে
function ean13CheckDigit(base12) {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const d = Number(base12[i]);
    sum += i % 2 === 0 ? d : d * 3;
  }
  return (10 - (sum % 10)) % 10;
}

export function isValidEan13(code) {
  const s = String(code || '');
  return /^\d{13}$/.test(s) && ean13CheckDigit(s.slice(0, 12)) === Number(s[12]);
}

// ক্রমিক নম্বর থেকে ১৩ অংকের বৈধ EAN-13 বারকোড (২ দিয়ে শুরু = দোকানের নিজস্ব কোড)
export function makeBarcodeFromNumber(n) {
  const base12 = `2${String(n).padStart(11, '0')}`;
  return `${base12}${ean13CheckDigit(base12)}`;
}

// প্রতিবার নতুন, ইউনিক বারকোড দেয় (সব দোকান মিলিয়ে একটাই ক্রম, তাই কখনো মিলবে না)
export async function getNextBarcode() {
  const counterRef = ref(database, 'barcode_counter/last');
  const result = await runTransaction(counterRef, (current) => (current || 0) + 1);
  return makeBarcodeFromNumber(result.snapshot.val());
}

// বারকোড ছবির ফরম্যাট: বৈধ EAN-13 হলে EAN13, না হলে (নিজের দেওয়া কোড) CODE128
export function barcodeFormat(code) {
  return isValidEan13(code) ? 'EAN13' : 'CODE128';
}

// বারকোডের SVG লেখা (প্রিন্ট/ডিসপ্লের জন্য)
export async function barcodeSvgString(code, { height = 40, width = 2, fontSize = 14 } = {}) {
  const JsBarcode = (await import('jsbarcode')).default;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  JsBarcode(svg, String(code), {
    format: barcodeFormat(code),
    height,
    width,
    fontSize,
    margin: 4,
    displayValue: true,
    background: '#ffffff',
  });
  return svg.outerHTML;
}

// নতুন উইন্ডোতে বারকোড লেবেল প্রিন্ট (স্টিকারের জন্য)
export async function printBarcodeLabels(products, shopName = '') {
  const cells = [];
  for (const p of products) {
    if (!p.barcode) continue;
    const svg = await barcodeSvgString(p.barcode, { height: 38, width: 1.6, fontSize: 12 });
    const name = String(p.name || '').replace(/</g, '&lt;');
    cells.push(`<div class="label"><div class="name">${name}</div>${svg}</div>`);
  }
  if (cells.length === 0) return false;

  const w = window.open('', '_blank');
  if (!w) return false;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${shopName} বারকোড</title>
<style>
  body{font-family:sans-serif;margin:8mm}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm}
  .label{border:1px dashed #bbb;padding:2mm;text-align:center;break-inside:avoid}
  .name{font-size:11px;font-weight:600;margin-bottom:1mm;word-break:break-word}
  svg{max-width:100%;height:auto}
  @media print{.label{border:none}}
</style></head><body><div class="grid">${cells.join('')}</div>
<script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script></body></html>`);
  w.document.close();
  return true;
}

// ---------- হিসাব ----------

export const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// পার্টির ব্যালেন্স = মোট বাকি − মোট জমা (ধনাত্মক মানে পার্টি আমাকে দেবে)
export function partyBalance(entries = []) {
  return entries.reduce(
    (sum, e) => (e.type === 'payment' ? sum - num(e.amount) : sum + num(e.amount)),
    0
  );
}

export function objToList(obj) {
  return obj ? Object.entries(obj).map(([id, v]) => ({ id, ...v })) : [];
}

export function timeOf(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

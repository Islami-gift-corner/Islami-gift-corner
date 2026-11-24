// টাকার অংক সুন্দরভাবে দেখানোর জন্য (দশমিকের লম্বা ভগ্নাংশ ছাঁটা, হাজার/লাখে কমা)
export function money(n) {
  const v = Math.round((Number(n) || 0) * 100) / 100;
  return v.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

// আজকের তারিখ লোকাল সময় অনুযায়ী YYYY-MM-DD (input type="date" এর জন্য)
export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

// ISO তারিখ → লোকাল YYYY-MM-DD
export function isoToDateStr(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

// YYYY-MM-DD → ISO (দুপুর ১২টা ধরে, যাতে টাইমজোনে তারিখ এদিক-ওদিক না হয়)
export function dateStrToIso(str) {
  return new Date(`${str}T12:00:00`).toISOString();
}

// YYYY-MM-DD বা ISO → dd/mm/yyyy
export function fmtDate(value) {
  if (!value) return '';
  const s = String(value);
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T12:00:00`) : new Date(s);
  return d.toLocaleDateString('en-GB');
}

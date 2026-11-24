'use client';

import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '@/lib/firebase';
import { calculateInvoiceProfit, isInRange } from '@/lib/profitUtils';
import { CalendarRange, FileSpreadsheet, TrendingUp } from 'lucide-react';

function firstDayOfMonth(offset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset, 1);
  return d.toISOString().slice(0, 10);
}
function lastDayOfMonth(offset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset + 1, 0);
  return d.toISOString().slice(0, 10);
}

const BN_MONTHS = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর',
];

export default function ProfitStatement() {
  const [invoices, setInvoices] = useState([]);
  const [companies, setCompanies] = useState({});
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [fromDate, setFromDate] = useState(firstDayOfMonth(-5));
  const [toDate, setToDate] = useState(lastDayOfMonth(0));

  useEffect(() => {
    const unsub1 = onValue(ref(database, 'invoices'), (s) => {
      setInvoices(s.val() ? Object.values(s.val()) : []);
      setLoading(false);
    });
    const unsub2 = onValue(ref(database, 'companies'), (s) => setCompanies(s.val() || {}));
    return () => {
      unsub1();
      unsub2();
    };
  }, []);

  if (loading) {
    return <p className="text-sm text-text-muted dark:text-dark-text-secondary">লোড হচ্ছে...</p>;
  }

  const filtered = invoices.filter((inv) => isInRange(inv.date, fromDate, toDate));

  const monthTotals = {};
  filtered.forEach((inv) => {
    const { totalProfit } = calculateInvoiceProfit(inv, companies);
    const d = new Date(inv.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthTotals[key]) {
      monthTotals[key] = {
        year: d.getFullYear(),
        month: d.getMonth(),
        totalSales: 0,
        totalProfit: 0,
        invoiceCount: 0,
      };
    }
    monthTotals[key].totalSales += inv.subtotal || 0;
    monthTotals[key].totalProfit += totalProfit;
    monthTotals[key].invoiceCount += 1;
  });

  const rows = Object.entries(monthTotals)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, v]) => ({ key, ...v }));

  const grandProfit = rows.reduce((sum, r) => sum + r.totalProfit, 0);
  const grandSales = rows.reduce((sum, r) => sum + r.totalSales, 0);

  const handleExport = async () => {
    setExporting(true);
    try {
      const XLSX = await import('xlsx');
      const sheetRows = rows.map((r) => ({
        মাস: `${BN_MONTHS[r.month]} ${r.year}`,
        'ইনভয়েস সংখ্যা': r.invoiceCount,
        'মোট বিক্রয়': Math.round(r.totalSales),
        'মোট প্রফিট': Math.round(r.totalProfit),
      }));
      sheetRows.push({
        মাস: 'সর্বমোট',
        'ইনভয়েস সংখ্যা': filtered.length,
        'মোট বিক্রয়': Math.round(grandSales),
        'মোট প্রফিট': Math.round(grandProfit),
      });
      const sheet = XLSX.utils.json_to_sheet(sheetRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, 'Profit Statement');
      XLSX.writeFile(workbook, `profit-statement-${fromDate}-to-${toDate}.xlsx`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      {/* সময়কাল নির্বাচন */}
      <div
        className="bg-background-card dark:bg-dark-card rounded-2xl shadow-sm
                   border border-border dark:border-dark-border p-4"
      >
        <p className="flex items-center gap-2 text-sm font-medium text-text-primary dark:text-dark-text-primary mb-3">
          <CalendarRange size={16} className="text-primary" />
          সময়কাল বাছাই করুন (একাধিক মাস/বছর একসাথে দেখতে পারবেন)
        </p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-text-muted dark:text-dark-text-secondary mb-1">
              শুরু
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full rounded-xl border border-border dark:border-dark-border
                         bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                         px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted dark:text-dark-text-secondary mb-1">
              শেষ
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full rounded-xl border border-border dark:border-dark-border
                         bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                         px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setFromDate(firstDayOfMonth(-5));
              setToDate(lastDayOfMonth(0));
            }}
            className="rounded-lg px-3 py-1.5 text-xs font-medium border border-border dark:border-dark-border
                       text-text-secondary dark:text-dark-text-secondary"
          >
            গত ৬ মাস
          </button>
          <button
            type="button"
            onClick={() => {
              setFromDate(firstDayOfMonth(-11));
              setToDate(lastDayOfMonth(0));
            }}
            className="rounded-lg px-3 py-1.5 text-xs font-medium border border-border dark:border-dark-border
                       text-text-secondary dark:text-dark-text-secondary"
          >
            গত ১ বছর
          </button>
        </div>
      </div>

      {/* মোট */}
      <div className="grid grid-cols-2 gap-3">
        <div
          className="bg-background-card dark:bg-dark-card rounded-2xl shadow-sm
                     border border-border dark:border-dark-border p-4"
        >
          <TrendingUp size={16} className="text-text-primary dark:text-dark-text-primary mb-2" />
          <p className="text-xs text-text-muted dark:text-dark-text-secondary mb-1">মোট বিক্রয়</p>
          <p className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">
            ৳{Math.round(grandSales)}
          </p>
        </div>
        <div
          className="bg-background-card dark:bg-dark-card rounded-2xl shadow-sm
                     border border-border dark:border-dark-border p-4"
        >
          <TrendingUp size={16} className="text-success mb-2" />
          <p className="text-xs text-text-muted dark:text-dark-text-secondary mb-1">মোট প্রফিট</p>
          <p className="text-sm font-semibold text-success">৳{Math.round(grandProfit)}</p>
        </div>
      </div>

      {/* মাস ভিত্তিক টেবিল */}
      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border dark:border-dark-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-background-sidebar dark:bg-dark-sidebar text-text-secondary dark:text-dark-text-secondary uppercase text-xs">
                <th className="text-left px-3 py-2 font-medium">মাস</th>
                <th className="text-right px-3 py-2 font-medium">ইনভয়েস</th>
                <th className="text-right px-3 py-2 font-medium">বিক্রয়</th>
                <th className="text-right px-3 py-2 font-medium">প্রফিট</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.key}
                  className="border-t border-border dark:border-dark-border text-text-primary dark:text-dark-text-primary"
                >
                  <td className="px-3 py-2">
                    {BN_MONTHS[r.month]} {r.year}
                  </td>
                  <td className="px-3 py-2 text-right">{r.invoiceCount}</td>
                  <td className="px-3 py-2 text-right">৳{Math.round(r.totalSales)}</td>
                  <td className="px-3 py-2 text-right font-medium text-success">
                    ৳{Math.round(r.totalProfit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button
        type="button"
        onClick={handleExport}
        disabled={exporting || rows.length === 0}
        className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium
                   border border-primary text-primary hover:bg-primary/5 transition-colors disabled:opacity-60"
      >
        <FileSpreadsheet size={16} />
        {exporting ? 'তৈরি হচ্ছে...' : 'Excel ডাউনলোড করুন'}
      </button>
    </div>
  );
}
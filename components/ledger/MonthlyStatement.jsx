'use client';

import { useState, useEffect, useRef } from 'react';
import { ref, onValue } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';
import { database, auth } from '@/lib/firebase';
import { exportElementToPdf } from '@/lib/pdfExport';
import StatementPages from '@/components/common/StatementPages';
import { CalendarRange, FileDown, TrendingUp, TrendingDown, Wallet } from 'lucide-react';

const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// source: 'admin' → ledger নোড, 'sr' → sr_ledger/{uid}/entries (শুধু নিজের এন্ট্রি)
export default function MonthlyStatement({ source = 'admin' }) {
  const [month, setMonth] = useState(currentMonth());
  const [entries, setEntries] = useState([]);
  const [uid, setUid] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const pdfRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => setUid(user?.uid || null));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (source === 'sr' && !uid) return;
    const path = source === 'sr' ? `sr_ledger/${uid}/entries` : 'ledger';
    const unsubscribe = onValue(ref(database, path), (snap) => {
      const data = snap.val();
      setEntries(data ? Object.entries(data).map(([id, v]) => ({ id, ...v })) : []);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [source, uid]);

  const monthEntries = entries
    .filter((e) => {
      const d = new Date(e.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return key === month;
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const totalIncome = monthEntries
    .filter((e) => e.type === 'income')
    .reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const totalExpense = monthEntries
    .filter((e) => e.type === 'expense')
    .reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const net = totalIncome - totalExpense;

  // ক্যাটাগরি অনুযায়ী যোগফল
  const byCategory = {};
  monthEntries.forEach((e) => {
    const key = `${e.type}|${e.category || 'অন্যান্য'}`;
    byCategory[key] = (byCategory[key] || 0) + (Number(e.amount) || 0);
  });
  const categoryList = Object.entries(byCategory).map(([k, amt]) => {
    const [type, category] = k.split('|');
    return { type, category, amt };
  });

  const monthLabel = (() => {
    const [y, m] = month.split('-');
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-GB', {
      month: 'long',
      year: 'numeric',
    });
  })();

  const rows = monthEntries.map((e) => ({
    weight: Math.max(1, Math.ceil((e.note || '').length / 38)),
    cells: [
      new Date(e.date).toLocaleDateString('en-GB'),
      e.category || '',
      e.note || '',
      e.type === 'income' ? e.amount : '',
      e.type === 'expense' ? e.amount : '',
    ],
  }));
  rows.push({ bold: true, shaded: true, cells: ['', 'Total', '', totalIncome, totalExpense] });

  const summary = (
    <div className="text-xs">
      <div className="flex flex-col items-end gap-1 mb-4">
        <div className="flex justify-between w-56">
          <span>Total Income</span>
          <span className="font-semibold">{totalIncome}</span>
        </div>
        <div className="flex justify-between w-56">
          <span>Total Expense</span>
          <span className="font-semibold">{totalExpense}</span>
        </div>
        <div
          className="flex justify-between w-56 pt-1 mt-1 font-bold"
          style={{ borderTop: '1px solid #000' }}
        >
          <span>{net >= 0 ? 'Net Profit / Savings' : 'Net Loss'}</span>
          <span>{Math.abs(net)}</span>
        </div>
      </div>
      {categoryList.length > 0 && (
        <>
          <p className="font-semibold mb-1">Category Summary</p>
          <table className="border-collapse text-xs">
            <tbody>
              {categoryList.map((c) => (
                <tr key={`${c.type}-${c.category}`}>
                  <td className="py-0.5 pr-6">{c.type === 'income' ? 'Income' : 'Expense'}</td>
                  <td className="py-0.5 pr-6">{c.category}</td>
                  <td className="py-0.5 text-right">{c.amt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );

  const handlePdf = async () => {
    setExporting(true);
    try {
      await exportElementToPdf(pdfRef.current, `income-expense-${month}.pdf`);
    } catch (err) {
      alert('PDF তৈরি করা যায়নি, আবার চেষ্টা করুন');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-text-muted dark:text-dark-text-secondary">লোড হচ্ছে...</p>;
  }

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <div
        className="bg-background-card dark:bg-dark-card rounded-2xl shadow-sm
                   border border-border dark:border-dark-border p-5"
      >
        <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary dark:text-dark-text-primary mb-3">
          <CalendarRange size={16} className="text-primary" />
          মাসিক আয়-ব্যয় স্টেটমেন্ট
        </h3>

        <label className="block text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1.5">
          মাস নির্বাচন করুন
        </label>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value || currentMonth())}
          className="rounded-xl border border-border dark:border-dark-border
                     bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                     px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary mb-4"
        />

        <div className="grid grid-cols-3 gap-3 text-center mb-4">
          <div className="rounded-xl bg-success/10 p-3">
            <p className="flex items-center justify-center gap-1 text-xs text-text-muted dark:text-dark-text-secondary mb-1">
              <TrendingUp size={12} /> আয়
            </p>
            <p className="text-sm font-semibold text-success">৳{totalIncome}</p>
          </div>
          <div className="rounded-xl bg-danger/10 p-3">
            <p className="flex items-center justify-center gap-1 text-xs text-text-muted dark:text-dark-text-secondary mb-1">
              <TrendingDown size={12} /> ব্যয়
            </p>
            <p className="text-sm font-semibold text-danger">৳{totalExpense}</p>
          </div>
          <div className="rounded-xl bg-background dark:bg-dark-background p-3">
            <p className="flex items-center justify-center gap-1 text-xs text-text-muted dark:text-dark-text-secondary mb-1">
              <Wallet size={12} /> {net >= 0 ? 'লাভ/সঞ্চয়' : 'ঘাটতি'}
            </p>
            <p className={`text-sm font-semibold ${net >= 0 ? 'text-success' : 'text-danger'}`}>
              ৳{Math.abs(net)}
            </p>
          </div>
        </div>

        <p className="text-xs text-text-secondary dark:text-dark-text-secondary mb-3">
          {monthLabel} — {monthEntries.length}টি এন্ট্রি
        </p>

        <button
          type="button"
          onClick={handlePdf}
          disabled={exporting || monthEntries.length === 0}
          className="flex items-center justify-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-medium
                     bg-gradient-to-r from-primary to-primary-light text-white disabled:opacity-50"
        >
          <FileDown size={15} />
          {exporting ? 'তৈরি হচ্ছে...' : 'PDF ডাউনলোড'}
        </button>
      </div>

      {/* PDF এর জন্য লুকানো প্রিন্টেবল স্টেটমেন্ট */}
      <div className="fixed -left-[9999px] top-0">
        <StatementPages
          innerRef={pdfRef}
          title="Monthly Income & Expense Statement"
          subtitle={monthLabel}
          columns={[
            { label: 'Date', width: '17%' },
            { label: 'Category', width: '20%' },
            { label: 'Note' },
            { label: 'Income', align: 'right', width: '14%' },
            { label: 'Expense', align: 'right', width: '14%' },
          ]}
          rows={rows}
          summary={summary}
          summaryRows={7 + categoryList.length}
        />
      </div>
    </div>
  );
}

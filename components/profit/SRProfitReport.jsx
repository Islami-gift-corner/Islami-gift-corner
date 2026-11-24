'use client';

import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '@/lib/firebase';
import { calculateInvoiceProfit, isInRange } from '@/lib/profitUtils';
import { UserRound, CalendarRange } from 'lucide-react';

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

export default function SRProfitReport() {
  const [invoices, setInvoices] = useState([]);
  const [companies, setCompanies] = useState({});
  const [srUsers, setSrUsers] = useState({});
  const [loading, setLoading] = useState(true);

  const [fromDate, setFromDate] = useState(firstDayOfMonth(0));
  const [toDate, setToDate] = useState(lastDayOfMonth(0));

  useEffect(() => {
    const unsub1 = onValue(ref(database, 'invoices'), (s) => {
      setInvoices(s.val() ? Object.values(s.val()) : []);
      setLoading(false);
    });
    const unsub2 = onValue(ref(database, 'companies'), (s) => setCompanies(s.val() || {}));
    const unsub3 = onValue(ref(database, 'users'), (s) => setSrUsers(s.val() || {}));
    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, []);

  if (loading) {
    return <p className="text-sm text-text-muted dark:text-dark-text-secondary">লোড হচ্ছে...</p>;
  }

  const filtered = invoices.filter((inv) => inv.sr_id && isInRange(inv.date, fromDate, toDate));

  const srTotals = {};
  filtered.forEach((inv) => {
    const { totalProfit } = calculateInvoiceProfit(inv, companies);
    const key = inv.sr_id;
    if (!srTotals[key]) {
      srTotals[key] = {
        name: srUsers[key]?.name || 'অজানা SR',
        totalProfit: 0,
        invoiceCount: 0,
      };
    }
    srTotals[key].totalProfit += totalProfit;
    srTotals[key].invoiceCount += 1;
  });

  const rows = Object.values(srTotals).sort((a, b) => b.totalProfit - a.totalProfit);
  const grandTotal = rows.reduce((sum, r) => sum + r.totalProfit, 0);

  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      {/* তারিখ নির্বাচন */}
      <div
        className="bg-background-card dark:bg-dark-card rounded-2xl shadow-sm
                   border border-border dark:border-dark-border p-4"
      >
        <p className="flex items-center gap-2 text-sm font-medium text-text-primary dark:text-dark-text-primary mb-3">
          <CalendarRange size={16} className="text-primary" />
          সময়কাল বাছাই করুন
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
              setFromDate(firstDayOfMonth(0));
              setToDate(lastDayOfMonth(0));
            }}
            className="rounded-lg px-3 py-1.5 text-xs font-medium border border-border dark:border-dark-border
                       text-text-secondary dark:text-dark-text-secondary"
          >
            এই মাস
          </button>
          <button
            type="button"
            onClick={() => {
              setFromDate(firstDayOfMonth(-1));
              setToDate(lastDayOfMonth(-1));
            }}
            className="rounded-lg px-3 py-1.5 text-xs font-medium border border-border dark:border-dark-border
                       text-text-secondary dark:text-dark-text-secondary"
          >
            গত মাস
          </button>
        </div>
      </div>

      {/* ফলাফল */}
      {rows.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center gap-2 py-12 rounded-2xl
                     border border-dashed border-border dark:border-dark-border"
        >
          <UserRound size={28} className="text-text-muted" />
          <p className="text-sm text-text-muted dark:text-dark-text-secondary">
            এই সময়ে কোনো SR-এর বিক্রয় পাওয়া যায়নি
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between px-1">
            <p className="text-sm font-medium text-text-secondary dark:text-dark-text-secondary">
              মোট প্রফিট
            </p>
            <p className="text-base font-semibold text-success">৳{Math.round(grandTotal)}</p>
          </div>

          <div className="flex flex-col gap-2">
            {rows.map((row, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between bg-background-card dark:bg-dark-card
                           rounded-xl border border-border dark:border-dark-border p-4"
              >
                <div>
                  <p className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">
                    {row.name}
                  </p>
                  <p className="text-xs text-text-secondary dark:text-dark-text-secondary">
                    {row.invoiceCount}টা ইনভয়েস
                  </p>
                </div>
                <span className="text-sm font-semibold text-success">
                  ৳{Math.round(row.totalProfit)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
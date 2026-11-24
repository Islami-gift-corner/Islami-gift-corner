'use client';

import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '@/lib/firebase';
import { summarizeLoan, daysFromToday } from '@/lib/bankUtils';
import { money, fmtDate } from '@/lib/format';
import { Landmark, ChevronRight, AlertTriangle, CalendarClock, CheckCircle2 } from 'lucide-react';

function dueLabel(dateStr) {
  const d = daysFromToday(dateStr);
  if (d === 0) return 'আজ';
  if (d > 0) return `${d} দিন পরে`;
  return `${-d} দিন বিলম্বিত`;
}

export default function BankOverview({ onSelect }) {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onValue(ref(database, 'bank_loans'), (snap) => {
      const data = snap.val();
      setLoans(data ? Object.entries(data).map(([id, v]) => ({ id, ...v })) : []);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <p className="text-sm text-text-muted dark:text-dark-text-secondary">লোড হচ্ছে...</p>;
  }

  if (loans.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 py-12 rounded-2xl
                   border border-dashed border-border dark:border-dark-border"
      >
        <Landmark size={28} className="text-text-muted" />
        <p className="text-sm text-text-muted dark:text-dark-text-secondary">এখনো কোনো লোন যোগ করা হয়নি</p>
      </div>
    );
  }

  const items = loans.map((loan) => ({ loan, s: summarizeLoan(loan) }));

  const totals = items.reduce(
    (t, { loan, s }) => ({
      principal: t.principal + (Number(loan.principal) || 0),
      payable: t.payable + s.totalPayable,
      paid: t.paid + s.paidAmount,
      remaining: t.remaining + s.remainingAmount,
      overdueCount: t.overdueCount + s.overdueCount,
      overdueAmount: t.overdueAmount + s.overdueAmount,
    }),
    { principal: 0, payable: 0, paid: 0, remaining: 0, overdueCount: 0, overdueAmount: 0 }
  );

  // সব লোনের পরবর্তী কিস্তি — যেটা আগে দিতে হবে সেটা উপরে
  const upcoming = items
    .filter(({ s }) => s.next)
    .map(({ loan, s }) => ({ loan, next: s.next }))
    .sort((a, b) => a.next.dueDate.localeCompare(b.next.dueDate))
    .slice(0, 6);

  const progress = totals.payable > 0 ? Math.min(100, (totals.paid / totals.payable) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* সামগ্রিক ওভারভিউ */}
      <div
        className="bg-background-card dark:bg-dark-card rounded-2xl shadow-sm
                   border border-border dark:border-dark-border p-5"
      >
        <h2 className="text-sm font-semibold text-text-primary dark:text-dark-text-primary mb-3">
          সামগ্রিক ওভারভিউ
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center mb-4">
          <div className="rounded-xl bg-background dark:bg-dark-background p-3">
            <p className="text-xs text-text-muted dark:text-dark-text-secondary mb-1">মোট লোন নিয়েছি</p>
            <p className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">৳{money(totals.principal)}</p>
          </div>
          <div className="rounded-xl bg-background dark:bg-dark-background p-3">
            <p className="text-xs text-text-muted dark:text-dark-text-secondary mb-1">মোট ফেরতযোগ্য</p>
            <p className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">৳{money(totals.payable)}</p>
          </div>
          <div className="rounded-xl bg-success/10 p-3">
            <p className="text-xs text-text-muted dark:text-dark-text-secondary mb-1">এ পর্যন্ত দিলাম</p>
            <p className="text-sm font-semibold text-success">৳{money(totals.paid)}</p>
          </div>
          <div className="rounded-xl bg-danger/10 p-3">
            <p className="text-xs text-text-muted dark:text-dark-text-secondary mb-1">বাকি রইলো</p>
            <p className="text-sm font-semibold text-danger">৳{money(totals.remaining)}</p>
          </div>
        </div>

        <div className="h-2.5 rounded-full bg-background dark:bg-dark-background overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary to-primary-light" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-[11px] text-text-muted dark:text-dark-text-secondary mt-1.5">
          মোট ফেরতযোগ্যের {Math.round(progress)}% পরিশোধ হয়েছে
        </p>

        {totals.overdueCount > 0 && (
          <p className="flex items-center gap-2 text-xs text-danger bg-danger/10 rounded-lg px-3 py-2 mt-3">
            <AlertTriangle size={14} />
            {totals.overdueCount}টি কিস্তি বিলম্বিত — মোট ৳{money(totals.overdueAmount)}
          </p>
        )}
      </div>

      {/* আসন্ন কিস্তি */}
      {upcoming.length > 0 && (
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-text-primary dark:text-dark-text-primary mb-2">
            <CalendarClock size={16} className="text-primary" />
            পরবর্তী কিস্তি
          </h2>
          <div className="flex flex-col gap-2">
            {upcoming.map(({ loan, next }) => {
              const late = next.status === 'overdue';
              return (
                <button
                  key={loan.id}
                  type="button"
                  onClick={() => onSelect(loan.id)}
                  className="flex items-center justify-between gap-3 bg-background-card dark:bg-dark-card
                             rounded-xl border border-border dark:border-dark-border p-3 text-left
                             hover:border-primary transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-text-primary dark:text-dark-text-primary">
                      {loan.bank_name}
                      <span className="text-xs text-text-muted dark:text-dark-text-secondary">
                        {' '}
                        · কিস্তি {next.no}
                      </span>
                    </p>
                    <p className="text-xs text-text-muted dark:text-dark-text-secondary">
                      {fmtDate(next.dueDate)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">
                      ৳{money(next.amount)}
                    </p>
                    <p className={`text-[11px] font-medium ${late ? 'text-danger' : 'text-warning'}`}>
                      {dueLabel(next.dueDate)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* লোনের তালিকা */}
      <div>
        <h2 className="text-sm font-semibold text-text-primary dark:text-dark-text-primary mb-2">
          সব লোন ({items.length}টি)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map(({ loan, s }) => (
            <button
              key={loan.id}
              type="button"
              onClick={() => onSelect(loan.id)}
              className="bg-background-card dark:bg-dark-card rounded-2xl border border-border dark:border-dark-border
                         p-4 text-left hover:border-primary transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold text-text-primary dark:text-dark-text-primary">
                    <Landmark size={15} className="text-primary" />
                    {loan.bank_name}
                  </p>
                  {loan.loan_name && (
                    <p className="text-xs text-text-muted dark:text-dark-text-secondary">{loan.loan_name}</p>
                  )}
                </div>
                {s.finished ? (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-success bg-success/10 rounded-full px-2 py-0.5">
                    <CheckCircle2 size={10} /> পরিশোধিত
                  </span>
                ) : s.overdueCount > 0 ? (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-danger bg-danger/10 rounded-full px-2 py-0.5">
                    <AlertTriangle size={10} /> {s.overdueCount} বিলম্বিত
                  </span>
                ) : (
                  <ChevronRight size={16} className="text-text-muted" />
                )}
              </div>

              <div className="h-2 rounded-full bg-background dark:bg-dark-background overflow-hidden mb-2">
                <div className="h-full bg-gradient-to-r from-primary to-primary-light" style={{ width: `${s.progress}%` }} />
              </div>
              <div className="flex justify-between text-xs text-text-secondary dark:text-dark-text-secondary mb-2">
                <span>
                  কিস্তি {s.paidCount}/{s.totalInstallments}
                </span>
                <span>{loan.frequency === 'weekly' ? 'সাপ্তাহিক' : 'মাসিক'} ৳{money(s.installmentAmount)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-lg bg-success/10 py-1.5">
                  <p className="text-[10px] text-text-muted dark:text-dark-text-secondary">দিয়েছি</p>
                  <p className="text-xs font-semibold text-success">৳{money(s.paidAmount)}</p>
                </div>
                <div className="rounded-lg bg-danger/10 py-1.5">
                  <p className="text-[10px] text-text-muted dark:text-dark-text-secondary">বাকি</p>
                  <p className="text-xs font-semibold text-danger">৳{money(s.remainingAmount)}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

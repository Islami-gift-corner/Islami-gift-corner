'use client';

import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '@/lib/firebase';
import { TrendingUp, Wallet, Receipt, ChevronRight } from 'lucide-react';

function isToday(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
}

function isThisMonth(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

export default function SRCurrentAccount({ srId, onSelectInvoice }) {
  const [period, setPeriod] = useState('today'); // 'today' | 'month'
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const invoicesRef = ref(database, 'invoices');
    const unsubscribe = onValue(invoicesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data)
          .map(([id, value]) => ({ id, ...value }))
          .filter((inv) => inv.sr_id === srId)
          .sort((a, b) => new Date(b.date) - new Date(a.date));
        setInvoices(list);
      } else {
        setInvoices([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [srId]);

  if (loading) {
    return <p className="text-sm text-text-muted dark:text-dark-text-secondary">লোড হচ্ছে...</p>;
  }

  const filtered = invoices.filter((inv) => (period === 'today' ? isToday(inv.date) : isThisMonth(inv.date)));
  const totalSales = filtered.reduce((sum, inv) => sum + (inv.subtotal || 0), 0);
  const totalDue = filtered.filter((i) => i.status !== 'paid').reduce((sum, i) => sum + (i.subtotal || 0), 0);
  const totalCash = filtered.filter((i) => i.status === 'paid').reduce((sum, i) => sum + (i.subtotal || 0), 0);

  return (
    <div className="flex flex-col gap-4">
      {/* আজ / চলতি মাস সাব-ট্যাব */}
      <div
        className="flex gap-1 p-1 rounded-xl bg-background-card dark:bg-dark-card
                   border border-border dark:border-dark-border w-fit"
      >
        <button
          type="button"
          onClick={() => setPeriod('today')}
          className={`rounded-lg px-4 py-1.5 text-xs font-medium transition-colors
            ${period === 'today' ? 'bg-primary text-white' : 'text-text-secondary dark:text-dark-text-secondary'}`}
        >
          আজকের হিসাব
        </button>
        <button
          type="button"
          onClick={() => setPeriod('month')}
          className={`rounded-lg px-4 py-1.5 text-xs font-medium transition-colors
            ${period === 'month' ? 'bg-primary text-white' : 'text-text-secondary dark:text-dark-text-secondary'}`}
        >
          চলতি মাসের হিসাব
        </button>
      </div>

      {/* সামারি */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-background-card dark:bg-dark-card rounded-2xl border border-border dark:border-dark-border p-4">
          <TrendingUp size={16} className="text-primary mb-2" />
          <p className="text-xs text-text-muted dark:text-dark-text-secondary mb-1">বিক্রয়</p>
          <p className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">৳{totalSales}</p>
        </div>
        <div className="bg-background-card dark:bg-dark-card rounded-2xl border border-border dark:border-dark-border p-4">
          <Wallet size={16} className="text-danger mb-2" />
          <p className="text-xs text-text-muted dark:text-dark-text-secondary mb-1">বাকি</p>
          <p className="text-sm font-semibold text-danger">৳{totalDue}</p>
        </div>
        <div className="bg-background-card dark:bg-dark-card rounded-2xl border border-border dark:border-dark-border p-4">
          <Wallet size={16} className="text-success mb-2" />
          <p className="text-xs text-text-muted dark:text-dark-text-secondary mb-1">নগদ</p>
          <p className="text-sm font-semibold text-success">৳{totalCash}</p>
        </div>
      </div>

      {/* এই সময়ের ইনভয়েস তালিকা */}
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary dark:text-dark-text-primary mb-2">
          <Receipt size={16} className="text-primary" />
          {period === 'today' ? 'আজকের' : 'চলতি মাসের'} ইনভয়েস ({filtered.length})
        </h3>
        {filtered.length === 0 ? (
          <p className="text-sm text-text-muted dark:text-dark-text-secondary">কোনো ইনভয়েস নেই</p>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((inv) => (
              <button
                key={inv.id}
                type="button"
                onClick={() => onSelectInvoice(inv)}
                className="flex items-center justify-between bg-background-card dark:bg-dark-card
                           rounded-xl border border-border dark:border-dark-border p-3 text-left
                           hover:border-primary transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-text-primary dark:text-dark-text-primary">
                    {inv.invoice_no}
                  </p>
                  <p className="text-xs text-text-muted dark:text-dark-text-secondary">
                    {inv.party?.name}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text-primary dark:text-dark-text-primary">
                    ৳{inv.subtotal}
                  </span>
                  <ChevronRight size={16} className="text-text-muted" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
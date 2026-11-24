'use client';

import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '@/lib/firebase';
import { TrendingUp, Wallet, Receipt } from 'lucide-react';

export default function SRFinancialSummary({ srId }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const invoicesRef = ref(database, 'invoices');
    const unsubscribe = onValue(invoicesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.values(data).filter((inv) => inv.sr_id === srId);
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

  const totalSales = invoices.reduce((sum, inv) => sum + (inv.subtotal || 0), 0);
  const totalDue = invoices
    .filter((inv) => inv.status !== 'paid')
    .reduce((sum, inv) => sum + (inv.subtotal || 0), 0);
  const totalCash = invoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + (inv.subtotal || 0), 0);

  const stats = [
    { label: 'মোট বিক্রয়', value: `৳${totalSales}`, icon: TrendingUp, color: 'text-primary' },
    { label: 'মোট বাকি', value: `৳${totalDue}`, icon: Wallet, color: 'text-danger' },
    { label: 'মোট নগদ', value: `৳${totalCash}`, icon: Wallet, color: 'text-success' },
    { label: 'মোট ইনভয়েস', value: invoices.length, icon: Receipt, color: 'text-text-primary dark:text-dark-text-primary' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map(({ label, value, icon: Icon, color }) => (
        <div
          key={label}
          className="bg-background-card dark:bg-dark-card rounded-2xl shadow-sm
                     border border-border dark:border-dark-border p-4"
        >
          <Icon size={16} className={`${color} mb-2`} />
          <p className="text-xs text-text-muted dark:text-dark-text-secondary mb-1">{label}</p>
          <p className={`text-sm font-semibold ${color}`}>{value}</p>
        </div>
      ))}
    </div>
  );
}
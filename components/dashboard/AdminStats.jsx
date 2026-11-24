'use client';

import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '@/lib/firebase';
import { TrendingUp, Wallet, Users, Package2 } from 'lucide-react';

function isToday(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
}

export default function AdminStats() {
  const [invoices, setInvoices] = useState([]);
  const [parties, setParties] = useState([]);
  const [companies, setCompanies] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubs = [
      onValue(ref(database, 'invoices'), (s) => setInvoices(s.val() ? Object.values(s.val()) : [])),
      onValue(ref(database, 'parties'), (s) => {
        setParties(s.val() ? Object.values(s.val()) : []);
        setLoading(false);
      }),
      onValue(ref(database, 'companies'), (s) => setCompanies(s.val() || {})),
    ];
    return () => unsubs.forEach((unsub) => unsub());
  }, []);

  if (loading) {
    return <p className="text-sm text-text-muted dark:text-dark-text-secondary">লোড হচ্ছে...</p>;
  }

  const todayInvoices = invoices.filter((inv) => isToday(inv.date));
  // MRP-ভিত্তিক গ্রস দামের বদলে কমিশন বাদ দেওয়ার পর প্রকৃত বিক্রয়মূল্য (নেট) দিয়ে হিসাব
  const todaySales = todayInvoices.reduce(
    (sum, inv) => sum + ((inv.subtotal || 0) - (inv.commission?.total || 0)),
    0
  );

  const todayCollection = parties.reduce((sum, party) => {
    const payments = Object.values(party.payments || {});
    const todayPayments = payments.filter((p) => isToday(p.date));
    return sum + todayPayments.reduce((s, p) => s + (p.amount || 0), 0);
  }, 0);

  const totalPartyDue = parties.reduce((sum, p) => sum + (p.balance || 0), 0);

  let stockValue = 0;
  Object.values(companies).forEach((company) => {
    Object.values(company.products || {}).forEach((product) => {
      stockValue += (Number(product.cost_price) || 0) * (Number(product.stock_qty) || 0);
    });
  });

  const stats = [
    { label: 'আজকের বিক্রয়', value: `৳${todaySales}`, icon: TrendingUp, color: 'text-primary' },
    { label: 'আজকের কালেকশন', value: `৳${todayCollection}`, icon: Wallet, color: 'text-success' },
    { label: 'পার্টির বাকি', value: `৳${totalPartyDue}`, icon: Users, color: 'text-danger' },
    { label: 'স্টক ভ্যালু', value: `৳${stockValue}`, icon: Package2, color: 'text-text-primary dark:text-dark-text-primary' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
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

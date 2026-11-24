'use client';

import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { database, auth } from '@/lib/firebase';
import { TrendingUp, Wallet, Receipt, Users } from 'lucide-react';

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

export default function SRStats() {
  const [invoices, setInvoices] = useState([]);
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);

  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (!uid) return;

    const unsub1 = onValue(ref(database, 'invoices'), (s) => {
      setInvoices(s.val() ? Object.values(s.val()) : []);
      setLoading(false);
    });
    const unsub2 = onValue(ref(database, 'parties'), (s) => {
      setParties(s.val() ? Object.values(s.val()) : []);
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, [uid]);

  if (loading) {
    return <p className="text-sm text-text-muted dark:text-dark-text-secondary">লোড হচ্ছে...</p>;
  }

  const myInvoices = invoices.filter((inv) => inv.sr_id === uid);
  const todayInvoices = myInvoices.filter((inv) => isToday(inv.date));
  const monthInvoices = myInvoices.filter((inv) => isThisMonth(inv.date));

  // MRP-ভিত্তিক গ্রস দামের বদলে কমিশন বাদ দেওয়ার পর প্রকৃত বিক্রয়মূল্য (নেট) দিয়ে হিসাব
  const netAmount = (inv) => (inv.subtotal || 0) - (inv.commission?.total || 0);
  const todaySales = todayInvoices.reduce((sum, inv) => sum + netAmount(inv), 0);
  const monthSales = monthInvoices.reduce((sum, inv) => sum + netAmount(inv), 0);

  // এই SR-এর নিজের তৈরি করা পার্টি ছাড়া অন্য কারো হিসাব (অ্যাডমিনসহ) এখানে আসবে না
  const myParties = parties.filter((p) => p.owner_id === uid);

  const todayCollection = myParties.reduce((sum, party) => {
    const payments = Object.values(party.payments || {});
    const todayPayments = payments.filter((p) => isToday(p.date));
    return sum + todayPayments.reduce((s, p) => s + (p.amount || 0), 0);
  }, 0);

  const totalPartyDue = myParties.reduce((sum, p) => sum + (p.balance || 0), 0);

  const stats = [
    { label: 'আজকের বিক্রয়', value: `৳${todaySales}`, icon: TrendingUp },
    { label: 'আজকের কালেকশন', value: `৳${todayCollection}`, icon: Wallet },
    { label: 'এই মাসের বিক্রয়', value: `৳${monthSales}`, icon: Receipt },
    { label: 'পার্টি বাকি', value: `৳${totalPartyDue}`, icon: Users },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map(({ label, value, icon: Icon }) => (
        <div
          key={label}
          className="bg-background-card dark:bg-dark-card rounded-2xl shadow-sm
                     border border-border dark:border-dark-border p-4"
        >
          <Icon size={16} className="text-primary mb-2" />
          <p className="text-xs text-text-muted dark:text-dark-text-secondary mb-1">{label}</p>
          <p className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}

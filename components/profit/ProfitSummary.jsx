'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ref, onValue } from 'firebase/database';
import { database } from '@/lib/firebase';
import { calculateTotalProfit, isToday, isThisMonth } from '@/lib/profitUtils';
import { calculateTotalRetailProfit } from '@/lib/retailUtils';
import {
  TrendingUp,
  Receipt,
  Users,
  UserRound,
  CalendarRange,
  ChevronRight,
  ShoppingBag,
} from 'lucide-react';

const OPTIONS = [
  {
    href: '/admin/profit/invoices',
    label: 'INV প্রফিট',
    description: 'কোন ইনভয়েস থেকে কত লাভ হলো — প্রোডাক্ট ভিত্তিক বিস্তারিত',
    icon: Receipt,
  },
  {
    href: '/admin/profit/retail',
    label: 'খুচরা প্রফিট',
    description: 'কোন খুচরা বিক্রয় থেকে কত লাভ হলো — বিস্তারিত',
    icon: ShoppingBag,
  },
  {
    href: '/admin/profit/parties',
    label: 'পার্টি প্রফিট',
    description: 'কোন পার্টি থেকে কত লাভ হলো, তারিখ/মাস বাছাই করে',
    icon: Users,
  },
  {
    href: '/admin/profit/sr',
    label: 'SR প্রফিট',
    description: 'কোন SR থেকে কত লাভ হলো, মাস ভিত্তিক',
    icon: UserRound,
  },
  {
    href: '/admin/profit/statement',
    label: 'স্টেটমেন্ট',
    description: 'একাধিক মাস/বছর মিলিয়ে সম্পূর্ণ প্রফিট',
    icon: CalendarRange,
  },
];

export default function ProfitSummary() {
  const [invoices, setInvoices] = useState([]);
  const [retailSales, setRetailSales] = useState([]);
  const [companies, setCompanies] = useState({});
  const [retailProducts, setRetailProducts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub1 = onValue(ref(database, 'invoices'), (s) => {
      setInvoices(s.val() ? Object.values(s.val()) : []);
      setLoading(false);
    });
    const unsub2 = onValue(ref(database, 'companies'), (s) => setCompanies(s.val() || {}));
    const unsub3 = onValue(ref(database, 'retail_sales'), (s) => {
      setRetailSales(s.val() ? Object.values(s.val()) : []);
    });
    const unsub4 = onValue(ref(database, 'retail_products'), (s) => setRetailProducts(s.val() || {}));
    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
    };
  }, []);

  if (loading) {
    return <p className="text-sm text-text-muted dark:text-dark-text-secondary">লোড হচ্ছে...</p>;
  }

  const todayInvoices = invoices.filter((inv) => isToday(inv.date));
  const monthInvoices = invoices.filter((inv) => isThisMonth(inv.date));
  const todayRetailSales = retailSales.filter((s) => isToday(s.date));
  const monthRetailSales = retailSales.filter((s) => isThisMonth(s.date));

  const todayProfit =
    calculateTotalProfit(todayInvoices, companies) +
    calculateTotalRetailProfit(todayRetailSales, companies, retailProducts);
  const monthProfit =
    calculateTotalProfit(monthInvoices, companies) +
    calculateTotalRetailProfit(monthRetailSales, companies, retailProducts);

  return (
    <div className="flex flex-col gap-6 max-w-md">
      {/* সারসংক্ষেপ কার্ড */}
      <div className="grid grid-cols-2 gap-3">
        <div
          className="bg-background-card dark:bg-dark-card rounded-2xl shadow-sm
                     border border-border dark:border-dark-border p-4"
        >
          <TrendingUp size={16} className="text-success mb-2" />
          <p className="text-xs text-text-muted dark:text-dark-text-secondary mb-1">আজকের প্রফিট</p>
          <p className="text-sm font-semibold text-success">৳{Math.round(todayProfit)}</p>
        </div>
        <div
          className="bg-background-card dark:bg-dark-card rounded-2xl shadow-sm
                     border border-border dark:border-dark-border p-4"
        >
          <TrendingUp size={16} className="text-success mb-2" />
          <p className="text-xs text-text-muted dark:text-dark-text-secondary mb-1">
            এই মাসের প্রফিট
          </p>
          <p className="text-sm font-semibold text-success">৳{Math.round(monthProfit)}</p>
        </div>
      </div>

      {/* ৪টা অপশন */}
      <div className="flex flex-col gap-3">
        {OPTIONS.map(({ href, label, description, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-4 bg-background-card dark:bg-dark-card
                       rounded-2xl border border-border dark:border-dark-border p-4
                       hover:border-primary transition-colors"
          >
            <div className="p-3 rounded-full bg-primary/10 shrink-0">
              <Icon size={20} className="text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">
                {label}
              </p>
              <p className="text-xs text-text-secondary dark:text-dark-text-secondary">
                {description}
              </p>
            </div>
            <ChevronRight size={18} className="text-text-muted shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}
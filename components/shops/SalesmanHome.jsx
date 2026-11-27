'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { money, todayStr } from '@/lib/format';
import { Camera, PenLine, Receipt, BookOpen, TrendingUp, Wallet } from 'lucide-react';
import { useSalesmanProfile } from './useSalesmanProfile';
import { useOwnSales } from './useShopData';
import SaleCard from './SaleCard';
import { cardCls, mutedCls } from './ui';

export default function SalesmanHome() {
  const { loading, uid, profile, shopId, shop } = useSalesmanProfile();
  const { sales } = useOwnSales(shopId, uid);

  const stats = useMemo(() => {
    const today = todayStr();
    const mine = sales.filter((s) => s.date === today);
    return {
      total: mine.reduce((s, x) => s + (Number(x.total) || 0), 0),
      cash: mine.reduce((s, x) => s + (Number(x.paid) || 0), 0),
      due: mine.reduce((s, x) => s + (Number(x.due) || 0), 0),
      count: mine.length,
      recent: mine.slice(0, 5),
    };
  }, [sales]);

  if (loading) return <p className={`text-sm ${mutedCls}`}>লোড হচ্ছে...</p>;

  if (!shopId) {
    return (
      <p className="text-sm text-danger bg-danger/10 rounded-xl px-4 py-3">
        আপনার একাউন্টে কোনো দোকান ঠিক করা নেই। অ্যাডমিনের সাথে যোগাযোগ করুন।
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary">
          {shop?.name || 'দোকান'}
        </h1>
        <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
          স্বাগতম, {profile?.name}
        </p>
      </div>

      {/* মূল দুটো বাটন */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href="/shop/sale?scan=1"
          className="flex items-center justify-center gap-3 rounded-2xl py-5 text-base font-semibold text-white
                     bg-gradient-to-r from-primary to-primary-light shadow-sm"
        >
          <Camera size={24} />
          স্ক্যান করে বিক্রি
        </Link>
        <Link
          href="/shop/sale"
          className={`${cardCls} flex items-center justify-center gap-3 !py-5 text-base font-semibold text-text-primary dark:text-dark-text-primary hover:border-primary transition-colors`}
        >
          <PenLine size={22} className="text-primary" />
          ম্যানুয়াল বিক্রি
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className={`${cardCls} !p-3`}>
          <TrendingUp size={16} className="text-primary mb-1" />
          <p className={`text-[11px] ${mutedCls}`}>আজকের বিক্রয়</p>
          <p className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">৳{money(stats.total)}</p>
          <p className={`text-[11px] ${mutedCls}`}>{stats.count}টি</p>
        </div>
        <div className={`${cardCls} !p-3`}>
          <Wallet size={16} className="text-primary mb-1" />
          <p className={`text-[11px] ${mutedCls}`}>নগদ পেয়েছি</p>
          <p className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">৳{money(stats.cash)}</p>
        </div>
        <div className={`${cardCls} !p-3`}>
          <BookOpen size={16} className="text-danger mb-1" />
          <p className={`text-[11px] ${mutedCls}`}>আজকের বাকি</p>
          <p className="text-sm font-semibold text-danger">৳{money(stats.due)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/shop/sales" className={`${cardCls} flex items-center gap-2 !p-3 text-sm font-medium text-text-primary dark:text-dark-text-primary hover:border-primary transition-colors`}>
          <Receipt size={18} className="text-primary" />
          আমার বিক্রয়
        </Link>
        <Link href="/shop/khata" className={`${cardCls} flex items-center gap-2 !p-3 text-sm font-medium text-text-primary dark:text-dark-text-primary hover:border-primary transition-colors`}>
          <BookOpen size={18} className="text-primary" />
          পার্টি খাতা
        </Link>
      </div>

      {stats.recent.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-text-primary dark:text-dark-text-primary mb-2">
            আজকের সাম্প্রতিক বিক্রয়
          </h2>
          <div className="flex flex-col gap-2">
            {stats.recent.map((s) => (
              <SaleCard key={s.id} sale={s} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

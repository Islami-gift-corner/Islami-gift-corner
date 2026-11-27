'use client';

import { useMemo, useState } from 'react';
import { money, todayStr } from '@/lib/format';
import { useSalesmanProfile } from './useSalesmanProfile';
import { useOwnSales } from './useShopData';
import SaleCard from './SaleCard';
import { cardCls, mutedCls, btnGhost } from './ui';

const RANGES = [
  { id: 'today', label: 'আজ' },
  { id: 'month', label: 'এই মাস' },
  { id: 'all', label: 'সব' },
];

export default function MySales() {
  const { uid, shopId } = useSalesmanProfile();
  const { sales, loading } = useOwnSales(shopId, uid);
  const [range, setRange] = useState('today');
  const [limit, setLimit] = useState(50);

  const filtered = useMemo(() => {
    const today = todayStr();
    if (range === 'today') return sales.filter((s) => s.date === today);
    if (range === 'month') return sales.filter((s) => (s.date || '').startsWith(today.slice(0, 7)));
    return sales;
  }, [sales, range]);

  const sum = (f) => filtered.reduce((s, x) => s + (Number(x[f]) || 0), 0);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary">আমার বিক্রয়</h1>

      <div className="flex gap-2">
        {RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setRange(r.id)}
            className={`rounded-xl px-4 py-2 text-xs font-medium ${
              range === r.id
                ? 'bg-gradient-to-r from-primary to-primary-light text-white'
                : 'bg-background-card dark:bg-dark-card border border-border dark:border-dark-border text-text-secondary dark:text-dark-text-secondary'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className={`${cardCls} grid grid-cols-3 gap-2 text-center`}>
        <div>
          <p className={`text-[11px] ${mutedCls}`}>মোট বিক্রয়</p>
          <p className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">৳{money(sum('total'))}</p>
        </div>
        <div>
          <p className={`text-[11px] ${mutedCls}`}>নগদ</p>
          <p className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">৳{money(sum('paid'))}</p>
        </div>
        <div>
          <p className={`text-[11px] ${mutedCls}`}>বাকি</p>
          <p className="text-sm font-semibold text-danger">৳{money(sum('due'))}</p>
        </div>
      </div>

      {loading ? (
        <p className={`text-sm ${mutedCls}`}>লোড হচ্ছে...</p>
      ) : filtered.length === 0 ? (
        <p className={`text-sm ${mutedCls}`}>কোনো বিক্রয় নেই</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.slice(0, limit).map((s) => (
            <SaleCard key={s.id} sale={s} />
          ))}
          {filtered.length > limit && (
            <button type="button" onClick={() => setLimit((l) => l + 50)} className={`${btnGhost} w-fit`}>
              আরও দেখুন
            </button>
          )}
        </div>
      )}
    </div>
  );
}

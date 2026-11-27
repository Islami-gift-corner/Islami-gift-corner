'use client';

import { useMemo } from 'react';
import { money, todayStr } from '@/lib/format';
import { partyBalance, objToList } from '@/lib/shopUtils';
import { TrendingUp, Banknote, CalendarDays, Wallet } from 'lucide-react';
import { useShopSales, useShopSalesmen, useShopKhata } from './useShopData';
import SaleCard from './SaleCard';
import { cardCls, mutedCls } from './ui';

function Stat({ icon: Icon, label, value, sub }) {
  return (
    <div className={`${cardCls} flex items-center gap-3`}>
      <div className="p-2.5 rounded-full bg-primary/10">
        <Icon size={18} className="text-primary" />
      </div>
      <div className="min-w-0">
        <p className={`text-xs ${mutedCls}`}>{label}</p>
        <p className="text-base font-semibold text-text-primary dark:text-dark-text-primary">{value}</p>
        {sub && <p className={`text-[11px] ${mutedCls}`}>{sub}</p>}
      </div>
    </div>
  );
}

export default function ShopOverview({ shopId }) {
  const { sales, loading } = useShopSales(shopId);
  const { salesmen } = useShopSalesmen(shopId);
  const { khata } = useShopKhata(shopId);

  const data = useMemo(() => {
    const today = todayStr();
    const month = today.slice(0, 7);
    const sum = (list, f) => list.reduce((s, x) => s + (Number(f(x)) || 0), 0);

    const todaySales = sales.filter((s) => s.date === today);
    const monthSales = sales.filter((s) => (s.date || '').startsWith(month));

    // আজকের নগদ = আজকের বিক্রয়ের নগদ + আজ খাতায় জমা নেওয়া টাকা
    let collectedToday = 0;
    let outstanding = 0;
    const dueBySalesman = {};
    Object.entries(khata).forEach(([uid, k]) => {
      const entries = objToList(k?.entries);
      entries.forEach((e) => {
        if (e.type === 'payment' && e.date === today) collectedToday += Number(e.amount) || 0;
      });
      const bal = partyBalance(entries);
      dueBySalesman[uid] = bal;
      outstanding += bal;
    });

    const perSalesman = salesmen.map((m) => {
      const mineToday = todaySales.filter((s) => s.salesman_id === m.id);
      const mineMonth = monthSales.filter((s) => s.salesman_id === m.id);
      return {
        id: m.id,
        name: m.name,
        status: m.status,
        todayTotal: sum(mineToday, (s) => s.total),
        todayCount: mineToday.length,
        monthTotal: sum(mineMonth, (s) => s.total),
        due: dueBySalesman[m.id] || 0,
      };
    });

    return {
      todayTotal: sum(todaySales, (s) => s.total),
      todayCount: todaySales.length,
      monthTotal: sum(monthSales, (s) => s.total),
      cashToday: sum(todaySales, (s) => s.paid) + collectedToday,
      outstanding,
      perSalesman,
    };
  }, [sales, salesmen, khata]);

  if (loading) return <p className={`text-sm ${mutedCls}`}>লোড হচ্ছে...</p>;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-xs text-primary">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
        </span>
        লাইভ — নতুন বিক্রি হলেই এখানে আপডেট হবে
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={TrendingUp} label="আজকের বিক্রয়" value={`৳${money(data.todayTotal)}`} sub={`${data.todayCount}টি বিক্রি`} />
        <Stat icon={Banknote} label="আজকের নগদ প্রাপ্তি" value={`৳${money(data.cashToday)}`} sub="বিক্রি + খাতার জমা" />
        <Stat icon={CalendarDays} label="এই মাসের বিক্রয়" value={`৳${money(data.monthTotal)}`} />
        <Stat icon={Wallet} label="মোট বাকি (পাওনা)" value={`৳${money(data.outstanding)}`} />
      </div>

      <div>
        <h2 className="text-sm font-semibold text-text-primary dark:text-dark-text-primary mb-2">
          সেলসম্যান অনুযায়ী
        </h2>
        {data.perSalesman.length === 0 ? (
          <p className={`text-sm ${mutedCls}`}>এই দোকানে এখনো কোনো সেলসম্যান নেই</p>
        ) : (
          <div className={`${cardCls} !p-0 overflow-x-auto`}>
            <table className="w-full text-xs">
              <thead>
                <tr className={`text-left ${mutedCls} border-b border-border dark:border-dark-border`}>
                  <th className="px-3 py-2 font-medium">নাম</th>
                  <th className="px-3 py-2 font-medium text-right">আজ</th>
                  <th className="px-3 py-2 font-medium text-right">মাস</th>
                  <th className="px-3 py-2 font-medium text-right">বাকি</th>
                </tr>
              </thead>
              <tbody>
                {data.perSalesman.map((m) => (
                  <tr key={m.id} className="border-b last:border-0 border-border dark:border-dark-border">
                    <td className="px-3 py-2 text-text-primary dark:text-dark-text-primary">
                      {m.name}
                      {m.status === 'inactive' && <span className="ml-1 text-danger">(বন্ধ)</span>}
                    </td>
                    <td className="px-3 py-2 text-right text-text-primary dark:text-dark-text-primary">
                      ৳{money(m.todayTotal)} <span className={mutedCls}>({m.todayCount})</span>
                    </td>
                    <td className="px-3 py-2 text-right text-text-primary dark:text-dark-text-primary">
                      ৳{money(m.monthTotal)}
                    </td>
                    <td className="px-3 py-2 text-right text-danger">৳{money(m.due)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-text-primary dark:text-dark-text-primary mb-2">
          সাম্প্রতিক বিক্রয়
        </h2>
        {sales.length === 0 ? (
          <p className={`text-sm ${mutedCls}`}>এখনো কোনো বিক্রয় হয়নি</p>
        ) : (
          <div className="flex flex-col gap-2">
            {sales.slice(0, 15).map((s) => (
              <SaleCard key={`${s.salesman_id}-${s.id}`} sale={s} showSalesman />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

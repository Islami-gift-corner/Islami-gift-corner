'use client';

import { useMemo, useState } from 'react';
import { money, fmtDate } from '@/lib/format';
import { objToList, partyBalance } from '@/lib/shopUtils';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useShopKhata, useShopSalesmen } from './useShopData';
import { cardCls, mutedCls } from './ui';

const TYPE_LABEL = { sale_due: 'বাকি বিক্রয়', opening: 'আগের বাকি', payment: 'জমা' };

// অ্যাডমিনের জন্য: সব সেলসম্যানের পার্টি খাতা (শুধু দেখা যাবে)
export default function ShopKhataAdmin({ shopId }) {
  const { khata, loading } = useShopKhata(shopId);
  const { salesmen } = useShopSalesmen(shopId);
  const [openParty, setOpenParty] = useState(null);

  const groups = useMemo(
    () =>
      Object.entries(khata).map(([uid, k]) => {
        const entries = objToList(k?.entries);
        const parties = objToList(k?.parties).map((p) => {
          const pe = entries
            .filter((e) => e.party_id === p.id)
            .sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
          return { ...p, entries: pe, balance: partyBalance(pe) };
        });
        return {
          uid,
          name: salesmen.find((m) => m.id === uid)?.name || 'সেলসম্যান',
          parties: parties.sort((a, b) => b.balance - a.balance),
          total: parties.reduce((s, p) => s + p.balance, 0),
        };
      }),
    [khata, salesmen]
  );

  if (loading) return <p className={`text-sm ${mutedCls}`}>লোড হচ্ছে...</p>;
  if (groups.length === 0) return <p className={`text-sm ${mutedCls}`}>এখনো কোনো পার্টি খাতা তৈরি হয়নি</p>;

  const grand = groups.reduce((s, g) => s + g.total, 0);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-primary dark:text-dark-text-primary">
        মোট বাকি (পাওনা): <span className="font-semibold text-danger">৳{money(grand)}</span>
      </p>

      {groups.map((g) => (
        <div key={g.uid} className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">
            {g.name} <span className={`font-normal ${mutedCls}`}>— বাকি ৳{money(g.total)}</span>
          </h3>
          {g.parties.length === 0 ? (
            <p className={`text-xs ${mutedCls}`}>কোনো পার্টি নেই</p>
          ) : (
            g.parties.map((p) => {
              const key = `${g.uid}-${p.id}`;
              const open = openParty === key;
              return (
                <div key={key} className={`${cardCls} !p-3`}>
                  <button type="button" onClick={() => setOpenParty(open ? null : key)} className="w-full flex items-center gap-2 text-left">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary dark:text-dark-text-primary truncate">{p.name}</p>
                      {p.phone && <p className={`text-xs ${mutedCls}`}>{p.phone}</p>}
                    </div>
                    <span className={`text-sm font-semibold ${p.balance > 0 ? 'text-danger' : 'text-success'}`}>
                      ৳{money(p.balance)}
                    </span>
                    {open ? <ChevronUp size={16} className={mutedCls} /> : <ChevronDown size={16} className={mutedCls} />}
                  </button>
                  {open && (
                    <div className="mt-3 pt-3 border-t border-border dark:border-dark-border flex flex-col gap-1.5">
                      {p.entries.length === 0 ? (
                        <p className={`text-xs ${mutedCls}`}>কোনো লেনদেন নেই</p>
                      ) : (
                        p.entries.map((e) => (
                          <div key={e.id} className="flex items-center justify-between text-xs">
                            <span className="text-text-primary dark:text-dark-text-primary">
                              {fmtDate(e.date)} • {TYPE_LABEL[e.type] || e.type}
                              {e.note ? ` (${e.note})` : ''}
                            </span>
                            <span className={e.type === 'payment' ? 'text-success' : 'text-danger'}>
                              {e.type === 'payment' ? '−' : '+'}৳{money(e.amount)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ))}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { money, fmtDate } from '@/lib/format';
import { timeOf } from '@/lib/shopUtils';
import { ChevronDown, ChevronUp, Trash2, User, UserRound } from 'lucide-react';
import { cardCls, mutedCls } from './ui';

// একটা বিক্রয়ের কার্ড — চাপলে পণ্যের তালিকা খোলে। অ্যাডমিন চাইলে বাতিল (onDelete) করতে পারে।
export default function SaleCard({ sale, showSalesman = false, onDelete }) {
  const [open, setOpen] = useState(false);
  const due = Number(sale.due) || 0;

  return (
    <div className={`${cardCls} !p-3`}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="w-full text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">
              ৳{money(sale.total)}
              {due > 0 && (
                <span className="ml-2 text-[11px] font-medium text-danger bg-danger/10 rounded-full px-2 py-0.5">
                  বাকি ৳{money(due)}
                </span>
              )}
            </p>
            <p className={`text-xs mt-0.5 ${mutedCls} flex flex-wrap items-center gap-x-3 gap-y-0.5`}>
              <span>
                {fmtDate(sale.date)} • {timeOf(sale.created_at)}
              </span>
              {showSalesman && (
                <span className="flex items-center gap-1">
                  <UserRound size={11} />
                  {sale.salesman_name || 'সেলসম্যান'}
                </span>
              )}
              <span className="flex items-center gap-1">
                <User size={11} />
                {sale.party_name || 'নগদ ক্রেতা'}
              </span>
              <span>{(sale.items || []).length}টি পণ্য</span>
            </p>
          </div>
          {open ? <ChevronUp size={16} className={mutedCls} /> : <ChevronDown size={16} className={mutedCls} />}
        </div>
      </button>

      {open && (
        <div className="mt-3 pt-3 border-t border-border dark:border-dark-border flex flex-col gap-1.5">
          {(sale.items || []).map((it, i) => (
            <div key={i} className="flex items-center justify-between gap-2 text-xs">
              <span className="text-text-primary dark:text-dark-text-primary min-w-0 truncate">
                {it.name}
                {it.manual && <span className={`ml-1 ${mutedCls}`}>(ম্যানুয়াল)</span>}
              </span>
              <span className={`shrink-0 ${mutedCls}`}>
                {it.qty} × ৳{money(it.price)} = ৳{money(it.line_total ?? it.qty * it.price)}
              </span>
            </div>
          ))}
          {Number(sale.discount) > 0 && (
            <p className="text-xs text-text-secondary dark:text-dark-text-secondary">
              ছাড়: ৳{money(sale.discount)}
            </p>
          )}
          <p className="text-xs text-text-secondary dark:text-dark-text-secondary">
            নগদ পাওয়া: ৳{money(sale.paid)}
          </p>
          {sale.note && <p className={`text-xs ${mutedCls}`}>নোট: {sale.note}</p>}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(sale)}
              className="mt-1 w-fit flex items-center gap-1.5 text-xs text-danger"
            >
              <Trash2 size={13} />
              এই বিক্রয় বাতিল করুন
            </button>
          )}
        </div>
      )}
    </div>
  );
}

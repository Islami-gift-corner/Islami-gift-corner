'use client';

import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '@/lib/firebase';
import { calculateInvoiceProfit } from '@/lib/profitUtils';
import { ChevronDown, ChevronUp, Receipt } from 'lucide-react';

export default function InvoiceProfitList() {
  const [invoices, setInvoices] = useState([]);
  const [companies, setCompanies] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const unsub1 = onValue(ref(database, 'invoices'), (s) => {
      const data = s.val();
      const list = data
        ? Object.entries(data)
            .map(([id, v]) => ({ id, ...v }))
            .sort((a, b) => new Date(b.date) - new Date(a.date))
        : [];
      setInvoices(list);
      setLoading(false);
    });
    const unsub2 = onValue(ref(database, 'companies'), (s) => setCompanies(s.val() || {}));
    return () => {
      unsub1();
      unsub2();
    };
  }, []);

  if (loading) {
    return <p className="text-sm text-text-muted dark:text-dark-text-secondary">লোড হচ্ছে...</p>;
  }

  if (invoices.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 py-12 rounded-2xl
                   border border-dashed border-border dark:border-dark-border"
      >
        <Receipt size={28} className="text-text-muted" />
        <p className="text-sm text-text-muted dark:text-dark-text-secondary">
          এখনো কোনো ইনভয়েস তৈরি হয়নি
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 max-w-2xl">
      {invoices.map((invoice) => {
        const { items, totalProfit } = calculateInvoiceProfit(invoice, companies);
        const isOpen = expandedId === invoice.id;

        return (
          <div
            key={invoice.id}
            className="bg-background-card dark:bg-dark-card rounded-2xl shadow-sm
                       border border-border dark:border-dark-border overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setExpandedId(isOpen ? null : invoice.id)}
              className="w-full flex items-center justify-between gap-3 p-4 text-left"
            >
              <div>
                <p className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">
                  {invoice.invoice_no}
                </p>
                <p className="text-xs text-text-secondary dark:text-dark-text-secondary">
                  {invoice.party?.name || 'খুচরা বিক্রয়'} —{' '}
                  {new Date(invoice.date).toLocaleDateString('bn-BD')}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-semibold text-success">৳{Math.round(totalProfit)}</span>
                {isOpen ? (
                  <ChevronUp size={16} className="text-text-muted" />
                ) : (
                  <ChevronDown size={16} className="text-text-muted" />
                )}
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-border dark:border-dark-border overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-background-sidebar dark:bg-dark-sidebar text-text-secondary dark:text-dark-text-secondary uppercase">
                      <th className="text-left px-3 py-2 font-medium">পণ্য</th>
                      <th className="text-right px-3 py-2 font-medium">পরিমাণ</th>
                      <th className="text-right px-3 py-2 font-medium">বিক্রয় মূল্য</th>
                      <th className="text-right px-3 py-2 font-medium">ক্রয় মূল্য</th>
                      <th className="text-right px-3 py-2 font-medium">লাভ/একক</th>
                      <th className="text-right px-3 py-2 font-medium">মোট লাভ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr
                        key={idx}
                        className="border-t border-border dark:border-dark-border text-text-primary dark:text-dark-text-primary"
                      >
                        <td className="px-3 py-2">{item.product_name}</td>
                        <td className="px-3 py-2 text-right">{item.qty}</td>
                        <td className="px-3 py-2 text-right">৳{item.price}</td>
                        <td className="px-3 py-2 text-right">৳{item.cost_price}</td>
                        <td className="px-3 py-2 text-right">৳{Math.round(item.profit_per_unit)}</td>
                        <td className="px-3 py-2 text-right font-medium text-success">
                          ৳{Math.round(item.item_profit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border dark:border-dark-border font-semibold text-text-primary dark:text-dark-text-primary">
                      <td className="px-3 py-2" colSpan={5}>
                        মোট প্রফিট
                      </td>
                      <td className="px-3 py-2 text-right text-success">
                        ৳{Math.round(totalProfit)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
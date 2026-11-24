'use client';

import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '@/lib/firebase';
import { Receipt, ChevronRight, Users, ShoppingBag } from 'lucide-react';

export default function InvoiceList({ onSelect, filterSrId }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('party'); // 'party' | 'local'

  useEffect(() => {
    const invoicesRef = ref(database, 'invoices');
    const unsubscribe = onValue(invoicesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        let list = Object.entries(data).map(([id, value]) => ({ id, ...value }));
        if (filterSrId) {
          list = list.filter((inv) => inv.sr_id === filterSrId);
        }
        list.sort((a, b) => new Date(b.date) - new Date(a.date));
        setInvoices(list);
      } else {
        setInvoices([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [filterSrId]);

  const partyInvoices = invoices.filter((inv) => !inv.is_walkin);
  const localInvoices = invoices.filter((inv) => inv.is_walkin);
  const visibleInvoices = category === 'party' ? partyInvoices : localInvoices;

  if (loading) {
    return (
      <p className="text-sm text-text-muted dark:text-dark-text-secondary">লোড হচ্ছে...</p>
    );
  }

  return (
    <div className="flex flex-col gap-3 max-w-2xl">
      {/* ক্যাটাগরি সাব-ট্যাব */}
      <div
        className="flex gap-1 p-1 rounded-xl bg-background-card dark:bg-dark-card
                   border border-border dark:border-dark-border w-fit"
      >
        <button
          type="button"
          onClick={() => setCategory('party')}
          className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors
            ${
              category === 'party'
                ? 'bg-primary text-white'
                : 'text-text-secondary dark:text-dark-text-secondary'
            }`}
        >
          <Users size={14} />
          পার্টি ({partyInvoices.length})
        </button>
        <button
          type="button"
          onClick={() => setCategory('local')}
          className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors
            ${
              category === 'local'
                ? 'bg-primary text-white'
                : 'text-text-secondary dark:text-dark-text-secondary'
            }`}
        >
          <ShoppingBag size={14} />
          লোকাল ({localInvoices.length})
        </button>
      </div>

      {visibleInvoices.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center gap-2 py-12 rounded-2xl
                     border border-dashed border-border dark:border-dark-border"
        >
          <Receipt size={28} className="text-text-muted" />
          <p className="text-sm text-text-muted dark:text-dark-text-secondary">
            এই ক্যাটাগরিতে কোনো ইনভয়েস নেই
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {visibleInvoices.map((invoice) => (
            <button
              key={invoice.id}
              type="button"
              onClick={() => onSelect(invoice)}
              className="flex items-center justify-between gap-3 bg-background-card dark:bg-dark-card
                         rounded-xl border border-border dark:border-dark-border p-4 text-left
                         hover:border-primary transition-colors"
            >
              <div>
                <p className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">
                  {invoice.invoice_no}
                </p>
                <p className="text-xs text-text-secondary dark:text-dark-text-secondary">
                  {invoice.party?.name} ·{' '}
                  {new Date(invoice.date).toLocaleDateString('bn-BD')}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-text-primary dark:text-dark-text-primary">
                  ৳{(invoice.subtotal || 0) - (invoice.commission?.total || 0)}
                </span>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full
                    ${
                      invoice.status === 'paid'
                        ? 'bg-success/10 text-success'
                        : 'bg-warning/10 text-warning'
                    }`}
                >
                  {invoice.status === 'paid' ? 'পরিশোধিত' : 'বাকি'}
                </span>
                <ChevronRight size={16} className="text-text-muted" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

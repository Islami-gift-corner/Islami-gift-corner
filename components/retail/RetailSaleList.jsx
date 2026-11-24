'use client';

import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { database, auth } from '@/lib/firebase';
import { deleteRetailSaleWithReversal } from '@/lib/retailUtils';
import { Receipt, ChevronRight, Trash2, X } from 'lucide-react';

export default function RetailSaleList() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const salesRef = ref(database, 'retail_sales');
    const unsubscribe = onValue(salesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([id, value]) => ({ id, ...value }));
        list.sort((a, b) => new Date(b.date) - new Date(a.date));
        setSales(list);
      } else {
        setSales([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleDelete = async () => {
    if (!selectedSale) return;
    setDeleting(true);
    try {
      await deleteRetailSaleWithReversal({ sale: selectedSale, userId: auth.currentUser?.uid });
      setSelectedSale(null);
      setConfirmDelete(false);
    } catch (err) {
      alert('ডিলিট করা যায়নি, আবার চেষ্টা করুন');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-text-muted dark:text-dark-text-secondary">লোড হচ্ছে...</p>;
  }

  if (selectedSale) {
    return (
      <div className="max-w-lg">
        <button
          type="button"
          onClick={() => {
            setSelectedSale(null);
            setConfirmDelete(false);
          }}
          className="text-xs text-primary mb-3"
        >
          ← তালিকায় ফিরে যান
        </button>

        <div
          className="bg-background-card dark:bg-dark-card rounded-2xl shadow-sm
                     border border-border dark:border-dark-border p-5"
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-base font-semibold text-text-primary dark:text-dark-text-primary">
                {selectedSale.sale_no}
              </p>
              <p className="text-xs text-text-secondary dark:text-dark-text-secondary">
                {selectedSale.customer_name} {selectedSale.customer_phone ? `· ${selectedSale.customer_phone}` : ''}
              </p>
              <p className="text-xs text-text-muted dark:text-dark-text-secondary mt-0.5">
                {new Date(selectedSale.date).toLocaleString('bn-BD')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              aria-label="ডিলিট করুন"
              className="p-1.5 rounded-lg text-danger hover:bg-danger/10"
            >
              <Trash2 size={16} />
            </button>
          </div>

          <div className="flex flex-col gap-1.5 mb-3">
            {(selectedSale.items || []).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className="text-text-primary dark:text-dark-text-primary">
                  {item.name}{' '}
                  <span className="text-text-muted text-xs">
                    × {item.qty}
                    {item.unit ? ` ${item.unit}` : ''}
                  </span>
                </span>
                <span className="text-text-secondary dark:text-dark-text-secondary">
                  ৳{item.subtotal}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-border dark:border-dark-border pt-3 flex flex-col gap-1 text-sm">
            <div className="flex items-center justify-between text-text-secondary dark:text-dark-text-secondary">
              <span>সাবটোটাল</span>
              <span>৳{selectedSale.subtotal}</span>
            </div>
            {selectedSale.discount > 0 && (
              <div className="flex items-center justify-between text-text-secondary dark:text-dark-text-secondary">
                <span>ছাড়</span>
                <span>-৳{selectedSale.discount}</span>
              </div>
            )}
            <div className="flex items-center justify-between font-semibold text-text-primary dark:text-dark-text-primary">
              <span>সর্বমোট</span>
              <span>৳{selectedSale.total}</span>
            </div>
            <div className="flex items-center justify-between text-success">
              <span>পাওয়া গেছে</span>
              <span>৳{selectedSale.paid_amount}</span>
            </div>
            {selectedSale.due > 0 && (
              <div className="flex items-center justify-between text-danger font-medium">
                <span>বাকি</span>
                <span>৳{selectedSale.due}</span>
              </div>
            )}
          </div>

          {confirmDelete && (
            <div className="mt-4 p-3 rounded-xl bg-danger/10 flex flex-col gap-2">
              <p className="text-xs text-danger">
                এই বিক্রয় ডিলিট করলে স্টক ফেরত যাবে ও কাস্টমারের হিসাব সমন্বয় হবে। নিশ্চিত?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 rounded-lg py-1.5 text-xs font-medium text-white bg-danger disabled:opacity-60"
                >
                  {deleting ? 'ডিলিট হচ্ছে...' : 'হ্যাঁ, ডিলিট করুন'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 rounded-lg py-1.5 text-xs font-medium border border-border dark:border-dark-border
                             text-text-secondary dark:text-dark-text-secondary"
                >
                  বাতিল
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (sales.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 py-12 rounded-2xl
                   border border-dashed border-border dark:border-dark-border"
      >
        <Receipt size={28} className="text-text-muted" />
        <p className="text-sm text-text-muted dark:text-dark-text-secondary">
          এখনো কোনো খুচরা বিক্রয় নেই
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 max-w-2xl">
      {sales.map((sale) => (
        <button
          key={sale.id}
          type="button"
          onClick={() => setSelectedSale(sale)}
          className="flex items-center justify-between gap-3 bg-background-card dark:bg-dark-card
                     rounded-xl border border-border dark:border-dark-border p-4 text-left
                     hover:border-primary transition-colors"
        >
          <div>
            <p className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">
              {sale.sale_no}
            </p>
            <p className="text-xs text-text-secondary dark:text-dark-text-secondary">
              {sale.customer_name} · {new Date(sale.date).toLocaleDateString('bn-BD')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-text-primary dark:text-dark-text-primary">
              ৳{sale.total}
            </span>
            <span
              className={`text-xs font-medium px-2 py-1 rounded-full
                ${sale.status === 'paid' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}
            >
              {sale.status === 'paid' ? 'পরিশোধিত' : 'বাকি'}
            </span>
            <ChevronRight size={16} className="text-text-muted" />
          </div>
        </button>
      ))}
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { ref, onValue, update, push, set } from 'firebase/database';
import { database, auth } from '@/lib/firebase';
import { logActivity } from '@/lib/activityLog';
import { Wallet, Phone, Receipt, CheckCircle2, AlertCircle } from 'lucide-react';

export default function RetailCustomerLedger({ customer, onBack }) {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [collectAmount, setCollectAmount] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const salesRef = ref(database, 'retail_sales');
    const unsubscribe = onValue(salesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data)
          .map(([id, value]) => ({ id, ...value }))
          .filter((sale) => sale.customer_id === customer.id);
        list.sort((a, b) => new Date(b.date) - new Date(a.date));
        setSales(list);
      } else {
        setSales([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [customer.id]);

  const handleCollect = async () => {
    setError('');
    setSuccess('');

    if (!collectAmount || isNaN(collectAmount) || Number(collectAmount) <= 0) {
      setError('সঠিক পরিমাণ দিন');
      return;
    }

    setSaving(true);
    try {
      const amount = Number(collectAmount);
      const newTotalPaid = (customer.total_paid || 0) + amount;
      const newBalance = (customer.total_purchase || 0) - newTotalPaid;

      await update(ref(database, `retail_customers/${customer.id}`), {
        total_paid: newTotalPaid,
        balance: newBalance,
      });

      const paymentRef = push(ref(database, `retail_customers/${customer.id}/payments`));
      await set(paymentRef, {
        amount,
        method: 'cash',
        note: 'বাকি আদায়',
        date: new Date().toISOString(),
      });

      const ledgerRef = push(ref(database, 'ledger'));
      await set(ledgerRef, {
        type: 'income',
        category: 'খুচরা বাকি আদায়',
        amount,
        note: `${customer.name} থেকে বাকি আদায়`,
        date: new Date().toISOString(),
        auto_generated: true,
      });

      customer.total_paid = newTotalPaid;
      customer.balance = newBalance;

      await logActivity({
        userId: auth.currentUser?.uid,
        action: 'খুচরা কাস্টমারের বাকি আদায়',
        target: `${customer.name} — ৳${amount}`,
      });

      setSuccess(`৳${amount} আদায় হয়েছে`);
      setCollectAmount('');
    } catch (err) {
      setError('আদায় সংরক্ষণ করা যায়নি, আবার চেষ্টা করুন');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg flex flex-col gap-4">
      <button type="button" onClick={onBack} className="text-xs text-primary w-fit">
        ← কাস্টমার তালিকায় ফিরে যান
      </button>

      <div
        className="bg-background-card dark:bg-dark-card rounded-2xl shadow-sm
                   border border-border dark:border-dark-border p-5"
      >
        <h2 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary mb-1">
          {customer.name}
        </h2>
        {customer.phone && (
          <p className="flex items-center gap-1.5 text-sm text-text-secondary dark:text-dark-text-secondary mb-4">
            <Phone size={14} />
            {customer.phone}
          </p>
        )}

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-background dark:bg-dark-background rounded-xl p-3">
            <p className="text-xs text-text-muted dark:text-dark-text-secondary mb-1">মোট কেনা</p>
            <p className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">
              ৳{customer.total_purchase || 0}
            </p>
          </div>
          <div className="bg-background dark:bg-dark-background rounded-xl p-3">
            <p className="text-xs text-text-muted dark:text-dark-text-secondary mb-1">পরিশোধিত</p>
            <p className="text-sm font-semibold text-success">৳{customer.total_paid || 0}</p>
          </div>
          <div className="bg-background dark:bg-dark-background rounded-xl p-3">
            <p className="text-xs text-text-muted dark:text-dark-text-secondary mb-1">বাকি</p>
            <p className="text-sm font-semibold text-danger">৳{customer.balance || 0}</p>
          </div>
        </div>
      </div>

      {(customer.balance || 0) > 0 && (
        <div
          className="bg-background-card dark:bg-dark-card rounded-2xl shadow-sm
                     border border-border dark:border-dark-border p-5"
        >
          <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary dark:text-dark-text-primary mb-3">
            <Wallet size={16} className="text-primary" />
            বাকি আদায় করুন
          </h3>
          <div className="flex gap-2">
            <input
              type="number"
              value={collectAmount}
              onChange={(e) => setCollectAmount(e.target.value)}
              placeholder={`সর্বোচ্চ ৳${customer.balance}`}
              className="flex-1 rounded-xl border border-border dark:border-dark-border
                         bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                         px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-text-muted"
            />
            <button
              type="button"
              onClick={handleCollect}
              disabled={saving}
              className="rounded-xl px-5 py-2.5 text-sm font-medium text-white
                         bg-gradient-to-r from-primary to-primary-light disabled:opacity-60"
            >
              {saving ? '...' : 'আদায়'}
            </button>
          </div>
          {error && (
            <p className="flex items-center gap-2 text-xs text-danger bg-danger/10 rounded-lg px-3 py-2 mt-2">
              <AlertCircle size={14} />
              {error}
            </p>
          )}
          {success && (
            <p className="flex items-center gap-2 text-xs text-success bg-success/10 rounded-lg px-3 py-2 mt-2">
              <CheckCircle2 size={14} />
              {success}
            </p>
          )}
        </div>
      )}

      <div
        className="bg-background-card dark:bg-dark-card rounded-2xl shadow-sm
                   border border-border dark:border-dark-border p-5"
      >
        <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary dark:text-dark-text-primary mb-3">
          <Receipt size={16} className="text-primary" />
          ক্রয়ের ইতিহাস
        </h3>
        {loading ? (
          <p className="text-sm text-text-muted dark:text-dark-text-secondary">লোড হচ্ছে...</p>
        ) : sales.length === 0 ? (
          <p className="text-sm text-text-muted dark:text-dark-text-secondary">
            এখনো কোনো বিক্রয় নেই
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {sales.map((sale) => (
              <div
                key={sale.id}
                className="flex items-center justify-between bg-background dark:bg-dark-background
                           rounded-xl px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-medium text-text-primary dark:text-dark-text-primary">
                    {sale.sale_no}
                  </p>
                  <p className="text-xs text-text-muted dark:text-dark-text-secondary">
                    {new Date(sale.date).toLocaleDateString('bn-BD')}
                  </p>
                </div>
                <span className="text-sm font-medium text-text-primary dark:text-dark-text-primary">
                  ৳{sale.total}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
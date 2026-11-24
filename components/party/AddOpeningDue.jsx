'use client';

import { useState } from 'react';
import { ref, update, push, set } from 'firebase/database';
import { database, auth } from '@/lib/firebase';
import { logActivity } from '@/lib/activityLog';
import { Landmark, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AddOpeningDue({ party, dues = [], onAdded }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('পূর্বের ব্যবসার বকেয়া');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const totalOpeningDue = dues.reduce((sum, d) => sum + (d.amount || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      setError('সঠিক পরিমাণ দিন');
      return;
    }

    setSaving(true);
    try {
      const dueAmount = Number(amount);

      const dueRef = push(ref(database, `parties/${party.id}/dues`));
      await set(dueRef, {
        amount: dueAmount,
        note: note.trim() || 'পূর্বের ব্যবসার বকেয়া',
        date: new Date(date).toISOString(),
      });

      const newTotalPurchase = (party.total_purchase || 0) + dueAmount;
      const newBalance = (party.balance || 0) + dueAmount;

      await update(ref(database, `parties/${party.id}`), {
        total_purchase: newTotalPurchase,
        balance: newBalance,
      });

      party.total_purchase = newTotalPurchase;
      party.balance = newBalance;

      await logActivity({
        userId: auth.currentUser?.uid,
        action: 'পূর্বের বকেয়া যোগ',
        target: `${party.name} — ৳${dueAmount}`,
      });

      setSuccess(`৳${dueAmount} পূর্বের বকেয়া হিসেবে যোগ হয়েছে`);
      setAmount('');
      setNote('পূর্বের ব্যবসার বকেয়া');
      if (onAdded) onAdded();
    } catch (err) {
      setError('বকেয়া যোগ করা যায়নি, আবার চেষ্টা করুন');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="bg-background-card dark:bg-dark-card rounded-2xl shadow-sm
                 border border-border dark:border-dark-border p-5"
    >
      <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary dark:text-dark-text-primary mb-1">
        <Landmark size={16} className="text-primary" />
        পূর্বের বকেয়া যোগ করুন
      </h3>
      <p className="text-xs text-text-muted dark:text-dark-text-secondary mb-4">
        আগের ব্যবসা থেকে (এই সফটওয়্যার ব্যবহার শুরুর আগে) এই পার্টির কাছে যে বকেয়া আছে, তা এখানে যোগ করলে
        সেটা পার্টির মোট বাকির সাথে যুক্ত হয়ে যাবে।
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="বকেয়ার পরিমাণ (৳)"
          className="rounded-xl border border-border dark:border-dark-border
                     bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                     px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-text-muted"
        />
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="নোট (ঐচ্ছিক)"
          className="rounded-xl border border-border dark:border-dark-border
                     bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                     px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-text-muted"
        />
        <div>
          <label className="block text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1.5">
            তারিখ
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl border border-border dark:border-dark-border
                       bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                       px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {error && (
          <p className="flex items-center gap-2 text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">
            <AlertCircle size={14} />
            {error}
          </p>
        )}
        {success && (
          <p className="flex items-center gap-2 text-xs text-success bg-success/10 rounded-lg px-3 py-2">
            <CheckCircle2 size={14} />
            {success}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="mt-1 w-full rounded-xl py-2.5 text-sm font-medium text-white
                     bg-gradient-to-r from-primary to-primary-light
                     hover:from-primary-dark hover:to-primary transition-colors disabled:opacity-60"
        >
          {saving ? 'সংরক্ষণ হচ্ছে...' : 'বকেয়া যোগ করুন'}
        </button>
      </form>

      {dues.length > 0 && (
        <div className="mt-5 pt-4 border-t border-border dark:border-dark-border">
          <p className="text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-2">
            পূর্বের বকেয়ার ইতিহাস (মোট ৳{totalOpeningDue})
          </p>
          <div className="flex flex-col gap-2">
            {dues.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between bg-background dark:bg-dark-background
                           rounded-xl px-3 py-2 text-sm"
              >
                <div>
                  <p className="text-text-primary dark:text-dark-text-primary">{d.note}</p>
                  <p className="text-xs text-text-muted dark:text-dark-text-secondary">
                    {new Date(d.date).toLocaleDateString('bn-BD')}
                  </p>
                </div>
                <span className="font-medium text-danger">৳{d.amount}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
'use client';

import { useState } from 'react';
import { ref, push, set } from 'firebase/database';
import { database, auth } from '@/lib/firebase';
import CategorySelector from './CategorySelector';
import { Plus, CheckCircle2, AlertCircle } from 'lucide-react';

const todayStr = () => new Date().toISOString().split('T')[0];

// SR এর নিজস্ব ঠালি খাতা — এন্ট্রি সবসময় sr_ledger/{uid}/entries পাথে সেভ হয়,
// তাই অন্য SR বা এডমিনের ঠালির সাথে কখনো মিশবে না।
export default function SRAddLedgerEntry({ type }) {
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [entryDate, setEntryDate] = useState(todayStr());
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const uid = auth.currentUser?.uid;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!uid) {
      setError('লগইন তথ্য পাওয়া যায়নি, আবার লগইন করুন');
      return;
    }
    if (!category) {
      setError('একটা খাত নির্বাচন করুন');
      return;
    }
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      setError('সঠিক পরিমাণ দিন');
      return;
    }
    if (!entryDate) {
      setError('তারিখ নির্বাচন করুন');
      return;
    }

    setSaving(true);
    try {
      // নির্বাচিত তারিখের দুপুর ১২টা ধরে সংরক্ষণ করা হচ্ছে — এতে টাইমজোনের
      // কারণে একদিন আগে/পরে হয়ে যাওয়ার সমস্যা এড়ানো যায়
      const isoDate = new Date(`${entryDate}T12:00:00`).toISOString();

      const entryRef = push(ref(database, `sr_ledger/${uid}/entries`));
      await set(entryRef, {
        type,
        category,
        amount: Number(amount),
        note: note.trim(),
        date: isoDate,
        auto_generated: false,
      });

      setSuccess(`${type === 'income' ? 'আয়' : 'ব্যয়'} সংরক্ষণ হয়েছে`);
      setCategory('');
      setAmount('');
      setNote('');
      setEntryDate(todayStr());
    } catch (err) {
      setError('সংরক্ষণ করা যায়নি, আবার চেষ্টা করুন');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="bg-background-card dark:bg-dark-card rounded-2xl shadow-sm
                 border border-border dark:border-dark-border p-5 max-w-md w-full"
    >
      <h2 className="text-base font-semibold text-text-primary dark:text-dark-text-primary mb-4">
        নতুন {type === 'income' ? 'আয়' : 'ব্যয়'} যোগ করুন
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <CategorySelector type={type} value={category} onChange={setCategory} />

        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="পরিমাণ (৳)"
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
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            max={todayStr()}
            className="w-full rounded-xl border border-border dark:border-dark-border
                       bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                       px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="নোট (ঐচ্ছিক)"
          className="rounded-xl border border-border dark:border-dark-border
                     bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                     px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-text-muted"
        />

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
          className={`mt-1 w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-60
            ${type === 'income' ? 'bg-gradient-to-r from-primary to-primary-light' : 'bg-danger hover:opacity-90'}`}
        >
          <Plus size={16} />
          {saving ? 'সংরক্ষণ হচ্ছে...' : `${type === 'income' ? 'আয়' : 'ব্যয়'} সংরক্ষণ করুন`}
        </button>
      </form>
    </div>
  );
}

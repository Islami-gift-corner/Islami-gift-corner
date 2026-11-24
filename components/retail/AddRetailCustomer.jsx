'use client';

import { useState } from 'react';
import { ref, push, set } from 'firebase/database';
import { database } from '@/lib/firebase';
import { UserPlus, X, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AddRetailCustomer({ onAdded }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', address: '', openingDue: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (error) setError('');
  };

  const resetForm = () => setForm({ name: '', phone: '', address: '', openingDue: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.name.trim()) {
      setError('কাস্টমারের নাম দিন');
      return;
    }
    if (form.openingDue && (isNaN(form.openingDue) || Number(form.openingDue) < 0)) {
      setError('পূর্বের বকেয়ার পরিমাণ সঠিক নয়');
      return;
    }

    setSaving(true);
    try {
      const openingDue = Number(form.openingDue) || 0;

      const newCustomerRef = push(ref(database, 'retail_customers'));
      await set(newCustomerRef, {
        name: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        total_purchase: openingDue,
        total_paid: 0,
        balance: openingDue,
        created_at: new Date().toISOString(),
      });

      const newCustomer = {
        id: newCustomerRef.key,
        name: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        total_purchase: openingDue,
        total_paid: 0,
        balance: openingDue,
      };

      setSuccess('কাস্টমার সফলভাবে যোগ হয়েছে');
      resetForm();
      if (onAdded) onAdded(newCustomer);
      setTimeout(() => setOpen(false), 800);
    } catch (err) {
      setError('কাস্টমার যোগ করা যায়নি, আবার চেষ্টা করুন');
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white
                   bg-gradient-to-r from-primary to-primary-light
                   hover:from-primary-dark hover:to-primary transition-colors w-fit"
      >
        <UserPlus size={16} />
        নতুন কাস্টমার যোগ করুন
      </button>
    );
  }

  return (
    <div
      className="bg-background-card dark:bg-dark-card rounded-2xl shadow-sm
                 border border-border dark:border-dark-border p-5 max-w-md w-full"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="flex items-center gap-2 text-base font-semibold text-text-primary dark:text-dark-text-primary">
          <UserPlus size={18} className="text-primary" />
          নতুন কাস্টমার যোগ করুন
        </h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="বন্ধ করুন"
          className="p-1 rounded-lg text-text-muted hover:bg-background dark:hover:bg-dark-background"
        >
          <X size={18} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="text"
          value={form.name}
          onChange={handleChange('name')}
          placeholder="কাস্টমারের নাম *"
          className="w-full rounded-xl border border-border dark:border-dark-border
                     bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                     px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-text-muted"
        />
        <input
          type="text"
          value={form.phone}
          onChange={handleChange('phone')}
          placeholder="মোবাইল নম্বর"
          className="w-full rounded-xl border border-border dark:border-dark-border
                     bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                     px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-text-muted"
        />
        <input
          type="text"
          value={form.address}
          onChange={handleChange('address')}
          placeholder="ঠিকানা"
          className="w-full rounded-xl border border-border dark:border-dark-border
                     bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                     px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-text-muted"
        />
        <input
          type="number"
          value={form.openingDue}
          onChange={handleChange('openingDue')}
          placeholder="পূর্বের বকেয়া (৳) — যদি থাকে"
          className="w-full rounded-xl border border-border dark:border-dark-border
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
          className="mt-1 w-full rounded-xl py-2.5 text-sm font-medium text-white
                     bg-gradient-to-r from-primary to-primary-light
                     hover:from-primary-dark hover:to-primary transition-colors disabled:opacity-60"
        >
          {saving ? 'সংরক্ষণ হচ্ছে...' : 'কাস্টমার সংরক্ষণ করুন'}
        </button>
      </form>
    </div>
  );
}
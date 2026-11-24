'use client';

import { useState } from 'react';
import { ref, push, set } from 'firebase/database';
import { database, auth } from '@/lib/firebase';
import { Users, Plus, X, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AddParty({ onAdded, compact = false }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', businessName: '', phone: '', address: '', openingDue: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (error) setError('');
  };

  const resetForm = () => setForm({ name: '', businessName: '', phone: '', address: '', openingDue: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.name.trim()) {
      setError('পার্টির নাম দিন');
      return;
    }
    if (form.openingDue && (isNaN(form.openingDue) || Number(form.openingDue) < 0)) {
      setError('পূর্বের বকেয়ার পরিমাণ সঠিক নয়');
      return;
    }

    setSaving(true);
    try {
      const openingDue = Number(form.openingDue) || 0;

      const newPartyRef = push(ref(database, 'parties'));
      await set(newPartyRef, {
        name: form.name.trim(),
        business_name: form.businessName.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        total_purchase: openingDue,
        total_paid: 0,
        balance: openingDue,
        owner_id: auth.currentUser?.uid || null,
        created_at: new Date().toISOString(),
      });

      if (openingDue > 0) {
        const dueRef = push(ref(database, `parties/${newPartyRef.key}/dues`));
        await set(dueRef, {
          amount: openingDue,
          note: 'ব্যবসা শুরুর পূর্বের বকেয়া',
          date: new Date().toISOString(),
        });
      }

      setSuccess('পার্টি সফলভাবে যোগ হয়েছে');
      resetForm();
      if (onAdded) onAdded({ id: newPartyRef.key, ...form });
      setTimeout(() => setOpen(false), 800);
    } catch (err) {
      setError('পার্টি যোগ করা যায়নি, আবার চেষ্টা করুন');
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white
                   bg-gradient-to-r from-primary to-primary-light
                   hover:from-primary-dark hover:to-primary transition-colors w-fit
                   ${compact ? 'text-xs px-3 py-2' : ''}`}
      >
        <Plus size={16} />
        নতুন পার্টি যোগ করুন
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
          <Users size={18} className="text-primary" />
          নতুন পার্টি যোগ করুন
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
          placeholder="পার্টির নাম *"
          className="w-full rounded-xl border border-border dark:border-dark-border
                     bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                     px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-text-muted"
        />
        <input
          type="text"
          value={form.businessName}
          onChange={handleChange('businessName')}
          placeholder="ব্যবসার নাম"
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
        <div>
          <input
            type="number"
            value={form.openingDue}
            onChange={handleChange('openingDue')}
            placeholder="পূর্বের বকেয়া (৳) — যদি থাকে"
            className="w-full rounded-xl border border-border dark:border-dark-border
                       bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                       px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-text-muted"
          />
          <p className="text-xs text-text-muted dark:text-dark-text-secondary mt-1 px-1">
            আগের ব্যবসা থেকে এই পার্টির কাছে বকেয়া থাকলে এখানে যোগ করুন
          </p>
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
          {saving ? 'সংরক্ষণ হচ্ছে...' : 'পার্টি সংরক্ষণ করুন'}
        </button>
      </form>
    </div>
  );
}
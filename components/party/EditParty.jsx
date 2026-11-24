'use client';

import { useState } from 'react';
import { ref, update } from 'firebase/database';
import { database, auth } from '@/lib/firebase';
import { logActivity } from '@/lib/activityLog';
import { Pencil, X, CheckCircle2, AlertCircle } from 'lucide-react';

// পার্টির নাম/ব্যবসার নাম/ফোন/ঠিকানা ভুল থাকলে পরে সংশোধন করার জন্য।
// আর্থিক তথ্য (মোট বিক্রয়, পরিশোধিত, বাকি) এখান থেকে বদলানো যাবে না — শুধু বেসিক তথ্য।
export default function EditParty({ party, onUpdated }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: party.name || '',
    businessName: party.business_name || '',
    phone: party.phone || '',
    address: party.address || '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.name.trim()) {
      setError('পার্টির নাম দিন');
      return;
    }

    setSaving(true);
    try {
      const updatedFields = {
        name: form.name.trim(),
        business_name: form.businessName.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
      };

      await update(ref(database, `parties/${party.id}`), updatedFields);

      await logActivity({
        userId: auth.currentUser?.uid,
        action: 'পার্টির তথ্য সংশোধন',
        target: updatedFields.name,
      });

      // লোকাল পার্টি অবজেক্টও আপডেট করে দিচ্ছি, যাতে সাথে সাথে নতুন তথ্য দেখা যায়
      Object.assign(party, updatedFields);

      setSuccess('পার্টির তথ্য আপডেট হয়েছে');
      if (onUpdated) onUpdated({ ...party, ...updatedFields });
      setTimeout(() => {
        setOpen(false);
        setSuccess('');
      }, 800);
    } catch (err) {
      setError('আপডেট করা যায়নি, আবার চেষ্টা করুন');
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="পার্টির তথ্য এডিট করুন"
        className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
      >
        <Pencil size={13} />
        তথ্য সংশোধন করুন
      </button>
    );
  }

  return (
    <div
      className="bg-background dark:bg-dark-background rounded-xl border border-border dark:border-dark-border
                 p-4 mt-3"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary dark:text-dark-text-primary">
          <Pencil size={14} className="text-primary" />
          পার্টির তথ্য সংশোধন করুন
        </h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="বন্ধ করুন"
          className="p-1 rounded-lg text-text-muted hover:bg-background-card dark:hover:bg-dark-card"
        >
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="text"
          value={form.name}
          onChange={handleChange('name')}
          placeholder="পার্টির নাম *"
          className="w-full rounded-xl border border-border dark:border-dark-border
                     bg-background-card dark:bg-dark-card text-text-primary dark:text-dark-text-primary
                     px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-text-muted"
        />
        <input
          type="text"
          value={form.businessName}
          onChange={handleChange('businessName')}
          placeholder="ব্যবসার নাম"
          className="w-full rounded-xl border border-border dark:border-dark-border
                     bg-background-card dark:bg-dark-card text-text-primary dark:text-dark-text-primary
                     px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-text-muted"
        />
        <input
          type="text"
          value={form.phone}
          onChange={handleChange('phone')}
          placeholder="মোবাইল নম্বর"
          className="w-full rounded-xl border border-border dark:border-dark-border
                     bg-background-card dark:bg-dark-card text-text-primary dark:text-dark-text-primary
                     px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-text-muted"
        />
        <input
          type="text"
          value={form.address}
          onChange={handleChange('address')}
          placeholder="ঠিকানা"
          className="w-full rounded-xl border border-border dark:border-dark-border
                     bg-background-card dark:bg-dark-card text-text-primary dark:text-dark-text-primary
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

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-xl py-2.5 text-sm font-medium text-white
                       bg-gradient-to-r from-primary to-primary-light disabled:opacity-60"
          >
            {saving ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex-1 rounded-xl py-2.5 text-sm font-medium border border-border dark:border-dark-border
                       text-text-secondary dark:text-dark-text-secondary"
          >
            বাতিল
          </button>
        </div>
      </form>
    </div>
  );
}
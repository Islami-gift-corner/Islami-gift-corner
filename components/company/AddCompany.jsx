'use client';

import { useState } from 'react';
import { ref, push, set } from 'firebase/database';
import { database } from '@/lib/firebase';
import { Building2, Plus, X, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AddCompany({ onAdded }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    address: '',
    phone: '',
    default_commission_percent: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (error) setError('');
  };

  const resetForm = () => {
    setForm({ name: '', address: '', phone: '', default_commission_percent: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.name.trim()) {
      setError('কোম্পানির নাম দিন');
      return;
    }
    if (
      form.default_commission_percent !== '' &&
      (isNaN(form.default_commission_percent) ||
        Number(form.default_commission_percent) < 0)
    ) {
      setError('কমিশন শতাংশ সঠিকভাবে দিন');
      return;
    }

    setSaving(true);
    try {
      const newCompanyRef = push(ref(database, 'companies'));
      await set(newCompanyRef, {
        name: form.name.trim(),
        address: form.address.trim(),
        phone: form.phone.trim(),
        default_commission_percent: form.default_commission_percent
          ? Number(form.default_commission_percent)
          : 0,
        created_at: new Date().toISOString(),
      });

      setSuccess('কোম্পানি সফলভাবে যোগ হয়েছে');
      resetForm();
      if (onAdded) onAdded();
      setTimeout(() => setOpen(false), 900);
    } catch (err) {
      setError('কোম্পানি যোগ করা যায়নি, আবার চেষ্টা করুন');
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
        <Plus size={18} />
        নতুন কোম্পানি যোগ করুন
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
          <Building2 size={18} className="text-primary" />
          নতুন কোম্পানি যোগ করুন
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
        <div>
          <label className="block text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1.5">
            কোম্পানির নাম *
          </label>
          <input
            type="text"
            value={form.name}
            onChange={handleChange('name')}
            placeholder="যেমন: Sony Electronics"
            className="w-full rounded-xl border border-border dark:border-dark-border
                       bg-background dark:bg-dark-background
                       text-text-primary dark:text-dark-text-primary
                       px-3 py-2.5 text-sm
                       focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                       placeholder:text-text-muted"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1.5">
            ঠিকানা
          </label>
          <input
            type="text"
            value={form.address}
            onChange={handleChange('address')}
            placeholder="কোম্পানির ঠিকানা"
            className="w-full rounded-xl border border-border dark:border-dark-border
                       bg-background dark:bg-dark-background
                       text-text-primary dark:text-dark-text-primary
                       px-3 py-2.5 text-sm
                       focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                       placeholder:text-text-muted"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1.5">
            ফোন নম্বর
          </label>
          <input
            type="text"
            value={form.phone}
            onChange={handleChange('phone')}
            placeholder="01xxxxxxxxx"
            className="w-full rounded-xl border border-border dark:border-dark-border
                       bg-background dark:bg-dark-background
                       text-text-primary dark:text-dark-text-primary
                       px-3 py-2.5 text-sm
                       focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                       placeholder:text-text-muted"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1.5">
            ডিফল্ট কমিশন (%)
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            value={form.default_commission_percent}
            onChange={handleChange('default_commission_percent')}
            placeholder="যেমন: 8"
            className="w-full rounded-xl border border-border dark:border-dark-border
                       bg-background dark:bg-dark-background
                       text-text-primary dark:text-dark-text-primary
                       px-3 py-2.5 text-sm
                       focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                       placeholder:text-text-muted"
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
                     hover:from-primary-dark hover:to-primary
                     transition-colors disabled:opacity-60"
        >
          {saving ? 'সংরক্ষণ হচ্ছে...' : 'কোম্পানি সংরক্ষণ করুন'}
        </button>
      </form>
    </div>
  );
}

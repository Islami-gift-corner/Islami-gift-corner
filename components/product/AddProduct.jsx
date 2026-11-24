'use client';

import { useState, useEffect } from 'react';
import { ref, push, set } from 'firebase/database';
import { database } from '@/lib/firebase';
import { Package, Plus, X, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AddProduct({ companyId, defaultCommission = 0, onAdded }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    cost_price: '',
    mrp: '',
    commission_percent: '',
    stock_qty: '',
    low_stock_threshold: '5',
    warranty_months: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  // কোম্পানি বদলালে ডিফল্ট কমিশন % দিয়ে ফিল্ড পূরণ করে রাখা (ব্যবহারকারী চাইলে বদলাতে পারবে)
  useEffect(() => {
    setForm((prev) => ({ ...prev, commission_percent: String(defaultCommission || '') }));
  }, [defaultCommission, companyId]);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (error) setError('');
  };

  const resetForm = () => {
    setForm({
      name: '',
      cost_price: '',
      mrp: '',
      commission_percent: String(defaultCommission || ''),
      stock_qty: '',
      low_stock_threshold: '5',
      warranty_months: '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!companyId) {
      setError('আগে একটা কোম্পানি নির্বাচন করুন');
      return;
    }
    if (!form.name.trim()) {
      setError('প্রোডাক্টের নাম দিন');
      return;
    }
    if (form.cost_price === '' || isNaN(form.cost_price) || Number(form.cost_price) < 0) {
      setError('সঠিক ক্রয়মূল্য দিন');
      return;
    }
    if (form.mrp === '' || isNaN(form.mrp) || Number(form.mrp) < 0) {
      setError('সঠিক MRP দিন');
      return;
    }

    setSaving(true);
    try {
      const newProductRef = push(ref(database, `companies/${companyId}/products`));
      await set(newProductRef, {
        name: form.name.trim(),
        cost_price: Number(form.cost_price),
        mrp: Number(form.mrp),
        commission_percent: form.commission_percent ? Number(form.commission_percent) : 0,
        stock_qty: form.stock_qty ? Number(form.stock_qty) : 0,
        low_stock_threshold: form.low_stock_threshold ? Number(form.low_stock_threshold) : 5,
        warranty_months: form.warranty_months ? Number(form.warranty_months) : 0,
        created_at: new Date().toISOString(),
      });

      setSuccess('প্রোডাক্ট সফলভাবে যোগ হয়েছে');
      resetForm();
      if (onAdded) onAdded();
      setTimeout(() => setOpen(false), 900);
    } catch (err) {
      setError('প্রোডাক্ট যোগ করা যায়নি, আবার চেষ্টা করুন');
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!companyId}
        className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white
                   bg-gradient-to-r from-primary to-primary-light
                   hover:from-primary-dark hover:to-primary transition-colors w-fit
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Plus size={18} />
        নতুন প্রোডাক্ট যোগ করুন
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
          <Package size={18} className="text-primary" />
          নতুন প্রোডাক্ট যোগ করুন
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
            প্রোডাক্টের নাম *
          </label>
          <input
            type="text"
            value={form.name}
            onChange={handleChange('name')}
            placeholder="যেমন: Sony 65 inch TV"
            className="w-full rounded-xl border border-border dark:border-dark-border
                       bg-background dark:bg-dark-background
                       text-text-primary dark:text-dark-text-primary
                       px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary
                       placeholder:text-text-muted"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1.5">
              ক্রয়মূল্য (৳) *
            </label>
            <input
              type="number"
              step="0.01"
              value={form.cost_price}
              onChange={handleChange('cost_price')}
              placeholder="0"
              className="w-full rounded-xl border border-border dark:border-dark-border
                         bg-background dark:bg-dark-background
                         text-text-primary dark:text-dark-text-primary
                         px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1.5">
              MRP (৳) *
            </label>
            <input
              type="number"
              step="0.01"
              value={form.mrp}
              onChange={handleChange('mrp')}
              placeholder="0"
              className="w-full rounded-xl border border-border dark:border-dark-border
                         bg-background dark:bg-dark-background
                         text-text-primary dark:text-dark-text-primary
                         px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1.5">
              কমিশন (%)
            </label>
            <input
              type="number"
              step="0.1"
              value={form.commission_percent}
              onChange={handleChange('commission_percent')}
              placeholder="কোম্পানির ডিফল্ট"
              className="w-full rounded-xl border border-border dark:border-dark-border
                         bg-background dark:bg-dark-background
                         text-text-primary dark:text-dark-text-primary
                         px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1.5">
              শুরুর স্টক
            </label>
            <input
              type="number"
              value={form.stock_qty}
              onChange={handleChange('stock_qty')}
              placeholder="0"
              className="w-full rounded-xl border border-border dark:border-dark-border
                         bg-background dark:bg-dark-background
                         text-text-primary dark:text-dark-text-primary
                         px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1.5">
              লো স্টক এলার্ট
            </label>
            <input
              type="number"
              value={form.low_stock_threshold}
              onChange={handleChange('low_stock_threshold')}
              placeholder="5"
              className="w-full rounded-xl border border-border dark:border-dark-border
                         bg-background dark:bg-dark-background
                         text-text-primary dark:text-dark-text-primary
                         px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1.5">
              ওয়্যারেন্টি (মাস)
            </label>
            <input
              type="number"
              value={form.warranty_months}
              onChange={handleChange('warranty_months')}
              placeholder="12"
              className="w-full rounded-xl border border-border dark:border-dark-border
                         bg-background dark:bg-dark-background
                         text-text-primary dark:text-dark-text-primary
                         px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
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
          {saving ? 'সংরক্ষণ হচ্ছে...' : 'প্রোডাক্ট সংরক্ষণ করুন'}
        </button>
      </form>
    </div>
  );
          }

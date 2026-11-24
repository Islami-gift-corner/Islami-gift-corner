'use client';

import { useState } from 'react';
import { ref, push, set } from 'firebase/database';
import { database } from '@/lib/firebase';
import { ShoppingBag, Plus, X, CheckCircle2, AlertCircle } from 'lucide-react';

// প্রচলিত কিছু একক — চাইলে "অন্যান্য" বেছে নিয়ে নিজের মতো লিখতেও পারবেন
export const RETAIL_UNITS = ['পিস', 'ডজন', 'গজ', 'ফুট', 'মিটার', 'কেজি', 'গ্রাম', 'লিটার', 'বক্স'];

// কোনো কোম্পানির সাথে সম্পর্কিত না — আলাদাভাবে কেনা খুচরা পণ্যের জন্য
export default function AddRetailProduct({ onAdded }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    cost_price: '',
    price: '',
    stock_qty: '',
    low_stock_threshold: '5',
    category: '',
    unit: 'পিস',
    customUnit: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (error) setError('');
  };

  const resetForm = () => {
    setForm({
      name: '',
      cost_price: '',
      price: '',
      stock_qty: '',
      low_stock_threshold: '5',
      category: '',
      unit: 'পিস',
      customUnit: '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.name.trim()) {
      setError('পণ্যের নাম দিন');
      return;
    }
    if (form.price === '' || isNaN(form.price) || Number(form.price) < 0) {
      setError('সঠিক বিক্রয়মূল্য দিন');
      return;
    }

    if (form.unit === '__other__' && !form.customUnit.trim()) {
      setError('একক লিখুন');
      return;
    }

    setSaving(true);
    try {
      const unit = form.unit === '__other__' ? form.customUnit.trim() : form.unit;
      const newProductRef = push(ref(database, 'retail_products'));
      await set(newProductRef, {
        name: form.name.trim(),
        cost_price: form.cost_price ? Number(form.cost_price) : 0,
        price: Number(form.price),
        stock_qty: form.stock_qty ? Number(form.stock_qty) : 0,
        low_stock_threshold: form.low_stock_threshold ? Number(form.low_stock_threshold) : 5,
        category: form.category.trim(),
        unit,
        created_at: new Date().toISOString(),
      });

      setSuccess('খুচরা পণ্য সফলভাবে যোগ হয়েছে');
      resetForm();
      if (onAdded) onAdded();
      setTimeout(() => setOpen(false), 900);
    } catch (err) {
      setError('পণ্য যোগ করা যায়নি, আবার চেষ্টা করুন');
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
        নতুন খুচরা পণ্য যোগ করুন
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
          <ShoppingBag size={18} className="text-primary" />
          নতুন খুচরা পণ্য যোগ করুন
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
            পণ্যের নাম *
          </label>
          <input
            type="text"
            value={form.name}
            onChange={handleChange('name')}
            placeholder="যেমন: চাইনিজ চার্জার লাইট"
            className="w-full rounded-xl border border-border dark:border-dark-border
                       bg-background dark:bg-dark-background
                       text-text-primary dark:text-dark-text-primary
                       px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary
                       placeholder:text-text-muted"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1.5">
            ক্যাটাগরি (ঐচ্ছিক)
          </label>
          <input
            type="text"
            value={form.category}
            onChange={handleChange('category')}
            placeholder="যেমন: ইলেকট্রনিক্স"
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
              একক (ইউনিট)
            </label>
            <select
              value={form.unit}
              onChange={(e) => setForm((prev) => ({ ...prev, unit: e.target.value }))}
              className="w-full rounded-xl border border-border dark:border-dark-border
                         bg-background dark:bg-dark-background
                         text-text-primary dark:text-dark-text-primary
                         px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {RETAIL_UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
              <option value="__other__">অন্যান্য (নিজে লিখুন)</option>
            </select>
          </div>
          {form.unit === '__other__' && (
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1.5">
                একক লিখুন
              </label>
              <input
                type="text"
                value={form.customUnit}
                onChange={handleChange('customUnit')}
                placeholder="যেমন: বান্ডিল"
                className="w-full rounded-xl border border-border dark:border-dark-border
                           bg-background dark:bg-dark-background
                           text-text-primary dark:text-dark-text-primary
                           px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary
                           placeholder:text-text-muted"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1.5">
              ক্রয়মূল্য (৳)
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
              বিক্রয়মূল্য (৳) *
            </label>
            <input
              type="number"
              step="0.01"
              value={form.price}
              onChange={handleChange('price')}
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
              শুরুর স্টক ({form.unit === '__other__' ? form.customUnit || 'একক' : form.unit})
            </label>
            <input
              type="number"
              step="0.01"
              value={form.stock_qty}
              onChange={handleChange('stock_qty')}
              placeholder="0"
              className="w-full rounded-xl border border-border dark:border-dark-border
                         bg-background dark:bg-dark-background
                         text-text-primary dark:text-dark-text-primary
                         px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1.5">
              লো স্টক এলার্ট
            </label>
            <input
              type="number"
              step="0.01"
              value={form.low_stock_threshold}
              onChange={handleChange('low_stock_threshold')}
              placeholder="5"
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
          {saving ? 'সংরক্ষণ হচ্ছে...' : 'পণ্য সংরক্ষণ করুন'}
        </button>
      </form>
    </div>
  );
}
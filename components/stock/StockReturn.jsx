'use client';

import { useState } from 'react';
import { auth } from '@/lib/firebase';
import { recordStockMovement } from '@/lib/stockUtils';
import CompanySelector from '@/components/product/CompanySelector';
import ProductSelector from '@/components/stock/ProductSelector';
import { Undo2, CheckCircle2, AlertCircle } from 'lucide-react';

const REASONS = [
  'পণ্য নষ্ট/ত্রুটিপূর্ণ',
  'ভুল পণ্য পাঠানো হয়েছে',
  'ক্রেতা মত পরিবর্তন করেছে',
  'অন্যান্য',
];

export default function StockReturn() {
  const [companyId, setCompanyId] = useState('');
  const [productId, setProductId] = useState('');
  const [qty, setQty] = useState('');
  const [partyName, setPartyName] = useState('');
  const [invoiceRef, setInvoiceRef] = useState('');
  const [reason, setReason] = useState(REASONS[0]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCompanyChange = (id) => {
    setCompanyId(id);
    setProductId('');
  };

  const resetForm = () => {
    setQty('');
    setPartyName('');
    setInvoiceRef('');
    setReason(REASONS[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!companyId || !productId) {
      setError('কোম্পানি ও প্রোডাক্ট দুটোই নির্বাচন করুন');
      return;
    }
    if (!qty || isNaN(qty) || Number(qty) <= 0) {
      setError('সঠিক পরিমাণ দিন');
      return;
    }

    setSaving(true);
    try {
      await recordStockMovement({
        companyId,
        productId,
        type: 'return',
        qty: Number(qty),
        reason: `${reason}${partyName ? ` — পার্টি: ${partyName}` : ''}`,
        recordedBy: auth.currentUser?.uid || '',
        refId: invoiceRef.trim(),
      });

      setSuccess('রিটার্ন সফলভাবে রেকর্ড হয়েছে, স্টক ফেরত যোগ হয়েছে');
      resetForm();
    } catch (err) {
      setError(err.message || 'রিটার্ন রেকর্ড করা যায়নি');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="bg-background-card dark:bg-dark-card rounded-2xl shadow-sm
                 border border-border dark:border-dark-border p-5 max-w-md w-full"
    >
      <h2 className="flex items-center gap-2 text-base font-semibold text-text-primary dark:text-dark-text-primary mb-1">
        <Undo2 size={18} className="text-primary" />
        পার্টি রিটার্ন
      </h2>
      <p className="text-xs text-text-muted dark:text-dark-text-secondary mb-4">
        ক্রেতা যে পণ্য ফেরত দিলো সেটা এখানে এন্ট্রি করুন, স্টক আবার বাড়বে
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <CompanySelector value={companyId} onChange={handleCompanyChange} />
        <ProductSelector
          companyId={companyId}
          value={productId}
          onChange={(id) => setProductId(id)}
        />

        <div>
          <label className="block text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1.5">
            রিটার্ন পরিমাণ *
          </label>
          <input
            type="number"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder="কত ইউনিট ফেরত এলো"
            className="w-full rounded-xl border border-border dark:border-dark-border
                       bg-background dark:bg-dark-background
                       text-text-primary dark:text-dark-text-primary
                       px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1.5">
            পার্টির নাম (ঐচ্ছিক)
          </label>
          <input
            type="text"
            value={partyName}
            onChange={(e) => setPartyName(e.target.value)}
            placeholder="কে ফেরত দিলো"
            className="w-full rounded-xl border border-border dark:border-dark-border
                       bg-background dark:bg-dark-background
                       text-text-primary dark:text-dark-text-primary
                       px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary
                       placeholder:text-text-muted"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1.5">
            ইনভয়েস নম্বর (ঐচ্ছিক)
          </label>
          <input
            type="text"
            value={invoiceRef}
            onChange={(e) => setInvoiceRef(e.target.value)}
            placeholder="যেমন: INV-2026-0001"
            className="w-full rounded-xl border border-border dark:border-dark-border
                       bg-background dark:bg-dark-background
                       text-text-primary dark:text-dark-text-primary
                       px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary
                       placeholder:text-text-muted"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1.5">
            রিটার্নের কারণ
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-xl border border-border dark:border-dark-border
                       bg-background dark:bg-dark-background
                       text-text-primary dark:text-dark-text-primary
                       px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
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
          {saving ? 'সংরক্ষণ হচ্ছে...' : 'রিটার্ন রেকর্ড করুন'}
        </button>
      </form>

      <p className="text-xs text-text-muted dark:text-dark-text-secondary mt-3">
        💡 পার্টি খাতা মডিউল (সেশন ১২) তৈরি হওয়ার পর এই রিটার্ন স্বয়ংক্রিয়ভাবে
        পার্টির বাকির হিসাব থেকে বিয়োগ হয়ে যাবে।
      </p>
    </div>
  );
      }

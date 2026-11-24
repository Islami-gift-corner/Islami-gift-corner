'use client';

import { useState } from 'react';
import { ref, push, set, get } from 'firebase/database';
import { database, auth } from '@/lib/firebase';
import { recordStockMovement } from '@/lib/stockUtils';
import CompanySelector from '@/components/product/CompanySelector';
import ProductSelector from '@/components/stock/ProductSelector';
import { AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';

const REASONS = [
  'পরিবহনে ক্ষতি',
  'গুদামে নষ্ট হয়েছে',
  'মেয়াদ উত্তীর্ণ',
  'অন্যান্য',
];

export default function StockDamage() {
  const [companyId, setCompanyId] = useState('');
  const [productId, setProductId] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState(REASONS[0]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCompanyChange = (id) => {
    setCompanyId(id);
    setProductId('');
    setSelectedProduct(null);
  };

  const handleProductChange = (id, product) => {
    setProductId(id);
    setSelectedProduct(product || null);
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
      // ধাপ ১: স্টক থেকে বাদ দেওয়া
      await recordStockMovement({
        companyId,
        productId,
        type: 'damage',
        qty: Number(qty),
        reason,
        recordedBy: auth.currentUser?.uid || '',
      });

      // ধাপ ২: আনুমানিক ক্ষতির পরিমাণ (ক্রয়মূল্য × পরিমাণ) ব্যয় খাতায় অটো যোগ করা
      const productSnap = await get(
        ref(database, `companies/${companyId}/products/${productId}`)
      );
      const costPrice = productSnap.exists() ? Number(productSnap.val().cost_price) || 0 : 0;
      const lossAmount = costPrice * Number(qty);

      const ledgerRef = push(ref(database, 'ledger'));
      await set(ledgerRef, {
        type: 'expense',
        category: 'ক্ষতি/ড্যামেজ',
        amount: lossAmount,
        note: `${selectedProduct?.name || 'প্রোডাক্ট'} — ${reason}`,
        date: new Date().toISOString(),
        auto_generated: true,
      });

      setSuccess(`ড্যামেজ রেকর্ড হয়েছে, আনুমানিক ক্ষতি ৳${lossAmount} ব্যয় খাতায় যোগ হয়েছে`);
      setQty('');
      setReason(REASONS[0]);
    } catch (err) {
      setError(err.message || 'ড্যামেজ রেকর্ড করা যায়নি');
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
        <AlertTriangle size={18} className="text-warning" />
        ড্যামেজ/ক্ষতি রিপোর্ট
      </h2>
      <p className="text-xs text-text-muted dark:text-dark-text-secondary mb-4">
        বিক্রয়যোগ্য নয় এমন পণ্য এখানে এন্ট্রি করুন, স্টক থেকে বাদ যাবে ও ব্যয় খাতায় অটো যোগ হবে
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <CompanySelector value={companyId} onChange={handleCompanyChange} />
        <ProductSelector
          companyId={companyId}
          value={productId}
          onChange={handleProductChange}
        />

        <div>
          <label className="block text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1.5">
            ড্যামেজ পরিমাণ *
          </label>
          <input
            type="number"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder="কত ইউনিট নষ্ট হয়েছে"
            className="w-full rounded-xl border border-border dark:border-dark-border
                       bg-background dark:bg-dark-background
                       text-text-primary dark:text-dark-text-primary
                       px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1.5">
            ড্যামেজের কারণ
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

        {selectedProduct && qty && !isNaN(qty) && (
          <p className="text-xs text-text-secondary dark:text-dark-text-secondary bg-background dark:bg-dark-background rounded-lg px-3 py-2">
            আনুমানিক ক্ষতি: ৳{(Number(selectedProduct.cost_price) || 0) * Number(qty)}
          </p>
        )}

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
                     bg-gradient-to-r from-warning to-warning
                     hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {saving ? 'সংরক্ষণ হচ্ছে...' : 'ড্যামেজ রিপোর্ট সংরক্ষণ করুন'}
        </button>
      </form>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '@/lib/firebase';
import { auth } from '@/lib/firebase';
import { recordStockMovement } from '@/lib/stockUtils';
import CompanySelector from '@/components/product/CompanySelector';
import ProductSelector from '@/components/stock/ProductSelector';
import { ArrowDownCircle, CheckCircle2, AlertCircle } from 'lucide-react';

export default function StockInward() {
  const [companyId, setCompanyId] = useState('');
  const [productId, setProductId] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [qty, setQty] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const [movements, setMovements] = useState([]);
  const [loadingMovements, setLoadingMovements] = useState(true);
  const [companiesMap, setCompaniesMap] = useState({});

  // কোম্পানির নাম দেখানোর জন্য একটা ম্যাপ রাখা (id → name)
  useEffect(() => {
    const companiesRef = ref(database, 'companies');
    const unsubscribe = onValue(companiesRef, (snapshot) => {
      const data = snapshot.val();
      const map = {};
      if (data) {
        Object.entries(data).forEach(([id, value]) => {
          map[id] = value.name;
        });
      }
      setCompaniesMap(map);
    });
    return () => unsubscribe();
  }, []);

  // সাম্প্রতিক ইনওয়ার্ড হিস্ট্রি লোড করা
  useEffect(() => {
    const movementsRef = ref(database, 'stock_movements');
    const unsubscribe = onValue(movementsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data)
          .map(([id, value]) => ({ id, ...value }))
          .filter((m) => m.type === 'inward')
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, 15);
        setMovements(list);
      } else {
        setMovements([]);
      }
      setLoadingMovements(false);
    });
    return () => unsubscribe();
  }, []);

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
      await recordStockMovement({
        companyId,
        productId,
        type: 'inward',
        qty: Number(qty),
        reason: note.trim() || 'স্টক ক্রয়',
        recordedBy: auth.currentUser?.uid || '',
      });

      setSuccess(`স্টক যোগ হয়েছে — নতুন স্টক: ${(selectedProduct?.stock_qty || 0) + Number(qty)}`);
      setQty('');
      setNote('');
    } catch (err) {
      setError(err.message || 'স্টক যোগ করা যায়নি');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ফর্ম */}
      <div
        className="bg-background-card dark:bg-dark-card rounded-2xl shadow-sm
                   border border-border dark:border-dark-border p-5 max-w-md w-full"
      >
        <h2 className="flex items-center gap-2 text-base font-semibold text-text-primary dark:text-dark-text-primary mb-4">
          <ArrowDownCircle size={18} className="text-primary" />
          স্টক ইনওয়ার্ড (কোম্পানি থেকে ক্রয়)
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <CompanySelector value={companyId} onChange={handleCompanyChange} />
          <ProductSelector
            companyId={companyId}
            value={productId}
            onChange={handleProductChange}
          />

          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1.5">
              পরিমাণ *
            </label>
            <input
              type="number"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="কত ইউনিট ক্রয় করলেন"
              className="w-full rounded-xl border border-border dark:border-dark-border
                         bg-background dark:bg-dark-background
                         text-text-primary dark:text-dark-text-primary
                         px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1.5">
              নোট (ঐচ্ছিক)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="যেমন: জুলাই মাসের অর্ডার"
              className="w-full rounded-xl border border-border dark:border-dark-border
                         bg-background dark:bg-dark-background
                         text-text-primary dark:text-dark-text-primary
                         px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary
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
            {saving ? 'সংরক্ষণ হচ্ছে...' : 'স্টক যোগ করুন'}
          </button>
        </form>
      </div>

      {/* হিস্ট্রি */}
      <div>
        <h3 className="text-sm font-semibold text-text-primary dark:text-dark-text-primary mb-3">
          সাম্প্রতিক স্টক ইনওয়ার্ড হিস্ট্রি
        </h3>

        {loadingMovements ? (
          <p className="text-sm text-text-muted dark:text-dark-text-secondary">লোড হচ্ছে...</p>
        ) : movements.length === 0 ? (
          <p className="text-sm text-text-muted dark:text-dark-text-secondary">
            এখনো কোনো স্টক ইনওয়ার্ড এন্ট্রি নেই
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border dark:border-dark-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-background-sidebar dark:bg-dark-sidebar text-text-secondary dark:text-dark-text-secondary uppercase text-xs">
                  <th className="text-left px-4 py-2.5 font-medium">তারিখ</th>
                  <th className="text-left px-4 py-2.5 font-medium">কোম্পানি</th>
                  <th className="text-left px-4 py-2.5 font-medium">পরিমাণ</th>
                  <th className="text-left px-4 py-2.5 font-medium">নোট</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr
                    key={m.id}
                    className="border-t border-border dark:border-dark-border
                               text-text-primary dark:text-dark-text-primary"
                  >
                    <td className="px-4 py-2.5">
                      {new Date(m.date).toLocaleDateString('bn-BD')}
                    </td>
                    <td className="px-4 py-2.5">{companiesMap[m.company_id] || '—'}</td>
                    <td className="px-4 py-2.5 text-success font-medium">+{m.qty}</td>
                    <td className="px-4 py-2.5 text-text-secondary dark:text-dark-text-secondary">
                      {m.reason || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
      }

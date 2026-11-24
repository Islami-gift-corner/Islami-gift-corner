'use client';

import { useState, useEffect } from 'react';
import { ref, push, set, onValue, update } from 'firebase/database';
import { database, auth } from '@/lib/firebase';
import { recordStockMovement } from '@/lib/stockUtils';
import CompanySelector from '@/components/product/CompanySelector';
import ProductSelector from '@/components/stock/ProductSelector';
import { ShieldAlert, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

export default function WarrantyClaim() {
  const [companyId, setCompanyId] = useState('');
  const [productId, setProductId] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [qty, setQty] = useState('');
  const [issue, setIssue] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const [claims, setClaims] = useState([]);
  const [loadingClaims, setLoadingClaims] = useState(true);
  const [companiesMap, setCompaniesMap] = useState({});

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

  useEffect(() => {
    const claimsRef = ref(database, 'warranty_claims');
    const unsubscribe = onValue(claimsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data)
          .map(([id, value]) => ({ id, ...value }))
          .sort((a, b) => new Date(b.claim_date) - new Date(a.claim_date));
        setClaims(list);
      } else {
        setClaims([]);
      }
      setLoadingClaims(false);
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
    if (!issue.trim()) {
      setError('সমস্যাটি কী তা লিখুন');
      return;
    }

    setSaving(true);
    try {
      // ধাপ ১: স্টক থেকে বাদ (কোম্পানিতে পাঠানো হচ্ছে)
      await recordStockMovement({
        companyId,
        productId,
        type: 'company_return',
        qty: Number(qty),
        reason: `ওয়্যারেন্টি ক্লেইম — ${issue.trim()}`,
        recordedBy: auth.currentUser?.uid || '',
      });

      // ধাপ ২: ক্লেইমের রেকর্ড রাখা
      const claimRef = push(ref(database, 'warranty_claims'));
      await set(claimRef, {
        product_id: productId,
        company_id: companyId,
        product_name: selectedProduct?.name || '',
        qty: Number(qty),
        issue: issue.trim(),
        claim_date: new Date().toISOString(),
        status: 'pending',
      });

      setSuccess('ওয়্যারেন্টি ক্লেইম রেকর্ড হয়েছে, স্টক থেকে বাদ দেওয়া হয়েছে');
      setQty('');
      setIssue('');
    } catch (err) {
      setError(err.message || 'ক্লেইম রেকর্ড করা যায়নি');
    } finally {
      setSaving(false);
    }
  };

  const markResolved = async (claimId) => {
    try {
      await update(ref(database, `warranty_claims/${claimId}`), { status: 'resolved' });
    } catch (err) {
      alert('আপডেট করা যায়নি');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div
        className="bg-background-card dark:bg-dark-card rounded-2xl shadow-sm
                   border border-border dark:border-dark-border p-5 max-w-md w-full"
      >
        <h2 className="flex items-center gap-2 text-base font-semibold text-text-primary dark:text-dark-text-primary mb-1">
          <ShieldAlert size={18} className="text-primary" />
          ওয়্যারেন্টি ক্লেইম (কোম্পানিতে পাঠানো)
        </h2>
        <p className="text-xs text-text-muted dark:text-dark-text-secondary mb-4">
          ত্রুটিপূর্ণ পণ্য কোম্পানিতে ওয়্যারেন্টি ক্লেইমের জন্য পাঠালে এখানে এন্ট্রি করুন
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
              পরিমাণ *
            </label>
            <input
              type="number"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="কতটি পাঠাচ্ছেন"
              className="w-full rounded-xl border border-border dark:border-dark-border
                         bg-background dark:bg-dark-background
                         text-text-primary dark:text-dark-text-primary
                         px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1.5">
              সমস্যার বিবরণ *
            </label>
            <input
              type="text"
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
              placeholder="যেমন: স্ক্রিন কাজ করছে না"
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
            {saving ? 'সংরক্ষণ হচ্ছে...' : 'ক্লেইম রেকর্ড করুন'}
          </button>
        </form>
      </div>

      {/* ক্লেইম তালিকা */}
      <div>
        <h3 className="text-sm font-semibold text-text-primary dark:text-dark-text-primary mb-3">
          ওয়্যারেন্টি ক্লেইম তালিকা
        </h3>

        {loadingClaims ? (
          <p className="text-sm text-text-muted dark:text-dark-text-secondary">লোড হচ্ছে...</p>
        ) : claims.length === 0 ? (
          <p className="text-sm text-text-muted dark:text-dark-text-secondary">
            এখনো কোনো ওয়্যারেন্টি ক্লেইম নেই
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {claims.map((claim) => (
              <div
                key={claim.id}
                className="flex items-start justify-between gap-3 bg-background-card dark:bg-dark-card
                           rounded-xl border border-border dark:border-dark-border p-3"
              >
                <div>
                  <p className="text-sm font-medium text-text-primary dark:text-dark-text-primary">
                    {claim.product_name} × {claim.qty}
                  </p>
                  <p className="text-xs text-text-secondary dark:text-dark-text-secondary">
                    {companiesMap[claim.company_id] || '—'} · {claim.issue}
                  </p>
                  <p className="text-xs text-text-muted dark:text-dark-text-secondary mt-0.5">
                    {new Date(claim.claim_date).toLocaleDateString('bn-BD')}
                  </p>
                </div>

                {claim.status === 'resolved' ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-success bg-success/10 rounded-full px-2.5 py-1 shrink-0">
                    <CheckCircle2 size={12} />
                    সমাধান হয়েছে
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => markResolved(claim.id)}
                    className="flex items-center gap-1 text-xs font-medium text-warning bg-warning/10 rounded-full px-2.5 py-1 shrink-0"
                  >
                    <Clock size={12} />
                    পেন্ডিং
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

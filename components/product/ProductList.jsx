'use client';

import { useState, useEffect } from 'react';
import { ref, onValue, update, remove } from 'firebase/database';
import { database, auth } from '@/lib/firebase';
import { logActivity } from '@/lib/activityLog';
import { Package, Pencil, Trash2, Check, X, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function ProductList({ companyId }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    if (!companyId) {
      setProducts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const productsRef = ref(database, `companies/${companyId}/products`);
    const unsubscribe = onValue(productsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([id, value]) => ({ id, ...value }));
        setProducts(list);
      } else {
        setProducts([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [companyId]);

  const startEdit = (product) => {
    setEditingId(product.id);
    setEditForm({
      name: product.name || '',
      cost_price: product.cost_price ?? '',
      mrp: product.mrp ?? '',
      commission_percent: product.commission_percent ?? '',
      stock_qty: product.stock_qty ?? '',
      low_stock_threshold: product.low_stock_threshold ?? 5,
      warranty_months: product.warranty_months ?? '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async (id) => {
    try {
      await update(ref(database, `companies/${companyId}/products/${id}`), {
        name: editForm.name.trim(),
        cost_price: Number(editForm.cost_price) || 0,
        mrp: Number(editForm.mrp) || 0,
        commission_percent: Number(editForm.commission_percent) || 0,
        stock_qty: Number(editForm.stock_qty) || 0,
        low_stock_threshold: Number(editForm.low_stock_threshold) || 5,
        warranty_months: Number(editForm.warranty_months) || 0,
      });
      setEditingId(null);
    } catch (err) {
      alert('আপডেট করা যায়নি, আবার চেষ্টা করুন');
    }
  };

  const handleDelete = async (id) => {
    try {
      const productName = products.find((p) => p.id === id)?.name || id;
      await remove(ref(database, `companies/${companyId}/products/${id}`));
      await logActivity({
        userId: auth.currentUser?.uid,
        action: 'প্রোডাক্ট ডিলিট',
        target: productName,
      });
      setConfirmDeleteId(null);
    } catch (err) {
      alert('ডিলিট করা যায়নি, আবার চেষ্টা করুন');
    }
  };

  if (!companyId) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 py-12 rounded-2xl
                   border border-dashed border-border dark:border-dark-border"
      >
        <Package size={28} className="text-text-muted" />
        <p className="text-sm text-text-muted dark:text-dark-text-secondary">
          প্রোডাক্ট দেখতে আগে একটা কোম্পানি নির্বাচন করুন
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <p className="text-sm text-text-muted dark:text-dark-text-secondary">
        লোড হচ্ছে...
      </p>
    );
  }

  if (products.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 py-12 rounded-2xl
                   border border-dashed border-border dark:border-dark-border"
      >
        <Package size={28} className="text-text-muted" />
        <p className="text-sm text-text-muted dark:text-dark-text-secondary">
          এই কোম্পানির এখনো কোনো প্রোডাক্ট নেই
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {products.map((product) => {
        const isEditing = editingId === product.id;
        const isLowStock =
          Number(product.stock_qty) <= Number(product.low_stock_threshold ?? 5);

        return (
          <div
            key={product.id}
            className="bg-background-card dark:bg-dark-card rounded-2xl shadow-sm
                       border border-border dark:border-dark-border p-4"
          >
            {isEditing ? (
              <div className="flex flex-col gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-text-secondary dark:text-dark-text-secondary mb-1">প্রোডাক্টের নাম</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="প্রোডাক্টের নাম"
                  className="w-full rounded-lg border border-border dark:border-dark-border
                             bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                             px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-text-secondary dark:text-dark-text-secondary mb-1">ক্রয়মূল্য (৳)</label>
                  <input
                    type="number"
                    value={editForm.cost_price}
                    onChange={(e) => setEditForm((p) => ({ ...p, cost_price: e.target.value }))}
                    placeholder="ক্রয়মূল্য"
                    className="w-full rounded-lg border border-border dark:border-dark-border
                               bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                               px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-text-secondary dark:text-dark-text-secondary mb-1">MRP (৳)</label>
                  <input
                    type="number"
                    value={editForm.mrp}
                    onChange={(e) => setEditForm((p) => ({ ...p, mrp: e.target.value }))}
                    placeholder="MRP"
                    className="w-full rounded-lg border border-border dark:border-dark-border
                               bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                               px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-text-secondary dark:text-dark-text-secondary mb-1">কমিশন (%)</label>
                  <input
                    type="number"
                    value={editForm.commission_percent}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, commission_percent: e.target.value }))
                    }
                    placeholder="কমিশন %"
                    className="w-full rounded-lg border border-border dark:border-dark-border
                               bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                               px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-text-secondary dark:text-dark-text-secondary mb-1">স্টক</label>
                  <input
                    type="number"
                    value={editForm.stock_qty}
                    onChange={(e) => setEditForm((p) => ({ ...p, stock_qty: e.target.value }))}
                    placeholder="স্টক"
                    className="w-full rounded-lg border border-border dark:border-dark-border
                               bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                               px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-text-secondary dark:text-dark-text-secondary mb-1">লো স্টক এলার্ট</label>
                  <input
                    type="number"
                    value={editForm.low_stock_threshold}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, low_stock_threshold: e.target.value }))
                    }
                    placeholder="লো স্টক এলার্ট"
                    className="w-full rounded-lg border border-border dark:border-dark-border
                               bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                               px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-text-secondary dark:text-dark-text-secondary mb-1">ওয়্যারেন্টি (মাস)</label>
                  <input
                    type="number"
                    value={editForm.warranty_months}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, warranty_months: e.target.value }))
                    }
                    placeholder="ওয়্যারেন্টি (মাস)"
                    className="w-full rounded-lg border border-border dark:border-dark-border
                               bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                               px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  </div>
                </div>
                <div className="flex gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => saveEdit(product.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium
                               text-white bg-gradient-to-r from-primary to-primary-light"
                  >
                    <Check size={16} />
                    সংরক্ষণ
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium
                               border border-border dark:border-dark-border text-text-secondary dark:text-dark-text-secondary"
                  >
                    <X size={16} />
                    বাতিল
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="flex items-center gap-2 font-semibold text-text-primary dark:text-dark-text-primary">
                    <Package size={17} className="text-primary shrink-0" />
                    {product.name}
                  </h3>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(product)}
                      aria-label="এডিট করুন"
                      className="p-1.5 rounded-lg text-text-muted hover:bg-background dark:hover:bg-dark-background"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(product.id)}
                      aria-label="ডিলিট করুন"
                      className="p-1.5 rounded-lg text-danger hover:bg-danger/10"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm text-text-secondary dark:text-dark-text-secondary mb-2">
                  <p>ক্রয়মূল্য: ৳{product.cost_price}</p>
                  <p>MRP: ৳{product.mrp}</p>
                  <p>কমিশন: {product.commission_percent ?? 0}%</p>
                  {product.warranty_months > 0 && (
                    <p className="flex items-center gap-1">
                      <ShieldCheck size={13} />
                      {product.warranty_months} মাস
                    </p>
                  )}
                </div>

                <div
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium
                    ${
                      isLowStock
                        ? 'bg-warning/10 text-warning'
                        : 'bg-success/10 text-success'
                    }`}
                >
                  {isLowStock && <AlertTriangle size={12} />}
                  স্টক: {product.stock_qty ?? 0} {isLowStock && '(কম স্টক)'}
                </div>

                {confirmDeleteId === product.id && (
                  <div className="mt-3 p-3 rounded-xl bg-danger/10 flex flex-col gap-2">
                    <p className="text-xs text-danger">এই প্রোডাক্ট ডিলিট করবেন?</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleDelete(product.id)}
                        className="flex-1 rounded-lg py-1.5 text-xs font-medium text-white bg-danger"
                      >
                        হ্যাঁ, ডিলিট করুন
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="flex-1 rounded-lg py-1.5 text-xs font-medium border border-border dark:border-dark-border
                                   text-text-secondary dark:text-dark-text-secondary"
                      >
                        বাতিল
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
                    }

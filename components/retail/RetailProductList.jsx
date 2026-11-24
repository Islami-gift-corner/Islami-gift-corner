'use client';

import { useState, useEffect } from 'react';
import { ref, onValue, update, remove } from 'firebase/database';
import { database, auth } from '@/lib/firebase';
import { logActivity } from '@/lib/activityLog';
import { RETAIL_UNITS } from './AddRetailProduct';
import { ShoppingBag, Pencil, Trash2, Check, X, AlertTriangle } from 'lucide-react';

export default function RetailProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    const productsRef = ref(database, 'retail_products');
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
  }, []);

  const startEdit = (product) => {
    setEditingId(product.id);
    setEditForm({
      name: product.name || '',
      category: product.category || '',
      cost_price: product.cost_price ?? '',
      price: product.price ?? '',
      stock_qty: product.stock_qty ?? '',
      low_stock_threshold: product.low_stock_threshold ?? 5,
      unit: RETAIL_UNITS.includes(product.unit) ? product.unit : '__other__',
      customUnit: RETAIL_UNITS.includes(product.unit) ? '' : product.unit || 'পিস',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async (id) => {
    try {
      const unit = editForm.unit === '__other__' ? editForm.customUnit.trim() : editForm.unit;
      await update(ref(database, `retail_products/${id}`), {
        name: editForm.name.trim(),
        category: editForm.category.trim(),
        cost_price: Number(editForm.cost_price) || 0,
        price: Number(editForm.price) || 0,
        stock_qty: Number(editForm.stock_qty) || 0,
        low_stock_threshold: Number(editForm.low_stock_threshold) || 5,
        unit,
      });
      setEditingId(null);
    } catch (err) {
      alert('আপডেট করা যায়নি, আবার চেষ্টা করুন');
    }
  };

  const handleDelete = async (id) => {
    try {
      const productName = products.find((p) => p.id === id)?.name || id;
      await remove(ref(database, `retail_products/${id}`));
      await logActivity({
        userId: auth.currentUser?.uid,
        action: 'খুচরা পণ্য ডিলিট',
        target: productName,
      });
      setConfirmDeleteId(null);
    } catch (err) {
      alert('ডিলিট করা যায়নি, আবার চেষ্টা করুন');
    }
  };

  if (loading) {
    return <p className="text-sm text-text-muted dark:text-dark-text-secondary">লোড হচ্ছে...</p>;
  }

  if (products.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 py-12 rounded-2xl
                   border border-dashed border-border dark:border-dark-border"
      >
        <ShoppingBag size={28} className="text-text-muted" />
        <p className="text-sm text-text-muted dark:text-dark-text-secondary">
          এখনো কোনো খুচরা পণ্য যোগ করা হয়নি
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {products.map((product) => {
        const isEditing = editingId === product.id;
        const isLowStock = Number(product.stock_qty) <= Number(product.low_stock_threshold ?? 5);

        return (
          <div
            key={product.id}
            className="bg-background-card dark:bg-dark-card rounded-2xl shadow-sm
                       border border-border dark:border-dark-border p-4"
          >
            {isEditing ? (
              <div className="flex flex-col gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-text-secondary dark:text-dark-text-secondary mb-1">পণ্যের নাম</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="পণ্যের নাম"
                  className="w-full rounded-lg border border-border dark:border-dark-border
                             bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                             px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-text-secondary dark:text-dark-text-secondary mb-1">ক্যাটাগরি</label>
                <input
                  type="text"
                  value={editForm.category}
                  onChange={(e) => setEditForm((p) => ({ ...p, category: e.target.value }))}
                  placeholder="ক্যাটাগরি"
                  className="w-full rounded-lg border border-border dark:border-dark-border
                             bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                             px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-text-secondary dark:text-dark-text-secondary mb-1">একক (ইউনিট)</label>
                  <select
                    value={editForm.unit}
                    onChange={(e) => setEditForm((p) => ({ ...p, unit: e.target.value }))}
                    className="w-full rounded-lg border border-border dark:border-dark-border
                               bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                               px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {RETAIL_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                    <option value="__other__">অন্যান্য</option>
                  </select>
                  </div>
                  {editForm.unit === '__other__' && (
                    <div>
                      <label className="block text-[11px] font-medium text-text-secondary dark:text-dark-text-secondary mb-1">একক লিখুন</label>
                    <input
                      type="text"
                      value={editForm.customUnit}
                      onChange={(e) => setEditForm((p) => ({ ...p, customUnit: e.target.value }))}
                      placeholder="একক লিখুন"
                      className="w-full rounded-lg border border-border dark:border-dark-border
                                 bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                                 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    </div>
                  )}
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
                    <label className="block text-[11px] font-medium text-text-secondary dark:text-dark-text-secondary mb-1">বিক্রয়মূল্য (৳)</label>
                  <input
                    type="number"
                    value={editForm.price}
                    onChange={(e) => setEditForm((p) => ({ ...p, price: e.target.value }))}
                    placeholder="বিক্রয়মূল্য"
                    className="w-full rounded-lg border border-border dark:border-dark-border
                               bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                               px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-text-secondary dark:text-dark-text-secondary mb-1">স্টক</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.stock_qty}
                    onChange={(e) => setEditForm((p) => ({ ...p, stock_qty: e.target.value }))}
                    placeholder="স্টক"
                    className="w-full rounded-lg border border-border dark:border-dark-border
                               bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                               px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-text-secondary dark:text-dark-text-secondary mb-1">লো স্টক এলার্ট</label>
                  <input
                    type="number"
                    step="0.01"
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
                    <ShoppingBag size={17} className="text-primary shrink-0" />
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

                {product.category && (
                  <p className="text-xs text-text-muted dark:text-dark-text-secondary mb-1.5">
                    {product.category}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm text-text-secondary dark:text-dark-text-secondary mb-2">
                  <p>ক্রয়মূল্য: ৳{product.cost_price ?? 0}</p>
                  <p>বিক্রয়মূল্য: ৳{product.price ?? 0}</p>
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
                  স্টক: {product.stock_qty ?? 0} {product.unit || 'পিস'} {isLowStock && '(কম স্টক)'}
                </div>

                {confirmDeleteId === product.id && (
                  <div className="mt-3 p-3 rounded-xl bg-danger/10 flex flex-col gap-2">
                    <p className="text-xs text-danger">এই পণ্য ডিলিট করবেন?</p>
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

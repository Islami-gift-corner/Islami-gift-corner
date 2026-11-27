'use client';

import { useEffect, useMemo, useState } from 'react';
import { ref, onValue, push, set, update, remove } from 'firebase/database';
import { database, auth } from '@/lib/firebase';
import { logActivity } from '@/lib/activityLog';
import { money } from '@/lib/format';
import { getNextBarcode, objToList, printBarcodeLabels } from '@/lib/shopUtils';
import { Plus, Search, Printer, Trash2, Pencil, QrCode, AlertCircle, CheckCircle2 } from 'lucide-react';
import BarcodeSvg from './BarcodeSvg';
import { cardCls, inputCls, btnPrimary, btnGhost, mutedCls, labelCls } from './ui';

const EMPTY = { name: '', price: '', unit: 'পিস', barcode: '' };

export default function ShopProducts({ shopId, shopName }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [openBarcode, setOpenBarcode] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onValue(ref(database, `shop_products/${shopId}`), (s) => {
      setProducts(objToList(s.val()).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'bn')));
      setLoading(false);
    });
    return () => unsub();
  }, [shopId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) => (p.name || '').toLowerCase().includes(q) || String(p.barcode || '').includes(q)
    );
  }, [products, search]);

  const setField = (f) => (e) => {
    setForm((p) => ({ ...p, [f]: e.target.value }));
    setError('');
  };

  const startAdd = () => {
    setEditingId(null);
    setForm(EMPTY);
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const startEdit = (p) => {
    setEditingId(p.id);
    setForm({ name: p.name || '', price: p.price ?? '', unit: p.unit || 'পিস', barcode: p.barcode || '' });
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.name.trim()) {
      setError('পণ্যের নাম দিন');
      return;
    }
    if (form.price !== '' && (isNaN(form.price) || Number(form.price) < 0)) {
      setError('সঠিক দাম দিন');
      return;
    }
    const customBarcode = String(form.barcode || '').trim();
    if (customBarcode && products.some((p) => p.barcode === customBarcode && p.id !== editingId)) {
      setError('এই বারকোড অন্য একটা পণ্যে আছে');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await update(ref(database, `shop_products/${shopId}/${editingId}`), {
          name: form.name.trim(),
          price: form.price === '' ? null : Number(form.price),
          unit: form.unit.trim() || 'পিস',
          ...(customBarcode ? { barcode: customBarcode } : {}),
        });
        setSuccess('পণ্য আপডেট হয়েছে');
      } else {
        // বারকোড ফাঁকা রাখলে স্বয়ংক্রিয়ভাবে তৈরি হয়
        const barcode = customBarcode || (await getNextBarcode());
        const newRef = push(ref(database, `shop_products/${shopId}`));
        await set(newRef, {
          name: form.name.trim(),
          price: form.price === '' ? null : Number(form.price),
          unit: form.unit.trim() || 'পিস',
          barcode,
          created_at: new Date().toISOString(),
        });
        await logActivity({
          userId: auth.currentUser?.uid,
          action: 'দোকানের পণ্য যোগ',
          target: `${form.name.trim()} (${barcode})`,
        });
        setSuccess(`"${form.name.trim()}" যোগ হয়েছে — বারকোড: ${barcode}`);
      }
      setForm(EMPTY);
      setEditingId(null);
      setShowForm(false);
    } catch (err) {
      setError('সেভ করা যায়নি, আবার চেষ্টা করুন');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p) => {
    if (!window.confirm(`"${p.name}" মুছে ফেলবেন? (আগের বিক্রয়ের হিসাব ঠিক থাকবে)`)) return;
    try {
      await remove(ref(database, `shop_products/${shopId}/${p.id}`));
    } catch (e) {
      alert('মুছে ফেলা যায়নি');
    }
  };

  const handlePrint = async (list) => {
    const ok = await printBarcodeLabels(list, shopName);
    if (!ok) alert('প্রিন্ট উইন্ডো খোলা যায়নি — পপ-আপ ব্লক করা থাকলে অনুমতি দিন');
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={startAdd} className={`${btnPrimary} flex items-center gap-2`}>
          <Plus size={16} />
          নতুন পণ্য
        </button>
        {products.length > 0 && (
          <button
            type="button"
            onClick={() => handlePrint(filtered)}
            className={`${btnGhost} flex items-center gap-2`}
          >
            <Printer size={16} />
            {search ? 'ফিল্টার করা' : 'সব'} বারকোড প্রিন্ট
          </button>
        )}
      </div>

      {success && (
        <p className="flex items-center gap-2 text-xs text-success bg-success/10 rounded-lg px-3 py-2">
          <CheckCircle2 size={14} />
          {success}
        </p>
      )}

      {showForm && (
        <form onSubmit={handleSave} className={`${cardCls} flex flex-col gap-3 max-w-md`}>
          <h2 className="text-base font-semibold text-text-primary dark:text-dark-text-primary">
            {editingId ? 'পণ্য সম্পাদনা' : 'নতুন পণ্য'}
          </h2>
          <input type="text" value={form.name} onChange={setField('name')} placeholder="পণ্যের নাম *" className={inputCls} />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>সাধারণ দাম (ঐচ্ছিক)</label>
              <input type="number" inputMode="decimal" value={form.price} onChange={setField('price')} placeholder="৳" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>একক</label>
              <input type="text" value={form.unit} onChange={setField('unit')} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>
              বারকোড {editingId ? '' : '(ফাঁকা রাখলে স্বয়ংক্রিয় তৈরি হবে)'}
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={form.barcode}
              onChange={setField('barcode')}
              placeholder={editingId ? '' : 'প্যাকেটে আগে থেকে বারকোড থাকলে এখানে লিখুন'}
              className={inputCls}
            />
          </div>
          <p className={`text-[11px] ${mutedCls}`}>
            💡 দাম ঐচ্ছিক — বিক্রির সময় সেলসম্যান প্রতিবার নিজে দাম লিখতে পারবে। এখানে দাম দিলে শুধু আগে থেকে বসানো থাকবে।
          </p>
          {error && (
            <p className="flex items-center gap-2 text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">
              <AlertCircle size={14} />
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className={`${btnPrimary} flex-1`}>
              {saving ? 'সেভ হচ্ছে...' : editingId ? 'আপডেট করুন' : 'পণ্য যোগ করুন'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className={btnGhost}>
              বাতিল
            </button>
          </div>
        </form>
      )}

      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="নাম বা বারকোড দিয়ে খুঁজুন"
          className={`${inputCls} pl-9`}
        />
      </div>

      {loading ? (
        <p className={`text-sm ${mutedCls}`}>লোড হচ্ছে...</p>
      ) : filtered.length === 0 ? (
        <p className={`text-sm ${mutedCls}`}>{products.length === 0 ? 'এখনো কোনো পণ্য যোগ করা হয়নি' : 'কিছু পাওয়া যায়নি'}</p>
      ) : (
        <div className="flex flex-col gap-2">
          <p className={`text-xs ${mutedCls}`}>{filtered.length}টি পণ্য</p>
          {filtered.map((p) => (
            <div key={p.id} className={`${cardCls} !p-3`}>
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary dark:text-dark-text-primary truncate">{p.name}</p>
                  <p className={`text-xs ${mutedCls}`}>
                    {p.price != null ? `৳${money(p.price)} / ${p.unit || 'পিস'}` : 'দাম নির্ধারিত নেই'} • {p.barcode}
                  </p>
                </div>
                <button type="button" onClick={() => setOpenBarcode(openBarcode === p.id ? null : p.id)} aria-label="বারকোড দেখুন" className="p-2 rounded-lg text-text-secondary hover:bg-background dark:hover:bg-dark-background">
                  <QrCode size={16} />
                </button>
                <button type="button" onClick={() => handlePrint([p])} aria-label="প্রিন্ট" className="p-2 rounded-lg text-text-secondary hover:bg-background dark:hover:bg-dark-background">
                  <Printer size={16} />
                </button>
                <button type="button" onClick={() => startEdit(p)} aria-label="সম্পাদনা" className="p-2 rounded-lg text-text-secondary hover:bg-background dark:hover:bg-dark-background">
                  <Pencil size={16} />
                </button>
                <button type="button" onClick={() => handleDelete(p)} aria-label="মুছুন" className="p-2 rounded-lg text-danger hover:bg-danger/10">
                  <Trash2 size={16} />
                </button>
              </div>
              {openBarcode === p.id && (
                <div className="mt-3 flex justify-center">
                  <BarcodeSvg code={p.barcode} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

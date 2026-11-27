'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ref, onValue, push, set } from 'firebase/database';
import { database, auth } from '@/lib/firebase';
import { logActivity } from '@/lib/activityLog';
import { objToList } from '@/lib/shopUtils';
import { Store, Plus, ChevronRight, AlertCircle, CheckCircle2, MapPin } from 'lucide-react';
import { cardCls, inputCls, btnPrimary, btnGhost, mutedCls } from './ui';

export default function ShopList() {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', phone: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onValue(ref(database, 'shops'), (s) => {
      setShops(objToList(s.val()).sort((a, b) => (a.created_at || '').localeCompare(b.created_at || '')));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.name.trim()) {
      setError('দোকানের নাম দিন');
      return;
    }
    setSaving(true);
    try {
      const newRef = push(ref(database, 'shops'));
      await set(newRef, {
        name: form.name.trim(),
        address: form.address.trim(),
        phone: form.phone.trim(),
        status: 'active',
        created_at: new Date().toISOString(),
      });
      await logActivity({
        userId: auth.currentUser?.uid,
        action: 'দোকান যোগ',
        target: form.name.trim(),
      });
      setSuccess(`"${form.name.trim()}" দোকান যোগ হয়েছে`);
      setForm({ name: '', address: '', phone: '' });
      setAdding(false);
    } catch (err) {
      setError('দোকান যোগ করা যায়নি, আবার চেষ্টা করুন');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {success && (
        <p className="flex items-center gap-2 text-xs text-success bg-success/10 rounded-lg px-3 py-2">
          <CheckCircle2 size={14} />
          {success}
        </p>
      )}

      {adding ? (
        <form onSubmit={handleAdd} className={`${cardCls} flex flex-col gap-3 max-w-md`}>
          <h2 className="flex items-center gap-2 text-base font-semibold text-text-primary dark:text-dark-text-primary">
            <Store size={18} className="text-primary" />
            নতুন দোকান
          </h2>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="দোকানের নাম *"
            className={inputCls}
          />
          <input
            type="text"
            value={form.address}
            onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
            placeholder="ঠিকানা"
            className={inputCls}
          />
          <input
            type="text"
            value={form.phone}
            onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
            placeholder="মোবাইল নম্বর"
            className={inputCls}
          />
          {error && (
            <p className="flex items-center gap-2 text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">
              <AlertCircle size={14} />
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className={`${btnPrimary} flex-1`}>
              {saving ? 'সেভ হচ্ছে...' : 'দোকান যোগ করুন'}
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setError('');
              }}
              className={btnGhost}
            >
              বাতিল
            </button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className={`${btnPrimary} w-fit flex items-center gap-2`}>
          <Plus size={16} />
          নতুন দোকান যোগ করুন
        </button>
      )}

      {loading ? (
        <p className={`text-sm ${mutedCls}`}>লোড হচ্ছে...</p>
      ) : shops.length === 0 ? (
        <p className={`text-sm ${mutedCls}`}>এখনো কোনো দোকান যোগ করা হয়নি</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {shops.map((shop) => (
            <Link
              key={shop.id}
              href={`/admin/shops/${shop.id}`}
              className={`${cardCls} flex items-center gap-3 hover:border-primary transition-colors`}
            >
              <div className="p-3 rounded-full bg-primary/10">
                <Store size={20} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary dark:text-dark-text-primary truncate">
                  {shop.name}
                </p>
                {shop.address && (
                  <p className={`flex items-center gap-1 text-xs ${mutedCls} truncate`}>
                    <MapPin size={11} />
                    {shop.address}
                  </p>
                )}
              </div>
              <ChevronRight size={18} className={mutedCls} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

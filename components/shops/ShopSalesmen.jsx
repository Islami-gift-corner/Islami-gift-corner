'use client';

import { useState } from 'react';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { ref, set, update } from 'firebase/database';
import { database, auth } from '@/lib/firebase';
import { getSecondaryAuth } from '@/lib/firebaseSecondary';
import { logActivity } from '@/lib/activityLog';
import { UserPlus, AlertCircle, CheckCircle2, Phone, Mail } from 'lucide-react';
import { useShopSalesmen } from './useShopData';
import { cardCls, inputCls, btnPrimary, btnGhost, mutedCls } from './ui';

const EMPTY = { name: '', phone: '', email: '', password: '' };

export default function ShopSalesmen({ shopId, shopName }) {
  const { salesmen, loading } = useShopSalesmen(shopId);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const setField = (f) => (e) => {
    setForm((p) => ({ ...p, [f]: e.target.value }));
    setError('');
  };

  const handleHire = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setError('নাম, ইমেইল ও পাসওয়ার্ড আবশ্যক');
      return;
    }
    if (form.password.length < 6) {
      setError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে');
      return;
    }

    setSaving(true);
    try {
      // দ্বিতীয় Auth দিয়ে তৈরি করা হয়, যাতে অ্যাডমিন নিজে লগআউট না হয়
      const secondaryAuth = getSecondaryAuth();
      const cred = await createUserWithEmailAndPassword(secondaryAuth, form.email.trim(), form.password);
      const newUid = cred.user.uid;

      await set(ref(database, `users/${newUid}`), {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        role: 'salesman',
        shopId,
        status: 'active',
        joining_date: new Date().toISOString().split('T')[0],
        photo_url: '',
      });
      await signOut(secondaryAuth);

      await logActivity({
        userId: auth.currentUser?.uid,
        action: 'সেলসম্যান নিয়োগ',
        target: `${form.name.trim()} — ${shopName}`,
      });
      setSuccess(`"${form.name.trim()}" নিয়োগ হয়েছে। লগইন: ${form.email.trim()}`);
      setForm(EMPTY);
      setShowForm(false);
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') setError('এই ইমেইলে আগে থেকেই একাউন্ট আছে');
      else if (err.code === 'auth/invalid-email') setError('সঠিক ইমেইল দিন');
      else if (err.code === 'auth/weak-password') setError('পাসওয়ার্ডটি দুর্বল, আরও শক্তিশালী দিন');
      else setError('সেলসম্যান তৈরি করা যায়নি, আবার চেষ্টা করুন');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (m) => {
    const next = m.status === 'inactive' ? 'active' : 'inactive';
    const msg =
      next === 'inactive'
        ? `"${m.name}" কে নিষ্ক্রিয় করবেন? সে আর লগইন করতে পারবে না (আগের হিসাব থাকবে)।`
        : `"${m.name}" কে আবার সক্রিয় করবেন?`;
    if (!window.confirm(msg)) return;
    try {
      await update(ref(database, `users/${m.id}`), { status: next });
      await logActivity({
        userId: auth.currentUser?.uid,
        action: next === 'inactive' ? 'সেলসম্যান নিষ্ক্রিয়' : 'সেলসম্যান সক্রিয়',
        target: m.name,
      });
    } catch (e) {
      alert('পরিবর্তন করা যায়নি');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {!showForm && (
        <button type="button" onClick={() => setShowForm(true)} className={`${btnPrimary} w-fit flex items-center gap-2`}>
          <UserPlus size={16} />
          নতুন সেলসম্যান
        </button>
      )}

      {success && (
        <p className="flex items-center gap-2 text-xs text-success bg-success/10 rounded-lg px-3 py-2">
          <CheckCircle2 size={14} />
          {success}
        </p>
      )}

      {showForm && (
        <form onSubmit={handleHire} className={`${cardCls} flex flex-col gap-3 max-w-md`}>
          <h2 className="text-base font-semibold text-text-primary dark:text-dark-text-primary">
            নতুন সেলসম্যান — {shopName}
          </h2>
          <input type="text" value={form.name} onChange={setField('name')} placeholder="পুরো নাম *" className={inputCls} />
          <input type="text" value={form.phone} onChange={setField('phone')} placeholder="মোবাইল নম্বর" className={inputCls} />
          <input type="email" value={form.email} onChange={setField('email')} placeholder="ইমেইল (লগইনের জন্য) *" className={inputCls} />
          <input type="text" value={form.password} onChange={setField('password')} placeholder="পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর) *" className={inputCls} />
          {error && (
            <p className="flex items-center gap-2 text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">
              <AlertCircle size={14} />
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className={`${btnPrimary} flex-1`}>
              {saving ? 'তৈরি হচ্ছে...' : 'নিয়োগ দিন'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className={btnGhost}>
              বাতিল
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className={`text-sm ${mutedCls}`}>লোড হচ্ছে...</p>
      ) : salesmen.length === 0 ? (
        <p className={`text-sm ${mutedCls}`}>এই দোকানে এখনো কোনো সেলসম্যান নেই</p>
      ) : (
        <div className="flex flex-col gap-2">
          {salesmen.map((m) => (
            <div key={m.id} className={`${cardCls} !p-3 flex items-center gap-3`}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary dark:text-dark-text-primary">
                  {m.name}
                  {m.status === 'inactive' && (
                    <span className="ml-2 text-[11px] text-danger bg-danger/10 rounded-full px-2 py-0.5">নিষ্ক্রিয়</span>
                  )}
                </p>
                <p className={`text-xs ${mutedCls} flex flex-wrap gap-x-3`}>
                  {m.phone && (
                    <span className="flex items-center gap-1">
                      <Phone size={11} />
                      {m.phone}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Mail size={11} />
                    {m.email}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleStatus(m)}
                className={`text-xs font-medium rounded-lg px-3 py-1.5 border ${
                  m.status === 'inactive'
                    ? 'border-primary text-primary'
                    : 'border-danger text-danger'
                }`}
              >
                {m.status === 'inactive' ? 'সক্রিয় করুন' : 'নিষ্ক্রিয় করুন'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

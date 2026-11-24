'use client';

import { useState, useEffect } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { database, auth } from '@/lib/firebase';
import { UserRound, Phone, MapPin, Image as ImageIcon, CheckCircle2, AlertCircle } from 'lucide-react';

export default function SRProfile({ targetUserId, isAdminView = false }) {
  const uid = targetUserId || auth.currentUser?.uid;

  const [profile, setProfile] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({ name: '', phone: '', area: '', photoUrl: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!uid) return;

    const userRef = ref(database, `users/${uid}`);
    const unsubUser = onValue(userRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setProfile(data);
        setForm({
          name: data.name || '',
          phone: data.phone || '',
          area: data.area || '',
          photoUrl: data.photo_url || '',
        });
      }
      setLoading(false);
    });

    const invoicesRef = ref(database, 'invoices');
    const unsubInvoices = onValue(invoicesRef, (snapshot) => {
      const data = snapshot.val();
      setInvoices(data ? Object.values(data) : []);
    });

    return () => {
      unsubUser();
      unsubInvoices();
    };
  }, [uid]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.name.trim()) {
      setError('নাম দিন');
      return;
    }

    setSaving(true);
    try {
      await update(ref(database, `users/${uid}`), {
        name: form.name.trim(),
        phone: form.phone.trim(),
        area: form.area.trim(),
        photo_url: form.photoUrl.trim(),
      });
      setSuccess('প্রোফাইল আপডেট হয়েছে');
    } catch (err) {
      setError('আপডেট করা যায়নি, আবার চেষ্টা করুন');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-text-muted dark:text-dark-text-secondary">লোড হচ্ছে...</p>;
  }

  if (!profile) {
    return <p className="text-sm text-text-muted dark:text-dark-text-secondary">প্রোফাইল পাওয়া যায়নি</p>;
  }

  // এই মাসের বিক্রয় ও কমিশন সামারি
  const now = new Date();
  const thisMonthInvoices = invoices.filter((inv) => {
    if (inv.sr_id !== uid) return false;
    const d = new Date(inv.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const monthSales = thisMonthInvoices.reduce((sum, inv) => sum + (inv.subtotal || 0), 0);
  const monthInvoiceCount = thisMonthInvoices.length;

  return (
    <div className="flex flex-col gap-6 max-w-md">
      {/* প্রোফাইল ফর্ম */}
      <div
        className="bg-background-card dark:bg-dark-card rounded-2xl shadow-sm
                   border border-border dark:border-dark-border p-5"
      >
        <div className="flex flex-col items-center gap-2 mb-5">
          <div className="w-20 h-20 rounded-full bg-background dark:bg-dark-background border border-border dark:border-dark-border overflow-hidden flex items-center justify-center">
            {form.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.photoUrl} alt={form.name} className="w-full h-full object-cover" />
            ) : (
              <UserRound size={32} className="text-text-muted" />
            )}
          </div>
          <p className="text-xs text-text-muted dark:text-dark-text-secondary">{profile.email}</p>
          {profile.joining_date && (
            <p className="text-xs text-text-muted dark:text-dark-text-secondary">
              যোগদান: {profile.joining_date}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1.5">
              নাম
            </label>
            <div className="relative">
              <UserRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full rounded-xl border border-border dark:border-dark-border
                           bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                           pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1.5">
              ফোন
            </label>
            <div className="relative">
              <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                className="w-full rounded-xl border border-border dark:border-dark-border
                           bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                           pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1.5">
              এলাকা
            </label>
            <div className="relative">
              <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={form.area}
                onChange={(e) => setForm((p) => ({ ...p, area: e.target.value }))}
                className="w-full rounded-xl border border-border dark:border-dark-border
                           bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                           pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1.5">
              প্রোফাইল ছবির লিংক (ঐচ্ছিক)
            </label>
            <div className="relative">
              <ImageIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={form.photoUrl}
                onChange={(e) => setForm((p) => ({ ...p, photoUrl: e.target.value }))}
                placeholder="https://..."
                className="w-full rounded-xl border border-border dark:border-dark-border
                           bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                           pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-text-muted"
              />
            </div>
            <p className="text-[11px] text-text-muted dark:text-dark-text-secondary mt-1">
              💡 ফ্রি প্ল্যানে সরাসরি ছবি আপলোড সাপোর্ট নেই (Firebase Storage এখন ফ্রি না)।
              ছবিটা Google Photos/imgur এ আপলোড করে সেই লিংক এখানে বসান।
            </p>
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
                       bg-gradient-to-r from-primary to-primary-light disabled:opacity-60"
          >
            {saving ? 'সংরক্ষণ হচ্ছে...' : 'প্রোফাইল আপডেট করুন'}
          </button>
        </form>
      </div>

      {/* এই মাসের সামারি */}
      <div
        className="bg-background-card dark:bg-dark-card rounded-2xl shadow-sm
                   border border-border dark:border-dark-border p-5"
      >
        <h3 className="text-sm font-semibold text-text-primary dark:text-dark-text-primary mb-3">
          এই মাসের সামারি
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-background dark:bg-dark-background p-3 text-center">
            <p className="text-xs text-text-muted dark:text-dark-text-secondary mb-1">বিক্রয়</p>
            <p className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">
              ৳{monthSales}
            </p>
          </div>
          <div className="rounded-xl bg-background dark:bg-dark-background p-3 text-center">
            <p className="text-xs text-text-muted dark:text-dark-text-secondary mb-1">ইনভয়েস সংখ্যা</p>
            <p className="text-sm font-semibold text-primary">{monthInvoiceCount}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
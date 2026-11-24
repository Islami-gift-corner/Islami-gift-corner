'use client';

import { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { ref, set, onValue } from 'firebase/database';
import { database, auth } from '@/lib/firebase';
import { getSecondaryAuth } from '@/lib/firebaseSecondary';
import { logActivity } from '@/lib/activityLog';
import { UserPlus, CheckCircle2, AlertCircle, Building2 } from 'lucide-react';

export default function HireSR({ onHired }) {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    area: '',
    joiningDate: new Date().toISOString().split('T')[0],
    password: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  // কোম্পানি লিস্ট — এডমিন চাইলে এই SR কে নির্দিষ্ট কোম্পানির প্রোডাক্ট বিক্রির জন্য
  // সীমাবদ্ধ করে দিতে পারবে (একাধিক কোম্পানিও সিলেক্ট করা যাবে)। কিছু সিলেক্ট না করলে
  // SR সব কোম্পানির প্রোডাক্টই বিক্রি করতে পারবে (ডিফল্ট, কোনো বাধা নেই)।
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState([]);

  useEffect(() => {
    const companiesRef = ref(database, 'companies');
    const unsubscribe = onValue(companiesRef, (snapshot) => {
      const data = snapshot.val();
      setCompanies(data ? Object.entries(data).map(([id, value]) => ({ id, ...value })) : []);
    });
    return () => unsubscribe();
  }, []);

  const toggleCompany = (id) => {
    setSelectedCompanyIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (error) setError('');
  };

  const resetForm = () => {
    setForm({
      name: '',
      phone: '',
      email: '',
      area: '',
      joiningDate: new Date().toISOString().split('T')[0],
      password: '',
    });
    setSelectedCompanyIds([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setError('নাম, ইমেইল ও পাসওয়ার্ড আবশ্যক');
      return;
    }
    if (form.password.length < 6) {
      setError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে');
      return;
    }

    setSaving(true);
    try {
      const secondaryAuth = getSecondaryAuth();

      // ধাপ ১: দ্বিতীয় Auth ইনস্ট্যান্স দিয়ে নতুন ইউজার তৈরি (Admin এর সেশন অক্ষত থাকবে)
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        form.email.trim(),
        form.password
      );
      const newUid = userCredential.user.uid;

      // ধাপ ২: Realtime Database এ তথ্য সংরক্ষণ
      await set(ref(database, `users/${newUid}`), {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        role: 'sr',
        area: form.area.trim(),
        joining_date: form.joiningDate,
        status: 'active',
        photo_url: '',
        // কিছু কোম্পানি সিলেক্ট করা থাকলেই শুধু allowed_companies সেভ হবে —
        // খালি রাখলে SR সব কোম্পানির প্রোডাক্ট বিক্রি করতে পারবে (কোনো বাধা নেই)
        ...(selectedCompanyIds.length > 0
          ? {
              allowed_companies: selectedCompanyIds.reduce(
                (acc, id) => ({ ...acc, [id]: true }),
                {}
              ),
            }
          : {}),
      });

      // ধাপ ৩: দ্বিতীয় Auth ইনস্ট্যান্স থেকে সাইন-আউট (পরিষ্কার রাখার জন্য)
      await signOut(secondaryAuth);

      setSuccess(`SR "${form.name}" সফলভাবে নিয়োগ হয়েছে`);
      await logActivity({
        userId: auth.currentUser?.uid,
        action: 'SR নিয়োগ',
        target: `${form.name} (${form.email})`,
      });
      resetForm();
      if (onHired) onHired();
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError('এই ইমেইলে আগে থেকেই একাউন্ট আছে');
      } else if (err.code === 'auth/invalid-email') {
        setError('সঠিক ইমেইল দিন');
      } else if (err.code === 'auth/weak-password') {
        setError('পাসওয়ার্ডটি দুর্বল, আরও শক্তিশালী পাসওয়ার্ড দিন');
      } else {
        setError('SR তৈরি করা যায়নি, আবার চেষ্টা করুন');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="bg-background-card dark:bg-dark-card rounded-2xl shadow-sm
                 border border-border dark:border-dark-border p-5 max-w-md w-full"
    >
      <h2 className="flex items-center gap-2 text-base font-semibold text-text-primary dark:text-dark-text-primary mb-4">
        <UserPlus size={18} className="text-primary" />
        নতুন SR/DSR নিয়োগ
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="text"
          value={form.name}
          onChange={handleChange('name')}
          placeholder="পুরো নাম *"
          className="rounded-xl border border-border dark:border-dark-border
                     bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                     px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-text-muted"
        />
        <input
          type="text"
          value={form.phone}
          onChange={handleChange('phone')}
          placeholder="মোবাইল নম্বর"
          className="rounded-xl border border-border dark:border-dark-border
                     bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                     px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-text-muted"
        />
        <input
          type="email"
          value={form.email}
          onChange={handleChange('email')}
          placeholder="ইমেইল (লগইনের জন্য) *"
          className="rounded-xl border border-border dark:border-dark-border
                     bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                     px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-text-muted"
        />
        <input
          type="text"
          value={form.area}
          onChange={handleChange('area')}
          placeholder="কর্মক্ষেত্র/এলাকা"
          className="rounded-xl border border-border dark:border-dark-border
                     bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                     px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-text-muted"
        />
        <div>
          <label className="block text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1.5">
            জয়েনিং তারিখ
          </label>
          <input
            type="date"
            value={form.joiningDate}
            onChange={handleChange('joiningDate')}
            className="w-full rounded-xl border border-border dark:border-dark-border
                       bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                       px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1.5">
            <span className="flex items-center gap-1.5">
              <Building2 size={13} />
              কোম্পানি অনুমোদন (ঐচ্ছিক)
            </span>
          </label>
          {companies.length === 0 ? (
            <p className="text-xs text-text-muted dark:text-dark-text-secondary">
              এখনো কোনো কোম্পানি যোগ করা হয়নি
            </p>
          ) : (
            <div
              className="rounded-xl border border-border dark:border-dark-border
                         bg-background dark:bg-dark-background p-3 flex flex-col gap-2 max-h-48 overflow-y-auto"
            >
              {companies.map((company) => (
                <label
                  key={company.id}
                  className="flex items-center gap-2 text-sm text-text-primary dark:text-dark-text-primary cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedCompanyIds.includes(company.id)}
                    onChange={() => toggleCompany(company.id)}
                    className="rounded accent-primary"
                  />
                  {company.name}
                </label>
              ))}
            </div>
          )}
          <p className="text-[11px] text-text-muted dark:text-dark-text-secondary mt-1.5">
            💡 কোনোটা সিলেক্ট না করলে এই SR সব কোম্পানির প্রোডাক্ট বিক্রি করতে পারবে। নির্দিষ্ট
            কোম্পানি সিলেক্ট করলে সে শুধু ওই কোম্পানি(গুলোর) প্রোডাক্টই ইনভয়েসে যোগ করতে পারবে।
          </p>
        </div>
        <input
          type="text"
          value={form.password}
          onChange={handleChange('password')}
          placeholder="ডিফল্ট পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর) *"
          className="rounded-xl border border-border dark:border-dark-border
                     bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                     px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-text-muted"
        />

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
                     hover:from-primary-dark hover:to-primary transition-colors disabled:opacity-60"
        >
          {saving ? 'তৈরি হচ্ছে...' : 'SR নিয়োগ করুন'}
        </button>
      </form>

      <p className="text-xs text-text-muted dark:text-dark-text-secondary mt-3">
        💡 এই ইমেইল-পাসওয়ার্ড দিয়ে SR লগইন পেজ থেকে প্রবেশ করতে পারবে।
      </p>
    </div>
  );
}
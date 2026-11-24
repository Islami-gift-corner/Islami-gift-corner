'use client';

import { useState } from 'react';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth';
import { ref, update } from 'firebase/database';
import { auth, database } from '@/lib/firebase';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ChangePassword() {
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (error) setError('');
    if (success) setSuccess('');
  };

  const toggleShow = (field) => () => {
    setShow((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const { currentPassword, newPassword, confirmPassword } = form;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('সব কয়টা ফিল্ড পূরণ করুন');
      return;
    }
    if (newPassword.length < 6) {
      setError('নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('নতুন পাসওয়ার্ড দুটো মিলছে না');
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;

      // ধাপ ১: বর্তমান পাসওয়ার্ড দিয়ে re-authenticate (নিরাপত্তার জন্য বাধ্যতামূলক)
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // ধাপ ২: নতুন পাসওয়ার্ড সেট করা
      await updatePassword(user, newPassword);

      // ধাপ ৩: শেষ কবে পরিবর্তন হলো তার রেকর্ড রাখা
      await update(ref(database, `users/${user.uid}`), {
        password_last_changed: new Date().toISOString(),
      });

      setSuccess('পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError('বর্তমান পাসওয়ার্ড ভুল হয়েছে');
      } else if (err.code === 'auth/weak-password') {
        setError('পাসওয়ার্ডটি খুব দুর্বল, আরও শক্তিশালী পাসওয়ার্ড দিন');
      } else if (err.code === 'auth/requires-recent-login') {
        setError('নিরাপত্তার জন্য আবার লগইন করে তারপর চেষ্টা করুন');
      } else {
        setError('পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে, আবার চেষ্টা করুন');
      }
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { key: 'currentPassword', showKey: 'current', label: 'বর্তমান পাসওয়ার্ড' },
    { key: 'newPassword', showKey: 'next', label: 'নতুন পাসওয়ার্ড' },
    { key: 'confirmPassword', showKey: 'confirm', label: 'নতুন পাসওয়ার্ড আবার লিখুন' },
  ];

  return (
    <div
      className="bg-background-card dark:bg-dark-card rounded-2xl shadow-sm
                 border border-border dark:border-dark-border p-6 max-w-md w-full"
    >
      <h2 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary mb-1">
        পাসওয়ার্ড পরিবর্তন
      </h2>
      <p className="text-sm text-text-muted dark:text-dark-text-secondary mb-6">
        নিরাপত্তার জন্য নিয়মিত পাসওয়ার্ড পরিবর্তন করুন
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {fields.map(({ key, showKey, label }) => (
          <div key={key}>
            <label className="block text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1.5">
              {label}
            </label>
            <div className="relative">
              <Lock
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted dark:text-dark-text-secondary"
              />
              <input
                type={show[showKey] ? 'text' : 'password'}
                value={form[key]}
                onChange={handleChange(key)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-border dark:border-dark-border
                           bg-background dark:bg-dark-background
                           text-text-primary dark:text-dark-text-primary
                           pl-10 pr-10 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                           placeholder:text-text-muted"
              />
              <button
                type="button"
                onClick={toggleShow(showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted dark:text-dark-text-secondary"
                aria-label={show[showKey] ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখান'}
              >
                {show[showKey] ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
        ))}

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
          disabled={loading}
          className="mt-2 w-full rounded-xl py-2.5 text-sm font-medium text-white
                     bg-gradient-to-r from-primary to-primary-light
                     hover:from-primary-dark hover:to-primary
                     transition-colors disabled:opacity-60"
        >
          {loading ? 'পরিবর্তন হচ্ছে...' : 'পাসওয়ার্ড পরিবর্তন করুন'}
        </button>
      </form>
    </div>
  );
                        }

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { brand } from '@/lib/brand';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { auth, database } from '@/lib/firebase';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, UserRound, Store } from 'lucide-react';
import { SHOPS_ENABLED, SR_ENABLED } from '@/lib/features';

// কোন কোন ট্যাব দেখাবে — features.js অনুযায়ী
const ROLE_TABS = [
  { id: 'admin', label: 'Admin Login', title: 'অ্যাডমিন লগইন', name: 'Admin', icon: ShieldCheck, home: '/admin/dashboard' },
  ...(SHOPS_ENABLED
    ? [{ id: 'salesman', label: 'Salesman Login', title: 'সেলসম্যান লগইন', name: 'Salesman', icon: Store, home: '/shop/dashboard' }]
    : []),
  ...(SR_ENABLED
    ? [{ id: 'sr', label: 'SR Login', title: 'এসআর লগইন', name: 'SR', icon: UserRound, home: '/sr/dashboard' }]
    : []),
];

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState('admin');
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.email.trim() || !form.password.trim()) {
      setError('ইমেইল ও পাসওয়ার্ড দুটোই দিন');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        form.email.trim(),
        form.password
      );
      const uid = userCredential.user.uid;

      const snapshot = await get(ref(database, `users/${uid}`));

      if (!snapshot.exists()) {
        setError('এই একাউন্টের তথ্য ডাটাবেসে পাওয়া যায়নি, Admin এর সাথে যোগাযোগ করুন');
        setLoading(false);
        return;
      }

      const userData = snapshot.val();

      if (userData.status === 'inactive') {
        setError('আপনার একাউন্ট নিষ্ক্রিয় করা আছে, Admin এর সাথে যোগাযোগ করুন');
        setLoading(false);
        return;
      }

      if (userData.role !== role) {
        setError(
          `এই একাউন্টটি "${ROLE_TABS.find((t) => t.id === userData.role)?.name || userData.role}" — সঠিক ট্যাব থেকে লগইন করুন`
        );
        setLoading(false);
        return;
      }

      router.push(ROLE_TABS.find((t) => t.id === userData.role)?.home || '/admin/dashboard');
    } catch (err) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError('ইমেইল অথবা পাসওয়ার্ড ভুল হয়েছে');
      } else if (err.code === 'auth/user-not-found') {
        setError('এই ইমেইলে কোনো একাউন্ট নেই');
      } else if (err.code === 'auth/too-many-requests') {
        setError('অনেকবার চেষ্টা হয়েছে, একটু পরে আবার চেষ্টা করুন');
      } else {
        setError('লগইন ব্যর্থ হয়েছে, আবার চেষ্টা করুন');
      }
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-4 py-10
                 bg-gradient-to-b from-background to-background-sidebar
                 dark:from-dark-background dark:to-dark-sidebar
                 transition-colors duration-300"
    >
      <div className="w-full max-w-sm">
        {/* লোগো — আরও বড়, নিচে ব্যবসার নাম কাছাকাছি */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative w-60 h-60 sm:w-72 sm:h-72">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={brand.logo} alt={brand.name} className="w-full h-full object-contain" />
          </div>
          <p className="-mt-3 text-primary dark:text-primary-light text-xl font-semibold tracking-wide">
            {brand.name}
          </p>
        </div>

        {/* কার্ড */}
        <div
          className="bg-background-card dark:bg-dark-card rounded-2xl shadow-sm
                     border border-border dark:border-dark-border p-6"
        >
          {/* Role Tabs */}
          <div
            className="flex gap-1 p-1 rounded-xl bg-background dark:bg-dark-background
                       border border-border dark:border-dark-border mb-6"
          >
            {ROLE_TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setRole(id)}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors
                  ${
                    role === id
                      ? 'bg-gradient-to-r from-primary to-primary-light text-white shadow-sm'
                      : 'text-text-secondary dark:text-dark-text-secondary'
                  }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>

          <h1 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary mb-6">
            {ROLE_TABS.find((t) => t.id === role)?.title}
          </h1>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1.5">
                ইমেইল
              </label>
              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted dark:text-dark-text-secondary"
                />
                <input
                  type="email"
                  value={form.email}
                  onChange={handleChange('email')}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-border dark:border-dark-border
                             bg-background dark:bg-dark-background
                             text-text-primary dark:text-dark-text-primary
                             pl-10 pr-3 py-2.5 text-sm
                             focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                             placeholder:text-text-muted"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1.5">
                পাসওয়ার্ড
              </label>
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted dark:text-dark-text-secondary"
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange('password')}
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
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted dark:text-dark-text-secondary"
                  aria-label={showPassword ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখান'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">
                {error}
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
              {loading ? 'লগইন হচ্ছে...' : 'লগইন করুন'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-text-muted dark:text-dark-text-secondary mt-6">
          © {new Date().getFullYear()} {brand.name}
        </p>
      </div>
    </div>
  );
}

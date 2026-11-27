'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { auth, database } from '@/lib/firebase';
import Topbar from './Topbar';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import FloatingCalculator from '@/components/calculator/FloatingCalculator';
import { brand } from '@/lib/brand';

const DARK_MODE_KEY = `${brand.slug}-dark-mode`;

const HOME_BY_ROLE = {
  admin: '/admin/dashboard',
  salesman: '/shop/dashboard',
  sr: '/sr/dashboard',
};

export default function AppShell({ role = 'admin', guard = true, children }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [allowed, setAllowed] = useState(!guard);

  // পেজ-গার্ড: লগইন না থাকলে বা ভুল ধরনের ইউজার (যেমন সেলসম্যান অ্যাডমিন পেজে) ঢুকলে সরিয়ে দেয়
  useEffect(() => {
    if (!guard) return;
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace('/login');
        return;
      }
      try {
        const snap = await get(ref(database, `users/${user.uid}`));
        const data = snap.val();
        if (!data || data.status === 'inactive') {
          router.replace('/login');
          return;
        }
        if (data.role !== role) {
          router.replace(HOME_BY_ROLE[data.role] || '/login');
          return;
        }
        setAllowed(true);
      } catch (e) {
        // নেটওয়ার্ক সমস্যা হলে আটকে না দিয়ে পেজ দেখতে দেওয়া হয় (ডাটা রুলস দিয়েই সুরক্ষিত)
        setAllowed(true);
      }
    });
    return () => unsub();
  }, [guard, role, router]);

  // পেজ লোড হওয়ার সময় আগের ডার্ক মোড পছন্দ মনে রাখা
  useEffect(() => {
    const saved = localStorage.getItem(DARK_MODE_KEY);
    const isDark = saved === 'true';
    setDarkMode(isDark);
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle('dark', next);
      localStorage.setItem(DARK_MODE_KEY, String(next));
      return next;
    });
  };

  return (
    <div className="print:block print:min-h-0 min-h-screen flex bg-background dark:bg-dark-background transition-colors duration-300">
      <Sidebar role={role} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="print:block flex-1 flex flex-col min-w-0">
        <Topbar
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          darkMode={darkMode}
          onToggleDarkMode={toggleDarkMode}
          showSearch={role !== 'salesman'}
        />

        <main className="print:p-0 flex-1 px-4 py-5 pb-20 md:pb-5">
          <div className="print:max-w-none max-w-6xl mx-auto w-full">
            {allowed ? children : <p className="text-sm text-text-muted dark:text-dark-text-secondary">লোড হচ্ছে...</p>}
          </div>
        </main>

        <BottomNav role={role} onOpenMenu={() => setSidebarOpen(true)} />
      </div>

      <FloatingCalculator />
    </div>
  );
}
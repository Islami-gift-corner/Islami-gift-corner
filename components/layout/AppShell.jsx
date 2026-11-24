'use client';

import { useState, useEffect } from 'react';
import Topbar from './Topbar';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import FloatingCalculator from '@/components/calculator/FloatingCalculator';
import { brand } from '@/lib/brand';

const DARK_MODE_KEY = `${brand.slug}-dark-mode`;

export default function AppShell({ role = 'admin', children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

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
        />

        <main className="print:p-0 flex-1 px-4 py-5 pb-20 md:pb-5">
          <div className="print:max-w-none max-w-6xl mx-auto w-full">{children}</div>
        </main>

        <BottomNav role={role} onOpenMenu={() => setSidebarOpen(true)} />
      </div>

      <FloatingCalculator />
    </div>
  );
}
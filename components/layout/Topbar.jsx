'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Menu, Search, Sun, Moon, Minimize2, LogOut, AlertTriangle } from 'lucide-react';

export default function Topbar({ onToggleSidebar, darkMode, onToggleDarkMode, showSearch = true }) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    // TODO: প্রোডাক্ট/পার্টি/ইনভয়েস মডিউল তৈরি হওয়ার পর এখানে আসল সার্চ যুক্ত হবে
    router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const handleMinimize = () => {
    // ব্রাউজার নিরাপত্তার কারণে ওয়েব পেজ থেকে সত্যিকারের "minimize" করা যায় না।
    // এটাই সবচেয়ে কাছাকাছি বিকল্প — উইন্ডো/ট্যাব থেকে ফোকাস সরিয়ে দেওয়া।
    if (typeof window !== 'undefined') {
      window.blur();
    }
  };

  const confirmLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut(auth);
      router.push('/login');
    } catch (err) {
      setLoggingOut(false);
      setShowLogoutConfirm(false);
    }
  };

  return (
    <>
      <header
        className="print:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3
                   bg-background-card dark:bg-dark-card
                   border-b border-border dark:border-dark-border"
      >
        {/* হ্যামবার্গার — সাইডবার শো/হাইড */}
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="মেনু খুলুন/বন্ধ করুন"
          className="p-2 rounded-lg text-text-secondary dark:text-dark-text-secondary
                     hover:bg-background dark:hover:bg-dark-background transition-colors"
        >
          <Menu size={20} />
        </button>

        {/* গ্লোবাল সার্চ */}
        {showSearch && (
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted dark:text-dark-text-secondary"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="প্রোডাক্ট, পার্টি বা ইনভয়েস খুঁজুন..."
              className="w-full rounded-xl border border-border dark:border-dark-border
                         bg-background dark:bg-dark-background
                         text-text-primary dark:text-dark-text-primary text-sm
                         pl-9 pr-3 py-2
                         focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                         placeholder:text-text-muted"
            />
          </div>
        </form>
        )}

        <div className="flex-1" />

        {/* ডান পাশের বাটনগুলো */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleDarkMode}
            aria-label="ডার্ক/লাইট মোড টগল করুন"
            className="p-2 rounded-lg text-text-secondary dark:text-dark-text-secondary
                       hover:bg-background dark:hover:bg-dark-background transition-colors"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button
            type="button"
            onClick={handleMinimize}
            aria-label="মিনিমাইজ"
            className="p-2 rounded-lg text-text-secondary dark:text-dark-text-secondary
                       hover:bg-background dark:hover:bg-dark-background transition-colors"
          >
            <Minimize2 size={18} />
          </button>

          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            aria-label="লগআউট"
            className="p-2 rounded-lg text-danger hover:bg-danger/10 transition-colors"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* লগআউট কনফার্মেশন মডাল */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40"
          onClick={() => !loggingOut && setShowLogoutConfirm(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-background-card dark:bg-dark-card rounded-2xl shadow-lg
                       border border-border dark:border-dark-border p-6"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-full bg-danger/10">
                <AlertTriangle size={20} className="text-danger" />
              </div>
              <h2 className="text-base font-semibold text-text-primary dark:text-dark-text-primary">
                লগআউট নিশ্চিত করুন
              </h2>
            </div>
            <p className="text-sm text-text-secondary dark:text-dark-text-secondary mb-6">
              আপনি কি নিশ্চিত যে লগআউট করতে চান? আবার প্রবেশ করতে পুনরায় লগইন করতে হবে।
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                disabled={loggingOut}
                className="flex-1 rounded-xl py-2.5 text-sm font-medium
                           border border-border dark:border-dark-border
                           text-text-secondary dark:text-dark-text-secondary
                           hover:bg-background dark:hover:bg-dark-background transition-colors disabled:opacity-60"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={confirmLogout}
                disabled={loggingOut}
                className="flex-1 rounded-xl py-2.5 text-sm font-medium text-white
                           bg-danger hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {loggingOut ? 'লগআউট হচ্ছে...' : 'হ্যাঁ, লগআউট করুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
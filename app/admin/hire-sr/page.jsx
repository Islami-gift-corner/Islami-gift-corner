'use client';

import { useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import BackButton from '@/components/layout/BackButton';
import HireSR from '@/components/admin/HireSR';
import SRList from '@/components/admin/SRList';
import { Users, UserPlus } from 'lucide-react';

export default function SRMenuPage() {
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'new'

  return (
    <AppShell role="admin">
      <BackButton />

      <h1 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-1">
        SR
      </h1>
      <p className="text-sm text-text-secondary dark:text-dark-text-secondary mb-5">
        SR তালিকা দেখুন অথবা নতুন SR নিয়োগ করুন
      </p>

      {/* SR লিস্ট / SR নিয়োগ টগল */}
      <div className="grid grid-cols-2 gap-2 mb-6 max-w-md">
        <button
          type="button"
          onClick={() => setActiveTab('list')}
          className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-colors
            ${
              activeTab === 'list'
                ? 'bg-gradient-to-r from-primary to-primary-light text-white shadow-sm'
                : 'bg-background-card dark:bg-dark-card border border-border dark:border-dark-border text-text-secondary dark:text-dark-text-secondary'
            }`}
        >
          <Users size={16} />
          SR লিস্ট
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('new')}
          className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-colors
            ${
              activeTab === 'new'
                ? 'bg-gradient-to-r from-primary to-primary-light text-white shadow-sm'
                : 'bg-background-card dark:bg-dark-card border border-border dark:border-dark-border text-text-secondary dark:text-dark-text-secondary'
            }`}
        >
          <UserPlus size={16} />
          SR নিয়োগ
        </button>
      </div>

      {activeTab === 'list' ? <SRList /> : <HireSR />}
    </AppShell>
  );
}
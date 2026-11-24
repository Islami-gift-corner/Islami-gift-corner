'use client';

import { useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import BackButton from '@/components/layout/BackButton';
import StockInward from '@/components/stock/StockInward';
import StockReturn from '@/components/stock/StockReturn';
import StockDamage from '@/components/stock/StockDamage';
import WarrantyClaim from '@/components/stock/WarrantyClaim';
import { ArrowDownCircle, Undo2, AlertTriangle, ShieldAlert } from 'lucide-react';

const TABS = [
  { key: 'inward', label: 'ইনওয়ার্ড', icon: ArrowDownCircle },
  { key: 'return', label: 'রিটার্ন', icon: Undo2 },
  { key: 'damage', label: 'ড্যামেজ', icon: AlertTriangle },
  { key: 'warranty', label: 'ওয়্যারেন্টি', icon: ShieldAlert },
];

export default function StockPage() {
  const [activeTab, setActiveTab] = useState('inward');

  return (
    <AppShell role="admin">
      <BackButton />

      <h1 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-1">
        স্টক বুক
      </h1>
      <p className="text-sm text-text-secondary dark:text-dark-text-secondary mb-5">
        স্টক ইনওয়ার্ড, রিটার্ন, ড্যামেজ ও ওয়্যারেন্টি ক্লেইম এখান থেকে ম্যানেজ করুন
      </p>

      {/* ট্যাব */}
      <div
        className="flex gap-1 p-1 rounded-xl bg-background-card dark:bg-dark-card
                   border border-border dark:border-dark-border mb-6 w-fit overflow-x-auto max-w-full"
      >
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-colors
              ${
                activeTab === key
                  ? 'bg-gradient-to-r from-primary to-primary-light text-white shadow-sm'
                  : 'text-text-secondary dark:text-dark-text-secondary hover:bg-background dark:hover:bg-dark-background'
              }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'inward' && <StockInward />}
      {activeTab === 'return' && <StockReturn />}
      {activeTab === 'damage' && <StockDamage />}
      {activeTab === 'warranty' && <WarrantyClaim />}
    </AppShell>
  );
}

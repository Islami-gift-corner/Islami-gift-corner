'use client';

import { useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import BackButton from '@/components/layout/BackButton';
import AddLedgerEntry from '@/components/ledger/AddLedgerEntry';
import LedgerList from '@/components/ledger/LedgerList';
import Notepad from '@/components/ledger/Notepad';
import MonthlyStatement from '@/components/ledger/MonthlyStatement';
import { StickyNote, TrendingUp, TrendingDown, FileText } from 'lucide-react';

export default function LedgerPage() {
  const [activeTab, setActiveTab] = useState('notes'); // 'notes' | 'income' | 'expense' | 'statement'

  return (
    <AppShell role="admin">
      <BackButton />

      <h1 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-1">
        ঠালি খাতা
      </h1>
      <p className="text-sm text-text-secondary dark:text-dark-text-secondary mb-5">
        নোট, আয় ও ব্যয়ের সম্পূর্ণ হিসাব
      </p>

      <div
        className="flex gap-1 p-1 rounded-xl bg-background-card dark:bg-dark-card
                   border border-border dark:border-dark-border mb-6 w-fit overflow-x-auto max-w-full"
      >
        <button
          type="button"
          onClick={() => setActiveTab('notes')}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors
            ${
              activeTab === 'notes'
                ? 'bg-gradient-to-r from-primary to-primary-light text-white shadow-sm'
                : 'text-text-secondary dark:text-dark-text-secondary'
            }`}
        >
          <StickyNote size={16} />
          নোট
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('income')}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors
            ${
              activeTab === 'income'
                ? 'bg-success text-white shadow-sm'
                : 'text-text-secondary dark:text-dark-text-secondary'
            }`}
        >
          <TrendingUp size={16} />
          আয়
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('expense')}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors
            ${
              activeTab === 'expense'
                ? 'bg-danger text-white shadow-sm'
                : 'text-text-secondary dark:text-dark-text-secondary'
            }`}
        >
          <TrendingDown size={16} />
          ব্যয়
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('statement')}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors
            ${
              activeTab === 'statement'
                ? 'bg-gradient-to-r from-primary to-primary-light text-white shadow-sm'
                : 'text-text-secondary dark:text-dark-text-secondary'
            }`}
        >
          <FileText size={16} />
          স্টেটমেন্ট
        </button>
      </div>

      {activeTab === 'notes' && <Notepad />}

      {activeTab === 'statement' && <MonthlyStatement source="admin" />}

      {(activeTab === 'income' || activeTab === 'expense') && (
        <div className="flex flex-col gap-6">
          <AddLedgerEntry type={activeTab} />
          <LedgerList type={activeTab} />
        </div>
      )}
    </AppShell>
  );
}

'use client';

import { useState } from 'react';
import { ArrowLeftRight, Building2 } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import BackButton from '@/components/layout/BackButton';
import AddCompany from '@/components/company/AddCompany';
import CompanyList from '@/components/company/CompanyList';
import CompanyTransactions from '@/components/company/CompanyTransactions';

export default function CompaniesPage() {
  const [view, setView] = useState('list'); // 'list' | 'transactions'

  return (
    <AppShell role="admin">
      <BackButton />

      <h1 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-1">
        কোম্পানি ম্যানেজমেন্ট
      </h1>
      <p className="text-sm text-text-secondary dark:text-dark-text-secondary mb-5">
        যেসব কোম্পানির সাথে ডিলারশিপ ব্যবসা করেন তাদের তালিকা
      </p>

      <div className="mb-6 flex flex-wrap items-start gap-3">
        <AddCompany />

        {/* কোম্পানি তালিকা ↔ কোম্পানির লেনদেন হিসাব */}
        <button
          type="button"
          onClick={() => setView((v) => (v === 'list' ? 'transactions' : 'list'))}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors w-fit
            ${
              view === 'transactions'
                ? 'bg-gradient-to-r from-primary to-primary-light text-white shadow-sm'
                : 'border border-primary text-primary hover:bg-primary/5'
            }`}
        >
          {view === 'transactions' ? <Building2 size={18} /> : <ArrowLeftRight size={18} />}
          {view === 'transactions' ? 'কোম্পানি তালিকা' : 'কোম্পানি লেনদেন'}
        </button>
      </div>

      {view === 'transactions' ? <CompanyTransactions /> : <CompanyList />}
    </AppShell>
  );
}

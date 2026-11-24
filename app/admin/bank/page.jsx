'use client';

import { useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import BackButton from '@/components/layout/BackButton';
import AddBankLoan from '@/components/bank/AddBankLoan';
import BankOverview from '@/components/bank/BankOverview';
import BankLoanDetail from '@/components/bank/BankLoanDetail';
import DebtSection from '@/components/bank/DebtSection';
import DebtProfile from '@/components/bank/DebtProfile';
import { Landmark, HandCoins } from 'lucide-react';

export default function BankPage() {
  const [tab, setTab] = useState('loan'); // 'loan' | 'debt'
  const [selectedLoanId, setSelectedLoanId] = useState(null);
  const [selectedDebtId, setSelectedDebtId] = useState(null);

  if (selectedLoanId) {
    return (
      <AppShell role="admin">
        <BankLoanDetail loanId={selectedLoanId} onBack={() => setSelectedLoanId(null)} />
      </AppShell>
    );
  }

  if (selectedDebtId) {
    return (
      <AppShell role="admin">
        <DebtProfile personId={selectedDebtId} onBack={() => setSelectedDebtId(null)} />
      </AppShell>
    );
  }

  return (
    <AppShell role="admin">
      <BackButton />

      <h1 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-1">
        ব্যাংক
      </h1>
      <p className="text-sm text-text-secondary dark:text-dark-text-secondary mb-5">
        ব্যাংক লোন ও কিস্তি, এবং ব্যক্তিগত ঋণ গ্রহণ/দানের হিসাব
      </p>

      {/* লোন | ঋণ */}
      <div
        className="flex gap-1 p-1 rounded-xl bg-background-card dark:bg-dark-card
                   border border-border dark:border-dark-border mb-6 w-fit"
      >
        <button
          type="button"
          onClick={() => setTab('loan')}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors
            ${
              tab === 'loan'
                ? 'bg-gradient-to-r from-primary to-primary-light text-white shadow-sm'
                : 'text-text-secondary dark:text-dark-text-secondary'
            }`}
        >
          <Landmark size={16} />
          লোন
        </button>
        <button
          type="button"
          onClick={() => setTab('debt')}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors
            ${
              tab === 'debt'
                ? 'bg-gradient-to-r from-primary to-primary-light text-white shadow-sm'
                : 'text-text-secondary dark:text-dark-text-secondary'
            }`}
        >
          <HandCoins size={16} />
          ঋণ
        </button>
      </div>

      {tab === 'loan' ? (
        <>
          <div className="mb-6">
            <AddBankLoan onAdded={(id) => setSelectedLoanId(id)} />
          </div>
          <BankOverview onSelect={setSelectedLoanId} />
        </>
      ) : (
        <DebtSection onSelect={setSelectedDebtId} />
      )}
    </AppShell>
  );
}

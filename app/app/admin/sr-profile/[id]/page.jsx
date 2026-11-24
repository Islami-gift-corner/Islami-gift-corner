'use client';

import { useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import BackButton from '@/components/layout/BackButton';
import SRProfile from '@/components/profile/SRProfile';
import SRFinancialSummary from '@/components/admin/SRFinancialSummary';
import InvoiceList from '@/components/invoice/InvoiceList';
import InvoicePrint from '@/components/invoice/InvoicePrint';
import { UserCog, Receipt } from 'lucide-react';

export default function AdminViewSRProfile({ params }) {
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'invoices'
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  if (selectedInvoice) {
    return (
      <AppShell role="admin">
        <InvoicePrint
          invoice={selectedInvoice}
          onBack={() => setSelectedInvoice(null)}
          allowDelete
          onDeleted={() => setSelectedInvoice(null)}
        />
      </AppShell>
    );
  }

  return (
    <AppShell role="admin">
      <BackButton />

      <h1 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-1">
        SR প্রোফাইল
      </h1>
      <p className="text-sm text-text-secondary dark:text-dark-text-secondary mb-5">
        এই SR এর প্রোফাইল, তৈরি করা ইনভয়েস ও বিক্রয়ের হিসাব
      </p>

      <div
        className="flex gap-1 p-1 rounded-xl bg-background-card dark:bg-dark-card
                   border border-border dark:border-dark-border mb-6 w-fit"
      >
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors
            ${
              activeTab === 'profile'
                ? 'bg-gradient-to-r from-primary to-primary-light text-white shadow-sm'
                : 'text-text-secondary dark:text-dark-text-secondary'
            }`}
        >
          <UserCog size={16} />
          প্রোফাইল
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('invoices')}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors
            ${
              activeTab === 'invoices'
                ? 'bg-gradient-to-r from-primary to-primary-light text-white shadow-sm'
                : 'text-text-secondary dark:text-dark-text-secondary'
            }`}
        >
          <Receipt size={16} />
          ইনভয়েস ও হিসাব
        </button>
      </div>

      {activeTab === 'profile' && <SRProfile targetUserId={params.id} isAdminView />}

      {activeTab === 'invoices' && (
        <div className="flex flex-col gap-6">
          <SRFinancialSummary srId={params.id} />
          <InvoiceList onSelect={setSelectedInvoice} filterSrId={params.id} />
        </div>
      )}
    </AppShell>
  );
}
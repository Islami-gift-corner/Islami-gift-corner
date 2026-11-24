'use client';

import { useState, useEffect } from 'react';
import { ref, get } from 'firebase/database';
import { database } from '@/lib/firebase';
import AppShell from '@/components/layout/AppShell';
import BackButton from '@/components/layout/BackButton';
import InvoiceForm from '@/components/invoice/InvoiceForm';
import InvoiceList from '@/components/invoice/InvoiceList';
import InvoicePrint from '@/components/invoice/InvoicePrint';
import { Plus, List } from 'lucide-react';

export default function InvoicesPage() {
  const [activeTab, setActiveTab] = useState('new'); // 'new' | 'list'
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // সার্চ ফলাফল থেকে ?open=<invoiceId> দিয়ে এলে সরাসরি সেই ইনভয়েস খুলবে
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('open');
    if (!id) return;
    get(ref(database, `invoices/${id}`)).then((snap) => {
      if (snap.exists()) setSelectedInvoice({ id, ...snap.val() });
    });
  }, []);

  if (selectedInvoice) {
    return (
      <AppShell role="admin">
        <div className="print:hidden">
          <BackButton />
        </div>
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
        ইনভয়েস
      </h1>
      <p className="text-sm text-text-secondary dark:text-dark-text-secondary mb-5">
        নতুন ইনভয়েস তৈরি করুন অথবা আগের ইনভয়েস দেখুন/প্রিন্ট করুন
      </p>

      <div
        className="flex gap-1 p-1 rounded-xl bg-background-card dark:bg-dark-card
                   border border-border dark:border-dark-border mb-6 w-fit"
      >
        <button
          type="button"
          onClick={() => setActiveTab('new')}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors
            ${
              activeTab === 'new'
                ? 'bg-gradient-to-r from-primary to-primary-light text-white shadow-sm'
                : 'text-text-secondary dark:text-dark-text-secondary'
            }`}
        >
          <Plus size={16} />
          নতুন ইনভয়েস
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('list')}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors
            ${
              activeTab === 'list'
                ? 'bg-gradient-to-r from-primary to-primary-light text-white shadow-sm'
                : 'text-text-secondary dark:text-dark-text-secondary'
            }`}
        >
          <List size={16} />
          ইনভয়েস তালিকা
        </button>
      </div>

      {activeTab === 'new' && <InvoiceForm onSaved={setSelectedInvoice} />}
      {activeTab === 'list' && <InvoiceList onSelect={setSelectedInvoice} />}
    </AppShell>
  );
}

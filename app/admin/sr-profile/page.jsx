'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import BackButton from '@/components/layout/BackButton';
import SRProfile from '@/components/profile/SRProfile';
import SRActions from '@/components/admin/SRActions';
import SRCompanyAccess from '@/components/admin/SRCompanyAccess';
import SRCurrentAccount from '@/components/admin/SRCurrentAccount';
import SRStatementExport from '@/components/admin/SRStatementExport';
import InvoicePrint from '@/components/invoice/InvoicePrint';
import { ref, onValue } from 'firebase/database';
import { database } from '@/lib/firebase';
import { Wallet, CalendarRange, UserCog } from 'lucide-react';

function SRProfileContent() {
  const searchParams = useSearchParams();
  const srId = searchParams.get('id');

  const [activeTab, setActiveTab] = useState('current'); // 'current' | 'statement' | 'profile'
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [srUser, setSrUser] = useState(null);

  useEffect(() => {
    if (!srId) return;
    const unsubscribe = onValue(ref(database, `users/${srId}`), (snap) => {
      if (snap.exists()) setSrUser({ id: srId, ...snap.val() });
    });
    return () => unsubscribe();
  }, [srId]);

  const srName = srUser?.name || '';

  if (!srId) {
    return (
      <AppShell role="admin">
        <BackButton />
        <p className="text-sm text-text-muted dark:text-dark-text-secondary">
          কোনো SR নির্বাচন করা হয়নি
        </p>
      </AppShell>
    );
  }

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

  const TABS = [
    { key: 'current', label: 'চলতি হিসাব', icon: Wallet },
    { key: 'statement', label: 'স্টেটমেন্ট', icon: CalendarRange },
    { key: 'profile', label: 'প্রোফাইল', icon: UserCog },
  ];

  return (
    <AppShell role="admin">
      <BackButton />

      <h1 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-1">
        {srName || 'SR প্রোফাইল'}
      </h1>
      <p className="text-sm text-text-secondary dark:text-dark-text-secondary mb-5">
        চলতি হিসাব, স্টেটমেন্ট ও প্রোফাইল
      </p>

      <div
        className="flex gap-1 p-1 rounded-xl bg-background-card dark:bg-dark-card
                   border border-border dark:border-dark-border mb-6 w-fit overflow-x-auto max-w-full"
      >
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors
              ${
                activeTab === key
                  ? 'bg-gradient-to-r from-primary to-primary-light text-white shadow-sm'
                  : 'text-text-secondary dark:text-dark-text-secondary'
              }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'current' && (
        <SRCurrentAccount srId={srId} onSelectInvoice={setSelectedInvoice} />
      )}

      {activeTab === 'statement' && <SRStatementExport srId={srId} srName={srName || 'SR'} />}

      {activeTab === 'profile' && (
        <div className="flex flex-col gap-6">
          <SRProfile targetUserId={srId} isAdminView />
          {srUser && <SRCompanyAccess sr={srUser} />}
          {srUser && <SRActions sr={srUser} />}
        </div>
      )}
    </AppShell>
  );
}

export default function AdminSRProfilePage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-text-muted">লোড হচ্ছে...</p>}>
      <SRProfileContent />
    </Suspense>
  );
}
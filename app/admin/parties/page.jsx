'use client';

import { useState, useEffect } from 'react';
import { ref, get } from 'firebase/database';
import { database } from '@/lib/firebase';
import AppShell from '@/components/layout/AppShell';
import BackButton from '@/components/layout/BackButton';
import AddParty from '@/components/party/AddParty';
import PartyList from '@/components/party/PartyList';
import PartyLedger from '@/components/party/PartyLedger';

export default function PartiesPage() {
  const [selectedParty, setSelectedParty] = useState(null);

  // সার্চ ফলাফল থেকে ?open=<partyId> দিয়ে এলে সরাসরি সেই পার্টির খাতা খুলবে
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('open');
    if (!id) return;
    get(ref(database, `parties/${id}`)).then((snap) => {
      if (snap.exists()) setSelectedParty({ id, ...snap.val() });
    });
  }, []);

  if (selectedParty) {
    return (
      <AppShell role="admin">
        <PartyLedger party={selectedParty} onBack={() => setSelectedParty(null)} allowDelete />
      </AppShell>
    );
  }

  return (
    <AppShell role="admin">
      <BackButton />

      <h1 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-1">
        পার্টি খাতা
      </h1>
      <p className="text-sm text-text-secondary dark:text-dark-text-secondary mb-5">
        ক্রেতাদের তালিকা, দেনা-পাওনার হিসাব ও লেনদেন হিস্ট্রি
      </p>

      <div className="mb-6">
        <AddParty />
      </div>

      <PartyList onSelect={setSelectedParty} />
    </AppShell>
  );
}

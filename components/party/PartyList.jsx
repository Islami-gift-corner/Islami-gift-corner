'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue } from 'firebase/database';
import { database, auth } from '@/lib/firebase';
import { Users, ChevronRight, AlertTriangle, UserCog, Building2 } from 'lucide-react';

const REMINDER_DAYS = 7; // এর বেশি দিন বাকি থাকলে রিমাইন্ডার দেখাবে

export default function PartyList({ onSelect }) {
  const [parties, setParties] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [users, setUsers] = useState({});
  const [uid, setUid] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('admin'); // 'admin' | 'sr' — ডিফল্ট অ্যাডমিন পার্টি

  // auth.currentUser পেজ লোডের প্রথম মুহূর্তে null থাকতে পারে (Firebase সেশন রিস্টোর
  // হতে একটু সময় লাগে) — তাই onAuthStateChanged দিয়ে নিশ্চিতভাবে uid পাওয়ার পর
  // role ফেচ করা হচ্ছে, যাতে সাময়িকভাবেও ভুল করে সবার ডেটা দেখা না যায়।
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUid(user?.uid || null);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!uid) return;
    const unsubscribe = onValue(ref(database, `users/${uid}/role`), (snapshot) => {
      setRole(snapshot.val() || null);
    });
    return () => unsubscribe();
  }, [uid]);

  useEffect(() => {
    const partiesRef = ref(database, 'parties');
    const unsubscribe = onValue(partiesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([id, value]) => ({ id, ...value }));
        setParties(list);
      } else {
        setParties([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const invoicesRef = ref(database, 'invoices');
    const unsubscribe = onValue(invoicesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setInvoices(Object.values(data));
      } else {
        setInvoices([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // অ্যাডমিন view-এ কোন পার্টি কোন SR-এর — তা দেখানোর জন্য ইউজারদের নাম দরকার
  useEffect(() => {
    const usersRef = ref(database, 'users');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      setUsers(snapshot.val() || {});
    });
    return () => unsubscribe();
  }, []);

  // একটা পার্টির শেষ ইনভয়েসের তারিখ থেকে কত দিন পার হয়েছে বের করা
  const getDaysSinceLastInvoice = (partyId) => {
    const partyInvoices = invoices
      .filter((inv) => inv.party_id === partyId && inv.status !== 'paid')
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (partyInvoices.length === 0) return null;

    const lastDate = new Date(partyInvoices[0].date);
    const diffMs = Date.now() - lastDate.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  };

  // SR শুধু নিজের তৈরি করা পার্টিই দেখবে (owner_id নিজের uid এর সাথে মিললে তবেই)।
  // owner_id নেই এমন পুরনো পার্টি (অ্যাডমিনের তৈরি পুরনো ডেটা) কোনো SR দেখবে না,
  // শুধু অ্যাডমিনই দেখবে (নিচের role !== 'sr' শাখায়)।
  // fail-safe: শুধু role নিশ্চিতভাবে 'admin' হলেই সব পার্টি দেখাবে, বাকি সব ক্ষেত্রে
  // (SR হোক বা role এখনো লোড হচ্ছে) শুধু নিজের তৈরি করা পার্টিই দেখাবে
  const visibleParties = role === 'admin' ? parties : parties.filter((p) => p.owner_id === uid);

  if (loading) {
    return (
      <p className="text-sm text-text-muted dark:text-dark-text-secondary">লোড হচ্ছে...</p>
    );
  }

  const renderPartyRow = (party) => {
    const daysOverdue = getDaysSinceLastInvoice(party.id);
    const showReminder = (party.balance || 0) > 0 && daysOverdue !== null && daysOverdue >= REMINDER_DAYS;

    return (
      <button
        key={party.id}
        type="button"
        onClick={() => onSelect(party)}
        className="flex items-center justify-between gap-3 bg-background-card dark:bg-dark-card
                   rounded-xl border border-border dark:border-dark-border p-4 text-left
                   hover:border-primary transition-colors"
      >
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-text-primary dark:text-dark-text-primary">
            {party.name}
            {showReminder && (
              <span className="flex items-center gap-1 text-[10px] font-medium text-danger bg-danger/10 rounded-full px-2 py-0.5">
                <AlertTriangle size={10} />
                {daysOverdue} দিন বাকি
              </span>
            )}
          </p>
          <p className="text-xs text-text-secondary dark:text-dark-text-secondary">
            {party.business_name} {party.phone ? `· ${party.phone}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p
              className={`text-sm font-medium ${
                (party.balance || 0) > 0 ? 'text-danger' : 'text-success'
              }`}
            >
              ৳{party.balance || 0}
            </p>
            <p className="text-[10px] text-text-muted dark:text-dark-text-secondary">বাকি</p>
          </div>
          <ChevronRight size={16} className="text-text-muted" />
        </div>
      </button>
    );
  };

  const emptyState = (message) => (
    <div
      className="flex flex-col items-center justify-center gap-2 py-12 rounded-2xl
                 border border-dashed border-border dark:border-dark-border"
    >
      <Users size={28} className="text-text-muted" />
      <p className="text-sm text-text-muted dark:text-dark-text-secondary">{message}</p>
    </div>
  );

  // SR-এর নিজের ভিউতে সব পার্টিই তার নিজের, তাই টগল/গ্রুপের দরকার নেই — সরাসরি লিস্ট
  if (role !== 'admin') {
    if (visibleParties.length === 0) return emptyState('এখনো কোনো পার্টি যোগ করা হয়নি');
    return <div className="flex flex-col gap-2">{visibleParties.map(renderPartyRow)}</div>;
  }

  // অ্যাডমিন ভিউ: অ্যাডমিনের নিজের পার্টি ও পুরনো (মালিক অজানা) পার্টি — "এডমিন পার্টি" ট্যাবে
  const adminParties = visibleParties.filter((p) => !p.owner_id || p.owner_id === uid);

  // SR-দের পার্টি — owner_id আছে এবং সেটা অ্যাডমিনের নিজের uid না
  const srParties = visibleParties.filter((p) => p.owner_id && p.owner_id !== uid);

  // SR-দের পার্টি নাম অনুযায়ী গ্রুপ করা হচ্ছে
  const srGroups = {};
  srParties.forEach((party) => {
    const ownerId = party.owner_id;
    const label = users[ownerId]?.name ? `SR: ${users[ownerId].name}` : 'SR (নাম পাওয়া যায়নি)';
    if (!srGroups[ownerId]) srGroups[ownerId] = { label, parties: [] };
    srGroups[ownerId].parties.push(party);
  });
  const orderedSrKeys = Object.keys(srGroups).sort((a, b) =>
    srGroups[a].label.localeCompare(srGroups[b].label, 'bn')
  );

  return (
    <div className="flex flex-col gap-4">
      <div
        className="flex gap-1 p-1 rounded-xl bg-background-card dark:bg-dark-card
                   border border-border dark:border-dark-border w-fit"
      >
        <button
          type="button"
          onClick={() => setActiveTab('admin')}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors
            ${
              activeTab === 'admin'
                ? 'bg-gradient-to-r from-primary to-primary-light text-white shadow-sm'
                : 'text-text-secondary dark:text-dark-text-secondary'
            }`}
        >
          <Building2 size={16} />
          এডমিন পার্টি
          <span className="text-[10px] opacity-80">({adminParties.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('sr')}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors
            ${
              activeTab === 'sr'
                ? 'bg-gradient-to-r from-primary to-primary-light text-white shadow-sm'
                : 'text-text-secondary dark:text-dark-text-secondary'
            }`}
        >
          <UserCog size={16} />
          SR পার্টি
          <span className="text-[10px] opacity-80">({srParties.length})</span>
        </button>
      </div>

      {activeTab === 'admin' &&
        (adminParties.length === 0 ? (
          emptyState('এডমিনের কোনো পার্টি যোগ করা হয়নি')
        ) : (
          <div className="flex flex-col gap-2">{adminParties.map(renderPartyRow)}</div>
        ))}

      {activeTab === 'sr' &&
        (srParties.length === 0 ? (
          emptyState('কোনো SR এখনো পার্টি যোগ করেনি')
        ) : (
          <div className="flex flex-col gap-6">
            {orderedSrKeys.map((key) => (
              <div key={key}>
                <p className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary dark:text-dark-text-secondary mb-2 px-0.5">
                  <UserCog size={13} />
                  {srGroups[key].label}
                  <span className="text-text-muted">({srGroups[key].parties.length}টা)</span>
                </p>
                <div className="flex flex-col gap-2">{srGroups[key].parties.map(renderPartyRow)}</div>
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}
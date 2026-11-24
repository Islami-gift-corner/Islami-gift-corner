'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue } from 'firebase/database';
import { database, auth } from '@/lib/firebase';
import { Users } from 'lucide-react';
import AddParty from './AddParty';

export default function PartySelector({ value, onChange }) {
  const [parties, setParties] = useState([]);
  const [uid, setUid] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddNew, setShowAddNew] = useState(false);

  // auth.currentUser পেজ লোডের প্রথম মুহূর্তে null থাকতে পারে, তাই onAuthStateChanged
  // দিয়ে নিশ্চিতভাবে uid পাওয়ার পর role ফেচ করা হচ্ছে (fail-safe, না হলে সাময়িকভাবে
  // ভুল করে সবার পার্টি দেখা/সিলেক্ট করা যেত)
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

  // fail-safe: শুধু role নিশ্চিতভাবে 'admin' হলেই সব পার্টি দেখাবে/সিলেক্ট করা যাবে,
  // বাকি সব ক্ষেত্রে (SR হোক বা role এখনো লোড হচ্ছে) শুধু নিজের তৈরি করা পার্টিই দেখাবে
  // ইনভয়েস তৈরির সময় এখানে সবার (SR-দের) পার্টি না দেখিয়ে শুধু নিজের পার্টিই দেখানো হয় —
  // অ্যাডমিন হলেও শুধু অ্যাডমিনের নিজের পার্টি (ও owner_id ছাড়া পুরনো পার্টি) দেখাবে,
  // কোনো SR-এর পার্টি অ্যাডমিনের ইনভয়েসে আসবে না। SR-রা যথারীতি শুধু নিজের পার্টি দেখবে।
  const visibleParties = parties.filter(
    (p) => p.owner_id === uid || (!p.owner_id && role === 'admin')
  );

  const handleSelectChange = (e) => {
    const id = e.target.value;
    if (id === '__new__') {
      setShowAddNew(true);
      return;
    }
    const party = visibleParties.find((p) => p.id === id);
    onChange(id, party || null);
  };

  const handlePartyAdded = (newParty) => {
    setShowAddNew(false);
    if (newParty?.id) {
      onChange(newParty.id, newParty);
    }
  };

  if (showAddNew) {
    return (
      <div className="flex flex-col gap-2">
        <AddParty onAdded={handlePartyAdded} />
        <button
          type="button"
          onClick={() => setShowAddNew(false)}
          className="text-xs text-text-muted underline w-fit"
        >
          বাতিল করে তালিকা থেকে বেছে নিন
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <Users
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted dark:text-dark-text-secondary pointer-events-none"
      />
      <select
        value={value || ''}
        onChange={handleSelectChange}
        disabled={loading}
        className="w-full appearance-none rounded-xl border border-border dark:border-dark-border
                   bg-background dark:bg-dark-background
                   text-text-primary dark:text-dark-text-primary text-sm
                   pl-9 pr-3 py-2.5
                   focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
      >
        <option value="" disabled>
          {loading ? 'লোড হচ্ছে...' : 'পার্টি নির্বাচন করুন'}
        </option>
        {visibleParties.map((party) => (
          <option key={party.id} value={party.id}>
            {party.name} {party.business_name ? `(${party.business_name})` : ''}
          </option>
        ))}
        <option value="__new__">+ নতুন পার্টি যোগ করুন</option>
      </select>
    </div>
  );
}
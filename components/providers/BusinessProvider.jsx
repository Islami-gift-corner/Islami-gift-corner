'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue } from 'firebase/database';
import { auth, database } from '@/lib/firebase';
import { brand } from '@/lib/brand';

// ব্যবসার তথ্য (নাম, মালিক, ফোন, ঠিকানা, লোগো) এখান থেকে সবাই পাবে —
// আলাদা আলাদা কম্পোনেন্টে বারবার Firebase শুনতে হবে না।
// অ্যাডমিন "বিজনেস প্রোফাইল" পেজে বদলালে ইনভয়েস, স্টেটমেন্ট, সাইডবার সব জায়গায় সাথে সাথে বদলে যায়।

const DEFAULTS = {
  name: brand.name,
  owner: '',
  ownerTitle: 'Proprietor',
  phones: [],
  address: '',
  logoUrl: brand.logo,
  loading: true,
};

const BusinessContext = createContext(DEFAULTS);

export function BusinessProvider({ children }) {
  const [info, setInfo] = useState(DEFAULTS);

  useEffect(() => {
    let unsubscribeDb = null;

    // লগইনের আগে ডাটাবেস পড়ার অনুমতি নাও থাকতে পারে — তাই লগইন হলেই শুনতে শুরু করি
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeDb) {
        unsubscribeDb();
        unsubscribeDb = null;
      }

      if (!user) {
        setInfo({ ...DEFAULTS, loading: false });
        return;
      }

      unsubscribeDb = onValue(
        ref(database, 'business_profile'),
        (snapshot) => {
          const d = snapshot.val() || {};
          setInfo({
            name: d.name || brand.name,
            owner: d.owner || '',
            ownerTitle: d.owner_title || 'Proprietor',
            phones: Array.isArray(d.phone) ? d.phone.filter(Boolean) : [],
            address: d.address || '',
            logoUrl: d.logo_url || brand.logo,
            loading: false,
          });
        },
        () => setInfo({ ...DEFAULTS, loading: false })
      );
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDb) unsubscribeDb();
    };
  }, []);

  // ব্রাউজার ট্যাবের নামও ব্যবসার নাম অনুযায়ী হয়
  useEffect(() => {
    if (info.name) document.title = info.name;
  }, [info.name]);

  const value = useMemo(() => info, [info]);
  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
}

export const useBusiness = () => useContext(BusinessContext);

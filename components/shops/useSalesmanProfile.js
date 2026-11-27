'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue } from 'firebase/database';
import { auth, database } from '@/lib/firebase';

// লগইন করা সেলসম্যানের তথ্য ও তার দোকান — সেলসম্যানের সব পেজ এটা ব্যবহার করে।
// ফেরত: { loading, uid, profile, shopId, shop }
export function useSalesmanProfile() {
  const [uid, setUid] = useState(null);
  const [profile, setProfile] = useState(null);
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUid(user?.uid || null);
      if (!user) setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!uid) return;
    const unsub = onValue(
      ref(database, `users/${uid}`),
      (s) => {
        setProfile(s.val());
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [uid]);

  const shopId = profile?.shopId || null;

  useEffect(() => {
    if (!shopId) return;
    const unsub = onValue(ref(database, `shops/${shopId}`), (s) => setShop(s.val()), () => {});
    return () => unsub();
  }, [shopId]);

  return { loading, uid, profile, shopId, shop };
}

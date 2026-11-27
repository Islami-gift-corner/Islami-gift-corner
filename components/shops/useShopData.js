'use client';

import { useEffect, useState } from 'react';
import { ref, onValue, query, orderByChild, equalTo } from 'firebase/database';
import { database } from '@/lib/firebase';
import { objToList } from '@/lib/shopUtils';

// একটা দোকানের সব বিক্রয় (সব সেলসম্যান মিলিয়ে) — রিয়েলটাইম, অ্যাডমিনের জন্য
export function useShopSales(shopId) {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onValue(ref(database, `shop_sales/${shopId}`), (s) => {
      const tree = s.val() || {};
      const list = [];
      Object.entries(tree).forEach(([uid, bySalesman]) => {
        Object.entries(bySalesman || {}).forEach(([id, sale]) => {
          list.push({ id, salesman_id: uid, ...sale });
        });
      });
      list.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
      setSales(list);
      setLoading(false);
    });
    return () => unsub();
  }, [shopId]);

  return { sales, loading };
}

// দোকানের সেলসম্যানরা
export function useShopSalesmen(shopId) {
  const [salesmen, setSalesmen] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(ref(database, 'users'), orderByChild('shopId'), equalTo(shopId));
    const unsub = onValue(q, (s) => {
      setSalesmen(objToList(s.val()).filter((u) => u.role === 'salesman'));
      setLoading(false);
    });
    return () => unsub();
  }, [shopId]);

  return { salesmen, loading };
}

// দোকানের সব খাতা: { [salesmanUid]: { parties: {...}, entries: {...} } }
export function useShopKhata(shopId) {
  const [khata, setKhata] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onValue(ref(database, `shop_khata/${shopId}`), (s) => {
      setKhata(s.val() || {});
      setLoading(false);
    });
    return () => unsub();
  }, [shopId]);

  return { khata, loading };
}

// সেলসম্যানের নিজের বিক্রয় (শুধু তার নিজের পাথ)
export function useOwnSales(shopId, uid) {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shopId || !uid) return;
    const unsub = onValue(
      ref(database, `shop_sales/${shopId}/${uid}`),
      (s) => {
        const list = objToList(s.val());
        list.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
        setSales(list);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [shopId, uid]);

  return { sales, loading };
}

// সেলসম্যানের নিজের পার্টি ও খাতার এন্ট্রি
export function useOwnKhata(shopId, uid) {
  const [parties, setParties] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shopId || !uid) return;
    const unsub1 = onValue(
      ref(database, `shop_khata/${shopId}/${uid}/parties`),
      (s) => {
        setParties(objToList(s.val()).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'bn')));
        setLoading(false);
      },
      () => setLoading(false)
    );
    const unsub2 = onValue(
      ref(database, `shop_khata/${shopId}/${uid}/entries`),
      (s) => setEntries(objToList(s.val())),
      () => {}
    );
    return () => {
      unsub1();
      unsub2();
    };
  }, [shopId, uid]);

  return { parties, entries, loading };
}

// দোকানের পণ্য তালিকা (সেলসম্যান পড়তে পারে, বদলাতে পারে না)
export function useShopProducts(shopId) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shopId) return;
    const unsub = onValue(
      ref(database, `shop_products/${shopId}`),
      (s) => {
        setProducts(objToList(s.val()).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'bn')));
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [shopId]);

  return { products, loading };
}

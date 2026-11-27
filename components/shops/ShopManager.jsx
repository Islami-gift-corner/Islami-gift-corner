'use client';

import { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '@/lib/firebase';
import { LayoutDashboard, Receipt, Package, Users, BookOpen } from 'lucide-react';
import ShopOverview from './ShopOverview';
import ShopSalesList from './ShopSalesList';
import ShopProducts from './ShopProducts';
import ShopSalesmen from './ShopSalesmen';
import ShopKhataAdmin from './ShopKhataAdmin';
import { mutedCls } from './ui';

const TABS = [
  { id: 'overview', label: 'ড্যাশবোর্ড', icon: LayoutDashboard },
  { id: 'sales', label: 'বিক্রয়', icon: Receipt },
  { id: 'products', label: 'পণ্য', icon: Package },
  { id: 'salesmen', label: 'সেলসম্যান', icon: Users },
  { id: 'khata', label: 'পার্টি খাতা', icon: BookOpen },
];

export default function ShopManager({ shopId }) {
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    const unsub = onValue(ref(database, `shops/${shopId}`), (s) => {
      setShop(s.val());
      setLoading(false);
    });
    return () => unsub();
  }, [shopId]);

  if (loading) return <p className={`text-sm ${mutedCls}`}>লোড হচ্ছে...</p>;
  if (!shop) return <p className="text-sm text-danger">দোকানটি পাওয়া যায়নি</p>;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary">
          {shop.name}
        </h1>
        {(shop.address || shop.phone) && (
          <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
            {[shop.address, shop.phone].filter(Boolean).join(' • ')}
          </p>
        )}
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`shrink-0 flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium transition-colors
              ${
                tab === id
                  ? 'bg-gradient-to-r from-primary to-primary-light text-white shadow-sm'
                  : 'bg-background-card dark:bg-dark-card border border-border dark:border-dark-border text-text-secondary dark:text-dark-text-secondary'
              }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <ShopOverview shopId={shopId} shop={shop} />}
      {tab === 'sales' && <ShopSalesList shopId={shopId} />}
      {tab === 'products' && <ShopProducts shopId={shopId} shopName={shop.name} />}
      {tab === 'salesmen' && <ShopSalesmen shopId={shopId} shopName={shop.name} />}
      {tab === 'khata' && <ShopKhataAdmin shopId={shopId} />}
    </div>
  );
}

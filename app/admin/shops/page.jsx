'use client';

import AppShell from '@/components/layout/AppShell';
import BackButton from '@/components/layout/BackButton';
import ShopList from '@/components/shops/ShopList';

export default function ShopsPage() {
  return (
    <AppShell role="admin">
      <BackButton />
      <h1 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-1">দোকান</h1>
      <p className="text-sm text-text-secondary dark:text-dark-text-secondary mb-5">
        দোকান যোগ করুন, তারপর দোকানে ঢুকে পণ্য, সেলসম্যান ও বিক্রয় দেখুন
      </p>
      <ShopList />
    </AppShell>
  );
}

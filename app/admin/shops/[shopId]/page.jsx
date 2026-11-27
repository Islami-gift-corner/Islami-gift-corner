'use client';

import { useParams } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import BackButton from '@/components/layout/BackButton';
import ShopManager from '@/components/shops/ShopManager';

export default function ShopDetailPage() {
  const { shopId } = useParams();
  return (
    <AppShell role="admin">
      <BackButton label="সব দোকান" />
      <ShopManager shopId={shopId} />
    </AppShell>
  );
}

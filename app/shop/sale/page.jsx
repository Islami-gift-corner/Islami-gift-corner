'use client';

import { Suspense } from 'react';
import AppShell from '@/components/layout/AppShell';
import SaleEntry from '@/components/shops/SaleEntry';

export default function SalePage() {
  return (
    <AppShell role="salesman">
      <Suspense fallback={<p className="text-sm text-text-muted">লোড হচ্ছে...</p>}>
        <SaleEntry />
      </Suspense>
    </AppShell>
  );
}

'use client';

import AppShell from '@/components/layout/AppShell';
import MySales from '@/components/shops/MySales';

export default function MySalesPage() {
  return (
    <AppShell role="salesman">
      <MySales />
    </AppShell>
  );
}

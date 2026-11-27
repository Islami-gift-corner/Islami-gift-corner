'use client';

import AppShell from '@/components/layout/AppShell';
import SalesmanHome from '@/components/shops/SalesmanHome';

export default function SalesmanDashboard() {
  return (
    <AppShell role="salesman">
      <SalesmanHome />
    </AppShell>
  );
}

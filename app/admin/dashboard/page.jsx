import AppShell from '@/components/layout/AppShell';
import AdminStats from '@/components/dashboard/AdminStats';
import LowStockAlert from '@/components/dashboard/LowStockAlert';
import QuickLinks from '@/components/dashboard/QuickLinks';

export default function AdminDashboard() {
  return (
    <AppShell role="admin">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-1">
            ড্যাশবোর্ড
          </h1>
        </div>

        <AdminStats />
        <LowStockAlert />

        <div>
          <h2 className="text-sm font-semibold text-text-primary dark:text-dark-text-primary mb-3">
            দ্রুত প্রবেশ
          </h2>
          <QuickLinks />
        </div>
      </div>
    </AppShell>
  );
}
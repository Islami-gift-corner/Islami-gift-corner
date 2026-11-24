import AppShell from '@/components/layout/AppShell';
import SRStats from '@/components/dashboard/SRStats';
import SRQuickLinks from '@/components/dashboard/SRQuickLinks';

export default function SRDashboard() {
  return (
    <AppShell role="sr">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-1">
            ড্যাশবোর্ড
          </h1>
          <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
            আপনার বিক্রয় সারসংক্ষেপ
          </p>
        </div>

        <SRStats />

        <div>
          <h2 className="text-sm font-semibold text-text-primary dark:text-dark-text-primary mb-3">
            দ্রুত প্রবেশ
          </h2>
          <SRQuickLinks />
        </div>
      </div>
    </AppShell>
  );
}
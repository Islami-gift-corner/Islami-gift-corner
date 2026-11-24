import AppShell from '@/components/layout/AppShell';
import BackButton from '@/components/layout/BackButton';
import ActivityLog from '@/components/admin/ActivityLog';

export default function ActivityLogPage() {
  return (
    <AppShell role="admin">
      <BackButton />

      <h1 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-1">
        অ্যাক্টিভিটি লগ
      </h1>
      <p className="text-sm text-text-secondary dark:text-dark-text-secondary mb-5">
        কে কী পরিবর্তন করেছে তার সাম্প্রতিক তালিকা
      </p>

      <ActivityLog />
    </AppShell>
  );
}

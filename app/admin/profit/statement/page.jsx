import AppShell from '@/components/layout/AppShell';
import BackButton from '@/components/layout/BackButton';
import ProfitStatement from '@/components/profit/ProfitStatement';

export default function ProfitStatementPage() {
  return (
    <AppShell role="admin">
      <BackButton />

      <h1 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-1">
        প্রফিট স্টেটমেন্ট
      </h1>
      <p className="text-sm text-text-secondary dark:text-dark-text-secondary mb-5">
        একাধিক মাস/বছর মিলিয়ে সম্পূর্ণ প্রফিটের হিসাব
      </p>

      <ProfitStatement />
    </AppShell>
  );
}
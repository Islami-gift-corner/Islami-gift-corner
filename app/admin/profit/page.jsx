import AppShell from '@/components/layout/AppShell';
import BackButton from '@/components/layout/BackButton';
import ProfitSummary from '@/components/profit/ProfitSummary';

export default function ProfitPage() {
  return (
    <AppShell role="admin">
      <BackButton />

      <h1 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-1">
        প্রফিট
      </h1>
      <p className="text-sm text-text-secondary dark:text-dark-text-secondary mb-5">
        আপনার ব্যবসার লাভের সম্পূর্ণ চিত্র
      </p>

      <ProfitSummary />
    </AppShell>
  );
}
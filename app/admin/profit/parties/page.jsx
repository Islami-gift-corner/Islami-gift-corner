import AppShell from '@/components/layout/AppShell';
import BackButton from '@/components/layout/BackButton';
import PartyProfitReport from '@/components/profit/PartyProfitReport';

export default function PartyProfitPage() {
  return (
    <AppShell role="admin">
      <BackButton />

      <h1 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-1">
        পার্টি প্রফিট
      </h1>
      <p className="text-sm text-text-secondary dark:text-dark-text-secondary mb-5">
        নির্দিষ্ট সময়ে কোন পার্টি থেকে কত লাভ হলো
      </p>

      <PartyProfitReport />
    </AppShell>
  );
}
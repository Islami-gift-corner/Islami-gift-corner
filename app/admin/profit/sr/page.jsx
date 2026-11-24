import AppShell from '@/components/layout/AppShell';
import BackButton from '@/components/layout/BackButton';
import SRProfitReport from '@/components/profit/SRProfitReport';

export default function SRProfitPage() {
  return (
    <AppShell role="admin">
      <BackButton />

      <h1 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-1">
        SR প্রফিট
      </h1>
      <p className="text-sm text-text-secondary dark:text-dark-text-secondary mb-5">
        নির্দিষ্ট সময়ে কোন SR-এর মাধ্যমে কত লাভ হলো
      </p>

      <SRProfitReport />
    </AppShell>
  );
}
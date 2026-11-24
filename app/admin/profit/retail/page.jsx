import AppShell from '@/components/layout/AppShell';
import BackButton from '@/components/layout/BackButton';
import RetailProfitList from '@/components/profit/RetailProfitList';

export default function RetailProfitPage() {
  return (
    <AppShell role="admin">
      <BackButton />

      <h1 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-1">
        খুচরা প্রফিট
      </h1>
      <p className="text-sm text-text-secondary dark:text-dark-text-secondary mb-5">
        খুচরা বিক্রয়ে ক্লিক করলে প্রতিটা পণ্যের লাভের বিস্তারিত দেখা যাবে
      </p>

      <RetailProfitList />
    </AppShell>
  );
}
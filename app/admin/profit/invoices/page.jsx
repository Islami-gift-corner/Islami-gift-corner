import AppShell from '@/components/layout/AppShell';
import BackButton from '@/components/layout/BackButton';
import InvoiceProfitList from '@/components/profit/InvoiceProfitList';

export default function InvoiceProfitPage() {
  return (
    <AppShell role="admin">
      <BackButton />

      <h1 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-1">
        INV প্রফিট
      </h1>
      <p className="text-sm text-text-secondary dark:text-dark-text-secondary mb-5">
        ইনভয়েসে ক্লিক করলে প্রতিটা পণ্যের লাভের বিস্তারিত দেখা যাবে (এটা প্রিন্টে আসে না, শুধু
        এডমিনের নিজের দেখার জন্য)
      </p>

      <InvoiceProfitList />
    </AppShell>
  );
}
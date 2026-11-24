import AppShell from '@/components/layout/AppShell';
import BackButton from '@/components/layout/BackButton';
import DataBackup from '@/components/admin/DataBackup';
import ProductionReset from '@/components/admin/ProductionReset';

export default function BackupPage() {
  return (
    <AppShell role="admin">
      <BackButton />

      <h1 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-1">
        ডেটা ব্যাকআপ
      </h1>
      <p className="text-sm text-text-secondary dark:text-dark-text-secondary mb-5">
        আপনার সব ব্যবসায়িক তথ্য ডাউনলোড করে নিরাপদে রাখুন
      </p>

      <DataBackup />

      <div className="mt-8">
        <ProductionReset />
      </div>
    </AppShell>
  );
}
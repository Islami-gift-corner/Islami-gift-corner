import AppShell from '@/components/layout/AppShell';
import BackButton from '@/components/layout/BackButton';
import SRProfile from '@/components/profile/SRProfile';

export default function SRProfilePage() {
  return (
    <AppShell role="sr">
      <BackButton />

      <h1 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-1">
        আমার প্রোফাইল
      </h1>
      <p className="text-sm text-text-secondary dark:text-dark-text-secondary mb-5">
        আপনার তথ্য দেখুন ও আপডেট করুন
      </p>

      <SRProfile />
    </AppShell>
  );
}

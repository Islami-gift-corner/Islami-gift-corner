import AppShell from '@/components/layout/AppShell';
import BackButton from '@/components/layout/BackButton';
import BusinessProfile from '@/components/admin/BusinessProfile';

export default function BusinessProfilePage() {
  return (
    <AppShell role="admin">
      <BackButton />

      <h1 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-1">
        বিজনেস প্রোফাইল
      </h1>
      <p className="text-sm text-text-secondary dark:text-dark-text-secondary mb-5">
        এই তথ্য সব ইনভয়েসের হেডারে দেখানো হবে
      </p>

      <BusinessProfile />
    </AppShell>
  );
}

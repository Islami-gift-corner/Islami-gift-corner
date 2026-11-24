import ChangePassword from '@/components/settings/ChangePassword';

export default function SettingsPage() {
  return (
    <div
      className="min-h-screen w-full flex flex-col items-center px-4 py-10
                 bg-background dark:bg-dark-background transition-colors duration-300"
    >
      <h1 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-6">
        সেটিংস
      </h1>
      <ChangePassword />
    </div>
  );
}

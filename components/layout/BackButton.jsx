'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function BackButton({ label = 'ফিরে যান' }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="flex items-center gap-2 mb-4 px-3 py-1.5 rounded-lg text-sm font-medium
                 text-text-secondary dark:text-dark-text-secondary
                 hover:bg-background-sidebar dark:hover:bg-dark-sidebar transition-colors w-fit"
    >
      <ArrowLeft size={16} />
      {label}
    </button>
  );
}

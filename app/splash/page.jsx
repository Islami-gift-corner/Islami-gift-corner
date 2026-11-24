'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { brand } from '@/lib/brand';

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/login');
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center gap-8
                 bg-gradient-to-b from-background to-background-sidebar
                 dark:from-dark-background dark:to-dark-sidebar
                 transition-colors duration-300"
    >
      {/* লোগো */}
      <div className="animate-logo-in flex flex-col items-center gap-3">
        <div className="relative w-40 h-40 sm:w-48 sm:h-48">
          {/* লোগো আসে lib/brand.js থেকে (ডিফল্ট: public/logo.svg) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={brand.logo} alt={brand.name} className="w-full h-full object-contain" />
        </div>
        <p className="text-text-secondary dark:text-dark-text-secondary text-sm font-medium tracking-wide">
          {brand.name}
        </p>
      </div>

      {/* লোডিং বার */}
      <div className="w-48 sm:w-56 flex flex-col items-center gap-2">
        <div
          className="w-full h-1.5 rounded-full bg-border dark:bg-dark-border overflow-hidden"
          role="progressbar"
          aria-label="লোড হচ্ছে"
        >
          <div className="h-full rounded-full bg-gradient-to-r from-primary to-primary-light animate-bar-load motion-reduce:animate-none motion-reduce:w-full" />
        </div>
        <span className="text-xs text-text-muted dark:text-dark-text-secondary">
          লোড হচ্ছে...
        </span>
      </div>
    </div>
  );
}

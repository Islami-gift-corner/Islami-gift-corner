'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserRound, Wallet, LayoutDashboard, Receipt, Users, UserCog, Store, Camera, BookOpen } from 'lucide-react';
import { SHOPS_ENABLED, SR_ENABLED } from '@/lib/features';

const adminTabs = [
  SR_ENABLED
    ? { href: '/admin/hire-sr', label: 'SR', icon: UserRound }
    : SHOPS_ENABLED
    ? { href: '/admin/shops', label: 'দোকান', icon: Store }
    : { href: '/admin/hire-sr', label: 'SR', icon: UserRound },
  { href: '/admin/ledger', label: 'ঠালি', icon: Wallet },
  { href: '/admin/dashboard', label: 'হোম', icon: LayoutDashboard },
  { href: '/admin/invoices', label: 'ইনভয়েস', icon: Receipt },
  { href: '/admin/parties', label: 'পার্টি', icon: Users },
];

const salesmanTabs = [
  { href: '/shop/khata', label: 'খাতা', icon: BookOpen },
  { href: '/shop/sales', label: 'বিক্রয়', icon: Receipt },
  { href: '/shop/dashboard', label: 'হোম', icon: LayoutDashboard },
  { href: '/shop/sale', label: 'বিক্রি', icon: Camera },
];

const srTabs = [
  { href: '/sr/profile', label: 'প্রোফাইল', icon: UserCog },
  { href: '/sr/ledger', label: 'ঠালি', icon: Wallet },
  { href: '/sr/dashboard', label: 'হোম', icon: LayoutDashboard },
  { href: '/sr/invoices', label: 'ইনভয়েস', icon: Receipt },
  { href: '/sr/parties', label: 'পার্টি', icon: Users },
];

export default function BottomNav({ role = 'admin', onOpenMenu }) {
  const pathname = usePathname();
  const tabs = role === 'admin' ? adminTabs : role === 'salesman' ? salesmanTabs : srTabs;

  return (
    <nav
      className="print:hidden fixed bottom-0 left-0 right-0 z-30 md:hidden
                 bg-background-card dark:bg-dark-card
                 border-t border-border dark:border-dark-border
                 flex items-center justify-around px-2 py-2
                 pb-[calc(0.5rem+env(safe-area-inset-bottom))]"
    >
      {tabs.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[11px] font-medium transition-colors
              ${
                active
                  ? 'text-primary dark:text-primary-light'
                  : 'text-text-muted dark:text-dark-text-secondary'
              }`}
          >
            <Icon size={20} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
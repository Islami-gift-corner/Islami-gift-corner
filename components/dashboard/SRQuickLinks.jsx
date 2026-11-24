'use client';

import Link from 'next/link';
import { Receipt, Users, Wallet, UserCog } from 'lucide-react';

const LINKS = [
  { href: '/sr/invoices', label: 'ইনভয়েস', icon: Receipt },
  { href: '/sr/parties', label: 'পার্টি খাতা', icon: Users },
  { href: '/sr/ledger', label: 'ঠালি খাতা', icon: Wallet },
  { href: '/sr/profile', label: 'প্রোফাইল', icon: UserCog },
];

export default function SRQuickLinks() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {LINKS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className="flex flex-col items-center gap-2 bg-background-card dark:bg-dark-card
                     rounded-2xl border border-border dark:border-dark-border p-4
                     hover:border-primary transition-colors text-center"
        >
          <div className="p-2.5 rounded-full bg-primary/10">
            <Icon size={18} className="text-primary" />
          </div>
          <span className="text-xs font-medium text-text-primary dark:text-dark-text-primary">
            {label}
          </span>
        </Link>
      ))}
    </div>
  );
}
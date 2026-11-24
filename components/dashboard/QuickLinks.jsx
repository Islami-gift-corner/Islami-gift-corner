'use client';

import Link from 'next/link';
import {
  Building2,
  Package,
  Warehouse,
  Receipt,
  Users,
  Wallet,
  UserPlus,
  UserCog,
  TrendingUp,
  ShoppingBag,
  Landmark,
} from 'lucide-react';

const LINKS = [
  { href: '/admin/companies', label: 'কোম্পানি', icon: Building2 },
  { href: '/admin/products', label: 'প্রোডাক্ট', icon: Package },
  { href: '/admin/stock', label: 'স্টক বুক', icon: Warehouse },
  { href: '/admin/invoices', label: 'ইনভয়েস', icon: Receipt },
  { href: '/admin/retail-sales', label: 'খুচরা বিক্রয়', icon: ShoppingBag },
  { href: '/admin/parties', label: 'পার্টি খাতা', icon: Users },
  { href: '/admin/ledger', label: 'ঠালি খাতা', icon: Wallet },
  { href: '/admin/bank', label: 'ব্যাংক', icon: Landmark },
  { href: '/admin/hire-sr', label: 'SR', icon: UserPlus },
  { href: '/admin/business-profile', label: 'বিজনেস প্রোফাইল', icon: UserCog },
  { href: '/admin/profit', label: 'প্রফিট', icon: TrendingUp },
];

export default function QuickLinks() {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
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

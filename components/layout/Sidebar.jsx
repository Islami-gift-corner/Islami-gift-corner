'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useBusiness } from '@/components/providers/BusinessProvider';
import { SHOPS_ENABLED, SR_ENABLED } from '@/lib/features';
import {
  LayoutDashboard,
  Building2,
  Package,
  Warehouse,
  Receipt,
  Users,
  Wallet,
  UserPlus,
  UserCog,
  TrendingUp,
  History,
  DownloadCloud,
  Settings,
  ShoppingBag,
  Landmark,
  Store,
  Camera,
  BookOpen,
  X,
} from 'lucide-react';

const allAdminLinks = [
  { href: '/admin/dashboard', label: 'ড্যাশবোর্ড', icon: LayoutDashboard },
  { href: '/admin/companies', label: 'কোম্পানি ম্যানেজমেন্ট', icon: Building2 },
  { href: '/admin/products', label: 'প্রোডাক্ট লিস্ট', icon: Package },
  { href: '/admin/stock', label: 'স্টক বুক', icon: Warehouse },
  { href: '/admin/invoices', label: 'ইনভয়েস', icon: Receipt },
  { href: '/admin/retail-sales', label: 'খুচরা বিক্রয়', icon: ShoppingBag },
  { href: '/admin/parties', label: 'পার্টি খাতা', icon: Users },
  { href: '/admin/ledger', label: 'ঠালি খাতা', icon: Wallet },
  { href: '/admin/bank', label: 'ব্যাংক', icon: Landmark },
  { href: '/admin/shops', label: 'দোকান', icon: Store, feature: 'shops' },
  { href: '/admin/hire-sr', label: 'SR', icon: UserPlus, feature: 'sr' },
  { href: '/admin/business-profile', label: 'বিজনেস প্রোফাইল', icon: UserCog },
  { href: '/admin/profit', label: 'প্রফিট', icon: TrendingUp },
  { href: '/admin/activity-log', label: 'অ্যাক্টিভিটি লগ', icon: History },
  { href: '/admin/backup', label: 'ডেটা ব্যাকআপ', icon: DownloadCloud },
  { href: '/settings', label: 'সেটিংস', icon: Settings },
];

// দোকান/SR ফিচার চালু-বন্ধ অনুযায়ী মেনু
const adminLinks = allAdminLinks.filter(
  (l) => (l.feature !== 'shops' || SHOPS_ENABLED) && (l.feature !== 'sr' || SR_ENABLED)
);

const salesmanLinks = [
  { href: '/shop/dashboard', label: 'ড্যাশবোর্ড', icon: LayoutDashboard },
  { href: '/shop/sale', label: 'নতুন বিক্রি', icon: Camera },
  { href: '/shop/sales', label: 'আমার বিক্রয়', icon: Receipt },
  { href: '/shop/khata', label: 'পার্টি খাতা', icon: BookOpen },
  { href: '/settings', label: 'সেটিংস', icon: Settings },
];

const srLinks = [
  { href: '/sr/dashboard', label: 'ড্যাশবোর্ড', icon: LayoutDashboard },
  { href: '/sr/invoices', label: 'ইনভয়েস', icon: Receipt },
  { href: '/sr/parties', label: 'পার্টি খাতা', icon: Users },
  { href: '/sr/profile', label: 'আমার প্রোফাইল', icon: UserCog },
  { href: '/settings', label: 'সেটিংস', icon: Settings },
];

export default function Sidebar({ role = 'admin', open, onClose }) {
  const pathname = usePathname();
  const business = useBusiness();
  const links = role === 'admin' ? adminLinks : role === 'salesman' ? salesmanLinks : srLinks;

  return (
    <>
      {/* মোবাইলে সাইডবার খোলা থাকলে পেছনে অন্ধকার ওভারলে */}
      {open && (
        <div
          onClick={onClose}
          className="print:hidden fixed inset-0 z-40 bg-black/40 md:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        className={`print:hidden fixed md:sticky top-0 left-0 z-50 md:z-auto h-screen
                    w-64 shrink-0 flex flex-col
                    bg-background-sidebar dark:bg-dark-sidebar
                    border-r border-border dark:border-dark-border
                    transition-transform duration-300
                    ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                    ${open ? 'md:block' : 'md:hidden'}`}
      >
        <div className="flex items-center justify-between px-4 py-4 md:hidden">
          <span className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">
            মেনু
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="মেনু বন্ধ করুন"
            className="p-1.5 rounded-lg text-text-secondary dark:text-dark-text-secondary
                       hover:bg-background dark:hover:bg-dark-background"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
                  ${
                    active
                      ? 'bg-gradient-to-r from-primary to-primary-light text-white shadow-sm'
                      : 'text-text-secondary dark:text-dark-text-secondary hover:bg-background dark:hover:bg-dark-background'
                  }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-border dark:border-dark-border">
          <p className="text-xs text-text-muted dark:text-dark-text-secondary text-center">
            {business.name}
          </p>
        </div>
      </aside>
    </>
  );
}

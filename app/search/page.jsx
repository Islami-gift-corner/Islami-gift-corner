'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue } from 'firebase/database';
import { database, auth } from '@/lib/firebase';
import AppShell from '@/components/layout/AppShell';
import BackButton from '@/components/layout/BackButton';
import Link from 'next/link';
import { Package, Users, Receipt, Building2 } from 'lucide-react';

function SearchContent() {
  const searchParams = useSearchParams();
  const query = (searchParams.get('q') || '').toLowerCase().trim();

  const [uid, setUid] = useState(null);
  const [role, setRole] = useState(null);
  const [companies, setCompanies] = useState({});
  const [parties, setParties] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  // auth.currentUser পেজ লোডের প্রথম মুহূর্তে null থাকতে পারে (Firebase সেশন রিস্টোর
  // হতে সময় লাগে), তাই onAuthStateChanged দিয়ে নিশ্চিতভাবে uid পাওয়ার পর role ফেচ
  // করা হচ্ছে — fail-safe, role নিশ্চিত না হওয়া পর্যন্ত ডিফল্ট 'admin' ধরা হবে না।
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUid(user?.uid || null);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!uid) return;
    const unsubscribe = onValue(ref(database, `users/${uid}/role`), (s) => {
      setRole(s.val() || null);
    });
    return () => unsubscribe();
  }, [uid]);

  useEffect(() => {
    const unsub1 = onValue(ref(database, 'companies'), (s) => setCompanies(s.val() || {}));
    const unsub2 = onValue(ref(database, 'parties'), (s) => {
      const data = s.val();
      setParties(data ? Object.entries(data).map(([id, v]) => ({ id, ...v })) : []);
    });
    const unsub3 = onValue(ref(database, 'invoices'), (s) => {
      const data = s.val();
      setInvoices(data ? Object.entries(data).map(([id, v]) => ({ id, ...v })) : []);
      setLoading(false);
    });

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, []);

  if (loading) {
    return (
      <AppShell role={role || 'sr'} guard={false}>
        <BackButton />
        <p className="text-sm text-text-muted dark:text-dark-text-secondary">লোড হচ্ছে...</p>
      </AppShell>
    );
  }

  if (!query) {
    return (
      <AppShell role={role || 'sr'} guard={false}>
        <BackButton />
        <p className="text-sm text-text-muted dark:text-dark-text-secondary">
          খুঁজতে উপরে সার্চ বক্সে কিছু টাইপ করুন
        </p>
      </AppShell>
    );
  }

  // প্রোডাক্ট মিলানো (সব কোম্পানির ভেতর থেকে)
  const matchedProducts = [];
  Object.entries(companies).forEach(([companyId, company]) => {
    Object.entries(company.products || {}).forEach(([productId, product]) => {
      if (product.name?.toLowerCase().includes(query)) {
        matchedProducts.push({ ...product, companyName: company.name, companyId, productId });
      }
    });
  });

  // কোম্পানি মিলানো
  const matchedCompanies = Object.entries(companies)
    .filter(([, c]) => c.name?.toLowerCase().includes(query))
    .map(([id, c]) => ({ id, ...c }));

  // পার্টি মিলানো (SR শুধু নিজের তৈরি করা পার্টি দেখবে, owner_id নেই এমন পুরনো
  // পার্টি — যেমন অ্যাডমিনের পুরনো ডেটা — কোনো SR দেখবে না)
  // fail-safe: শুধু role নিশ্চিতভাবে 'admin' হলেই সব পার্টি দেখাবে
  const visibleParties = role === 'admin' ? parties : parties.filter((p) => p.owner_id === uid);
  const matchedParties = visibleParties.filter(
    (p) =>
      p.name?.toLowerCase().includes(query) ||
      p.business_name?.toLowerCase().includes(query) ||
      p.phone?.includes(query)
  );

  // ইনভয়েস মিলানো (SR শুধু নিজের ইনভয়েস দেখবে)
  // fail-safe: শুধু role নিশ্চিতভাবে 'admin' হলেই সব ইনভয়েস দেখাবে
  const visibleInvoices = role === 'admin' ? invoices : invoices.filter((inv) => inv.sr_id === uid);
  const matchedInvoices = visibleInvoices.filter(
    (inv) =>
      inv.invoice_no?.toLowerCase().includes(query) ||
      inv.party?.name?.toLowerCase().includes(query)
  );

  const totalResults =
    matchedProducts.length + matchedCompanies.length + matchedParties.length + matchedInvoices.length;

  const isAdmin = role === 'admin';

  // SR-এর জন্য প্রোডাক্ট/কোম্পানির আলাদা পেজ নেই (শুধু অ্যাডমিনের আছে) — তাই SR-এর
  // ক্ষেত্রে এগুলো লিংক না হয়ে সাধারণ কার্ড হিসেবে দেখাবে, ক্লিকে অন্য পেজে বের হয়ে যাবে না
  const Wrapper = ({ href, className, children }) =>
    href ? (
      <Link href={href} className={className}>
        {children}
      </Link>
    ) : (
      <div className={className}>{children}</div>
    );

  const invoicesBasePath = role === 'admin' ? '/admin/invoices' : '/sr/invoices';
  const partiesBasePath = role === 'admin' ? '/admin/parties' : '/sr/parties';

  return (
    <AppShell role={role || 'sr'} guard={false}>
      <BackButton />
      <h1 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-1">
        সার্চ ফলাফল
      </h1>
      <p className="text-sm text-text-secondary dark:text-dark-text-secondary mb-5">
        &quot;{query}&quot; এর জন্য {totalResults}টি ফলাফল পাওয়া গেছে
      </p>

      <div className="flex flex-col gap-6">
        {matchedProducts.length > 0 && (
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-text-primary dark:text-dark-text-primary mb-2">
              <Package size={16} className="text-primary" />
              প্রোডাক্ট ({matchedProducts.length})
            </h2>
            <div className="flex flex-col gap-2">
              {matchedProducts.map((p) => (
                <Wrapper
                  key={`${p.companyId}-${p.productId}`}
                  href={isAdmin ? `/admin/products?company=${p.companyId}` : null}
                  className="flex items-center justify-between bg-background-card dark:bg-dark-card
                             rounded-xl border border-border dark:border-dark-border p-3 text-sm"
                >
                  <span className="text-text-primary dark:text-dark-text-primary">{p.name}</span>
                  <span className="text-text-muted dark:text-dark-text-secondary text-xs">
                    {p.companyName} · স্টক: {p.stock_qty ?? 0}
                  </span>
                </Wrapper>
              ))}
            </div>
          </div>
        )}

        {matchedCompanies.length > 0 && (
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-text-primary dark:text-dark-text-primary mb-2">
              <Building2 size={16} className="text-primary" />
              কোম্পানি ({matchedCompanies.length})
            </h2>
            <div className="flex flex-col gap-2">
              {matchedCompanies.map((c) => (
                <Wrapper
                  key={c.id}
                  href={isAdmin ? `/admin/products?company=${c.id}` : null}
                  className="bg-background-card dark:bg-dark-card rounded-xl border border-border dark:border-dark-border p-3 text-sm text-text-primary dark:text-dark-text-primary"
                >
                  {c.name}
                </Wrapper>
              ))}
            </div>
          </div>
        )}

        {matchedParties.length > 0 && (
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-text-primary dark:text-dark-text-primary mb-2">
              <Users size={16} className="text-primary" />
              পার্টি ({matchedParties.length})
            </h2>
            <div className="flex flex-col gap-2">
              {matchedParties.map((p) => (
                <Link
                  key={p.id}
                  href={`${partiesBasePath}?open=${p.id}`}
                  className="flex items-center justify-between bg-background-card dark:bg-dark-card
                             rounded-xl border border-border dark:border-dark-border p-3 text-sm"
                >
                  <span className="text-text-primary dark:text-dark-text-primary">{p.name}</span>
                  <span className="text-danger text-xs font-medium">৳{p.balance || 0} বাকি</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {matchedInvoices.length > 0 && (
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-text-primary dark:text-dark-text-primary mb-2">
              <Receipt size={16} className="text-primary" />
              ইনভয়েস ({matchedInvoices.length})
            </h2>
            <div className="flex flex-col gap-2">
              {matchedInvoices.map((inv) => (
                <Link
                  key={inv.id}
                  href={`${invoicesBasePath}?open=${inv.id}`}
                  className="flex items-center justify-between bg-background-card dark:bg-dark-card
                             rounded-xl border border-border dark:border-dark-border p-3 text-sm"
                >
                  <span className="text-text-primary dark:text-dark-text-primary">{inv.invoice_no}</span>
                  <span className="text-text-muted dark:text-dark-text-secondary text-xs">
                    {inv.party?.name} · ৳{inv.subtotal}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {totalResults === 0 && (
          <p className="text-sm text-text-muted dark:text-dark-text-secondary py-8 text-center">
            কোনো ফলাফল পাওয়া যায়নি
          </p>
        )}
      </div>
    </AppShell>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-text-muted">লোড হচ্ছে...</p>}>
      <SearchContent />
    </Suspense>
  );
  }

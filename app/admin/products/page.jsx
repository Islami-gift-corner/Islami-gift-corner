'use client';

import { useState, useEffect } from 'react';
import { ref, get } from 'firebase/database';
import { database } from '@/lib/firebase';
import AppShell from '@/components/layout/AppShell';
import BackButton from '@/components/layout/BackButton';
import CompanySelector from '@/components/product/CompanySelector';
import AddProduct from '@/components/product/AddProduct';
import BulkImportProducts from '@/components/product/BulkImportProducts';
import ProductList from '@/components/product/ProductList';

export default function ProductsPage() {
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedCompany, setSelectedCompany] = useState(null);

  // সার্চ ফলাফল থেকে ?company=<id> দিয়ে এলে সেই কোম্পানি অটো-সিলেক্ট হবে
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('company');
    if (!id) return;
    get(ref(database, `companies/${id}`)).then((snap) => {
      if (snap.exists()) {
        setSelectedCompanyId(id);
        setSelectedCompany({ id, ...snap.val() });
      }
    });
  }, []);

  const handleCompanyChange = (id, companyData) => {
    setSelectedCompanyId(id);
    setSelectedCompany(companyData || null);
  };

  return (
    <AppShell role="admin">
      <BackButton />

      <h1 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-1">
        প্রোডাক্ট লিস্ট
      </h1>
      <p className="text-sm text-text-secondary dark:text-dark-text-secondary mb-5">
        কোম্পানি নির্বাচন করে তার প্রোডাক্ট দেখুন ও ম্যানেজ করুন
      </p>

      <div className="mb-5">
        <CompanySelector value={selectedCompanyId} onChange={handleCompanyChange} />
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <AddProduct
          companyId={selectedCompanyId}
          defaultCommission={selectedCompany?.default_commission_percent}
        />
        <BulkImportProducts companyId={selectedCompanyId} />
      </div>

      <ProductList companyId={selectedCompanyId} />
    </AppShell>
  );
}

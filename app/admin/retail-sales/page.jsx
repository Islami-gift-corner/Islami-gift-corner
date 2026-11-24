'use client';

import { useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import BackButton from '@/components/layout/BackButton';
import RetailSaleForm from '@/components/retail/RetailSaleForm';
import RetailSaleList from '@/components/retail/RetailSaleList';
import RetailCustomerList from '@/components/retail/RetailCustomerList';
import RetailCustomerLedger from '@/components/retail/RetailCustomerLedger';
import AddRetailProduct from '@/components/retail/AddRetailProduct';
import RetailProductList from '@/components/retail/RetailProductList';
import { Plus, List, Users, ShoppingBag } from 'lucide-react';

export default function RetailSalesPage() {
  const [activeTab, setActiveTab] = useState('new'); // 'new' | 'list' | 'customers' | 'products'
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const TABS = [
    { key: 'new', label: 'নতুন বিক্রয়', icon: Plus },
    { key: 'list', label: 'বিক্রয় তালিকা', icon: List },
    { key: 'customers', label: 'কাস্টমার/বাকি', icon: Users },
    { key: 'products', label: 'খুচরা পণ্য', icon: ShoppingBag },
  ];

  return (
    <AppShell role="admin">
      <BackButton />

      <h1 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-1">
        খুচরা বিক্রয়
      </h1>
      <p className="text-sm text-text-secondary dark:text-dark-text-secondary mb-5">
        কোম্পানি ও নিজস্ব খুচরা পণ্য একসাথে বিক্রি করুন, বাকি ট্র্যাক করুন
      </p>

      <div
        className="flex gap-1 p-1 rounded-xl bg-background-card dark:bg-dark-card
                   border border-border dark:border-dark-border mb-6 w-fit overflow-x-auto max-w-full"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveTab(tab.key);
                setSelectedCustomer(null);
              }}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors
                ${
                  activeTab === tab.key
                    ? 'bg-gradient-to-r from-primary to-primary-light text-white shadow-sm'
                    : 'text-text-secondary dark:text-dark-text-secondary'
                }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'new' && <RetailSaleForm onSaved={() => setActiveTab('list')} />}
      {activeTab === 'list' && <RetailSaleList />}

      {activeTab === 'customers' &&
        (selectedCustomer ? (
          <RetailCustomerLedger
            customer={selectedCustomer}
            onBack={() => setSelectedCustomer(null)}
          />
        ) : (
          <RetailCustomerList onSelect={setSelectedCustomer} />
        ))}

      {activeTab === 'products' && (
        <div className="flex flex-col gap-6">
          <AddRetailProduct />
          <RetailProductList />
        </div>
      )}
    </AppShell>
  );
}
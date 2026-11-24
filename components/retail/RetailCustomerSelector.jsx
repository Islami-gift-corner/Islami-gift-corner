'use client';

import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '@/lib/firebase';
import { User } from 'lucide-react';
import AddRetailCustomer from './AddRetailCustomer';

export default function RetailCustomerSelector({ value, onChange }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddNew, setShowAddNew] = useState(false);

  useEffect(() => {
    const customersRef = ref(database, 'retail_customers');
    const unsubscribe = onValue(customersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([id, value]) => ({ id, ...value }));
        setCustomers(list);
      } else {
        setCustomers([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSelectChange = (e) => {
    const id = e.target.value;
    if (id === '__new__') {
      setShowAddNew(true);
      return;
    }
    const customer = customers.find((c) => c.id === id);
    onChange(id, customer || null);
  };

  const handleCustomerAdded = (newCustomer) => {
    setShowAddNew(false);
    if (newCustomer?.id) {
      onChange(newCustomer.id, newCustomer);
    }
  };

  if (showAddNew) {
    return (
      <div className="flex flex-col gap-2">
        <AddRetailCustomer onAdded={handleCustomerAdded} />
        <button
          type="button"
          onClick={() => setShowAddNew(false)}
          className="text-xs text-text-muted underline w-fit"
        >
          বাতিল করে তালিকা থেকে বেছে নিন
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <User
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted dark:text-dark-text-secondary pointer-events-none"
      />
      <select
        value={value || ''}
        onChange={handleSelectChange}
        disabled={loading}
        className="w-full appearance-none rounded-xl border border-border dark:border-dark-border
                   bg-background dark:bg-dark-background
                   text-text-primary dark:text-dark-text-primary text-sm
                   pl-9 pr-3 py-2.5
                   focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
      >
        <option value="" disabled>
          {loading ? 'লোড হচ্ছে...' : 'কাস্টমার নির্বাচন করুন'}
        </option>
        {customers.map((customer) => (
          <option key={customer.id} value={customer.id}>
            {customer.name} {customer.phone ? `— ${customer.phone}` : ''}
          </option>
        ))}
        <option value="__new__">+ নতুন কাস্টমার যোগ করুন</option>
      </select>
    </div>
  );
}
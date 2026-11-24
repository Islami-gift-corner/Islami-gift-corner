'use client';

import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '@/lib/firebase';
import { Users, ChevronRight } from 'lucide-react';

export default function RetailCustomerList({ onSelect }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const customersRef = ref(database, 'retail_customers');
    const unsubscribe = onValue(customersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([id, value]) => ({ id, ...value }));
        list.sort((a, b) => (b.balance || 0) - (a.balance || 0));
        setCustomers(list);
      } else {
        setCustomers([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <p className="text-sm text-text-muted dark:text-dark-text-secondary">লোড হচ্ছে...</p>;
  }

  if (customers.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 py-12 rounded-2xl
                   border border-dashed border-border dark:border-dark-border"
      >
        <Users size={28} className="text-text-muted" />
        <p className="text-sm text-text-muted dark:text-dark-text-secondary">
          এখনো কোনো খুচরা কাস্টমার যোগ করা হয়নি
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 max-w-2xl">
      {customers.map((customer) => (
        <button
          key={customer.id}
          type="button"
          onClick={() => onSelect(customer)}
          className="flex items-center justify-between gap-3 bg-background-card dark:bg-dark-card
                     rounded-xl border border-border dark:border-dark-border p-4 text-left
                     hover:border-primary transition-colors"
        >
          <div>
            <p className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">
              {customer.name}
            </p>
            <p className="text-xs text-text-secondary dark:text-dark-text-secondary">
              {customer.phone || 'নম্বর নেই'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p
                className={`text-sm font-medium ${
                  (customer.balance || 0) > 0 ? 'text-danger' : 'text-success'
                }`}
              >
                ৳{customer.balance || 0}
              </p>
              <p className="text-[10px] text-text-muted dark:text-dark-text-secondary">বাকি</p>
            </div>
            <ChevronRight size={16} className="text-text-muted" />
          </div>
        </button>
      ))}
    </div>
  );
}
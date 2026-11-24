'use client';

import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '@/lib/firebase';
import { Building2 } from 'lucide-react';

export default function CompanySelector({ value, onChange, allowedCompanyIds }) {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const companiesRef = ref(database, 'companies');
    const unsubscribe = onValue(companiesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        let list = Object.entries(data).map(([id, value]) => ({ id, ...value }));
        // allowedCompanyIds দেওয়া থাকলে (এবং খালি না হলে) শুধু সেই কোম্পানিগুলোই দেখানো হবে —
        // যেমন কোনো SR-কে নির্দিষ্ট কোম্পানির সাথে সীমাবদ্ধ করা থাকলে।
        // না দেওয়া থাকলে (undefined/null/খালি অ্যারে) সব কোম্পানি দেখাবে, আগের আচরণ অপরিবর্তিত।
        if (Array.isArray(allowedCompanyIds) && allowedCompanyIds.length > 0) {
          list = list.filter((c) => allowedCompanyIds.includes(c.id));
        }
        setCompanies(list);
      } else {
        setCompanies([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [allowedCompanyIds]);

  if (loading) {
    return (
      <p className="text-sm text-text-muted dark:text-dark-text-secondary">
        কোম্পানি লোড হচ্ছে...
      </p>
    );
  }

  if (companies.length === 0) {
    return (
      <p className="text-sm text-text-muted dark:text-dark-text-secondary">
        আগে একটা কোম্পানি যোগ করুন (কোম্পানি ম্যানেজমেন্ট পেজ থেকে)
      </p>
    );
  }

  return (
    <div className="relative w-full sm:w-64">
      <Building2
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted dark:text-dark-text-secondary pointer-events-none"
      />
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value, companies.find((c) => c.id === e.target.value))}
        className="w-full appearance-none rounded-xl border border-border dark:border-dark-border
                   bg-background dark:bg-dark-background
                   text-text-primary dark:text-dark-text-primary text-sm
                   pl-9 pr-3 py-2.5
                   focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
      >
        <option value="" disabled>
          কোম্পানি নির্বাচন করুন
        </option>
        {companies.map((company) => (
          <option key={company.id} value={company.id}>
            {company.name}
          </option>
        ))}
      </select>
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { database, auth } from '@/lib/firebase';
import { logActivity } from '@/lib/activityLog';
import { Building2, CheckCircle2, AlertCircle } from 'lucide-react';

// এডমিন SR নিয়োগ দেওয়ার পরও যেকোনো সময় তার কোম্পানি অনুমোদন পরিবর্তন করতে পারবে এখান থেকে।
// কিছু সিলেক্ট না থাকলে SR সব কোম্পানির প্রোডাক্ট বিক্রি করতে পারবে (কোনো বাধা নেই)।
export default function SRCompanyAccess({ sr }) {
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const companiesRef = ref(database, 'companies');
    const unsubscribe = onValue(companiesRef, (snapshot) => {
      const data = snapshot.val();
      setCompanies(data ? Object.entries(data).map(([id, value]) => ({ id, ...value })) : []);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setSelectedCompanyIds(sr.allowed_companies ? Object.keys(sr.allowed_companies) : []);
  }, [sr.allowed_companies]);

  const toggleCompany = (id) => {
    setSelectedCompanyIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const allowedCompanies =
        selectedCompanyIds.length > 0
          ? selectedCompanyIds.reduce((acc, id) => ({ ...acc, [id]: true }), {})
          : null;

      await update(ref(database, `users/${sr.id}`), {
        allowed_companies: allowedCompanies,
      });
      await logActivity({
        userId: auth.currentUser?.uid,
        action: 'SR কোম্পানি অনুমোদন পরিবর্তন',
        target: sr.name,
      });
      setMessage({ type: 'success', text: 'কোম্পানি অনুমোদন সংরক্ষণ হয়েছে' });
    } catch (err) {
      setMessage({ type: 'error', text: 'সংরক্ষণ করা যায়নি, আবার চেষ্টা করুন' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-text-muted dark:text-dark-text-secondary">লোড হচ্ছে...</p>;
  }

  return (
    <div
      className="bg-background-card dark:bg-dark-card rounded-2xl shadow-sm
                 border border-border dark:border-dark-border p-5 max-w-md"
    >
      <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary dark:text-dark-text-primary mb-1">
        <Building2 size={16} />
        কোম্পানি অনুমোদন
      </h3>
      <p className="text-xs text-text-muted dark:text-dark-text-secondary mb-4">
        এই SR কোন কোম্পানির প্রোডাক্ট বিক্রি করতে পারবে তা নিয়ন্ত্রণ করুন
      </p>

      {companies.length === 0 ? (
        <p className="text-sm text-text-muted dark:text-dark-text-secondary">
          এখনো কোনো কোম্পানি যোগ করা হয়নি
        </p>
      ) : (
        <div
          className="rounded-xl border border-border dark:border-dark-border
                     bg-background dark:bg-dark-background p-3 flex flex-col gap-2 max-h-48 overflow-y-auto mb-3"
        >
          {companies.map((company) => (
            <label
              key={company.id}
              className="flex items-center gap-2 text-sm text-text-primary dark:text-dark-text-primary cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedCompanyIds.includes(company.id)}
                onChange={() => toggleCompany(company.id)}
                className="rounded accent-primary"
              />
              {company.name}
            </label>
          ))}
        </div>
      )}

      <p className="text-[11px] text-text-muted dark:text-dark-text-secondary mb-3">
        💡 কোনোটা সিলেক্ট না থাকলে SR সব কোম্পানির প্রোডাক্ট বিক্রি করতে পারবে।
      </p>

      {message && (
        <p
          className={`flex items-start gap-2 text-xs rounded-lg px-3 py-2 mb-3
            ${message.type === 'success' ? 'text-success bg-success/10' : 'text-danger bg-danger/10'}`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
          ) : (
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
          )}
          {message.text}
        </p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-xl py-2.5 text-sm font-medium text-white
                   bg-gradient-to-r from-primary to-primary-light disabled:opacity-60"
      >
        {saving ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
      </button>
    </div>
  );
}
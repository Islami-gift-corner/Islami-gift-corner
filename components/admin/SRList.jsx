'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '@/lib/firebase';
import { UserRound, Phone, ChevronRight } from 'lucide-react';

export default function SRList() {
  const router = useRouter();
  const [srUsers, setSrUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const usersRef = ref(database, 'users');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data)
          .map(([id, value]) => ({ id, ...value }))
          .filter((u) => u.role === 'sr');
        setSrUsers(list);
      } else {
        setSrUsers([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <p className="text-sm text-text-muted dark:text-dark-text-secondary">লোড হচ্ছে...</p>;
  }

  if (srUsers.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 py-12 rounded-2xl
                   border border-dashed border-border dark:border-dark-border"
      >
        <UserRound size={28} className="text-text-muted" />
        <p className="text-sm text-text-muted dark:text-dark-text-secondary">
          এখনো কোনো SR নিয়োগ দেওয়া হয়নি
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 max-w-md">
      {srUsers.map((sr) => (
        <button
          key={sr.id}
          type="button"
          onClick={() => router.push(`/admin/sr-profile?id=${sr.id}`)}
          className="flex items-center justify-between gap-3 bg-background-card dark:bg-dark-card
                     rounded-xl border border-border dark:border-dark-border p-4 text-left
                     hover:border-primary transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10 shrink-0">
              <UserRound size={18} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">
                {sr.name}
              </p>
              {sr.phone && (
                <p className="flex items-center gap-1.5 text-xs text-text-secondary dark:text-dark-text-secondary">
                  <Phone size={12} />
                  {sr.phone}
                </p>
              )}
            </div>
          </div>
          <ChevronRight size={18} className="text-text-muted shrink-0" />
        </button>
      ))}
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '@/lib/firebase';
import { History, UserRound } from 'lucide-react';

export default function ActivityLog() {
  const [logs, setLogs] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const usersRef = ref(database, 'users');
    const unsubUsers = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      const map = {};
      if (data) {
        Object.entries(data).forEach(([id, value]) => {
          map[id] = value.name || value.email;
        });
      }
      setUsersMap(map);
    });

    const logRef = ref(database, 'activity_log');
    const unsubLogs = onValue(logRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data)
          .map(([id, value]) => ({ id, ...value }))
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .slice(0, 100);
        setLogs(list);
      } else {
        setLogs([]);
      }
      setLoading(false);
    });

    return () => {
      unsubUsers();
      unsubLogs();
    };
  }, []);

  if (loading) {
    return <p className="text-sm text-text-muted dark:text-dark-text-secondary">লোড হচ্ছে...</p>;
  }

  if (logs.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 py-12 rounded-2xl
                   border border-dashed border-border dark:border-dark-border"
      >
        <History size={28} className="text-text-muted" />
        <p className="text-sm text-text-muted dark:text-dark-text-secondary">
          এখনো কোনো অ্যাক্টিভিটি রেকর্ড হয়নি
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 max-w-2xl">
      {logs.map((log) => (
        <div
          key={log.id}
          className="flex items-start gap-3 bg-background-card dark:bg-dark-card
                     rounded-xl border border-border dark:border-dark-border p-3"
        >
          <div className="p-2 rounded-full bg-primary/10 shrink-0">
            <UserRound size={14} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-text-primary dark:text-dark-text-primary">
              <span className="font-medium">{usersMap[log.user_id] || 'অজানা ইউজার'}</span>{' '}
              — {log.action}
            </p>
            {log.target && (
              <p className="text-xs text-text-secondary dark:text-dark-text-secondary truncate">
                {log.target}
              </p>
            )}
            <p className="text-[11px] text-text-muted dark:text-dark-text-secondary mt-0.5">
              {new Date(log.timestamp).toLocaleString('bn-BD')}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
            }

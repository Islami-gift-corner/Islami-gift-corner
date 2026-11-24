'use client';

import { useState, useEffect } from 'react';
import { ref, onValue, update, remove } from 'firebase/database';
import { database, auth } from '@/lib/firebase';
import { logActivity } from '@/lib/activityLog';
import { Wallet, Sparkles, Pencil, Trash2, Check, X, AlertCircle, AlertTriangle } from 'lucide-react';

// SR এর নিজস্ব ঠালি খাতার তালিকা — sr_ledger/{uid}/entries থেকে পড়া হয়,
// তাই অন্য SR বা এডমিনের এন্ট্রি এখানে কখনো দেখা যাবে না।
export default function SRLedgerList({ type }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  // ভুল করে ভুল আয়/ব্যয় লিখে ফেললে পরে সংশোধন/ডিলিট করার জন্য
  const [editingId, setEditingId] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editDate, setEditDate] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [actionError, setActionError] = useState('');

  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (!uid) {
      setEntries([]);
      setLoading(false);
      return;
    }

    const ledgerRef = ref(database, `sr_ledger/${uid}/entries`);
    const unsubscribe = onValue(ledgerRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data)
          .map(([id, value]) => ({ id, ...value }))
          .filter((entry) => entry.type === type)
          .sort((a, b) => new Date(b.date) - new Date(a.date));
        setEntries(list);
      } else {
        setEntries([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [type, uid]);

  const startEdit = (entry) => {
    setActionError('');
    setEditingId(entry.id);
    setEditAmount(String(entry.amount));
    setEditNote(entry.note || '');
    setEditDate(new Date(entry.date).toISOString().split('T')[0]);
  };

  const saveEdit = async (id) => {
    setActionError('');
    const newAmount = Number(editAmount);
    if (!editAmount || isNaN(newAmount) || newAmount <= 0) {
      setActionError('সঠিক পরিমাণ দিন');
      return;
    }
    if (!editDate) {
      setActionError('তারিখ নির্বাচন করুন');
      return;
    }
    if (!uid) return;
    try {
      await update(ref(database, `sr_ledger/${uid}/entries/${id}`), {
        amount: newAmount,
        note: editNote.trim(),
        date: new Date(`${editDate}T12:00:00`).toISOString(),
      });
      await logActivity({
        userId: uid,
        action: `নিজের ঠালি খাতা ${type === 'income' ? 'আয়' : 'ব্যয়'} সংশোধন`,
        target: `৳${newAmount}`,
      });
      setEditingId(null);
    } catch (err) {
      setActionError('সংশোধন করা যায়নি, আবার চেষ্টা করুন');
    }
  };

  const handleDelete = async (entry) => {
    if (!uid) return;
    try {
      await remove(ref(database, `sr_ledger/${uid}/entries/${entry.id}`));
      await logActivity({
        userId: uid,
        action: `নিজের ঠালি খাতা ${type === 'income' ? 'আয়' : 'ব্যয়'} ডিলিট`,
        target: `${entry.category} — ৳${entry.amount}`,
      });
      setConfirmDeleteId(null);
    } catch (err) {
      setActionError('ডিলিট করা যায়নি, আবার চেষ্টা করুন');
    }
  };

  if (loading) {
    return <p className="text-sm text-text-muted dark:text-dark-text-secondary">লোড হচ্ছে...</p>;
  }

  const total = entries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  // ক্যাটাগরি ওয়াইজ যোগফল
  const byCategory = entries.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + (Number(e.amount) || 0);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      {/* সারসংক্ষেপ */}
      <div
        className={`rounded-2xl p-4 flex items-center justify-between
          ${type === 'income' ? 'bg-success/10' : 'bg-danger/10'}`}
      >
        <span className="flex items-center gap-2 text-sm font-medium text-text-primary dark:text-dark-text-primary">
          <Wallet size={16} className={type === 'income' ? 'text-success' : 'text-danger'} />
          মোট {type === 'income' ? 'আয়' : 'ব্যয়'}
        </span>
        <span className={`text-lg font-bold ${type === 'income' ? 'text-success' : 'text-danger'}`}>
          ৳{total}
        </span>
      </div>

      {/* ক্যাটাগরি ওয়াইজ ব্রেকডাউন */}
      {Object.keys(byCategory).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(byCategory).map(([cat, amt]) => (
            <span
              key={cat}
              className="text-xs font-medium bg-background-card dark:bg-dark-card border border-border dark:border-dark-border
                         rounded-full px-3 py-1.5 text-text-secondary dark:text-dark-text-secondary"
            >
              {cat}: ৳{amt}
            </span>
          ))}
        </div>
      )}

      {actionError && (
        <p className="flex items-center gap-2 text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">
          <AlertCircle size={14} />
          {actionError}
        </p>
      )}

      {/* এন্ট্রি তালিকা */}
      {entries.length === 0 ? (
        <p className="text-sm text-text-muted dark:text-dark-text-secondary py-6 text-center">
          এখনো কোনো {type === 'income' ? 'আয়' : 'ব্যয়'} এন্ট্রি নেই
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map((entry) =>
            editingId === entry.id ? (
              <div
                key={entry.id}
                className="bg-background-card dark:bg-dark-card rounded-xl border border-primary p-3 flex flex-col gap-2"
              >
                {entry.auto_generated && (
                  <p className="flex items-center gap-1.5 text-[11px] text-warning">
                    <AlertTriangle size={12} />
                    এটা স্বয়ংক্রিয়ভাবে তৈরি হওয়া এন্ট্রি — বদলালে মূল ইনভয়েসের সাথে অমিল হতে পারে
                  </p>
                )}
                <input
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  placeholder="পরিমাণ (৳)"
                  className="rounded-lg border border-border dark:border-dark-border
                             bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                             px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="rounded-lg border border-border dark:border-dark-border
                             bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                             px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <input
                  type="text"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="নোট (ঐচ্ছিক)"
                  className="rounded-lg border border-border dark:border-dark-border
                             bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                             px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => saveEdit(entry.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium
                               text-white bg-gradient-to-r from-primary to-primary-light"
                  >
                    <Check size={14} />
                    সংরক্ষণ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setActionError('');
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium
                               border border-border dark:border-dark-border text-text-secondary dark:text-dark-text-secondary"
                  >
                    <X size={14} />
                    বাতিল
                  </button>
                </div>
              </div>
            ) : confirmDeleteId === entry.id ? (
              <div
                key={entry.id}
                className="bg-danger/10 rounded-xl border border-danger p-3 flex flex-col gap-2"
              >
                <p className="text-xs text-danger">
                  "{entry.category}" — ৳{entry.amount} এন্ট্রিটা মুছে ফেলবেন?
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleDelete(entry)}
                    className="flex-1 rounded-lg py-1.5 text-xs font-medium text-white bg-danger"
                  >
                    হ্যাঁ, ডিলিট করুন
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(null)}
                    className="flex-1 rounded-lg py-1.5 text-xs font-medium border border-border dark:border-dark-border
                               text-text-secondary dark:text-dark-text-secondary"
                  >
                    বাতিল
                  </button>
                </div>
              </div>
            ) : (
              <div
                key={entry.id}
                className="flex items-center justify-between bg-background-card dark:bg-dark-card
                           rounded-xl border border-border dark:border-dark-border p-3"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-medium text-text-primary dark:text-dark-text-primary">
                    {entry.category}
                    {entry.auto_generated && (
                      <span title="স্বয়ংক্রিয়ভাবে যোগ হয়েছে">
                        <Sparkles size={12} className="text-primary" />
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-text-muted dark:text-dark-text-secondary truncate">
                    {new Date(entry.date).toLocaleDateString('bn-BD')}
                    {entry.note ? ` · ${entry.note}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`text-sm font-semibold ${type === 'income' ? 'text-success' : 'text-danger'}`}
                  >
                    {type === 'income' ? '+' : '-'}৳{entry.amount}
                  </span>
                  <button
                    type="button"
                    onClick={() => startEdit(entry)}
                    aria-label="সংশোধন করুন"
                    className="p-1.5 rounded-lg text-text-muted hover:bg-background dark:hover:bg-dark-background"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActionError('');
                      setConfirmDeleteId(entry.id);
                    }}
                    aria-label="ডিলিট করুন"
                    className="p-1.5 rounded-lg text-danger hover:bg-danger/10"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
      }

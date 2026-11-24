'use client';

import { useState, useEffect } from 'react';
import { ref, onValue, push, set } from 'firebase/database';
import { database, auth } from '@/lib/firebase';
import { logActivity } from '@/lib/activityLog';
import { DIRECTIONS, summarizeDebt } from '@/lib/debtUtils';
import { money, todayStr, dateStrToIso, fmtDate } from '@/lib/format';
import { HandCoins, UserRound, ChevronRight, Plus, X, AlertCircle, CheckCircle2, Phone } from 'lucide-react';

const labelCls = 'block text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1.5';
const inputCls = `w-full rounded-xl border border-border dark:border-dark-border
  bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
  px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-text-muted`;

const EMPTY = { name: '', phone: '', address: '', amount: '', date: todayStr(), note: '' };

export default function DebtSection({ onSelect }) {
  const [direction, setDirection] = useState('borrowed'); // 'borrowed' | 'lent'
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = onValue(ref(database, 'personal_debts'), (snap) => {
      const data = snap.val();
      setPeople(data ? Object.entries(data).map(([id, v]) => ({ id, ...v })) : []);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const d = DIRECTIONS[direction];
  const list = people
    .filter((p) => p.direction === direction)
    .map((p) => ({ person: p, s: summarizeDebt(p) }))
    .sort((a, b) => b.s.remaining - a.s.remaining);

  const totalGiven = list.reduce((s, x) => s + x.s.total, 0);
  const totalPaid = list.reduce((s, x) => s + x.s.paid, 0);
  const totalRemaining = list.reduce((s, x) => s + Math.max(0, x.s.remaining), 0);

  const setF = (field) => (e) => {
    setForm((p) => ({ ...p, [field]: e.target.value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.name.trim()) return setError('নাম দিন');
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0) return setError('সঠিক পরিমাণ দিন');
    if (!form.date) return setError('তারিখ দিন');

    setSaving(true);
    try {
      const personRef = push(ref(database, 'personal_debts'));
      const entryKey = push(ref(database, `personal_debts/${personRef.key}/entries`)).key;
      await set(personRef, {
        name: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        direction,
        created_at: new Date().toISOString(),
        entries: {
          [entryKey]: {
            type: 'principal',
            amount: Number(form.amount),
            date: dateStrToIso(form.date),
            note: form.note.trim(),
            created_at: new Date().toISOString(),
          },
        },
      });
      await logActivity({
        userId: auth.currentUser?.uid,
        action: `${d.title} — নতুন প্রোফাইল`,
        target: `${form.name.trim()} — ৳${form.amount}`,
      });
      setSuccess('প্রোফাইল তৈরি হয়েছে');
      setForm({ ...EMPTY, date: todayStr() });
      setTimeout(() => {
        setOpen(false);
        setSuccess('');
        onSelect(personRef.key);
      }, 500);
    } catch (err) {
      setError('সংরক্ষণ করা যায়নি, আবার চেষ্টা করুন');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* ঋণ গ্রহণ / ঋণ দান */}
      <div
        className="flex gap-1 p-1 rounded-xl bg-background-card dark:bg-dark-card
                   border border-border dark:border-dark-border w-fit"
      >
        {Object.entries(DIRECTIONS).map(([key, dd]) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setDirection(key);
              setOpen(false);
            }}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors
              ${
                direction === key
                  ? 'bg-gradient-to-r from-primary to-primary-light text-white shadow-sm'
                  : 'text-text-secondary dark:text-dark-text-secondary'
              }`}
          >
            {dd.title}
          </button>
        ))}
      </div>

      {/* ওভারভিউ */}
      <div className="bg-background-card dark:bg-dark-card rounded-2xl shadow-sm border border-border dark:border-dark-border p-5">
        <h2 className="text-sm font-semibold text-text-primary dark:text-dark-text-primary mb-3">
          {d.title} — ওভারভিউ
        </h2>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-background dark:bg-dark-background p-3">
            <p className="text-[11px] text-text-muted dark:text-dark-text-secondary mb-1">{d.totalLabel}</p>
            <p className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">৳{money(totalGiven)}</p>
          </div>
          <div className="rounded-xl bg-success/10 p-3">
            <p className="text-[11px] text-text-muted dark:text-dark-text-secondary mb-1">{d.paidLabel}</p>
            <p className="text-sm font-semibold text-success">৳{money(totalPaid)}</p>
          </div>
          <div className="rounded-xl bg-danger/10 p-3">
            <p className="text-[11px] text-text-muted dark:text-dark-text-secondary mb-1">{d.remainingLabel}</p>
            <p className="text-sm font-semibold text-danger">৳{money(totalRemaining)}</p>
          </div>
        </div>
      </div>

      {/* নতুন প্রোফাইল */}
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white
                     bg-gradient-to-r from-primary to-primary-light w-fit"
        >
          <Plus size={18} />
          {direction === 'borrowed' ? 'নতুন ঋণ গ্রহণ' : 'নতুন ঋণ দান'}
        </button>
      ) : (
        <div className="bg-background-card dark:bg-dark-card rounded-2xl shadow-sm border border-border dark:border-dark-border p-5 max-w-md w-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="flex items-center gap-2 text-base font-semibold text-text-primary dark:text-dark-text-primary">
              <HandCoins size={18} className="text-primary" />
              {direction === 'borrowed' ? 'নতুন ঋণ গ্রহণ' : 'নতুন ঋণ দান'}
            </h3>
            <button type="button" onClick={() => setOpen(false)} aria-label="বন্ধ করুন" className="p-1 rounded-lg text-text-muted hover:bg-background dark:hover:bg-dark-background">
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div>
              <label className={labelCls}>{d.personWord} — নাম *</label>
              <input type="text" value={form.name} onChange={setF('name')} placeholder="নাম" className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>মোবাইল (ঐচ্ছিক)</label>
                <input type="text" value={form.phone} onChange={setF('phone')} placeholder="01XXXXXXXXX" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>ঠিকানা (ঐচ্ছিক)</label>
                <input type="text" value={form.address} onChange={setF('address')} placeholder="ঠিকানা" className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>ঋণের পরিমাণ (৳) *</label>
                <input type="number" value={form.amount} onChange={setF('amount')} placeholder="0" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>তারিখ</label>
                <input type="date" value={form.date} max={todayStr()} onChange={setF('date')} className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>নোট (ঐচ্ছিক)</label>
              <input type="text" value={form.note} onChange={setF('note')} placeholder="যেমন: কী কারণে" className={inputCls} />
            </div>
            {error && (
              <p className="flex items-center gap-2 text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">
                <AlertCircle size={14} /> {error}
              </p>
            )}
            {success && (
              <p className="flex items-center gap-2 text-xs text-success bg-success/10 rounded-lg px-3 py-2">
                <CheckCircle2 size={14} /> {success}
              </p>
            )}
            <button type="submit" disabled={saving} className="w-full rounded-xl py-2.5 text-sm font-medium text-white bg-gradient-to-r from-primary to-primary-light disabled:opacity-60">
              {saving ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
            </button>
          </form>
        </div>
      )}

      {/* প্রোফাইলের তালিকা */}
      {loading ? (
        <p className="text-sm text-text-muted dark:text-dark-text-secondary">লোড হচ্ছে...</p>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10 rounded-2xl border border-dashed border-border dark:border-dark-border">
          <HandCoins size={26} className="text-text-muted" />
          <p className="text-sm text-text-muted dark:text-dark-text-secondary">এখনো কোনো {d.title} এন্ট্রি নেই</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {list.map(({ person, s }) => (
            <button
              key={person.id}
              type="button"
              onClick={() => onSelect(person.id)}
              className="flex items-center justify-between gap-3 bg-background-card dark:bg-dark-card
                         rounded-xl border border-border dark:border-dark-border p-3 text-left
                         hover:border-primary transition-colors"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-semibold text-text-primary dark:text-dark-text-primary">
                  <UserRound size={14} className="text-primary shrink-0" />
                  <span className="truncate">{person.name}</span>
                </p>
                <p className="flex items-center gap-1 text-[11px] text-text-muted dark:text-dark-text-secondary">
                  {person.phone && (
                    <>
                      <Phone size={10} /> {person.phone} ·{' '}
                    </>
                  )}
                  {s.lastDate ? `শেষ লেনদেন ${fmtDate(s.lastDate)}` : ''}
                </p>
                <p className="text-[11px] text-text-secondary dark:text-dark-text-secondary mt-0.5">
                  {direction === 'borrowed' ? 'নিয়েছি' : 'দিয়েছি'} ৳{money(s.total)} · {direction === 'borrowed' ? 'দিয়েছি' : 'পেয়েছি'} ৳{money(s.paid)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right">
                  {s.remaining > 0 ? (
                    <p className="text-sm font-semibold text-danger">৳{money(s.remaining)}</p>
                  ) : (
                    <p className="text-xs font-medium text-success">পরিশোধিত</p>
                  )}
                  <p className="text-[10px] text-text-muted dark:text-dark-text-secondary">
                    {s.remaining > 0 ? (direction === 'borrowed' ? 'বাকি (সে পাবে)' : 'বাকি (আমি পাবো)') : ''}
                  </p>
                </div>
                <ChevronRight size={16} className="text-text-muted" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

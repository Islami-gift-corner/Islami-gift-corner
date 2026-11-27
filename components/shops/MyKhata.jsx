'use client';

import { useMemo, useState } from 'react';
import { ref, push, set } from 'firebase/database';
import { database } from '@/lib/firebase';
import { money, fmtDate, todayStr } from '@/lib/format';
import { partyBalance, num } from '@/lib/shopUtils';
import { Plus, ArrowLeft, Phone, AlertCircle } from 'lucide-react';
import { useSalesmanProfile } from './useSalesmanProfile';
import { useOwnKhata } from './useShopData';
import { cardCls, inputCls, btnPrimary, btnGhost, mutedCls, labelCls } from './ui';

const TYPE_LABEL = { sale_due: 'বাকি বিক্রয়', opening: 'আগের বাকি', payment: 'টাকা জমা' };

export default function MyKhata() {
  const { uid, shopId } = useSalesmanProfile();
  const { parties, entries, loading } = useOwnKhata(shopId, uid);
  const [selectedId, setSelectedId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [partyForm, setPartyForm] = useState({ name: '', phone: '', opening: '' });
  const [txn, setTxn] = useState(null); // 'payment' | 'opening'
  const [txnForm, setTxnForm] = useState({ amount: '', note: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const list = useMemo(
    () =>
      parties
        .map((p) => ({ ...p, balance: partyBalance(entries.filter((e) => e.party_id === p.id)) }))
        .sort((a, b) => b.balance - a.balance),
    [parties, entries]
  );
  const totalDue = list.reduce((s, p) => s + p.balance, 0);
  const selected = list.find((p) => p.id === selectedId);
  const selectedEntries = useMemo(
    () =>
      entries
        .filter((e) => e.party_id === selectedId)
        .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')),
    [entries, selectedId]
  );

  const base = `shop_khata/${shopId}/${uid}`;

  const addParty = async (e) => {
    e.preventDefault();
    setError('');
    if (!partyForm.name.trim()) return setError('পার্টির নাম দিন');
    if (partyForm.opening !== '' && (isNaN(partyForm.opening) || num(partyForm.opening) < 0)) {
      return setError('আগের বাকির পরিমাণ সঠিক নয়');
    }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const pRef = push(ref(database, `${base}/parties`));
      await set(pRef, { name: partyForm.name.trim(), phone: partyForm.phone.trim(), created_at: now });
      if (num(partyForm.opening) > 0) {
        await set(push(ref(database, `${base}/entries`)), {
          party_id: pRef.key,
          type: 'opening',
          amount: num(partyForm.opening),
          date: todayStr(),
          note: 'আগের বাকি',
          created_at: now,
        });
      }
      setPartyForm({ name: '', phone: '', opening: '' });
      setShowAdd(false);
    } catch (err) {
      setError('পার্টি যোগ করা যায়নি, আবার চেষ্টা করুন');
    } finally {
      setSaving(false);
    }
  };

  const saveTxn = async (e) => {
    e.preventDefault();
    setError('');
    const amount = num(txnForm.amount);
    if (!(amount > 0)) return setError('সঠিক পরিমাণ দিন');
    if (txn === 'payment' && amount > selected.balance + 0.0001) {
      if (!window.confirm(`বাকি আছে ৳${money(selected.balance)}, কিন্তু আপনি ৳${money(amount)} জমা নিচ্ছেন। তবুও সেভ করবেন?`)) return;
    }
    setSaving(true);
    try {
      await set(push(ref(database, `${base}/entries`)), {
        party_id: selected.id,
        type: txn,
        amount,
        date: todayStr(),
        note: txnForm.note.trim(),
        created_at: new Date().toISOString(),
      });
      setTxn(null);
      setTxnForm({ amount: '', note: '' });
    } catch (err) {
      setError('সেভ করা যায়নি, আবার চেষ্টা করুন');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className={`text-sm ${mutedCls}`}>লোড হচ্ছে...</p>;

  // ---------- পার্টির বিস্তারিত ----------
  if (selected) {
    return (
      <div className="flex flex-col gap-4 max-w-xl">
        <button type="button" onClick={() => { setSelectedId(null); setTxn(null); setError(''); }} className="flex items-center gap-2 text-sm text-text-secondary dark:text-dark-text-secondary w-fit">
          <ArrowLeft size={16} />
          সব পার্টি
        </button>

        <div className={cardCls}>
          <p className="text-base font-semibold text-text-primary dark:text-dark-text-primary">{selected.name}</p>
          {selected.phone && (
            <p className={`text-xs flex items-center gap-1 ${mutedCls}`}>
              <Phone size={11} />
              {selected.phone}
            </p>
          )}
          <p className="mt-2 text-xs text-text-secondary dark:text-dark-text-secondary">মোট বাকি</p>
          <p className={`text-2xl font-bold ${selected.balance > 0 ? 'text-danger' : 'text-success'}`}>
            ৳{money(selected.balance)}
          </p>
        </div>

        {txn ? (
          <form onSubmit={saveTxn} className={`${cardCls} flex flex-col gap-3`}>
            <p className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">
              {txn === 'payment' ? 'টাকা জমা নিন' : 'আগের বাকি যোগ করুন'}
            </p>
            <div>
              <label className={labelCls}>পরিমাণ (৳)</label>
              <input type="number" inputMode="decimal" value={txnForm.amount} onChange={(e) => setTxnForm((f) => ({ ...f, amount: e.target.value }))} className={inputCls} autoFocus />
            </div>
            <input type="text" value={txnForm.note} onChange={(e) => setTxnForm((f) => ({ ...f, note: e.target.value }))} placeholder="নোট (ঐচ্ছিক)" className={inputCls} />
            {error && (
              <p className="flex items-center gap-2 text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">
                <AlertCircle size={14} />
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className={`${btnPrimary} flex-1`}>
                {saving ? 'সেভ হচ্ছে...' : 'সেভ করুন'}
              </button>
              <button type="button" onClick={() => { setTxn(null); setError(''); }} className={btnGhost}>
                বাতিল
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setTxn('payment')} className={btnPrimary}>
              টাকা জমা নিন
            </button>
            <button type="button" onClick={() => setTxn('opening')} className={btnGhost}>
              বাকি যোগ করুন
            </button>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <h2 className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">লেনদেনের তালিকা</h2>
          {selectedEntries.length === 0 ? (
            <p className={`text-sm ${mutedCls}`}>কোনো লেনদেন নেই</p>
          ) : (
            selectedEntries.map((e) => (
              <div key={e.id} className={`${cardCls} !p-3 flex items-center justify-between gap-2`}>
                <div className="min-w-0">
                  <p className="text-sm text-text-primary dark:text-dark-text-primary">{TYPE_LABEL[e.type] || e.type}</p>
                  <p className={`text-xs ${mutedCls}`}>
                    {fmtDate(e.date)}
                    {e.note ? ` • ${e.note}` : ''}
                  </p>
                </div>
                <span className={`text-sm font-semibold ${e.type === 'payment' ? 'text-success' : 'text-danger'}`}>
                  {e.type === 'payment' ? '−' : '+'}৳{money(e.amount)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // ---------- পার্টির তালিকা ----------
  return (
    <div className="flex flex-col gap-4 max-w-xl">
      <div>
        <h1 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary">পার্টি খাতা</h1>
        <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
          মোট বাকি: <span className="font-semibold text-danger">৳{money(totalDue)}</span>
        </p>
      </div>

      {showAdd ? (
        <form onSubmit={addParty} className={`${cardCls} flex flex-col gap-3`}>
          <p className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">নতুন পার্টি</p>
          <input type="text" value={partyForm.name} onChange={(e) => setPartyForm((f) => ({ ...f, name: e.target.value }))} placeholder="নাম *" className={inputCls} />
          <input type="text" value={partyForm.phone} onChange={(e) => setPartyForm((f) => ({ ...f, phone: e.target.value }))} placeholder="মোবাইল নম্বর" className={inputCls} />
          <input type="number" inputMode="decimal" value={partyForm.opening} onChange={(e) => setPartyForm((f) => ({ ...f, opening: e.target.value }))} placeholder="আগের বাকি থাকলে (৳)" className={inputCls} />
          {error && (
            <p className="flex items-center gap-2 text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">
              <AlertCircle size={14} />
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className={`${btnPrimary} flex-1`}>
              {saving ? 'সেভ হচ্ছে...' : 'পার্টি যোগ করুন'}
            </button>
            <button type="button" onClick={() => { setShowAdd(false); setError(''); }} className={btnGhost}>
              বাতিল
            </button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setShowAdd(true)} className={`${btnPrimary} w-fit flex items-center gap-2`}>
          <Plus size={16} />
          নতুন পার্টি
        </button>
      )}

      {list.length === 0 ? (
        <p className={`text-sm ${mutedCls}`}>এখনো কোনো পার্টি নেই</p>
      ) : (
        <div className="flex flex-col gap-2">
          {list.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedId(p.id)}
              className={`${cardCls} !p-3 flex items-center justify-between gap-2 text-left hover:border-primary transition-colors`}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary dark:text-dark-text-primary truncate">{p.name}</p>
                {p.phone && <p className={`text-xs ${mutedCls}`}>{p.phone}</p>}
              </div>
              <span className={`text-sm font-semibold ${p.balance > 0 ? 'text-danger' : 'text-success'}`}>
                ৳{money(p.balance)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

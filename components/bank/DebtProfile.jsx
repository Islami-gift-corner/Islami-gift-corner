'use client';

import { useState, useEffect, useRef } from 'react';
import { ref, onValue, push, set, update, remove } from 'firebase/database';
import { database, auth } from '@/lib/firebase';
import { logActivity } from '@/lib/activityLog';
import { exportElementToPdf } from '@/lib/pdfExport';
import { DIRECTIONS, summarizeDebt } from '@/lib/debtUtils';
import { money, todayStr, dateStrToIso, isoToDateStr, fmtDate } from '@/lib/format';
import StatementPages from '@/components/common/StatementPages';
import {
  ArrowLeft,
  UserRound,
  Phone,
  MapPin,
  Pencil,
  Trash2,
  Check,
  X,
  FileDown,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

const labelCls = 'block text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1.5';
const inputCls = `w-full rounded-xl border border-border dark:border-dark-border
  bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
  px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-text-muted`;
const smallCls = `w-full rounded-lg border border-border dark:border-dark-border
  bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
  px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary`;

export default function DebtProfile({ personId, onBack }) {
  const [person, setPerson] = useState(null);
  const [loading, setLoading] = useState(true);

  const [type, setType] = useState('repayment');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayStr());
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({});
  const [confirmDeletePerson, setConfirmDeletePerson] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [actionError, setActionError] = useState('');

  const [exporting, setExporting] = useState(false);
  const pdfRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onValue(ref(database, `personal_debts/${personId}`), (snap) => {
      setPerson(snap.exists() ? { id: personId, ...snap.val() } : null);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [personId]);

  if (loading) {
    return <p className="text-sm text-text-muted dark:text-dark-text-secondary">লোড হচ্ছে...</p>;
  }
  if (!person) {
    return (
      <div className="flex flex-col gap-3">
        <button type="button" onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-text-secondary dark:text-dark-text-secondary w-fit">
          <ArrowLeft size={16} /> ফিরে যান
        </button>
        <p className="text-sm text-text-muted dark:text-dark-text-secondary">প্রোফাইলটি পাওয়া যায়নি (মুছে ফেলা হয়ে থাকতে পারে)</p>
      </div>
    );
  }

  const d = DIRECTIONS[person.direction] || DIRECTIONS.borrowed;
  const s = summarizeDebt(person);
  const uid = () => auth.currentUser?.uid;

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const amt = Number(amount);
    if (!amount || isNaN(amt) || amt <= 0) return setError('সঠিক পরিমাণ দিন');
    if (!date) return setError('তারিখ দিন');
    if (type === 'repayment' && amt > s.remaining + 0.001)
      return setError(`বাকির (৳${money(s.remaining)}) চেয়ে বেশি দেওয়া যাবে না`);
    setSaving(true);
    try {
      const entryRef = push(ref(database, `personal_debts/${person.id}/entries`));
      await set(entryRef, {
        type,
        amount: amt,
        date: dateStrToIso(date),
        note: note.trim(),
        created_at: new Date().toISOString(),
      });
      await logActivity({
        userId: uid(),
        action: `${d.title} — ${type === 'principal' ? d.principalLabel : d.repaymentLabel}`,
        target: `${person.name} — ৳${amt}`,
      });
      setSuccess('এন্ট্রি সংরক্ষণ হয়েছে');
      setAmount('');
      setNote('');
    } catch (err) {
      setError('সংরক্ষণ করা যায়নি, আবার চেষ্টা করুন');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (en) => {
    setActionError('');
    setEditingId(en.id);
    setEditForm({ amount: String(en.amount), date: isoToDateStr(en.date), note: en.note || '' });
  };

  const saveEdit = async (en) => {
    setActionError('');
    if (!editForm.amount || isNaN(editForm.amount) || Number(editForm.amount) <= 0)
      return setActionError('সঠিক পরিমাণ দিন');
    if (!editForm.date) return setActionError('তারিখ দিন');
    try {
      await update(ref(database, `personal_debts/${person.id}/entries/${en.id}`), {
        amount: Number(editForm.amount),
        date: dateStrToIso(editForm.date),
        note: editForm.note.trim(),
      });
      await logActivity({
        userId: uid(),
        action: `${d.title} এন্ট্রি সংশোধন`,
        target: `${person.name} — ৳${en.amount} থেকে ৳${editForm.amount}`,
      });
      setEditingId(null);
    } catch (err) {
      setActionError('সংশোধন করা যায়নি, আবার চেষ্টা করুন');
    }
  };

  const deleteEntry = async (en) => {
    try {
      await remove(ref(database, `personal_debts/${person.id}/entries/${en.id}`));
      await logActivity({
        userId: uid(),
        action: `${d.title} এন্ট্রি ডিলিট`,
        target: `${person.name} — ৳${en.amount}`,
      });
      setConfirmDeleteId(null);
    } catch (err) {
      setActionError('ডিলিট করা যায়নি, আবার চেষ্টা করুন');
    }
  };

  const startEditProfile = () => {
    setError('');
    setEditingProfile(true);
    setProfileForm({ name: person.name || '', phone: person.phone || '', address: person.address || '' });
  };

  const saveProfile = async () => {
    if (!profileForm.name.trim()) return setError('নাম দিন');
    try {
      await update(ref(database, `personal_debts/${person.id}`), {
        name: profileForm.name.trim(),
        phone: profileForm.phone.trim(),
        address: profileForm.address.trim(),
      });
      setEditingProfile(false);
      setError('');
    } catch (err) {
      setError('সংশোধন করা যায়নি, আবার চেষ্টা করুন');
    }
  };

  const deletePerson = async () => {
    try {
      await remove(ref(database, `personal_debts/${person.id}`));
      await logActivity({
        userId: uid(),
        action: `${d.title} প্রোফাইল ডিলিট`,
        target: `${person.name} — ৳${s.total}`,
      });
      onBack();
    } catch (err) {
      setError('ডিলিট করা যায়নি, আবার চেষ্টা করুন');
      setConfirmDeletePerson(false);
    }
  };

  const handlePdf = async () => {
    setExporting(true);
    try {
      await exportElementToPdf(pdfRef.current, `${person.name}-${person.direction}-statement.pdf`);
    } catch (err) {
      alert('PDF তৈরি করা যায়নি, আবার চেষ্টা করুন');
    } finally {
      setExporting(false);
    }
  };

  const pdfRows = s.entries.map((en) => ({
    weight: Math.max(1, Math.ceil((en.note || '').length / 30)),
    cells: [
      fmtDate(en.date),
      en.note || (en.type === 'principal' ? d.pdfPrincipal : d.pdfRepayment),
      en.type === 'principal' ? money(en.amount) : '',
      en.type === 'principal' ? '' : money(en.amount),
      money(en.balance),
    ],
  }));
  pdfRows.push({ bold: true, shaded: true, cells: ['', 'Total', money(s.total), money(s.paid), money(s.remaining)] });

  const entriesDesc = [...s.entries].reverse();

  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-medium text-text-secondary dark:text-dark-text-secondary w-fit"
      >
        <ArrowLeft size={16} />
        {d.title} তালিকায় ফিরুন
      </button>

      {/* প্রোফাইল */}
      <div className="bg-background-card dark:bg-dark-card rounded-2xl shadow-sm border border-border dark:border-dark-border p-5">
        {editingProfile ? (
          <div className="flex flex-col gap-2.5">
            <div>
              <label className="block text-[11px] text-text-secondary dark:text-dark-text-secondary mb-1">নাম</label>
              <input className={smallCls} value={profileForm.name} onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-text-secondary dark:text-dark-text-secondary mb-1">মোবাইল</label>
                <input className={smallCls} value={profileForm.phone} onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[11px] text-text-secondary dark:text-dark-text-secondary mb-1">ঠিকানা</label>
                <input className={smallCls} value={profileForm.address} onChange={(e) => setProfileForm((p) => ({ ...p, address: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={saveProfile} className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium text-white bg-gradient-to-r from-primary to-primary-light">
                <Check size={14} /> সংরক্ষণ
              </button>
              <button type="button" onClick={() => { setEditingProfile(false); setError(''); }} className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium border border-border dark:border-dark-border text-text-secondary dark:text-dark-text-secondary">
                <X size={14} /> বাতিল
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <p className="text-[11px] font-medium text-primary mb-1">{d.title}</p>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-text-primary dark:text-dark-text-primary">
                <UserRound size={18} className="text-primary" />
                {person.name}
              </h2>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary dark:text-dark-text-secondary mt-1">
                {person.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone size={12} /> {person.phone}
                  </span>
                )}
                {person.address && (
                  <span className="flex items-center gap-1.5">
                    <MapPin size={12} /> {person.address}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-1 shrink-0">
              <button type="button" onClick={startEditProfile} aria-label="প্রোফাইল সংশোধন" className="p-1.5 rounded-lg text-text-muted hover:bg-background dark:hover:bg-dark-background">
                <Pencil size={15} />
              </button>
              <button type="button" onClick={() => setConfirmDeletePerson(true)} aria-label="প্রোফাইল ডিলিট" className="p-1.5 rounded-lg text-danger hover:bg-danger/10">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 text-center mt-3">
          <div className="rounded-xl bg-background dark:bg-dark-background p-3">
            <p className="text-[11px] text-text-muted dark:text-dark-text-secondary mb-1">{d.totalLabel}</p>
            <p className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">৳{money(s.total)}</p>
          </div>
          <div className="rounded-xl bg-success/10 p-3">
            <p className="text-[11px] text-text-muted dark:text-dark-text-secondary mb-1">{d.paidLabel}</p>
            <p className="text-sm font-semibold text-success">৳{money(s.paid)}</p>
          </div>
          <div className="rounded-xl bg-danger/10 p-3">
            <p className="text-[11px] text-text-muted dark:text-dark-text-secondary mb-1">{d.remainingLabel}</p>
            <p className="text-sm font-semibold text-danger">৳{money(Math.max(0, s.remaining))}</p>
          </div>
        </div>
        {s.remaining <= 0 && s.total > 0 && (
          <p className="flex items-center gap-2 text-xs text-success bg-success/10 rounded-lg px-3 py-2 mt-3">
            <CheckCircle2 size={14} /> পুরো ঋণ পরিশোধ হয়ে গেছে
          </p>
        )}
      </div>

      {confirmDeletePerson && (
        <div className="bg-danger/10 rounded-xl border border-danger p-3 flex flex-col gap-2">
          <p className="text-xs text-danger">
            "{person.name}" এর প্রোফাইল ও সব লেনদেনের রেকর্ড মুছে ফেলবেন? এটা ফেরানো যাবে না।
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={deletePerson} className="flex-1 rounded-lg py-1.5 text-xs font-medium text-white bg-danger">
              হ্যাঁ, ডিলিট করুন
            </button>
            <button type="button" onClick={() => setConfirmDeletePerson(false)} className="flex-1 rounded-lg py-1.5 text-xs font-medium border border-border dark:border-dark-border text-text-secondary dark:text-dark-text-secondary">
              বাতিল
            </button>
          </div>
        </div>
      )}

      {/* নতুন এন্ট্রি */}
      <div className="bg-background-card dark:bg-dark-card rounded-2xl shadow-sm border border-border dark:border-dark-border p-5">
        <h3 className="text-sm font-semibold text-text-primary dark:text-dark-text-primary mb-3">নতুন এন্ট্রি</h3>
        <form onSubmit={handleAdd} className="flex flex-col gap-3">
          <div className="flex gap-1 p-1 rounded-xl bg-background dark:bg-dark-background border border-border dark:border-dark-border w-fit">
            {[
              ['repayment', d.repaymentLabel],
              ['principal', d.principalLabel],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setType(key)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors
                  ${type === key ? 'bg-primary text-white' : 'text-text-secondary dark:text-dark-text-secondary'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>পরিমাণ (৳) *</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>তারিখ</label>
              <input type="date" value={date} max={todayStr()} onChange={(e) => setDate(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>নোট (ঐচ্ছিক)</label>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} />
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
            {saving ? 'সংরক্ষণ হচ্ছে...' : 'এন্ট্রি সংরক্ষণ করুন'}
          </button>
        </form>
      </div>

      {/* লেনদেনের হিস্ট্রি */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">
            লেনদেনের হিস্ট্রি ({s.entries.length}টি)
          </h3>
          <button
            type="button"
            onClick={handlePdf}
            disabled={exporting || s.entries.length === 0}
            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium border border-border dark:border-dark-border text-text-primary dark:text-dark-text-primary disabled:opacity-50"
          >
            <FileDown size={14} />
            {exporting ? 'তৈরি হচ্ছে...' : 'স্টেটমেন্ট PDF'}
          </button>
        </div>
        {actionError && (
          <p className="flex items-center gap-2 text-xs text-danger bg-danger/10 rounded-lg px-3 py-2 mb-2">
            <AlertCircle size={14} /> {actionError}
          </p>
        )}
        <div className="flex flex-col gap-2">
          {entriesDesc.map((en) =>
            editingId === en.id ? (
              <div key={en.id} className="bg-background-card dark:bg-dark-card rounded-xl border border-primary p-3 flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-text-secondary dark:text-dark-text-secondary mb-1">পরিমাণ (৳)</label>
                    <input type="number" value={editForm.amount} onChange={(e) => setEditForm((p) => ({ ...p, amount: e.target.value }))} className={smallCls} />
                  </div>
                  <div>
                    <label className="block text-[11px] text-text-secondary dark:text-dark-text-secondary mb-1">তারিখ</label>
                    <input type="date" max={todayStr()} value={editForm.date} onChange={(e) => setEditForm((p) => ({ ...p, date: e.target.value }))} className={smallCls} />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] text-text-secondary dark:text-dark-text-secondary mb-1">নোট</label>
                  <input type="text" value={editForm.note} onChange={(e) => setEditForm((p) => ({ ...p, note: e.target.value }))} className={smallCls} />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => saveEdit(en)} className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium text-white bg-gradient-to-r from-primary to-primary-light">
                    <Check size={14} /> সংরক্ষণ
                  </button>
                  <button type="button" onClick={() => { setEditingId(null); setActionError(''); }} className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium border border-border dark:border-dark-border text-text-secondary dark:text-dark-text-secondary">
                    <X size={14} /> বাতিল
                  </button>
                </div>
              </div>
            ) : confirmDeleteId === en.id ? (
              <div key={en.id} className="bg-danger/10 rounded-xl border border-danger p-3 flex flex-col gap-2">
                <p className="text-xs text-danger">৳{money(en.amount)} এর এই এন্ট্রি মুছে ফেলবেন?</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => deleteEntry(en)} className="flex-1 rounded-lg py-1.5 text-xs font-medium text-white bg-danger">
                    হ্যাঁ, ডিলিট করুন
                  </button>
                  <button type="button" onClick={() => setConfirmDeleteId(null)} className="flex-1 rounded-lg py-1.5 text-xs font-medium border border-border dark:border-dark-border text-text-secondary dark:text-dark-text-secondary">
                    বাতিল
                  </button>
                </div>
              </div>
            ) : (
              <div key={en.id} className="flex items-center justify-between gap-2 bg-background-card dark:bg-dark-card rounded-xl border border-border dark:border-dark-border p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary dark:text-dark-text-primary">
                    {en.type === 'principal' ? d.principalLabel : d.repaymentLabel}
                  </p>
                  <p className="text-xs text-text-muted dark:text-dark-text-secondary truncate">
                    {fmtDate(en.date)}
                    {en.note ? ` · ${en.note}` : ''}
                  </p>
                  <p className="text-[11px] text-text-muted dark:text-dark-text-secondary">এরপর বাকি: ৳{money(en.balance)}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-sm font-semibold ${en.type === 'principal' ? 'text-danger' : 'text-success'}`}>
                    {en.type === 'principal' ? '+' : '−'}৳{money(en.amount)}
                  </span>
                  <button type="button" onClick={() => startEdit(en)} aria-label="সংশোধন করুন" className="p-1.5 rounded-lg text-text-muted hover:bg-background dark:hover:bg-dark-background">
                    <Pencil size={14} />
                  </button>
                  <button type="button" onClick={() => { setActionError(''); setConfirmDeleteId(en.id); }} aria-label="ডিলিট করুন" className="p-1.5 rounded-lg text-danger hover:bg-danger/10">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* PDF এর জন্য লুকানো পেজ */}
      <div className="fixed -left-[9999px] top-0">
        <StatementPages
          innerRef={pdfRef}
          title={person.direction === 'lent' ? 'Loan Given — Statement' : 'Loan Taken — Statement'}
          subtitle={`${person.name}${person.phone ? ` · ${person.phone}` : ''}${person.address ? ` · ${person.address}` : ''}`}
          columns={[
            { label: 'Date', width: '15%' },
            { label: 'Details' },
            { label: d.pdfPrincipal, align: 'right', width: '17%' },
            { label: d.pdfRepayment, align: 'right', width: '17%' },
            { label: 'Balance', align: 'right', width: '16%' },
          ]}
          rows={pdfRows}
          summary={
            <p className="text-right text-sm font-bold">
              {d.pdfRemaining}: {money(Math.max(0, s.remaining))}
            </p>
          }
          summaryRows={3}
        />
      </div>
    </div>
  );
}

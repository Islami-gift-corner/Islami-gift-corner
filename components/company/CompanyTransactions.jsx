'use client';

import { useState, useEffect, useRef } from 'react';
import { ref, onValue, push, set, update, remove } from 'firebase/database';
import { database, auth } from '@/lib/firebase';
import { logActivity } from '@/lib/activityLog';
import { exportElementToPdf } from '@/lib/pdfExport';
import { money, todayStr, dateStrToIso, isoToDateStr, fmtDate } from '@/lib/format';
import StatementPages from '@/components/common/StatementPages';
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  FileDown,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';

// প্রতিটা লেনদেনের ধরন ও তার প্রভাব: +১ = আমি কোম্পানিকে আরও দেবো (দেনা বাড়ে), -১ = দেনা কমে
const TYPES = {
  purchase: { label: 'মাল নিলাম (কোম্পানি মাল দিলো)', short: 'মাল নিলাম', sign: 1 },
  payment: { label: 'টাকা দিলাম (কোম্পানিকে পরিশোধ)', short: 'টাকা দিলাম', sign: -1 },
  return: { label: 'মাল ফেরত দিলাম / ক্রেডিট', short: 'মাল ফেরত', sign: -1 },
  opening_payable: { label: 'পূর্বের জের — আমি কোম্পানিকে দেবো', short: 'পূর্বের জের (দেবো)', sign: 1 },
  opening_receivable: { label: 'পূর্বের জের — আমি কোম্পানির কাছে পাবো', short: 'পূর্বের জের (পাবো)', sign: -1 },
};

const labelCls = 'block text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1.5';
const inputCls = `w-full rounded-xl border border-border dark:border-dark-border
  bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
  px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-text-muted`;
const smallInputCls = `w-full rounded-lg border border-border dark:border-dark-border
  bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
  px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary`;

// ধনাত্মক = আমি কোম্পানিকে দেবো (কোম্পানি আমার কাছে পাবে), ঋণাত্মক = আমি কোম্পানির কাছে পাবো
const netOf = (entries) =>
  entries.reduce((n, e) => n + (TYPES[e.type]?.sign || 0) * (Number(e.amount) || 0), 0);

function BalanceText({ net, className = '' }) {
  if (Math.round(net * 100) === 0) {
    return <span className={`text-text-muted dark:text-dark-text-secondary ${className}`}>হিসাব মিলে গেছে</span>;
  }
  return net > 0 ? (
    <span className={`text-danger ${className}`}>কোম্পানি পাবে ৳{money(net)}</span>
  ) : (
    <span className={`text-success ${className}`}>আমি পাবো ৳{money(-net)}</span>
  );
}

export default function CompanyTransactions() {
  const [companies, setCompanies] = useState([]);
  const [allTx, setAllTx] = useState({});
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState('');

  // নতুন এন্ট্রি ফর্ম
  const [type, setType] = useState('payment');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayStr());
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // সংশোধন/ডিলিট
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [actionError, setActionError] = useState('');

  // স্টেটমেন্ট
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [exporting, setExporting] = useState(false);
  const pdfRef = useRef(null);

  useEffect(() => {
    const u1 = onValue(ref(database, 'companies'), (snap) => {
      const data = snap.val();
      setCompanies(data ? Object.entries(data).map(([id, v]) => ({ id, name: v.name || '' })) : []);
      setLoading(false);
    });
    const u2 = onValue(ref(database, 'company_transactions'), (snap) => {
      setAllTx(snap.val() || {});
    });
    return () => {
      u1();
      u2();
    };
  }, []);

  const txOf = (cid) =>
    Object.entries(allTx[cid] || {})
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => new Date(a.date) - new Date(b.date) || (a.created_at || '').localeCompare(b.created_at || ''));

  const company = companies.find((c) => c.id === companyId);
  const entries = companyId ? txOf(companyId) : [];
  const net = netOf(entries);

  const sum = (t) => entries.filter((e) => e.type === t).reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const totalPurchase = sum('purchase');
  const totalPayment = sum('payment');
  const totalReturn = sum('return');
  const openingNet = sum('opening_payable') - sum('opening_receivable');

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!companyId) return setError('আগে কোম্পানি নির্বাচন করুন');
    if (!amount || isNaN(amount) || Number(amount) <= 0) return setError('সঠিক পরিমাণ দিন');
    if (!date) return setError('তারিখ দিন');
    setSaving(true);
    try {
      const txRef = push(ref(database, `company_transactions/${companyId}`));
      await set(txRef, {
        type,
        amount: Number(amount),
        date: dateStrToIso(date),
        note: note.trim(),
        created_at: new Date().toISOString(),
        created_by: auth.currentUser?.uid || '',
      });
      await logActivity({
        userId: auth.currentUser?.uid,
        action: `কোম্পানি লেনদেন — ${TYPES[type].short}`,
        target: `${company?.name || ''} — ৳${amount}`,
      });
      setSuccess('এন্ট্রি সংরক্ষণ হয়েছে');
      setAmount('');
      setNote('');
    } catch (err) {
      setError('এন্ট্রি সংরক্ষণ করা যায়নি, আবার চেষ্টা করুন');
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
      await update(ref(database, `company_transactions/${companyId}/${en.id}`), {
        amount: Number(editForm.amount),
        date: dateStrToIso(editForm.date),
        note: editForm.note.trim(),
      });
      await logActivity({
        userId: auth.currentUser?.uid,
        action: 'কোম্পানি লেনদেন সংশোধন',
        target: `${company?.name || ''} — ৳${en.amount} থেকে ৳${editForm.amount}`,
      });
      setEditingId(null);
    } catch (err) {
      setActionError('সংশোধন করা যায়নি, আবার চেষ্টা করুন');
    }
  };

  const handleDelete = async (en) => {
    try {
      await remove(ref(database, `company_transactions/${companyId}/${en.id}`));
      await logActivity({
        userId: auth.currentUser?.uid,
        action: 'কোম্পানি লেনদেন ডিলিট',
        target: `${company?.name || ''} — ${TYPES[en.type]?.short} ৳${en.amount}`,
      });
      setConfirmDeleteId(null);
    } catch (err) {
      setActionError('ডিলিট করা যায়নি, আবার চেষ্টা করুন');
    }
  };

  // ---- স্টেটমেন্ট (ধারাবাহিক বাকিসহ) ----
  const dayStart = (d) => new Date(d).setHours(0, 0, 0, 0);
  let running = 0;
  const withBalance = entries.map((en) => {
    running += (TYPES[en.type]?.sign || 0) * (Number(en.amount) || 0);
    return { ...en, balance: running };
  });
  const inRange = (en) => {
    const t = dayStart(en.date);
    if (fromDate && t < dayStart(fromDate)) return false;
    if (toDate && t > dayStart(toDate)) return false;
    return true;
  };
  const filtered = withBalance.filter(inRange);
  let openingBalance = 0;
  if (fromDate) {
    const before = withBalance.filter((en) => dayStart(en.date) < dayStart(fromDate));
    openingBalance = before.length ? before[before.length - 1].balance : 0;
  }
  const closing = filtered.length ? filtered[filtered.length - 1].balance : openingBalance;
  const isDebit = (en) => TYPES[en.type]?.sign === 1; // দেনা বাড়ানো (মাল/জের)
  const totalIn = filtered.filter(isDebit).reduce((s, en) => s + Number(en.amount), 0);
  const totalOut = filtered.filter((en) => !isDebit(en)).reduce((s, en) => s + Number(en.amount), 0);

  const balanceCell = (b) => (Math.round(b * 100) === 0 ? '0' : b > 0 ? `${money(b)} Dr` : `${money(-b)} Cr`);

  const pdfRows = [];
  if (fromDate) {
    pdfRows.push({ bold: true, shaded: true, cells: ['', 'Previous Balance', '', '', balanceCell(openingBalance)] });
  }
  filtered.forEach((en) => {
    pdfRows.push({
      weight: Math.max(1, Math.ceil((en.note || '').length / 30)),
      cells: [
        fmtDate(en.date),
        `${TYPES[en.type]?.short}${en.note ? ` — ${en.note}` : ''}`,
        isDebit(en) ? money(en.amount) : '',
        isDebit(en) ? '' : money(en.amount),
        balanceCell(en.balance),
      ],
    });
  });
  pdfRows.push({
    bold: true,
    shaded: true,
    cells: ['', 'Total', money(totalIn), money(totalOut), balanceCell(closing)],
  });

  const handlePdf = async () => {
    setExporting(true);
    try {
      await exportElementToPdf(pdfRef.current, `${company?.name || 'company'}-statement.pdf`);
    } catch (err) {
      alert('PDF তৈরি করা যায়নি, আবার চেষ্টা করুন');
    } finally {
      setExporting(false);
    }
  };

  const handleExcel = async () => {
    setExporting(true);
    try {
      const XLSX = await import('xlsx');
      const rows = [];
      if (fromDate) rows.push({ Date: '', Details: 'Previous Balance', 'Goods / Due': '', 'Paid / Credit': '', Balance: balanceCell(openingBalance) });
      filtered.forEach((en) =>
        rows.push({
          Date: fmtDate(en.date),
          Details: `${TYPES[en.type]?.short}${en.note ? ` — ${en.note}` : ''}`,
          'Goods / Due': isDebit(en) ? en.amount : '',
          'Paid / Credit': isDebit(en) ? '' : en.amount,
          Balance: balanceCell(en.balance),
        })
      );
      rows.push({ Date: '', Details: 'Total', 'Goods / Due': totalIn, 'Paid / Credit': totalOut, Balance: balanceCell(closing) });
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Statement');
      XLSX.writeFile(wb, `${company?.name || 'company'}-statement.xlsx`);
    } catch (err) {
      alert('Excel তৈরি করা যায়নি, আবার চেষ্টা করুন');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-text-muted dark:text-dark-text-secondary">লোড হচ্ছে...</p>;
  }

  // ---- ওভারভিউ: কোনো কোম্পানি নির্বাচিত না থাকলে সব কোম্পানির বাকি ----
  if (!companyId) {
    const rows = companies
      .map((c) => ({ ...c, net: netOf(txOf(c.id)), count: Object.keys(allTx[c.id] || {}).length }))
      .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
    const owe = rows.filter((r) => r.net > 0).reduce((s, r) => s + r.net, 0);
    const recv = rows.filter((r) => r.net < 0).reduce((s, r) => s - r.net, 0);

    return (
      <div className="flex flex-col gap-5 max-w-2xl">
        <div className="bg-background-card dark:bg-dark-card rounded-2xl shadow-sm border border-border dark:border-dark-border p-5">
          <h3 className="text-sm font-semibold text-text-primary dark:text-dark-text-primary mb-3">
            কোম্পানি লেনদেন — ওভারভিউ
          </h3>
          <div className="grid grid-cols-2 gap-3 text-center mb-4">
            <div className="rounded-xl bg-danger/10 p-3">
              <p className="text-xs text-text-muted dark:text-dark-text-secondary mb-1">কোম্পানিরা পাবে (আমি দেবো)</p>
              <p className="text-sm font-semibold text-danger">৳{money(owe)}</p>
            </div>
            <div className="rounded-xl bg-success/10 p-3">
              <p className="text-xs text-text-muted dark:text-dark-text-secondary mb-1">আমি পাবো</p>
              <p className="text-sm font-semibold text-success">৳{money(recv)}</p>
            </div>
          </div>

          <label className={labelCls}>কোম্পানি নির্বাচন করুন</label>
          <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className={inputCls}>
            <option value="">-- কোম্পানি বেছে নিন --</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-text-muted dark:text-dark-text-secondary">আগে কোম্পানি যোগ করুন</p>
        ) : (
          <div className="flex flex-col gap-2">
            {rows.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setCompanyId(r.id)}
                className="flex items-center justify-between gap-3 bg-background-card dark:bg-dark-card
                           rounded-xl border border-border dark:border-dark-border p-3 text-left
                           hover:border-primary transition-colors"
              >
                <div>
                  <p className="flex items-center gap-2 text-sm font-medium text-text-primary dark:text-dark-text-primary">
                    <Building2 size={14} className="text-primary" />
                    {r.name}
                  </p>
                  <p className="text-[11px] text-text-muted dark:text-dark-text-secondary">{r.count}টি এন্ট্রি</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <BalanceText net={r.net} className="text-sm font-medium" />
                  <ChevronRight size={16} className="text-text-muted" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ---- একটা কোম্পানির বিস্তারিত ----
  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      <div className="bg-background-card dark:bg-dark-card rounded-2xl shadow-sm border border-border dark:border-dark-border p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <label className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">কোম্পানি</label>
          <button type="button" onClick={() => setCompanyId('')} className="text-xs font-medium text-primary">
            সব কোম্পানির ওভারভিউ
          </button>
        </div>
        <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className={`${inputCls} mb-4`}>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center mb-3">
          <div className="rounded-xl bg-background dark:bg-dark-background p-3">
            <p className="text-[11px] text-text-muted dark:text-dark-text-secondary mb-1">মোট মাল নিয়েছি</p>
            <p className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">৳{money(totalPurchase)}</p>
          </div>
          <div className="rounded-xl bg-success/10 p-3">
            <p className="text-[11px] text-text-muted dark:text-dark-text-secondary mb-1">মোট টাকা দিয়েছি</p>
            <p className="text-sm font-semibold text-success">৳{money(totalPayment)}</p>
          </div>
          <div className="rounded-xl bg-background dark:bg-dark-background p-3">
            <p className="text-[11px] text-text-muted dark:text-dark-text-secondary mb-1">মাল ফেরত/ক্রেডিট</p>
            <p className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">৳{money(totalReturn)}</p>
          </div>
          <div className="rounded-xl bg-background dark:bg-dark-background p-3">
            <p className="text-[11px] text-text-muted dark:text-dark-text-secondary mb-1">পূর্বের জের</p>
            <p className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">
              {openingNet === 0 ? '—' : openingNet > 0 ? `৳${money(openingNet)} দেবো` : `৳${money(-openingNet)} পাবো`}
            </p>
          </div>
        </div>

        <div className={`rounded-xl p-3 text-center ${net > 0 ? 'bg-danger/10' : net < 0 ? 'bg-success/10' : 'bg-background dark:bg-dark-background'}`}>
          <p className="text-[11px] text-text-muted dark:text-dark-text-secondary mb-1">বর্তমান হিসাব</p>
          <BalanceText net={net} className="text-base font-bold" />
        </div>
      </div>

      {/* নতুন এন্ট্রি */}
      <div className="bg-background-card dark:bg-dark-card rounded-2xl shadow-sm border border-border dark:border-dark-border p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary dark:text-dark-text-primary mb-3">
          <Plus size={16} className="text-primary" />
          নতুন এন্ট্রি
        </h3>
        <form onSubmit={handleAdd} className="flex flex-col gap-3">
          <div>
            <label className={labelCls}>এন্ট্রির ধরন</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className={inputCls}>
              {Object.entries(TYPES).map(([key, t]) => (
                <option key={key} value={key}>
                  {t.label}
                </option>
              ))}
            </select>
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
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="যেমন: চালান নং, চেক নং" className={inputCls} />
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
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl py-2.5 text-sm font-medium text-white bg-gradient-to-r from-primary to-primary-light disabled:opacity-60"
          >
            {saving ? 'সংরক্ষণ হচ্ছে...' : 'এন্ট্রি সংরক্ষণ করুন'}
          </button>
        </form>
      </div>

      {/* স্টেটমেন্ট */}
      <div className="bg-background-card dark:bg-dark-card rounded-2xl shadow-sm border border-border dark:border-dark-border p-5">
        <h3 className="text-sm font-semibold text-text-primary dark:text-dark-text-primary mb-3">স্টেটমেন্ট ডাউনলোড</h3>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className={labelCls}>শুরুর তারিখ</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>শেষ তারিখ</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className={inputCls} />
          </div>
        </div>
        <p className="text-xs text-text-secondary dark:text-dark-text-secondary mb-3">
          {filtered.length}টি এন্ট্রি · বাকি হিসাব: <BalanceText net={closing} />
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handlePdf}
            disabled={exporting || filtered.length === 0}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-medium bg-gradient-to-r from-primary to-primary-light text-white disabled:opacity-50"
          >
            <FileDown size={15} /> PDF
          </button>
          <button
            type="button"
            onClick={handleExcel}
            disabled={exporting || filtered.length === 0}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-medium border border-border dark:border-dark-border text-text-primary dark:text-dark-text-primary disabled:opacity-50"
          >
            <FileSpreadsheet size={15} /> Excel
          </button>
        </div>
      </div>

      {/* এন্ট্রির তালিকা */}
      <div>
        <h3 className="text-sm font-semibold text-text-primary dark:text-dark-text-primary mb-2">
          লেনদেনের তালিকা ({entries.length}টি)
        </h3>
        {actionError && (
          <p className="flex items-center gap-2 text-xs text-danger bg-danger/10 rounded-lg px-3 py-2 mb-2">
            <AlertCircle size={14} /> {actionError}
          </p>
        )}
        {entries.length === 0 ? (
          <p className="text-sm text-text-muted dark:text-dark-text-secondary py-4">এখনো কোনো এন্ট্রি নেই</p>
        ) : (
          <div className="flex flex-col gap-2">
            {[...withBalance].reverse().map((en) =>
              editingId === en.id ? (
                <div key={en.id} className="bg-background-card dark:bg-dark-card rounded-xl border border-primary p-3 flex flex-col gap-2">
                  <p className="text-xs font-medium text-text-secondary dark:text-dark-text-secondary">{TYPES[en.type]?.label}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-text-secondary dark:text-dark-text-secondary mb-1">পরিমাণ (৳)</label>
                      <input type="number" value={editForm.amount} onChange={(e) => setEditForm((p) => ({ ...p, amount: e.target.value }))} className={smallInputCls} />
                    </div>
                    <div>
                      <label className="block text-[11px] text-text-secondary dark:text-dark-text-secondary mb-1">তারিখ</label>
                      <input type="date" value={editForm.date} max={todayStr()} onChange={(e) => setEditForm((p) => ({ ...p, date: e.target.value }))} className={smallInputCls} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] text-text-secondary dark:text-dark-text-secondary mb-1">নোট</label>
                    <input type="text" value={editForm.note} onChange={(e) => setEditForm((p) => ({ ...p, note: e.target.value }))} className={smallInputCls} />
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
                  <p className="text-xs text-danger">
                    {TYPES[en.type]?.short} ৳{money(en.amount)} এন্ট্রিটা মুছে ফেলবেন?
                  </p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => handleDelete(en)} className="flex-1 rounded-lg py-1.5 text-xs font-medium text-white bg-danger">
                      হ্যাঁ, ডিলিট করুন
                    </button>
                    <button type="button" onClick={() => setConfirmDeleteId(null)} className="flex-1 rounded-lg py-1.5 text-xs font-medium border border-border dark:border-dark-border text-text-secondary dark:text-dark-text-secondary">
                      বাতিল
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  key={en.id}
                  className="flex items-center justify-between gap-2 bg-background-card dark:bg-dark-card rounded-xl border border-border dark:border-dark-border p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary dark:text-dark-text-primary">{TYPES[en.type]?.short}</p>
                    <p className="text-xs text-text-muted dark:text-dark-text-secondary truncate">
                      {fmtDate(en.date)}
                      {en.note ? ` · ${en.note}` : ''}
                    </p>
                    <p className="text-[11px] text-text-muted dark:text-dark-text-secondary">
                      এরপর: <BalanceText net={en.balance} />
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-sm font-semibold ${isDebit(en) ? 'text-danger' : 'text-success'}`}>
                      ৳{money(en.amount)}
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
        )}
      </div>

      {/* PDF এর জন্য লুকানো পেজ */}
      <div className="fixed -left-[9999px] top-0">
        <StatementPages
          innerRef={pdfRef}
          title="Company Account Statement"
          subtitle={`${company?.name || ''}${fromDate || toDate ? ` — ${fromDate || 'Start'} to ${toDate || 'Today'}` : ''}`}
          columns={[
            { label: 'Date', width: '14%' },
            { label: 'Details' },
            { label: 'Goods / Due', align: 'right', width: '17%' },
            { label: 'Paid / Credit', align: 'right', width: '17%' },
            { label: 'Balance', align: 'right', width: '16%' },
          ]}
          rows={pdfRows}
          summary={
            <div className="text-xs text-right">
              <p className="font-bold text-sm">
                {Math.round(closing * 100) === 0
                  ? 'Account settled'
                  : closing > 0
                  ? `We owe the company: ${money(closing)}`
                  : `Company owes us: ${money(-closing)}`}
              </p>
              <p className="mt-1" style={{ color: '#666' }}>Dr = we owe the company · Cr = company owes us</p>
            </div>
          }
          summaryRows={4}
        />
      </div>
    </div>
  );
}

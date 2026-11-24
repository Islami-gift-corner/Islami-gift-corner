'use client';

import { useState } from 'react';
import { ref, push, set } from 'firebase/database';
import { database, auth } from '@/lib/firebase';
import { logActivity } from '@/lib/activityLog';
import { addPeriod } from '@/lib/bankUtils';
import { money, todayStr, dateStrToIso } from '@/lib/format';
import { Landmark, Plus, X, CheckCircle2, AlertCircle } from 'lucide-react';

const labelCls = 'block text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1.5';
const inputCls = `w-full rounded-xl border border-border dark:border-dark-border
  bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
  px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-text-muted`;

const EMPTY = {
  bank_name: '',
  loan_name: '',
  principal: '',
  installment_amount: '',
  frequency: 'monthly',
  total_installments: '',
  first_due_date: todayStr(),
  prior_paid_count: '0',
  taken_date: '',
};

export default function AddBankLoan({ onAdded }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const set_ = (field) => (e) => {
    setForm((p) => ({ ...p, [field]: e.target.value }));
    if (error) setError('');
  };

  const totalPayable = (Number(form.installment_amount) || 0) * (Number(form.total_installments) || 0);
  const interest = totalPayable - (Number(form.principal) || 0);
  const priorCount = Math.floor(Number(form.prior_paid_count) || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.bank_name.trim()) return setError('ব্যাংকের নাম দিন');
    if (!form.principal || Number(form.principal) <= 0) return setError('মোট লোনের পরিমাণ দিন');
    if (!form.installment_amount || Number(form.installment_amount) <= 0)
      return setError('কিস্তির পরিমাণ দিন');
    const total = Math.floor(Number(form.total_installments));
    if (!total || total <= 0) return setError('মোট কিস্তি সংখ্যা দিন');
    if (!form.first_due_date) return setError('প্রথম কিস্তির তারিখ দিন');
    if (priorCount < 0 || priorCount > total)
      return setError('আগে পরিশোধ করা কিস্তি মোট কিস্তির চেয়ে বেশি হতে পারে না');

    setSaving(true);
    try {
      const loanRef = push(ref(database, 'bank_loans'));
      const amount = Number(form.installment_amount);

      // আগে যে কিস্তিগুলো দেওয়া হয়ে গেছে — প্রথম থেকে ধারাবাহিকভাবে একসাথে এন্ট্রি
      // (প্রতিটা কিস্তির নির্ধারিত তারিখেই পরিশোধ ধরা হয়)
      const payments = {};
      for (let i = 1; i <= priorCount; i++) {
        const key = push(ref(database, `bank_loans/${loanRef.key}/payments`)).key;
        payments[key] = {
          installment_no: i,
          amount,
          date: dateStrToIso(addPeriod(form.first_due_date, form.frequency, i - 1)),
          note: 'আগের পরিশোধ (একসাথে এন্ট্রি)',
          bulk_initial: true,
        };
      }

      const data = {
        bank_name: form.bank_name.trim(),
        loan_name: form.loan_name.trim(),
        principal: Number(form.principal),
        installment_amount: amount,
        frequency: form.frequency,
        total_installments: total,
        first_due_date: form.first_due_date,
        taken_date: form.taken_date || '',
        created_at: new Date().toISOString(),
      };
      if (priorCount > 0) data.payments = payments;

      await set(loanRef, data);
      await logActivity({
        userId: auth.currentUser?.uid,
        action: 'ব্যাংক লোন যোগ',
        target: `${data.bank_name} — ৳${data.principal}`,
      });

      setSuccess('লোন সফলভাবে যোগ হয়েছে');
      setForm({ ...EMPTY, first_due_date: todayStr() });
      if (onAdded) onAdded(loanRef.key);
      setTimeout(() => setOpen(false), 900);
    } catch (err) {
      setError('লোন যোগ করা যায়নি, আবার চেষ্টা করুন');
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white
                   bg-gradient-to-r from-primary to-primary-light w-fit"
      >
        <Plus size={18} />
        নতুন লোন যোগ করুন
      </button>
    );
  }

  return (
    <div
      className="bg-background-card dark:bg-dark-card rounded-2xl shadow-sm
                 border border-border dark:border-dark-border p-5 max-w-md w-full"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="flex items-center gap-2 text-base font-semibold text-text-primary dark:text-dark-text-primary">
          <Landmark size={18} className="text-primary" />
          নতুন ব্যাংক লোন
        </h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="বন্ধ করুন"
          className="p-1 rounded-lg text-text-muted hover:bg-background dark:hover:bg-dark-background"
        >
          <X size={18} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <label className={labelCls}>ব্যাংকের নাম *</label>
          <input type="text" value={form.bank_name} onChange={set_('bank_name')} placeholder="যেমন: ইসলামী ব্যাংক" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>লোনের নাম/ধরন (ঐচ্ছিক)</label>
          <input type="text" value={form.loan_name} onChange={set_('loan_name')} placeholder="যেমন: ব্যবসায়িক লোন" className={inputCls} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>মোট লোন নিয়েছি (৳) *</label>
            <input type="number" value={form.principal} onChange={set_('principal')} placeholder="0" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>লোন নেওয়ার তারিখ</label>
            <input type="date" value={form.taken_date} onChange={set_('taken_date')} className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>কিস্তির পরিমাণ (৳) *</label>
            <input type="number" value={form.installment_amount} onChange={set_('installment_amount')} placeholder="0" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>কিস্তির ধরন *</label>
            <select value={form.frequency} onChange={set_('frequency')} className={inputCls}>
              <option value="monthly">মাসিক</option>
              <option value="weekly">সাপ্তাহিক</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>মোট কিস্তি সংখ্যা *</label>
            <input type="number" value={form.total_installments} onChange={set_('total_installments')} placeholder="যেমন: 24" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>প্রথম কিস্তির তারিখ *</label>
            <input type="date" value={form.first_due_date} onChange={set_('first_due_date')} className={inputCls} />
          </div>
        </div>

        <div>
          <label className={labelCls}>আগে কয়টা কিস্তি পরিশোধ করেছি</label>
          <input type="number" value={form.prior_paid_count} onChange={set_('prior_paid_count')} placeholder="0" className={inputCls} />
          <p className="text-[11px] text-text-muted dark:text-dark-text-secondary mt-1">
            প্রথম কিস্তি থেকে ধারাবাহিকভাবে এতগুলো কিস্তি একসাথে পরিশোধিত হিসেবে এন্ট্রি হবে
            {priorCount > 0 ? ` (৳${money(priorCount * (Number(form.installment_amount) || 0))})` : ''}
          </p>
        </div>

        {totalPayable > 0 && (
          <div className="rounded-xl bg-background dark:bg-dark-background p-3 text-xs flex flex-col gap-1">
            <p className="flex justify-between text-text-secondary dark:text-dark-text-secondary">
              <span>মোট ফেরতযোগ্য</span>
              <span className="font-semibold text-text-primary dark:text-dark-text-primary">৳{money(totalPayable)}</span>
            </p>
            <p className="flex justify-between text-text-secondary dark:text-dark-text-secondary">
              <span>সুদ/খরচ (আনুমানিক)</span>
              <span className="font-semibold text-text-primary dark:text-dark-text-primary">৳{money(interest)}</span>
            </p>
          </div>
        )}

        {error && (
          <p className="flex items-center gap-2 text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">
            <AlertCircle size={14} />
            {error}
          </p>
        )}
        {success && (
          <p className="flex items-center gap-2 text-xs text-success bg-success/10 rounded-lg px-3 py-2">
            <CheckCircle2 size={14} />
            {success}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="mt-1 w-full rounded-xl py-2.5 text-sm font-medium text-white
                     bg-gradient-to-r from-primary to-primary-light disabled:opacity-60"
        >
          {saving ? 'সংরক্ষণ হচ্ছে...' : 'লোন সংরক্ষণ করুন'}
        </button>
      </form>
    </div>
  );
}

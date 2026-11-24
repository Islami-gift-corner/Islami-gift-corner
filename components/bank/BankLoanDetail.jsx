'use client';

import { useState, useEffect, useRef } from 'react';
import { ref, onValue, push, set, update, remove } from 'firebase/database';
import { database, auth } from '@/lib/firebase';
import { logActivity } from '@/lib/activityLog';
import { exportElementToPdf } from '@/lib/pdfExport';
import { summarizeLoan, daysFromToday } from '@/lib/bankUtils';
import { money, todayStr, dateStrToIso, isoToDateStr, fmtDate } from '@/lib/format';
import StatementPages from '@/components/common/StatementPages';
import {
  ArrowLeft,
  Landmark,
  FileDown,
  Pencil,
  Trash2,
  Check,
  X,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Undo2,
} from 'lucide-react';

const labelCls = 'block text-[11px] font-medium text-text-secondary dark:text-dark-text-secondary mb-1';
const inputCls = `w-full rounded-lg border border-border dark:border-dark-border
  bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
  px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary`;

const STATUS = {
  paid: { label: 'পরিশোধিত', cls: 'bg-success/10 text-success' },
  overdue: { label: 'বিলম্বিত', cls: 'bg-danger/10 text-danger' },
  upcoming: { label: 'বাকি', cls: 'bg-warning/10 text-warning' },
};

export default function BankLoanDetail({ loanId, onBack }) {
  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payingNo, setPayingNo] = useState(null);
  const [payDate, setPayDate] = useState(todayStr());
  const [payAmount, setPayAmount] = useState('');
  const [undoNo, setUndoNo] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const pdfRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onValue(ref(database, `bank_loans/${loanId}`), (snap) => {
      setLoan(snap.exists() ? { id: loanId, ...snap.val() } : null);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [loanId]);

  if (loading) {
    return <p className="text-sm text-text-muted dark:text-dark-text-secondary">লোড হচ্ছে...</p>;
  }
  if (!loan) {
    return (
      <div className="flex flex-col gap-3">
        <button type="button" onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-text-secondary dark:text-dark-text-secondary w-fit">
          <ArrowLeft size={16} /> ব্যাংকের তালিকায় ফিরুন
        </button>
        <p className="text-sm text-text-muted dark:text-dark-text-secondary">লোনটি পাওয়া যায়নি (মুছে ফেলা হয়ে থাকতে পারে)</p>
      </div>
    );
  }

  const s = summarizeLoan(loan);
  const uid = () => auth.currentUser?.uid;

  const startPay = (row) => {
    setError('');
    setUndoNo(null);
    setPayingNo(row.no);
    setPayDate(todayStr());
    setPayAmount(String(row.amount));
  };

  const confirmPay = async (row) => {
    setError('');
    const amount = Number(payAmount);
    if (!payAmount || isNaN(amount) || amount <= 0) return setError('সঠিক পরিমাণ দিন');
    if (!payDate) return setError('তারিখ দিন');
    try {
      const payRef = push(ref(database, `bank_loans/${loan.id}/payments`));
      await set(payRef, {
        installment_no: row.no,
        amount,
        date: dateStrToIso(payDate),
        note: '',
      });
      await logActivity({
        userId: uid(),
        action: 'ব্যাংক কিস্তি পরিশোধ',
        target: `${loan.bank_name} — কিস্তি ${row.no} — ৳${amount}`,
      });
      setPayingNo(null);
    } catch (err) {
      setError('কিস্তি রেকর্ড করা যায়নি, আবার চেষ্টা করুন');
    }
  };

  const undoPay = async (row) => {
    try {
      await remove(ref(database, `bank_loans/${loan.id}/payments/${row.payment.id}`));
      await logActivity({
        userId: uid(),
        action: 'ব্যাংক কিস্তি বাতিল',
        target: `${loan.bank_name} — কিস্তি ${row.no} — ৳${row.payment.amount}`,
      });
      setUndoNo(null);
    } catch (err) {
      setError('বাতিল করা যায়নি, আবার চেষ্টা করুন');
    }
  };

  const startEdit = () => {
    setError('');
    setEditing(true);
    setEditForm({
      bank_name: loan.bank_name || '',
      loan_name: loan.loan_name || '',
      principal: String(loan.principal ?? ''),
      installment_amount: String(loan.installment_amount ?? ''),
      total_installments: String(loan.total_installments ?? ''),
      first_due_date: loan.first_due_date || '',
    });
  };

  const saveEdit = async () => {
    setError('');
    const total = Math.floor(Number(editForm.total_installments));
    if (!editForm.bank_name.trim()) return setError('ব্যাংকের নাম দিন');
    if (!editForm.principal || Number(editForm.principal) <= 0) return setError('লোনের পরিমাণ দিন');
    if (!editForm.installment_amount || Number(editForm.installment_amount) <= 0)
      return setError('কিস্তির পরিমাণ দিন');
    if (!total || total <= 0) return setError('মোট কিস্তি সংখ্যা দিন');
    if (!editForm.first_due_date) return setError('প্রথম কিস্তির তারিখ দিন');
    try {
      await update(ref(database, `bank_loans/${loan.id}`), {
        bank_name: editForm.bank_name.trim(),
        loan_name: editForm.loan_name.trim(),
        principal: Number(editForm.principal),
        installment_amount: Number(editForm.installment_amount),
        total_installments: total,
        first_due_date: editForm.first_due_date,
      });
      await logActivity({ userId: uid(), action: 'ব্যাংক লোন সংশোধন', target: editForm.bank_name.trim() });
      setEditing(false);
    } catch (err) {
      setError('সংশোধন করা যায়নি, আবার চেষ্টা করুন');
    }
  };

  const handleDelete = async () => {
    try {
      await remove(ref(database, `bank_loans/${loan.id}`));
      await logActivity({
        userId: uid(),
        action: 'ব্যাংক লোন ডিলিট',
        target: `${loan.bank_name} — ৳${loan.principal}`,
      });
      onBack();
    } catch (err) {
      setError('ডিলিট করা যায়নি, আবার চেষ্টা করুন');
      setConfirmDelete(false);
    }
  };

  const handlePdf = async () => {
    setExporting(true);
    try {
      await exportElementToPdf(pdfRef.current, `${loan.bank_name}-loan-schedule.pdf`);
    } catch (err) {
      alert('PDF তৈরি করা যায়নি, আবার চেষ্টা করুন');
    } finally {
      setExporting(false);
    }
  };

  const pdfRows = s.schedule.map((r) => ({
    cells: [
      r.no,
      fmtDate(r.dueDate),
      r.amount,
      r.status === 'paid' ? 'Paid' : r.status === 'overdue' ? 'Overdue' : 'Pending',
      r.payment ? fmtDate(r.payment.date) : '',
      r.payment ? r.payment.amount : '',
    ],
  }));
  pdfRows.push({
    bold: true,
    shaded: true,
    cells: ['', 'Total', s.totalPayable, `${s.paidCount}/${s.totalInstallments}`, '', s.paidAmount],
  });

  const nextLabel = s.next
    ? (() => {
        const d = daysFromToday(s.next.dueDate);
        return d === 0 ? 'আজ' : d > 0 ? `${d} দিন পরে` : `${-d} দিন বিলম্বিত`;
      })()
    : '';

  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-medium text-text-secondary dark:text-dark-text-secondary w-fit"
      >
        <ArrowLeft size={16} />
        ব্যাংকের তালিকায় ফিরুন
      </button>

      {/* হেডার ও সারসংক্ষেপ */}
      <div className="bg-background-card dark:bg-dark-card rounded-2xl shadow-sm border border-border dark:border-dark-border p-5">
        {editing ? (
          <div className="flex flex-col gap-2.5">
            <div>
              <label className={labelCls}>ব্যাংকের নাম</label>
              <input className={inputCls} value={editForm.bank_name} onChange={(e) => setEditForm((p) => ({ ...p, bank_name: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>লোনের নাম/ধরন</label>
              <input className={inputCls} value={editForm.loan_name} onChange={(e) => setEditForm((p) => ({ ...p, loan_name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelCls}>মোট লোন (৳)</label>
                <input type="number" className={inputCls} value={editForm.principal} onChange={(e) => setEditForm((p) => ({ ...p, principal: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>কিস্তির পরিমাণ (৳)</label>
                <input type="number" className={inputCls} value={editForm.installment_amount} onChange={(e) => setEditForm((p) => ({ ...p, installment_amount: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>মোট কিস্তি সংখ্যা</label>
                <input type="number" className={inputCls} value={editForm.total_installments} onChange={(e) => setEditForm((p) => ({ ...p, total_installments: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>প্রথম কিস্তির তারিখ</label>
                <input type="date" className={inputCls} value={editForm.first_due_date} onChange={(e) => setEditForm((p) => ({ ...p, first_due_date: e.target.value }))} />
              </div>
            </div>
            <p className="text-[11px] text-text-muted dark:text-dark-text-secondary">
              কিস্তির পরিমাণ/সংখ্যা/তারিখ বদলালে নির্ধারিত কিস্তির তালিকা নতুন করে সাজবে; আগের পরিশোধ রেকর্ড অপরিবর্তিত থাকবে।
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={saveEdit} className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium text-white bg-gradient-to-r from-primary to-primary-light">
                <Check size={14} /> সংরক্ষণ
              </button>
              <button type="button" onClick={() => { setEditing(false); setError(''); }} className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium border border-border dark:border-dark-border text-text-secondary dark:text-dark-text-secondary">
                <X size={14} /> বাতিল
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold text-text-primary dark:text-dark-text-primary">
                  <Landmark size={18} className="text-primary" />
                  {loan.bank_name}
                </h2>
                {loan.loan_name && (
                  <p className="text-xs text-text-muted dark:text-dark-text-secondary">{loan.loan_name}</p>
                )}
                <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-1">
                  {loan.frequency === 'weekly' ? 'সাপ্তাহিক' : 'মাসিক'} কিস্তি ৳{money(s.installmentAmount)} · মোট {s.totalInstallments}টি
                  {loan.taken_date ? ` · লোন নেওয়া ${fmtDate(loan.taken_date)}` : ''}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button type="button" onClick={startEdit} aria-label="সংশোধন" className="p-1.5 rounded-lg text-text-muted hover:bg-background dark:hover:bg-dark-background">
                  <Pencil size={15} />
                </button>
                <button type="button" onClick={() => setConfirmDelete(true)} aria-label="ডিলিট" className="p-1.5 rounded-lg text-danger hover:bg-danger/10">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            <div className="h-2.5 rounded-full bg-background dark:bg-dark-background overflow-hidden mb-1.5">
              <div className="h-full bg-gradient-to-r from-primary to-primary-light" style={{ width: `${s.progress}%` }} />
            </div>
            <p className="text-[11px] text-text-muted dark:text-dark-text-secondary mb-3">
              কিস্তি {s.paidCount}/{s.totalInstallments} পরিশোধিত · {Math.round(s.progress)}%
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="rounded-xl bg-background dark:bg-dark-background p-3">
                <p className="text-[11px] text-text-muted dark:text-dark-text-secondary mb-1">লোন নিয়েছি</p>
                <p className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">৳{money(loan.principal)}</p>
              </div>
              <div className="rounded-xl bg-background dark:bg-dark-background p-3">
                <p className="text-[11px] text-text-muted dark:text-dark-text-secondary mb-1">মোট ফেরতযোগ্য</p>
                <p className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">৳{money(s.totalPayable)}</p>
              </div>
              <div className="rounded-xl bg-success/10 p-3">
                <p className="text-[11px] text-text-muted dark:text-dark-text-secondary mb-1">দিয়েছি</p>
                <p className="text-sm font-semibold text-success">৳{money(s.paidAmount)}</p>
              </div>
              <div className="rounded-xl bg-danger/10 p-3">
                <p className="text-[11px] text-text-muted dark:text-dark-text-secondary mb-1">বাকি ({s.remainingCount}টি)</p>
                <p className="text-sm font-semibold text-danger">৳{money(s.remainingAmount)}</p>
              </div>
            </div>
            <p className="text-[11px] text-text-muted dark:text-dark-text-secondary mt-2">
              সুদ/খরচ (আনুমানিক): ৳{money(s.interest)}
            </p>

            {s.finished ? (
              <p className="flex items-center gap-2 text-xs text-success bg-success/10 rounded-lg px-3 py-2 mt-3">
                <CheckCircle2 size={14} /> এই লোনের সব কিস্তি পরিশোধ হয়ে গেছে
              </p>
            ) : (
              s.next && (
                <p className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 mt-3 ${s.next.status === 'overdue' ? 'text-danger bg-danger/10' : 'text-warning bg-warning/10'}`}>
                  {s.next.status === 'overdue' && <AlertTriangle size={14} />}
                  পরবর্তী কিস্তি {s.next.no} — {fmtDate(s.next.dueDate)} — ৳{money(s.next.amount)} ({nextLabel})
                </p>
              )
            )}
          </>
        )}
      </div>

      {error && (
        <p className="flex items-center gap-2 text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">
          <AlertCircle size={14} />
          {error}
        </p>
      )}

      {confirmDelete && (
        <div className="bg-danger/10 rounded-xl border border-danger p-3 flex flex-col gap-2">
          <p className="text-xs text-danger">
            "{loan.bank_name}" লোন ও তার সব কিস্তির রেকর্ড মুছে ফেলবেন? এটা ফেরানো যাবে না।
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={handleDelete} className="flex-1 rounded-lg py-1.5 text-xs font-medium text-white bg-danger">
              হ্যাঁ, ডিলিট করুন
            </button>
            <button type="button" onClick={() => setConfirmDelete(false)} className="flex-1 rounded-lg py-1.5 text-xs font-medium border border-border dark:border-dark-border text-text-secondary dark:text-dark-text-secondary">
              বাতিল
            </button>
          </div>
        </div>
      )}

      {/* কিস্তির তালিকা */}
      <div className="bg-background-card dark:bg-dark-card rounded-2xl shadow-sm border border-border dark:border-dark-border p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">কিস্তির তালিকা</h3>
          <button
            type="button"
            onClick={handlePdf}
            disabled={exporting}
            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium
                       border border-border dark:border-dark-border text-text-primary dark:text-dark-text-primary disabled:opacity-50"
          >
            <FileDown size={14} />
            {exporting ? 'তৈরি হচ্ছে...' : 'PDF'}
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {s.schedule.map((row) => {
            const st = STATUS[row.status];
            return (
              <div
                key={row.no}
                className={`rounded-xl border p-3 ${row.isNext ? 'border-primary' : 'border-border dark:border-dark-border'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-text-primary dark:text-dark-text-primary">
                      কিস্তি {row.no}
                      <span className="text-xs text-text-muted dark:text-dark-text-secondary"> · {fmtDate(row.dueDate)}</span>
                    </p>
                    {row.payment && (
                      <p className="text-[11px] text-text-muted dark:text-dark-text-secondary">
                        দেওয়া হয়েছে {fmtDate(row.payment.date)} · ৳{money(row.payment.amount)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">৳{money(row.amount)}</span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                    {row.status === 'paid' ? (
                      <button type="button" onClick={() => setUndoNo(undoNo === row.no ? null : row.no)} aria-label="বাতিল করুন" className="p-1.5 rounded-lg text-text-muted hover:bg-background dark:hover:bg-dark-background">
                        <Undo2 size={14} />
                      </button>
                    ) : (
                      <button type="button" onClick={() => startPay(row)} className="rounded-lg px-2.5 py-1 text-xs font-medium text-white bg-gradient-to-r from-primary to-primary-light">
                        পরিশোধ
                      </button>
                    )}
                  </div>
                </div>

                {payingNo === row.no && (
                  <div className="mt-3 grid grid-cols-2 gap-2 items-end">
                    <div>
                      <label className={labelCls}>পরিশোধের তারিখ</label>
                      <input type="date" max={todayStr()} value={payDate} onChange={(e) => setPayDate(e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>পরিমাণ (৳)</label>
                      <input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className={inputCls} />
                    </div>
                    <button type="button" onClick={() => confirmPay(row)} className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium text-white bg-gradient-to-r from-primary to-primary-light">
                      <Check size={14} /> নিশ্চিত করুন
                    </button>
                    <button type="button" onClick={() => setPayingNo(null)} className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium border border-border dark:border-dark-border text-text-secondary dark:text-dark-text-secondary">
                      <X size={14} /> বাতিল
                    </button>
                  </div>
                )}

                {undoNo === row.no && row.payment && (
                  <div className="mt-3 bg-danger/10 rounded-lg p-2.5 flex flex-col gap-2">
                    <p className="text-xs text-danger">কিস্তি {row.no}-এর পরিশোধ এন্ট্রি মুছে আবার "বাকি" করবেন?</p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => undoPay(row)} className="flex-1 rounded-lg py-1.5 text-xs font-medium text-white bg-danger">
                        হ্যাঁ, বাতিল করুন
                      </button>
                      <button type="button" onClick={() => setUndoNo(null)} className="flex-1 rounded-lg py-1.5 text-xs font-medium border border-border dark:border-dark-border text-text-secondary dark:text-dark-text-secondary">
                        না
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* PDF এর জন্য লুকানো পেজ */}
      <div className="fixed -left-[9999px] top-0">
        <StatementPages
          innerRef={pdfRef}
          title="Bank Loan Installment Schedule"
          subtitle={`${loan.bank_name}${loan.loan_name ? ` — ${loan.loan_name}` : ''} · Loan ${money(loan.principal)} · ${
            loan.frequency === 'weekly' ? 'Weekly' : 'Monthly'
          } ${money(s.installmentAmount)}`}
          columns={[
            { label: 'No', width: '8%' },
            { label: 'Due Date', width: '18%' },
            { label: 'Amount', align: 'right', width: '16%' },
            { label: 'Status', width: '16%' },
            { label: 'Paid On', width: '18%' },
            { label: 'Paid Amount', align: 'right' },
          ]}
          rows={pdfRows}
          summary={
            <div className="flex flex-col items-end gap-1 text-xs">
              <p>Total Payable: {money(s.totalPayable)}</p>
              <p>Paid: {money(s.paidAmount)}</p>
              <p className="font-bold">Remaining: {money(s.remainingAmount)} ({s.remainingCount} installments)</p>
            </div>
          }
          summaryRows={5}
        />
      </div>
    </div>
  );
}

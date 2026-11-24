'use client';

import { useState, useEffect } from 'react';
import { ref, onValue, update, push, set, remove } from 'firebase/database';
import { database, auth } from '@/lib/firebase';
import { logActivity } from '@/lib/activityLog';
import InvoiceForm from '@/components/invoice/InvoiceForm';
import InvoicePrint from '@/components/invoice/InvoicePrint';
import PartyStatementExport from './PartyStatementExport';
import AddOpeningDue from './AddOpeningDue';
import EditParty from './EditParty';
import {
  ArrowLeft,
  Phone,
  Building2,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Receipt,
  ChevronRight,
  History,
  FilePlus2,
  Landmark,
  Pencil,
  Trash2,
  X,
  Check,
} from 'lucide-react';

export default function PartyLedger({ party, onBack, allowDelete = false }) {
  const [activeTab, setActiveTab] = useState('invoice'); // 'invoice' | 'collection' | 'statement' | 'history'
  const [historySubTab, setHistorySubTab] = useState('invoice'); // 'invoice' | 'collection'

  // পার্টির বেসিক তথ্য (নাম/ব্যবসার নাম/ফোন/ঠিকানা) এডিট করার পর সাথে সাথে
  // হেডারে দেখানোর জন্য আলাদা state — বাকি সব জায়গায় (আর্থিক হিসাব) party prop-ই ব্যবহার হয়
  const [displayParty, setDisplayParty] = useState(party);

  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [dues, setDues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const [collectAmount, setCollectAmount] = useState('');
  const [collectMethod, setCollectMethod] = useState('cash');

  // ভুল করে ভুল টাকার পরিমাণ কালেকশন রেকর্ড করে ফেললে পরে সংশোধন/ডিলিট করার জন্য
  const [editingPaymentId, setEditingPaymentId] = useState(null);
  const [editPaymentAmount, setEditPaymentAmount] = useState('');
  const [confirmDeletePaymentId, setConfirmDeletePaymentId] = useState(null);
  const [paymentActionError, setPaymentActionError] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const invoicesRef = ref(database, 'invoices');
    const unsubscribeInvoices = onValue(invoicesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data)
          .map(([id, value]) => ({ id, ...value }))
          .filter((inv) => inv.party_id === party.id)
          .sort((a, b) => new Date(b.date) - new Date(a.date));
        setInvoices(list);
      } else {
        setInvoices([]);
      }
      setLoading(false);
    });

    const paymentsRef = ref(database, `parties/${party.id}/payments`);
    const unsubscribePayments = onValue(paymentsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data)
          .map(([id, value]) => ({ id, ...value }))
          .sort((a, b) => new Date(b.date) - new Date(a.date));
        setPayments(list);
      } else {
        setPayments([]);
      }
    });

    const duesRef = ref(database, `parties/${party.id}/dues`);
    const unsubscribeDues = onValue(duesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data)
          .map(([id, value]) => ({ id, ...value }))
          .sort((a, b) => new Date(b.date) - new Date(a.date));
        setDues(list);
      } else {
        setDues([]);
      }
    });

    return () => {
      unsubscribeInvoices();
      unsubscribePayments();
      unsubscribeDues();
    };
  }, [party.id]);

  const handleCollect = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!collectAmount || isNaN(collectAmount) || Number(collectAmount) <= 0) {
      setError('সঠিক পরিমাণ দিন');
      return;
    }
    if (Number(collectAmount) > (party.balance || 0)) {
      setError('বাকির চেয়ে বেশি টাকা কালেকশন দেখানো যাবে না');
      return;
    }

    setSaving(true);
    try {
      const amount = Number(collectAmount);

      const paymentRef = push(ref(database, `parties/${party.id}/payments`));

      const ledgerRef = push(ref(database, 'ledger'));
      await set(ledgerRef, {
        type: 'income',
        category: 'পার্টি কালেকশন',
        amount,
        note: `${party.name} থেকে কালেকশন`,
        date: new Date().toISOString(),
        auto_generated: true,
      });

      await set(paymentRef, {
        amount,
        method: collectMethod,
        date: new Date().toISOString(),
        ledger_entry_id: ledgerRef.key,
      });

      const newTotalPaid = (party.total_paid || 0) + amount;
      const newBalance = (party.total_purchase || 0) - newTotalPaid;

      await update(ref(database, `parties/${party.id}`), {
        total_paid: newTotalPaid,
        balance: newBalance,
      });

      party.total_paid = newTotalPaid;
      party.balance = newBalance;

      setSuccess(`৳${amount} কালেকশন রেকর্ড হয়েছে`);
      await logActivity({
        userId: auth.currentUser?.uid,
        action: 'পার্টি কালেকশন',
        target: `${party.name} — ৳${amount}`,
      });
      setCollectAmount('');
    } catch (err) {
      setError('কালেকশন রেকর্ড করা যায়নি, আবার চেষ্টা করুন');
    } finally {
      setSaving(false);
    }
  };

  const startEditPayment = (payment) => {
    setPaymentActionError('');
    setEditingPaymentId(payment.id);
    setEditPaymentAmount(String(payment.amount));
  };

  // ভুল করে ভুল পরিমাণ কালেকশন করে ফেললে এখান থেকে সঠিক পরিমাণে সংশোধন করা যায় —
  // পার্টির total_paid/balance এবং লিংক করা ঠালি খাতার আয়ের এন্ট্রি দুটোই ঠিক হয়ে যায়
  const saveEditPayment = async (payment) => {
    setPaymentActionError('');
    const newAmount = Number(editPaymentAmount);

    if (!editPaymentAmount || isNaN(newAmount) || newAmount <= 0) {
      setPaymentActionError('সঠিক পরিমাণ দিন');
      return;
    }

    const difference = newAmount - payment.amount;
    if (difference > (party.balance || 0)) {
      setPaymentActionError('এই পরিমাণে বাড়ালে বাকির চেয়ে বেশি পরিশোধ দেখাবে');
      return;
    }

    try {
      await update(ref(database, `parties/${party.id}/payments/${payment.id}`), {
        amount: newAmount,
      });

      const newTotalPaid = (party.total_paid || 0) + difference;
      const newBalance = (party.total_purchase || 0) - newTotalPaid;
      await update(ref(database, `parties/${party.id}`), {
        total_paid: newTotalPaid,
        balance: newBalance,
      });

      if (payment.ledger_entry_id) {
        await update(ref(database, `ledger/${payment.ledger_entry_id}`), {
          amount: newAmount,
        });
      }

      party.total_paid = newTotalPaid;
      party.balance = newBalance;

      await logActivity({
        userId: auth.currentUser?.uid,
        action: 'পার্টি কালেকশন সংশোধন',
        target: `${party.name} — ৳${payment.amount} থেকে ৳${newAmount}`,
      });

      setEditingPaymentId(null);
    } catch (err) {
      setPaymentActionError('সংশোধন করা যায়নি, আবার চেষ্টা করুন');
    }
  };

  // ভুল কালেকশন এন্ট্রি পুরোপুরি মুছে ফেলার জন্য — পার্টির হিসাব ও লিংক করা
  // ঠালি খাতার আয়ের এন্ট্রি দুটোই ফেরত/মুছে যাবে
  const deletePayment = async (payment) => {
    try {
      await remove(ref(database, `parties/${party.id}/payments/${payment.id}`));

      const newTotalPaid = Math.max(0, (party.total_paid || 0) - payment.amount);
      const newBalance = (party.total_purchase || 0) - newTotalPaid;
      await update(ref(database, `parties/${party.id}`), {
        total_paid: newTotalPaid,
        balance: newBalance,
      });

      if (payment.ledger_entry_id) {
        await remove(ref(database, `ledger/${payment.ledger_entry_id}`));
      }

      party.total_paid = newTotalPaid;
      party.balance = newBalance;

      await logActivity({
        userId: auth.currentUser?.uid,
        action: 'পার্টি কালেকশন ডিলিট',
        target: `${party.name} — ৳${payment.amount}`,
      });

      setConfirmDeletePaymentId(null);
    } catch (err) {
      setPaymentActionError('ডিলিট করা যায়নি, আবার চেষ্টা করুন');
    }
  };

  if (selectedInvoice) {
    return (
      <InvoicePrint
        invoice={selectedInvoice}
        onBack={() => setSelectedInvoice(null)}
        allowDelete={allowDelete}
        onDeleted={() => setSelectedInvoice(null)}
      />
    );
  }

  const TABS = [
    { key: 'invoice', label: 'ইনভয়েস', icon: FilePlus2 },
    { key: 'collection', label: 'কালেকশন', icon: Wallet },
    { key: 'opening_due', label: 'পূর্বের বকেয়া', icon: Landmark },
    { key: 'statement', label: 'স্টেটমেন্ট', icon: Receipt },
    { key: 'history', label: 'হিস্ট্রি', icon: History },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-medium text-text-secondary dark:text-dark-text-secondary w-fit"
      >
        <ArrowLeft size={16} />
        পার্টি তালিকায় ফিরুন
      </button>

      {/* পার্টির তথ্য ও সামারি — সবসময় দেখা যাবে */}
      <div
        className="bg-background-card dark:bg-dark-card rounded-2xl shadow-sm
                   border border-border dark:border-dark-border p-5"
      >
        <div className="flex items-start justify-between gap-3 mb-1">
          <h2 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary">
            {displayParty.name}
          </h2>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-secondary dark:text-dark-text-secondary mb-2">
          {displayParty.business_name && (
            <span className="flex items-center gap-1.5">
              <Building2 size={14} />
              {displayParty.business_name}
            </span>
          )}
          {displayParty.phone && (
            <span className="flex items-center gap-1.5">
              <Phone size={14} />
              {displayParty.phone}
            </span>
          )}
        </div>

        <EditParty party={party} onUpdated={setDisplayParty} />

        <div className="grid grid-cols-3 gap-3 text-center mt-4">
          <div className="rounded-xl bg-background dark:bg-dark-background p-3">
            <p className="text-xs text-text-muted dark:text-dark-text-secondary mb-1">মোট বিক্রয়</p>
            <p className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">
              ৳{party.total_purchase || 0}
            </p>
          </div>
          <div className="rounded-xl bg-background dark:bg-dark-background p-3">
            <p className="text-xs text-text-muted dark:text-dark-text-secondary mb-1">পরিশোধিত</p>
            <p className="text-sm font-semibold text-success">৳{party.total_paid || 0}</p>
          </div>
          <div className="rounded-xl bg-background dark:bg-dark-background p-3">
            <p className="text-xs text-text-muted dark:text-dark-text-secondary mb-1">বাকি</p>
            <p className="text-sm font-semibold text-danger">৳{party.balance || 0}</p>
          </div>
        </div>
      </div>

      {/* মূল ৪টা ট্যাব */}
      <div
        className="flex gap-1 p-1 rounded-xl bg-background-card dark:bg-dark-card
                   border border-border dark:border-dark-border w-fit overflow-x-auto max-w-full"
      >
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-colors
              ${
                activeTab === key
                  ? 'bg-gradient-to-r from-primary to-primary-light text-white shadow-sm'
                  : 'text-text-secondary dark:text-dark-text-secondary'
              }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* ট্যাব ১: ইনভয়েস তৈরি — পার্টি অটো সিলেক্ট করা থাকবে */}
      {activeTab === 'invoice' && (
        <InvoiceForm presetParty={party} onSaved={setSelectedInvoice} />
      )}

      {/* ট্যাব ২: কালেকশন */}
      {activeTab === 'collection' && (
        <div
          className="bg-background-card dark:bg-dark-card rounded-2xl shadow-sm
                     border border-border dark:border-dark-border p-5"
        >
          <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary dark:text-dark-text-primary mb-3">
            <Wallet size={16} className="text-primary" />
            পেমেন্ট কালেকশন
          </h3>

          {(party.balance || 0) > 0 ? (
            <>
              <form onSubmit={handleCollect} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="number"
                  value={collectAmount}
                  onChange={(e) => setCollectAmount(e.target.value)}
                  placeholder="পরিমাণ"
                  className="flex-1 rounded-xl border border-border dark:border-dark-border
                             bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                             px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <select
                  value={collectMethod}
                  onChange={(e) => setCollectMethod(e.target.value)}
                  className="rounded-xl border border-border dark:border-dark-border
                             bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                             px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="cash">নগদ</option>
                  <option value="bank">ব্যাংক ট্রান্সফার</option>
                  <option value="check">চেক</option>
                </select>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl px-5 py-2.5 text-sm font-medium text-white
                             bg-gradient-to-r from-primary to-primary-light disabled:opacity-60"
                >
                  {saving ? 'সংরক্ষণ হচ্ছে...' : 'কালেকশন করুন'}
                </button>
              </form>

              {error && (
                <p className="flex items-center gap-2 text-xs text-danger bg-danger/10 rounded-lg px-3 py-2 mt-3">
                  <AlertCircle size={14} />
                  {error}
                </p>
              )}
              {success && (
                <p className="flex items-center gap-2 text-xs text-success bg-success/10 rounded-lg px-3 py-2 mt-3">
                  <CheckCircle2 size={14} />
                  {success}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-text-muted dark:text-dark-text-secondary">
              এই পার্টির কোনো বাকি নেই
            </p>
          )}
        </div>
      )}

      {/* ট্যাব ৩: পূর্বের বকেয়া যোগ */}
      {activeTab === 'opening_due' && (
        <AddOpeningDue party={party} dues={dues} />
      )}

      {/* ট্যাব ৪: স্টেটমেন্ট */}
      {activeTab === 'statement' && (
        <PartyStatementExport party={party} invoices={invoices} dues={dues} payments={payments} />
      )}

      {/* ট্যাব ৪: হিস্ট্রি — ইনভয়েস/কালেকশন সাব-ট্যাব */}
      {activeTab === 'history' && (
        <div className="flex flex-col gap-4">
          <div
            className="flex gap-1 p-1 rounded-xl bg-background-card dark:bg-dark-card
                       border border-border dark:border-dark-border w-fit"
          >
            <button
              type="button"
              onClick={() => setHistorySubTab('invoice')}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors
                ${
                  historySubTab === 'invoice'
                    ? 'bg-primary text-white'
                    : 'text-text-secondary dark:text-dark-text-secondary'
                }`}
            >
              ইনভয়েস
            </button>
            <button
              type="button"
              onClick={() => setHistorySubTab('collection')}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors
                ${
                  historySubTab === 'collection'
                    ? 'bg-primary text-white'
                    : 'text-text-secondary dark:text-dark-text-secondary'
                }`}
            >
              কালেকশন
            </button>
            <button
              type="button"
              onClick={() => setHistorySubTab('due')}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors
                ${
                  historySubTab === 'due'
                    ? 'bg-primary text-white'
                    : 'text-text-secondary dark:text-dark-text-secondary'
                }`}
            >
              পূর্বের বকেয়া
            </button>
          </div>

          {historySubTab === 'invoice' &&
            (loading ? (
              <p className="text-sm text-text-muted dark:text-dark-text-secondary">লোড হচ্ছে...</p>
            ) : invoices.length === 0 ? (
              <p className="text-sm text-text-muted dark:text-dark-text-secondary">কোনো ইনভয়েস নেই</p>
            ) : (
              <div className="flex flex-col gap-2">
                {invoices.map((inv, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setSelectedInvoice(inv)}
                    className="flex items-center justify-between bg-background-card dark:bg-dark-card
                               rounded-xl border border-border dark:border-dark-border p-3 text-left
                               hover:border-primary transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-text-primary dark:text-dark-text-primary">
                        {inv.invoice_no}
                      </p>
                      <p className="text-xs text-text-muted dark:text-dark-text-secondary">
                        {new Date(inv.date).toLocaleDateString('bn-BD')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text-primary dark:text-dark-text-primary">
                        ৳{(inv.subtotal || 0) - (inv.commission?.total || 0)}
                      </span>
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-full
                          ${inv.status === 'paid' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}
                      >
                        {inv.status === 'paid' ? 'পরিশোধিত' : 'বাকি'}
                      </span>
                      <ChevronRight size={16} className="text-text-muted" />
                    </div>
                  </button>
                ))}
              </div>
            ))}

          {historySubTab === 'collection' &&
            (payments.length === 0 ? (
              <p className="text-sm text-text-muted dark:text-dark-text-secondary">
                কোনো কালেকশন হিস্ট্রি নেই
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {paymentActionError && (
                  <p className="flex items-center gap-2 text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">
                    <AlertCircle size={14} />
                    {paymentActionError}
                  </p>
                )}
                {payments.map((p) =>
                  editingPaymentId === p.id ? (
                    <div
                      key={p.id}
                      className="bg-background-card dark:bg-dark-card rounded-xl border border-primary p-3 flex flex-col gap-2"
                    >
                      <label className="text-xs text-text-secondary dark:text-dark-text-secondary">
                        সঠিক পরিমাণ লিখুন
                      </label>
                      <input
                        type="number"
                        value={editPaymentAmount}
                        onChange={(e) => setEditPaymentAmount(e.target.value)}
                        className="rounded-lg border border-border dark:border-dark-border
                                   bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                                   px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => saveEditPayment(p)}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium
                                     text-white bg-gradient-to-r from-primary to-primary-light"
                        >
                          <Check size={14} />
                          সংরক্ষণ
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPaymentId(null);
                            setPaymentActionError('');
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium
                                     border border-border dark:border-dark-border text-text-secondary dark:text-dark-text-secondary"
                        >
                          <X size={14} />
                          বাতিল
                        </button>
                      </div>
                    </div>
                  ) : confirmDeletePaymentId === p.id ? (
                    <div
                      key={p.id}
                      className="bg-danger/10 rounded-xl border border-danger p-3 flex flex-col gap-2"
                    >
                      <p className="text-xs text-danger">
                        ৳{p.amount}-এর এই কালেকশন এন্ট্রি মুছে ফেলবেন? পার্টির বাকি ও ঠালি খাতার
                        হিসাব দুটোই আপডেট হয়ে যাবে।
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => deletePayment(p)}
                          className="flex-1 rounded-lg py-1.5 text-xs font-medium text-white bg-danger"
                        >
                          হ্যাঁ, ডিলিট করুন
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeletePaymentId(null)}
                          className="flex-1 rounded-lg py-1.5 text-xs font-medium border border-border dark:border-dark-border
                                     text-text-secondary dark:text-dark-text-secondary"
                        >
                          বাতিল
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-2 bg-background-card dark:bg-dark-card
                                 rounded-xl border border-border dark:border-dark-border p-3 text-sm"
                    >
                      <span className="text-text-secondary dark:text-dark-text-secondary">
                        {new Date(p.date).toLocaleDateString('bn-BD')} ·{' '}
                        {p.method === 'cash' ? 'নগদ' : p.method === 'bank' ? 'ব্যাংক' : 'চেক'}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-medium text-success">৳{p.amount}</span>
                        <button
                          type="button"
                          onClick={() => startEditPayment(p)}
                          aria-label="সংশোধন করুন"
                          className="p-1.5 rounded-lg text-text-muted hover:bg-background dark:hover:bg-dark-background"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentActionError('');
                            setConfirmDeletePaymentId(p.id);
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
            ))}

          {historySubTab === 'due' &&
            (dues.length === 0 ? (
              <p className="text-sm text-text-muted dark:text-dark-text-secondary">
                কোনো পূর্বের বকেয়া যোগ করা হয়নি
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {dues.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between bg-background-card dark:bg-dark-card
                               rounded-xl border border-border dark:border-dark-border p-3 text-sm"
                  >
                    <div>
                      <p className="text-text-secondary dark:text-dark-text-secondary">{d.note}</p>
                      <p className="text-xs text-text-muted dark:text-dark-text-secondary">
                        {new Date(d.date).toLocaleDateString('bn-BD')}
                      </p>
                    </div>
                    <span className="font-medium text-danger">৳{d.amount}</span>
                  </div>
                ))}
              </div>
            ))}
        </div>
      )}
    </div>
  );
       }

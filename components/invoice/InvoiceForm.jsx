'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, get, set, update, push } from 'firebase/database';
import { database, auth } from '@/lib/firebase';
import { recordStockMovement } from '@/lib/stockUtils';
import { getNextInvoiceNumber } from '@/lib/invoiceUtils';
import { logActivity } from '@/lib/activityLog';
import CompanySelector from '@/components/product/CompanySelector';
import ProductSelector from '@/components/stock/ProductSelector';
import PartySelector from '@/components/party/PartySelector';
import {
  Receipt,
  Plus,
  Trash2,
  User,
  ShoppingBag,
  Percent,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export default function InvoiceForm({ onSaved, presetParty }) {
  const [customerType, setCustomerType] = useState('party'); // 'party' | 'walkin'
  const [partyId, setPartyId] = useState(presetParty?.id || '');
  const [selectedParty, setSelectedParty] = useState(presetParty || null);

  // লগইন করা ইউজার (SR) কে নির্দিষ্ট কোম্পানির সাথে সীমাবদ্ধ করা থাকলে সেই তালিকা আনা হচ্ছে —
  // অ্যাডমিন খালি রাখলে (allowed_companies না থাকলে) সব কোম্পানিই দেখাবে, কোনো restriction নেই।
  const [allowedCompanyIds, setAllowedCompanyIds] = useState(null);

  useEffect(() => {
    // auth.currentUser পেজ লোডের প্রথম মুহূর্তে null থাকতে পারে (Firebase সেশন
    // রিস্টোর হতে সময় লাগে), তাই onAuthStateChanged দিয়ে নিশ্চিতভাবে uid পাওয়ার
    // পর এই ফেচ করা হচ্ছে — না হলে সাময়িকভাবে SR-এর কোম্পানি সীমাবদ্ধতা এড়িয়ে যেত।
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) return;
      get(ref(database, `users/${user.uid}/allowed_companies`)).then((snap) => {
        const data = snap.val();
        setAllowedCompanyIds(data ? Object.keys(data) : []);
      });
    });
    return () => unsubscribeAuth();
  }, []);

  // presetParty দেওয়া থাকলে (যেমন পার্টি প্রোফাইলের ভেতর থেকে ইনভয়েস তৈরি করলে)
  // সেটাই অটো-সিলেক্ট থাকবে
  useEffect(() => {
    if (presetParty) {
      setPartyId(presetParty.id);
      setSelectedParty(presetParty);
      setCustomerType('party');
    }
  }, [presetParty]);
  const [walkinCustomer, setWalkinCustomer] = useState({ name: '', phone: '', address: '' });

  // লাইন আইটেম যোগ করার স্টেজিং এরিয়া
  const [stagingCompanyId, setStagingCompanyId] = useState('');
  const [stagingProduct, setStagingProduct] = useState(null);
  const [stagingQty, setStagingQty] = useState('');
  const [stagingPrice, setStagingPrice] = useState('');
  const [stagingCommission, setStagingCommission] = useState('');

  const [items, setItems] = useState([]);

  // অতিরিক্ত কমিশন
  const [extraEnabled, setExtraEnabled] = useState(false);
  const [extraType, setExtraType] = useState('percent'); // 'percent' | 'fixed'
  const [extraValue, setExtraValue] = useState('');

  const [paymentStatus, setPaymentStatus] = useState('due'); // 'due' | 'paid'

  // ইনভয়েসের তারিখ — ডিফল্ট আজ, চাইলে আগের যেকোনো তারিখ দেওয়া যাবে
  const todayStr = () => {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  };
  const [invoiceDate, setInvoiceDate] = useState(todayStr());

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const handlePartyChange = (id, party) => {
    setPartyId(id);
    setSelectedParty(party);
  };

  const handleProductPick = (id, product) => {
    setStagingProduct(product ? { id, ...product } : null);
    if (product) {
      setStagingPrice(String(product.mrp ?? ''));
      setStagingCommission(String(product.commission_percent ?? 0));
    }
  };

  const addItem = () => {
    setError('');
    if (!stagingCompanyId || !stagingProduct) {
      setError('কোম্পানি ও প্রোডাক্ট নির্বাচন করুন');
      return;
    }
    if (!stagingQty || isNaN(stagingQty) || Number(stagingQty) <= 0) {
      setError('সঠিক পরিমাণ দিন');
      return;
    }
    if (!stagingPrice || isNaN(stagingPrice) || Number(stagingPrice) < 0) {
      setError('সঠিক মূল্য দিন');
      return;
    }

    setItems((prev) => [
      ...prev,
      {
        localId: `${Date.now()}-${Math.random()}`,
        companyId: stagingCompanyId,
        productId: stagingProduct.id,
        productName: stagingProduct.name,
        qty: Number(stagingQty),
        price: Number(stagingPrice),
        commissionPercent: Number(stagingCommission) || 0,
      },
    ]);

    setStagingProduct(null);
    setStagingQty('');
    setStagingPrice('');
    setStagingCommission('');
  };

  const removeItem = (localId) => {
    setItems((prev) => prev.filter((item) => item.localId !== localId));
  };

  const subtotal = items.reduce((sum, item) => sum + item.qty * item.price, 0);
  const baseCommission = items.reduce(
    (sum, item) => sum + (item.qty * item.price * item.commissionPercent) / 100,
    0
  );
  // অতিরিক্ত কমিশন এখন মূল সাবটোটাল থেকে না, বরং নিয়মিত কমিশন বাদ দেওয়ার পর যা থাকে
  // তার উপর ধরা হয়। যেমন: ১০০ টাকায় ১০% নিয়মিত কমিশন = ১০ টাকা, বাকি থাকে ৯০ টাকা —
  // অতিরিক্ত কমিশন % এখন এই ৯০ টাকার উপর হিসাব হবে, মূল ১০০ টাকার উপর না।
  const amountAfterBaseCommission = subtotal - baseCommission;
  const extraAmount = !extraEnabled || !extraValue || isNaN(extraValue)
    ? 0
    : extraType === 'percent'
    ? (amountAfterBaseCommission * Number(extraValue)) / 100
    : Number(extraValue);
  const totalCommission = baseCommission + extraAmount;

  const resetForm = () => {
    setCustomerType('party');
    setPartyId(presetParty?.id || '');
    setSelectedParty(presetParty || null);
    setWalkinCustomer({ name: '', phone: '', address: '' });
    setItems([]);
    setExtraEnabled(false);
    setExtraValue('');
    setPaymentStatus('due');
    setInvoiceDate(todayStr());
  };

  const handleSaveInvoice = async () => {
    setError('');
    setSuccess('');

    if (customerType === 'party' && (!partyId || !selectedParty)) {
      setError('পার্টি নির্বাচন করুন');
      return;
    }
    if (customerType === 'walkin' && !walkinCustomer.name.trim()) {
      setError('ক্রেতার নাম দিন');
      return;
    }
    if (items.length === 0) {
      setError('কমপক্ষে একটা পণ্য যোগ করুন');
      return;
    }
    if (!invoiceDate) {
      setError('ইনভয়েসের তারিখ দিন');
      return;
    }
    if (invoiceDate > todayStr()) {
      setError('ভবিষ্যতের তারিখে ইনভয়েস করা যাবে না');
      return;
    }

    setSaving(true);
    try {
      // আজকের তারিখ হলে এখনকার সময়, আগের তারিখ হলে ওই দিনের দুপুর ১২টা
      const invoiceDateIso =
        invoiceDate === todayStr()
          ? new Date().toISOString()
          : new Date(`${invoiceDate}T12:00:00`).toISOString();

      // ধাপ ১: স্টক যাচাই + বিক্রির মুহূর্তের ক্রয়মূল্য (cost_price) সংরক্ষণের জন্য সংগ্রহ।
      // ইনভয়েসে ক্রয়মূল্য আটকে রাখা হয়, যাতে পরে প্রোডাক্টের দাম বদলালেও
      // পুরনো ইনভয়েসের প্রফিট বদলে না যায়।
      const costByLocalId = {};
      for (const item of items) {
        const snap = await get(
          ref(database, `companies/${item.companyId}/products/${item.productId}`)
        );
        const currentStock = snap.exists() ? Number(snap.val().stock_qty) || 0 : 0;
        costByLocalId[item.localId] = snap.exists() ? Number(snap.val().cost_price) || 0 : 0;
        if (currentStock < item.qty) {
          throw new Error(
            `"${item.productName}" এর পর্যাপ্ত স্টক নেই (আছে: ${currentStock}, দরকার: ${item.qty})`
          );
        }
      }

      // ধাপ ২: ইনভয়েস নম্বর
      const invoiceNo = await getNextInvoiceNumber();
      const invoiceId = invoiceNo.replace(/-/g, '_');
      const uid = auth.currentUser?.uid || '';

      const customerName = customerType === 'party' ? selectedParty.name : walkinCustomer.name.trim();

      // পার্টির কাছ থেকে আসলে যে টাকা পাওয়া যাবে (নিয়মিত + অতিরিক্ত দুই কমিশনই
      // বাদ দেওয়ার পর) — পার্টির হিসাব ও ঠালি খাতার আয় এই টাকা দিয়েই হওয়া উচিত,
      // পুরো MRP-ভিত্তিক সাবটোটাল দিয়ে না
      const netAmount = subtotal - totalCommission;

      const partyInfo =
        customerType === 'party'
          ? {
              name: selectedParty.name,
              business_name: selectedParty.business_name || '',
              phone: selectedParty.phone || '',
              address: selectedParty.address || '',
            }
          : {
              name: walkinCustomer.name.trim(),
              business_name: '',
              phone: walkinCustomer.phone.trim(),
              address: walkinCustomer.address.trim(),
            };

      const invoiceData = {
        invoice_no: invoiceNo,
        date: invoiceDateIso,
        party_id: customerType === 'party' ? partyId : null,
        is_walkin: customerType === 'walkin',
        party: partyInfo,
        sr_id: uid,
        items: items.map((item) => ({
          company_id: item.companyId,
          product_id: item.productId,
          product_name: item.productName,
          qty: item.qty,
          price: item.price,
          commission_percent: item.commissionPercent,
          cost_price: costByLocalId[item.localId] ?? 0,
        })),
        subtotal,
        commission: {
          base_amount: Math.round(baseCommission),
          extra: extraEnabled ? { type: extraType, value: Number(extraValue) || 0 } : null,
          extra_amount: Math.round(extraAmount),
          total: Math.round(totalCommission),
        },
        collected_by: uid,
        status: paymentStatus,
      };

      // ধাপ ৩: ইনভয়েস সংরক্ষণ
      await set(ref(database, `invoices/${invoiceId}`), invoiceData);

      // ধাপ ৪: স্টক আউটওয়ার্ড
      for (const item of items) {
        await recordStockMovement({
          companyId: item.companyId,
          productId: item.productId,
          type: 'outward',
          qty: item.qty,
          reason: `ইনভয়েস ${invoiceNo}`,
          recordedBy: uid,
          refId: invoiceId,
        });
      }

      // ধাপ ৫: পার্টির খাতা আপডেট (শুধু রেজিস্টার্ড পার্টির ক্ষেত্রে —
      // খুচরা/Walk-in বিক্রয়ে কোনো পার্টি রেকর্ড নেই, তাই স্কিপ হবে)
      if (customerType === 'party') {
        const newTotalPurchase = (selectedParty.total_purchase || 0) + netAmount;
        const paidNow = paymentStatus === 'paid' ? netAmount : 0;
        const newTotalPaid = (selectedParty.total_paid || 0) + paidNow;
        const newBalance = newTotalPurchase - newTotalPaid;

        await update(ref(database, `parties/${partyId}`), {
          total_purchase: newTotalPurchase,
          total_paid: newTotalPaid,
          balance: newBalance,
        });

        // ইনভয়েসের সাথে সাথেই পুরো টাকা পাওয়া গেলে সেটাও কালেকশন হিস্ট্রিতে
        // রাখা হচ্ছে — নাহলে "আজকের কালেকশন" ড্যাশবোর্ডে এই টাকা ধরা পড়ত না
        if (paidNow > 0) {
          const paymentRef = push(ref(database, `parties/${partyId}/payments`));
          await set(paymentRef, {
            amount: paidNow,
            method: 'cash',
            note: `ইনভয়েস ${invoiceNo}`,
            date: invoiceDateIso,
          });
        }
      }

      // ধাপ ৬: নগদ পরিশোধ হলে ঠালি খাতায় অটো আয় যোগ করা
      // (entry এর ID টা ইনভয়েসেও রেখে দিচ্ছি, যাতে পরে ইনভয়েস ডিলিট হলে
      // ঠিক এই আয়ের এন্ট্রিটাই খুঁজে বাতিল করা যায়)
      let ledgerEntryId = null;
      if (paymentStatus === 'paid') {
        const ledgerRef = push(ref(database, 'ledger'));
        await set(ledgerRef, {
          type: 'income',
          category: 'বিক্রয়',
          amount: netAmount,
          note: `ইনভয়েস ${invoiceNo} — ${customerName}`,
          date: invoiceDateIso,
          auto_generated: true,
        });
        ledgerEntryId = ledgerRef.key;
        await update(ref(database, `invoices/${invoiceId}`), {
          ledger_entry_id: ledgerEntryId,
        });
      }

      setSuccess(`ইনভয়েস ${invoiceNo} সফলভাবে সংরক্ষণ হয়েছে`);
      await logActivity({
        userId: uid,
        action: 'ইনভয়েস তৈরি',
        target: `${invoiceNo} — ${customerName} — ৳${netAmount}`,
      });
      resetForm();

      // সংরক্ষণ হওয়ার সাথে সাথেই এই ইনভয়েসটা প্রিন্ট ভিউতে দেখানোর জন্য parent কে জানানো
      if (onSaved) {
        onSaved({ id: invoiceId, ...invoiceData, ledger_entry_id: ledgerEntryId });
      }
    } catch (err) {
      setError(err.message || 'ইনভয়েস সংরক্ষণ করা যায়নি');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* ক্রেতার তথ্য */}
      <div
        className="bg-background-card dark:bg-dark-card rounded-2xl shadow-sm
                   border border-border dark:border-dark-border p-5"
      >
        <h2 className="flex items-center gap-2 text-base font-semibold text-text-primary dark:text-dark-text-primary mb-4">
          <User size={18} className="text-primary" />
          ক্রেতার তথ্য
        </h2>

        {presetParty ? (
          <div className="rounded-xl bg-background dark:bg-dark-background px-3 py-2.5 mb-2">
            <p className="text-sm font-medium text-text-primary dark:text-dark-text-primary">
              {presetParty.name} {presetParty.business_name ? `(${presetParty.business_name})` : ''}
            </p>
            {presetParty.phone && (
              <p className="text-xs text-text-secondary dark:text-dark-text-secondary">
                {presetParty.phone}
              </p>
            )}
            <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-1">
              বর্তমান বাকি: <span className="font-medium text-danger">৳{presetParty.balance || 0}</span>
            </p>
          </div>
        ) : (
          <>
            {/* পার্টি / খুচরা টগল */}
            <div
              className="flex gap-1 p-1 rounded-xl bg-background dark:bg-dark-background
                         border border-border dark:border-dark-border mb-4 w-fit"
            >
              <button
                type="button"
                onClick={() => setCustomerType('party')}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors
                  ${
                    customerType === 'party'
                      ? 'bg-gradient-to-r from-primary to-primary-light text-white shadow-sm'
                      : 'text-text-secondary dark:text-dark-text-secondary'
                  }`}
              >
                <User size={15} />
                পার্টি
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomerType('walkin');
                  setPaymentStatus('paid');
                }}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors
                  ${
                    customerType === 'walkin'
                      ? 'bg-gradient-to-r from-primary to-primary-light text-white shadow-sm'
                      : 'text-text-secondary dark:text-dark-text-secondary'
                  }`}
              >
                <ShoppingBag size={15} />
                খুচরা বিক্রয়
              </button>
            </div>

            {customerType === 'party' ? (
              <>
                <PartySelector value={partyId} onChange={handlePartyChange} />
                {selectedParty && (
                  <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-2">
                    বর্তমান বাকি:{' '}
                    <span className="font-medium text-danger">৳{selectedParty.balance || 0}</span>
                  </p>
                )}
              </>
            ) : (
          <div className="flex flex-col gap-3">
            <input
              type="text"
              value={walkinCustomer.name}
              onChange={(e) => setWalkinCustomer((p) => ({ ...p, name: e.target.value }))}
              placeholder="ক্রেতার নাম *"
              className="w-full rounded-xl border border-border dark:border-dark-border
                         bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                         px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-text-muted"
            />
            <input
              type="text"
              value={walkinCustomer.phone}
              onChange={(e) => setWalkinCustomer((p) => ({ ...p, phone: e.target.value }))}
              placeholder="মোবাইল নম্বর (ঐচ্ছিক)"
              className="w-full rounded-xl border border-border dark:border-dark-border
                         bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                         px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-text-muted"
            />
            <input
              type="text"
              value={walkinCustomer.address}
              onChange={(e) => setWalkinCustomer((p) => ({ ...p, address: e.target.value }))}
              placeholder="ঠিকানা (ঐচ্ছিক)"
              className="w-full rounded-xl border border-border dark:border-dark-border
                         bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                         px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-text-muted"
            />
            <p className="text-[11px] text-text-muted dark:text-dark-text-secondary">
              💡 খুচরা বিক্রয়ে কোনো স্থায়ী পার্টি রেকর্ড তৈরি হয় না, তাই এটা সবসময়
              "নগদ পরিশোধ" হিসেবেই সংরক্ষণ হবে।
            </p>
          </div>
            )}
          </>
        )}
      </div>

      {/* ইনভয়েসের তারিখ */}
      <div
        className="bg-background-card dark:bg-dark-card rounded-2xl shadow-sm
                   border border-border dark:border-dark-border p-5"
      >
        <label className="block text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1.5">
          ইনভয়েসের তারিখ
        </label>
        <input
          type="date"
          value={invoiceDate}
          max={todayStr()}
          onChange={(e) => setInvoiceDate(e.target.value)}
          className="rounded-xl border border-border dark:border-dark-border
                     bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                     px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <p className="text-[11px] text-text-muted dark:text-dark-text-secondary mt-1.5">
          আগের কোনো তারিখের ইনভয়েস করতে চাইলে সেই তারিখ বেছে নিন
        </p>
      </div>

      {/* পণ্য যোগ করা */}
      <div
        className="bg-background-card dark:bg-dark-card rounded-2xl shadow-sm
                   border border-border dark:border-dark-border p-5"
      >
        <h2 className="flex items-center gap-2 text-base font-semibold text-text-primary dark:text-dark-text-primary mb-4">
          <Receipt size={18} className="text-primary" />
          পণ্য যোগ করুন
        </h2>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <CompanySelector
              value={stagingCompanyId}
              allowedCompanyIds={allowedCompanyIds}
              onChange={(id) => {
                setStagingCompanyId(id);
                setStagingProduct(null);
              }}
            />
            <ProductSelector
              companyId={stagingCompanyId}
              value={stagingProduct?.id || ''}
              onChange={handleProductPick}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1.5">
                পরিমাণ
              </label>
              <input
                type="number"
                value={stagingQty}
                onChange={(e) => setStagingQty(e.target.value)}
                placeholder="0"
                className="w-full rounded-xl border border-border dark:border-dark-border
                         bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                         px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1.5">
                মূল্য/একক (৳)
              </label>
              <input
                type="number"
                value={stagingPrice}
                onChange={(e) => setStagingPrice(e.target.value)}
                placeholder="0"
                className="w-full rounded-xl border border-border dark:border-dark-border
                         bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                         px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1.5">
                কমিশন (%)
              </label>
              <input
                type="number"
                value={stagingCommission}
                onChange={(e) => setStagingCommission(e.target.value)}
                placeholder="0"
                className="w-full rounded-xl border border-border dark:border-dark-border
                         bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                         px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={addItem}
            className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium
                       border border-primary text-primary hover:bg-primary/5 transition-colors w-fit px-4"
          >
            <Plus size={16} />
            তালিকায় যোগ করুন
          </button>
        </div>

        {items.length > 0 && (
          <div className="mt-4 overflow-x-auto rounded-xl border border-border dark:border-dark-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-background-sidebar dark:bg-dark-sidebar text-text-secondary dark:text-dark-text-secondary uppercase text-xs">
                  <th className="text-left px-3 py-2 font-medium">পণ্য</th>
                  <th className="text-right px-3 py-2 font-medium">পরিমাণ</th>
                  <th className="text-right px-3 py-2 font-medium">মূল্য</th>
                  <th className="text-right px-3 py-2 font-medium">মোট</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.localId}
                    className="border-t border-border dark:border-dark-border text-text-primary dark:text-dark-text-primary"
                  >
                    <td className="px-3 py-2">{item.productName}</td>
                    <td className="px-3 py-2 text-right">{item.qty}</td>
                    <td className="px-3 py-2 text-right">৳{item.price}</td>
                    <td className="px-3 py-2 text-right font-medium">৳{item.qty * item.price}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => removeItem(item.localId)}
                        aria-label="বাদ দিন"
                        className="p-1 rounded-lg text-danger hover:bg-danger/10"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* কমিশন ও সারসংক্ষেপ */}
      <div
        className="bg-background-card dark:bg-dark-card rounded-2xl shadow-sm
                   border border-border dark:border-dark-border p-5"
      >
        <h2 className="flex items-center gap-2 text-base font-semibold text-text-primary dark:text-dark-text-primary mb-4">
          <Percent size={18} className="text-primary" />
          কমিশন ও সারসংক্ষেপ
        </h2>

        <div className="flex items-center justify-between text-sm text-text-secondary dark:text-dark-text-secondary mb-2">
          <span>সাবটোটাল</span>
          <span className="font-medium text-text-primary dark:text-dark-text-primary">৳{subtotal}</span>
        </div>
        <div className="flex items-center justify-between text-sm text-text-secondary dark:text-dark-text-secondary mb-3">
          <span>কোম্পানির নির্ধারিত কমিশন</span>
          <span>৳{Math.round(baseCommission)}</span>
        </div>

        <label className="flex items-center gap-2 text-sm text-text-primary dark:text-dark-text-primary mb-3 cursor-pointer">
          <input
            type="checkbox"
            checked={extraEnabled}
            onChange={(e) => setExtraEnabled(e.target.checked)}
            className="rounded accent-primary"
          />
          + অতিরিক্ত কমিশন যোগ করুন
        </label>

        {extraEnabled && (
          <div className="grid grid-cols-2 gap-3 mb-3">
            <select
              value={extraType}
              onChange={(e) => setExtraType(e.target.value)}
              className="rounded-xl border border-border dark:border-dark-border
                         bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                         px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="percent">শতাংশ (%)</option>
              <option value="fixed">নির্দিষ্ট টাকা</option>
            </select>
            <input
              type="number"
              value={extraValue}
              onChange={(e) => setExtraValue(e.target.value)}
              placeholder={extraType === 'percent' ? 'যেমন: 2' : 'যেমন: 2000'}
              className="rounded-xl border border-border dark:border-dark-border
                         bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                         px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-text-muted"
            />
          </div>
        )}

        <div className="flex items-center justify-between text-sm font-semibold text-text-primary dark:text-dark-text-primary pt-3 border-t border-border dark:border-dark-border">
          <span>মোট কমিশন</span>
          <span className="text-primary">৳{Math.round(totalCommission)}</span>
        </div>

        {customerType === 'party' && (
          <div className="mt-4">
            <label className="block text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1.5">
              পেমেন্ট স্ট্যাটাস
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPaymentStatus('due')}
                className={`flex-1 rounded-xl py-2 text-sm font-medium transition-colors
                  ${
                    paymentStatus === 'due'
                      ? 'bg-warning/10 text-warning border border-warning'
                      : 'border border-border dark:border-dark-border text-text-secondary dark:text-dark-text-secondary'
                  }`}
              >
                বাকি (Due)
              </button>
              <button
                type="button"
                onClick={() => setPaymentStatus('paid')}
                className={`flex-1 rounded-xl py-2 text-sm font-medium transition-colors
                  ${
                    paymentStatus === 'paid'
                      ? 'bg-success/10 text-success border border-success'
                      : 'border border-border dark:border-dark-border text-text-secondary dark:text-dark-text-secondary'
                  }`}
              >
                নগদ পরিশোধ
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className="flex items-center gap-2 text-xs text-danger bg-danger/10 rounded-lg px-3 py-2 mt-4">
            <AlertCircle size={14} />
            {error}
          </p>
        )}
        {success && (
          <p className="flex items-center gap-2 text-xs text-success bg-success/10 rounded-lg px-3 py-2 mt-4">
            <CheckCircle2 size={14} />
            {success}
          </p>
        )}

        <button
          type="button"
          onClick={handleSaveInvoice}
          disabled={saving}
          className="mt-4 w-full rounded-xl py-3 text-sm font-semibold text-white
                     bg-gradient-to-r from-primary to-primary-light
                     hover:from-primary-dark hover:to-primary transition-colors disabled:opacity-60"
        >
          {saving ? 'সংরক্ষণ হচ্ছে...' : 'ইনভয়েস সংরক্ষণ করুন'}
        </button>
      </div>
    </div>
  );
              }

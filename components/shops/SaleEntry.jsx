'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ref, push, update } from 'firebase/database';
import { database } from '@/lib/firebase';
import { money, todayStr } from '@/lib/format';
import { num } from '@/lib/shopUtils';
import {
  Camera,
  Search,
  Plus,
  Minus,
  Trash2,
  PenLine,
  AlertCircle,
  CheckCircle2,
  UserRound,
} from 'lucide-react';
import { useSalesmanProfile } from './useSalesmanProfile';
import { useOwnKhata, useShopProducts } from './useShopData';
import BarcodeScanner from './BarcodeScanner';
import { cardCls, inputCls, btnPrimary, btnGhost, labelCls, mutedCls } from './ui';

// স্ক্যানারের কোড ও সংরক্ষিত বারকোডের UPC/EAN এর শূন্য-পার্থক্য সামলাতে
function findByBarcode(products, code) {
  const c = String(code).trim();
  const candidates = [c];
  if (c.length === 12) candidates.push(`0${c}`);
  if (c.length === 13 && c.startsWith('0')) candidates.push(c.slice(1));
  return products.find((p) => candidates.includes(String(p.barcode)));
}

export default function SaleEntry() {
  const searchParams = useSearchParams();
  const { uid, profile, shopId, shop, loading: profileLoading } = useSalesmanProfile();
  const { products } = useShopProducts(shopId);
  const { parties } = useOwnKhata(shopId, uid);

  const [items, setItems] = useState([]);
  const [showScanner, setShowScanner] = useState(false);
  const [search, setSearch] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [manual, setManual] = useState({ name: '', qty: '1', price: '' });

  const [customerMode, setCustomerMode] = useState('walkin'); // 'walkin' | 'party'
  const [partyId, setPartyId] = useState('');
  const [newParty, setNewParty] = useState(false);
  const [newPartyForm, setNewPartyForm] = useState({ name: '', phone: '' });

  const [discount, setDiscount] = useState('');
  const [paid, setPaid] = useState('');
  const [note, setNote] = useState('');

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(null);

  // হোম থেকে "স্ক্যান করে বিক্রি" চাপলে সরাসরি ক্যামেরা খুলবে
  useEffect(() => {
    if (searchParams.get('scan') === '1') setShowScanner(true);
  }, [searchParams]);

  // ---------- কার্ট ----------
  const addProduct = (p) => {
    setItems((prev) => {
      const idx = prev.findIndex((it) => it.productId === p.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], qty: String(num(copy[idx].qty) + 1) };
        return copy;
      }
      return [
        ...prev,
        {
          key: `${Date.now()}-${Math.random()}`,
          productId: p.id,
          barcode: p.barcode || '',
          name: p.name,
          qty: '1',
          price: p.price != null ? String(p.price) : '',
          manual: false,
        },
      ];
    });
  };

  const handleScan = (code) => {
    const p = findByBarcode(products, code);
    if (p) {
      addProduct(p);
      return `✓ ${p.name} যোগ হয়েছে`;
    }
    return `✗ "${code}" তালিকায় নেই — ম্যানুয়ালি যোগ করুন`;
  };

  const addManual = () => {
    setError('');
    if (!manual.name.trim()) return setError('পণ্যের নাম লিখুন');
    if (!(num(manual.qty) > 0)) return setError('সঠিক পরিমাণ দিন');
    if (manual.price === '' || num(manual.price) < 0) return setError('সঠিক মূল্য দিন');
    setItems((prev) => [
      ...prev,
      {
        key: `${Date.now()}-${Math.random()}`,
        productId: null,
        barcode: '',
        name: manual.name.trim(),
        qty: String(manual.qty),
        price: String(manual.price),
        manual: true,
      },
    ]);
    setManual({ name: '', qty: '1', price: '' });
    setShowManual(false);
  };

  const updateItem = (key, field, value) =>
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, [field]: value } : it)));
  const removeItem = (key) => setItems((prev) => prev.filter((it) => it.key !== key));
  const changeQty = (key, delta) =>
    setItems((prev) =>
      prev.map((it) =>
        it.key === key ? { ...it, qty: String(Math.max(1, num(it.qty) + delta)) } : it
      )
    );

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p) => (p.name || '').toLowerCase().includes(q) || String(p.barcode || '').includes(q))
      .slice(0, 8);
  }, [products, search]);

  // ---------- হিসাব ----------
  const subtotal = items.reduce((s, it) => s + num(it.qty) * num(it.price), 0);
  const discountAmt = Math.min(Math.max(0, num(discount)), subtotal);
  const total = Math.max(0, subtotal - discountAmt);
  const paidAmt = paid === '' ? total : Math.min(Math.max(0, num(paid)), total);
  const due = Math.max(0, total - paidAmt);

  const resetAll = () => {
    setItems([]);
    setDiscount('');
    setPaid('');
    setNote('');
    setCustomerMode('walkin');
    setPartyId('');
    setNewParty(false);
    setNewPartyForm({ name: '', phone: '' });
    setSearch('');
    setError('');
  };

  // ---------- সেভ ----------
  const handleSubmit = async () => {
    setError('');
    if (!shopId || !uid) return setError('আপনার দোকান ঠিক করা নেই, অ্যাডমিনের সাথে যোগাযোগ করুন');
    if (items.length === 0) return setError('কমপক্ষে একটা পণ্য যোগ করুন');
    for (const it of items) {
      if (!(num(it.qty) > 0)) return setError(`"${it.name}" এর পরিমাণ সঠিক নয়`);
      if (it.price === '' || num(it.price) < 0) return setError(`"${it.name}" এর মূল্য লিখুন`);
    }
    if (paid !== '' && (isNaN(paid) || num(paid) < 0)) return setError('নগদ টাকার পরিমাণ সঠিক নয়');

    const needParty = customerMode === 'party' || due > 0;
    if (needParty && customerMode !== 'party') {
      return setError('বাকি রাখতে হলে "পার্টি (খাতা)" নির্বাচন করুন');
    }
    if (customerMode === 'party' && !newParty && !partyId) return setError('পার্টি নির্বাচন করুন');
    if (customerMode === 'party' && newParty && !newPartyForm.name.trim()) return setError('নতুন পার্টির নাম দিন');

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const today = todayStr();
      const updates = {};
      const khataBase = `shop_khata/${shopId}/${uid}`;

      let pId = '';
      let pName = '';
      let pPhone = '';
      if (customerMode === 'party') {
        if (newParty) {
          pId = push(ref(database, `${khataBase}/parties`)).key;
          pName = newPartyForm.name.trim();
          pPhone = newPartyForm.phone.trim();
          updates[`${khataBase}/parties/${pId}`] = { name: pName, phone: pPhone, created_at: now };
        } else {
          const p = parties.find((x) => x.id === partyId);
          pId = partyId;
          pName = p?.name || '';
          pPhone = p?.phone || '';
        }
      }

      const saleId = push(ref(database, `shop_sales/${shopId}/${uid}`)).key;
      let entryId = '';
      if (due > 0) {
        entryId = push(ref(database, `${khataBase}/entries`)).key;
        updates[`${khataBase}/entries/${entryId}`] = {
          party_id: pId,
          type: 'sale_due',
          amount: due,
          sale_id: saleId,
          date: today,
          note: '',
          created_at: now,
        };
      }

      updates[`shop_sales/${shopId}/${uid}/${saleId}`] = {
        created_at: now,
        date: today,
        shop_id: shopId,
        salesman_id: uid,
        salesman_name: profile?.name || '',
        items: items.map((it) => ({
          product_id: it.productId || '',
          barcode: it.barcode || '',
          name: it.name,
          qty: num(it.qty),
          price: num(it.price),
          line_total: num(it.qty) * num(it.price),
          manual: !!it.manual,
        })),
        subtotal,
        discount: discountAmt,
        total,
        paid: paidAmt,
        due,
        party_id: pId,
        party_name: pName,
        party_phone: pPhone,
        khata_entry_id: entryId,
        note: note.trim(),
      };

      // সেল + খাতার এন্ট্রি একসাথে (সবকিছু সেভ হবে, নয়তো কিছুই না)
      await update(ref(database), updates);

      setDone({ total, paid: paidAmt, due, party: pName });
      resetAll();
    } catch (err) {
      console.error(err);
      setError(
        err?.code === 'PERMISSION_DENIED' || /permission/i.test(err?.message || '')
          ? 'সেভ করার অনুমতি নেই — অ্যাডমিনকে জানান (ডাটাবেস রুলস ঠিক আছে কিনা দেখতে হবে)'
          : 'সেভ করা যায়নি, ইন্টারনেট দেখে আবার চেষ্টা করুন'
      );
    } finally {
      setSaving(false);
    }
  };

  if (profileLoading) return <p className={`text-sm ${mutedCls}`}>লোড হচ্ছে...</p>;
  if (!shopId) {
    return (
      <p className="text-sm text-danger bg-danger/10 rounded-xl px-4 py-3">
        আপনার একাউন্টে কোনো দোকান ঠিক করা নেই। অ্যাডমিনের সাথে যোগাযোগ করুন।
      </p>
    );
  }

  // ---------- সফল হওয়ার পর ----------
  if (done) {
    return (
      <div className={`${cardCls} max-w-md mx-auto flex flex-col items-center gap-3 text-center`}>
        <CheckCircle2 size={44} className="text-success" />
        <p className="text-base font-semibold text-text-primary dark:text-dark-text-primary">বিক্রয় সেভ হয়েছে</p>
        <p className="text-2xl font-bold text-text-primary dark:text-dark-text-primary">৳{money(done.total)}</p>
        <p className="text-xs text-text-secondary dark:text-dark-text-secondary">
          নগদ ৳{money(done.paid)}
          {done.due > 0 && ` • বাকি ৳${money(done.due)} (${done.party} এর খাতায় তোলা হয়েছে)`}
        </p>
        <div className="flex gap-2 w-full mt-2">
          <button type="button" onClick={() => { setDone(null); setShowScanner(true); }} className={`${btnPrimary} flex-1 flex items-center justify-center gap-2`}>
            <Camera size={16} />
            স্ক্যান করে নতুন বিক্রি
          </button>
        </div>
        <div className="flex gap-2 w-full">
          <button type="button" onClick={() => setDone(null)} className={`${btnGhost} flex-1`}>
            ম্যানুয়াল বিক্রি
          </button>
          <Link href="/shop/dashboard" className={`${btnGhost} flex-1 text-center`}>
            হোম
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 max-w-2xl mx-auto w-full">
      <div>
        <h1 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary">নতুন বিক্রি</h1>
        <p className="text-sm text-text-secondary dark:text-dark-text-secondary">{shop?.name}</p>
      </div>

      {/* স্ক্যান বাটন */}
      <button
        type="button"
        onClick={() => setShowScanner(true)}
        className="flex items-center justify-center gap-3 rounded-2xl py-4 text-base font-semibold text-white bg-gradient-to-r from-primary to-primary-light shadow-sm"
      >
        <Camera size={22} />
        ক্যামেরা দিয়ে স্ক্যান করুন
      </button>

      {/* ম্যানুয়াল খোঁজা */}
      <div className={`${cardCls} !p-3 flex flex-col gap-2`}>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="পণ্যের নাম বা বারকোড লিখে খুঁজুন"
            className={`${inputCls} pl-9`}
          />
        </div>
        {search.trim() && (
          <div className="flex flex-col">
            {searchResults.length === 0 ? (
              <p className={`text-xs px-1 py-2 ${mutedCls}`}>তালিকায় পাওয়া যায়নি — নিচের "তালিকার বাইরের পণ্য" দিয়ে যোগ করুন</p>
            ) : (
              searchResults.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    addProduct(p);
                    setSearch('');
                  }}
                  className="flex items-center justify-between gap-2 px-2 py-2 rounded-lg text-left hover:bg-background dark:hover:bg-dark-background"
                >
                  <span className="text-sm text-text-primary dark:text-dark-text-primary truncate">{p.name}</span>
                  <span className={`text-xs shrink-0 ${mutedCls}`}>{p.price != null ? `৳${money(p.price)}` : ''}</span>
                </button>
              ))
            )}
          </div>
        )}
        <button
          type="button"
          onClick={() => setShowManual((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-medium text-primary w-fit"
        >
          <PenLine size={13} />
          তালিকার বাইরের পণ্য (নাম ও দাম নিজে লিখুন)
        </button>
        {showManual && (
          <div className="grid grid-cols-6 gap-2">
            <input type="text" value={manual.name} onChange={(e) => setManual((m) => ({ ...m, name: e.target.value }))} placeholder="পণ্যের নাম" className={`${inputCls} col-span-6`} />
            <input type="number" inputMode="decimal" value={manual.qty} onChange={(e) => setManual((m) => ({ ...m, qty: e.target.value }))} placeholder="পরিমাণ" className={`${inputCls} col-span-2`} />
            <input type="number" inputMode="decimal" value={manual.price} onChange={(e) => setManual((m) => ({ ...m, price: e.target.value }))} placeholder="দাম ৳" className={`${inputCls} col-span-2`} />
            <button type="button" onClick={addManual} className={`${btnPrimary} col-span-2 !px-2`}>
              যোগ
            </button>
          </div>
        )}
      </div>

      {/* কার্ট */}
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">
          বিক্রির তালিকা ({items.length})
        </h2>
        {items.length === 0 ? (
          <p className={`text-sm ${mutedCls}`}>এখনো কোনো পণ্য যোগ হয়নি — স্ক্যান করুন বা খুঁজে যোগ করুন</p>
        ) : (
          items.map((it) => (
            <div key={it.key} className={`${cardCls} !p-3 flex flex-col gap-2`}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-text-primary dark:text-dark-text-primary">
                  {it.name}
                  {it.manual && <span className={`ml-1 text-[11px] ${mutedCls}`}>(ম্যানুয়াল)</span>}
                </p>
                <button type="button" onClick={() => removeItem(it.key)} aria-label="সরান" className="p-1 text-danger">
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-xl border border-border dark:border-dark-border">
                  <button type="button" onClick={() => changeQty(it.key, -1)} className="p-2.5 text-text-secondary" aria-label="কমান">
                    <Minus size={14} />
                  </button>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={it.qty}
                    onChange={(e) => updateItem(it.key, 'qty', e.target.value)}
                    className="w-14 text-center bg-transparent text-sm text-text-primary dark:text-dark-text-primary focus:outline-none"
                  />
                  <button type="button" onClick={() => changeQty(it.key, 1)} className="p-2.5 text-text-secondary" aria-label="বাড়ান">
                    <Plus size={14} />
                  </button>
                </div>
                <span className={`text-xs ${mutedCls}`}>×</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={it.price}
                  onChange={(e) => updateItem(it.key, 'price', e.target.value)}
                  placeholder="দাম ৳"
                  className={`${inputCls} !w-28 ${it.price === '' ? '!border-danger' : ''}`}
                />
                <span className="ml-auto text-sm font-semibold text-text-primary dark:text-dark-text-primary">
                  ৳{money(num(it.qty) * num(it.price))}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ক্রেতা */}
      <div className={`${cardCls} flex flex-col gap-3`}>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: 'walkin', label: 'নগদ ক্রেতা' },
            { id: 'party', label: 'পার্টি (খাতা)' },
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setCustomerMode(m.id)}
              className={`rounded-xl py-2.5 text-sm font-medium ${
                customerMode === m.id
                  ? 'bg-gradient-to-r from-primary to-primary-light text-white'
                  : 'border border-border dark:border-dark-border text-text-secondary dark:text-dark-text-secondary'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {customerMode === 'party' && (
          <div className="flex flex-col gap-2">
            {!newParty ? (
              <>
                <select value={partyId} onChange={(e) => setPartyId(e.target.value)} className={inputCls}>
                  <option value="">— পার্টি নির্বাচন করুন —</option>
                  {parties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.phone ? ` (${p.phone})` : ''}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={() => setNewParty(true)} className="text-xs font-medium text-primary w-fit flex items-center gap-1">
                  <UserRound size={13} />
                  নতুন পার্টি যোগ করুন
                </button>
              </>
            ) : (
              <>
                <input type="text" value={newPartyForm.name} onChange={(e) => setNewPartyForm((f) => ({ ...f, name: e.target.value }))} placeholder="নতুন পার্টির নাম *" className={inputCls} />
                <input type="text" value={newPartyForm.phone} onChange={(e) => setNewPartyForm((f) => ({ ...f, phone: e.target.value }))} placeholder="মোবাইল নম্বর" className={inputCls} />
                <button type="button" onClick={() => setNewParty(false)} className="text-xs font-medium text-text-secondary w-fit">
                  ← আগের পার্টি থেকে বাছুন
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* টাকার হিসাব */}
      <div className={`${cardCls} flex flex-col gap-3`}>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>ছাড় (৳)</label>
            <input type="number" inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>নগদ পেয়েছি (৳)</label>
            <input type="number" inputMode="decimal" value={paid} onChange={(e) => setPaid(e.target.value)} placeholder={String(total)} className={inputCls} />
          </div>
        </div>
        <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="নোট (ঐচ্ছিক)" className={inputCls} />

        <div className="rounded-xl bg-background dark:bg-dark-background p-3 flex flex-col gap-1 text-sm">
          <div className="flex justify-between text-text-secondary dark:text-dark-text-secondary">
            <span>মোট দাম</span>
            <span>৳{money(subtotal)}</span>
          </div>
          {discountAmt > 0 && (
            <div className="flex justify-between text-text-secondary dark:text-dark-text-secondary">
              <span>ছাড়</span>
              <span>− ৳{money(discountAmt)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-text-primary dark:text-dark-text-primary text-base">
            <span>সর্বমোট</span>
            <span>৳{money(total)}</span>
          </div>
          <div className="flex justify-between text-text-secondary dark:text-dark-text-secondary">
            <span>নগদ</span>
            <span>৳{money(paidAmt)}</span>
          </div>
          {due > 0 && (
            <div className="flex justify-between font-semibold text-danger">
              <span>বাকি (খাতায় উঠবে)</span>
              <span>৳{money(due)}</span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <p className="flex items-center gap-2 text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">
          <AlertCircle size={14} />
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={saving || items.length === 0}
        className={`${btnPrimary} !py-3.5 text-base`}
      >
        {saving ? 'সেভ হচ্ছে...' : `বিক্রয় সেভ করুন — ৳${money(total)}`}
      </button>

      {showScanner && <BarcodeScanner onDetect={handleScan} onClose={() => setShowScanner(false)} />}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { ref, get, set, update, push } from 'firebase/database';
import { database, auth } from '@/lib/firebase';
import { getNextRetailSaleNumber } from '@/lib/retailUtils';
import { recordStockMovement, recordRetailStockMovement } from '@/lib/stockUtils';
import { logActivity } from '@/lib/activityLog';
import CompanySelector from '@/components/product/CompanySelector';
import ProductSelector from '@/components/stock/ProductSelector';
import RetailProductSelector from './RetailProductSelector';
import RetailCustomerSelector from './RetailCustomerSelector';
import {
  ShoppingCart,
  Plus,
  Trash2,
  Building2,
  ShoppingBag,
  PenLine,
  User,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export default function RetailSaleForm({ onSaved }) {
  const [customerMode, setCustomerMode] = useState('walkin'); // 'walkin' | 'customer'
  const [customerId, setCustomerId] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [walkinName, setWalkinName] = useState('');
  const [walkinPhone, setWalkinPhone] = useState('');

  const [items, setItems] = useState([]);
  const [itemSource, setItemSource] = useState('company'); // 'company' | 'retail' | 'manual'

  // কোম্পানি প্রোডাক্টের জন্য স্টেজিং
  const [stagingCompanyId, setStagingCompanyId] = useState('');
  const [stagingCompanyProduct, setStagingCompanyProduct] = useState(null);
  const [stagingCompanyQty, setStagingCompanyQty] = useState('');
  const [stagingCompanyPrice, setStagingCompanyPrice] = useState('');

  // খুচরা পণ্যের জন্য স্টেজিং
  const [stagingRetailProduct, setStagingRetailProduct] = useState(null);
  const [stagingRetailQty, setStagingRetailQty] = useState('');
  const [stagingRetailPrice, setStagingRetailPrice] = useState('');

  // ম্যানুয়াল এন্ট্রির জন্য স্টেজিং
  const [manualName, setManualName] = useState('');
  const [manualQty, setManualQty] = useState('');
  const [manualPrice, setManualPrice] = useState('');

  const [discount, setDiscount] = useState('');
  const [paidNow, setPaidNow] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const addCompanyItem = () => {
    setError('');
    if (!stagingCompanyId || !stagingCompanyProduct) {
      setError('কোম্পানি ও প্রোডাক্ট নির্বাচন করুন');
      return;
    }
    if (!stagingCompanyQty || isNaN(stagingCompanyQty) || Number(stagingCompanyQty) <= 0) {
      setError('সঠিক পরিমাণ দিন');
      return;
    }
    if (!stagingCompanyPrice || isNaN(stagingCompanyPrice) || Number(stagingCompanyPrice) < 0) {
      setError('সঠিক মূল্য দিন');
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        localId: `${Date.now()}-${Math.random()}`,
        source: 'company',
        companyId: stagingCompanyId,
        productId: stagingCompanyProduct.id,
        name: stagingCompanyProduct.name,
        qty: Number(stagingCompanyQty),
        price: Number(stagingCompanyPrice),
        costPrice: Number(stagingCompanyProduct.cost_price) || 0,
      },
    ]);
    setStagingCompanyProduct(null);
    setStagingCompanyQty('');
    setStagingCompanyPrice('');
  };

  const addRetailItem = () => {
    setError('');
    if (!stagingRetailProduct) {
      setError('খুচরা পণ্য নির্বাচন করুন');
      return;
    }
    if (!stagingRetailQty || isNaN(stagingRetailQty) || Number(stagingRetailQty) <= 0) {
      setError('সঠিক পরিমাণ দিন');
      return;
    }
    if (!stagingRetailPrice || isNaN(stagingRetailPrice) || Number(stagingRetailPrice) < 0) {
      setError('সঠিক মূল্য দিন');
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        localId: `${Date.now()}-${Math.random()}`,
        source: 'retail',
        productId: stagingRetailProduct.id,
        name: stagingRetailProduct.name,
        unit: stagingRetailProduct.unit || 'পিস',
        qty: Number(stagingRetailQty),
        price: Number(stagingRetailPrice),
        costPrice: Number(stagingRetailProduct.cost_price) || 0,
      },
    ]);
    setStagingRetailProduct(null);
    setStagingRetailQty('');
    setStagingRetailPrice('');
  };

  const addManualItem = () => {
    setError('');
    if (!manualName.trim()) {
      setError('পণ্যের নাম লিখুন');
      return;
    }
    if (!manualQty || isNaN(manualQty) || Number(manualQty) <= 0) {
      setError('সঠিক পরিমাণ দিন');
      return;
    }
    if (!manualPrice || isNaN(manualPrice) || Number(manualPrice) < 0) {
      setError('সঠিক মূল্য দিন');
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        localId: `${Date.now()}-${Math.random()}`,
        source: 'manual',
        name: manualName.trim(),
        qty: Number(manualQty),
        price: Number(manualPrice),
      },
    ]);
    setManualName('');
    setManualQty('');
    setManualPrice('');
  };

  const removeItem = (localId) => {
    setItems((prev) => prev.filter((item) => item.localId !== localId));
  };

  const subtotal = items.reduce((sum, item) => sum + item.qty * item.price, 0);
  const discountAmount = discount && !isNaN(discount) ? Number(discount) : 0;
  const total = Math.max(0, subtotal - discountAmount);

  const resetForm = () => {
    setCustomerMode('walkin');
    setCustomerId('');
    setSelectedCustomer(null);
    setWalkinName('');
    setWalkinPhone('');
    setItems([]);
    setDiscount('');
    setPaidNow('');
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    if (customerMode === 'customer' && (!customerId || !selectedCustomer)) {
      setError('কাস্টমার নির্বাচন করুন');
      return;
    }
    if (items.length === 0) {
      setError('কমপক্ষে একটা পণ্য যোগ করুন');
      return;
    }

    // walk-in বিক্রয়ে সবসময় পুরো টাকা এখনই ধরা হয় (বাকি রাখার সুযোগ নেই)
    const effectivePaidNow =
      customerMode === 'walkin'
        ? total
        : paidNow === ''
        ? 0
        : Math.min(Number(paidNow) || 0, total);

    if (customerMode === 'customer' && paidNow !== '' && (isNaN(paidNow) || Number(paidNow) < 0)) {
      setError('সঠিক পরিমাণ দিন');
      return;
    }

    setSaving(true);
    try {
      // ধাপ ১: স্টক যাচাই (ম্যানুয়াল আইটেম বাদে)
      for (const item of items) {
        if (item.source === 'company') {
          const snap = await get(
            ref(database, `companies/${item.companyId}/products/${item.productId}`)
          );
          const currentStock = snap.exists() ? Number(snap.val().stock_qty) || 0 : 0;
          if (currentStock < item.qty) {
            throw new Error(`"${item.name}" এর পর্যাপ্ত স্টক নেই (আছে: ${currentStock}, দরকার: ${item.qty})`);
          }
        } else if (item.source === 'retail') {
          const snap = await get(ref(database, `retail_products/${item.productId}`));
          const currentStock = snap.exists() ? Number(snap.val().stock_qty) || 0 : 0;
          if (currentStock < item.qty) {
            throw new Error(`"${item.name}" এর পর্যাপ্ত স্টক নেই (আছে: ${currentStock}, দরকার: ${item.qty})`);
          }
        }
      }

      // ধাপ ২: বিক্রয় নম্বর
      const saleNo = await getNextRetailSaleNumber();
      const saleId = saleNo.replace(/-/g, '_');
      const uid = auth.currentUser?.uid || '';

      const customerName =
        customerMode === 'customer' ? selectedCustomer.name : walkinName.trim() || 'ক্যাশ কাস্টমার';
      const customerPhone = customerMode === 'customer' ? selectedCustomer.phone || '' : walkinPhone.trim();

      const due = total - effectivePaidNow;

      const saleData = {
        sale_no: saleNo,
        date: new Date().toISOString(),
        customer_id: customerMode === 'customer' ? customerId : null,
        customer_name: customerName,
        customer_phone: customerPhone,
        items: items.map((item) => ({
          source: item.source,
          company_id: item.companyId || null,
          product_id: item.productId || null,
          name: item.name,
          unit: item.unit || null,
          qty: item.qty,
          price: item.price,
          cost_price: item.costPrice ?? null,
          subtotal: item.qty * item.price,
        })),
        subtotal,
        discount: discountAmount,
        total,
        paid_amount: effectivePaidNow,
        due,
        status: due <= 0 ? 'paid' : 'due',
        recorded_by: uid,
      };

      // ধাপ ৩: বিক্রয় সংরক্ষণ
      await set(ref(database, `retail_sales/${saleId}`), saleData);

      // ধাপ ৪: স্টক আউটওয়ার্ড (কোম্পানি ও খুচরা পণ্যের জন্য)
      for (const item of items) {
        if (item.source === 'company') {
          await recordStockMovement({
            companyId: item.companyId,
            productId: item.productId,
            type: 'outward',
            qty: item.qty,
            reason: `খুচরা বিক্রয় ${saleNo}`,
            recordedBy: uid,
            refId: saleId,
          });
        } else if (item.source === 'retail') {
          await recordRetailStockMovement({
            productId: item.productId,
            type: 'outward',
            qty: item.qty,
            reason: `খুচরা বিক্রয় ${saleNo}`,
            recordedBy: uid,
            refId: saleId,
          });
        }
      }

      // ধাপ ৫: নির্দিষ্ট কাস্টমার হলে তার হিসাব আপডেট
      if (customerMode === 'customer') {
        const newTotalPurchase = (selectedCustomer.total_purchase || 0) + total;
        const newTotalPaid = (selectedCustomer.total_paid || 0) + effectivePaidNow;
        const newBalance = newTotalPurchase - newTotalPaid;

        await update(ref(database, `retail_customers/${customerId}`), {
          total_purchase: newTotalPurchase,
          total_paid: newTotalPaid,
          balance: newBalance,
        });

        if (effectivePaidNow > 0) {
          const paymentRef = push(ref(database, `retail_customers/${customerId}/payments`));
          await set(paymentRef, {
            amount: effectivePaidNow,
            method: 'cash',
            note: `খুচরা বিক্রয় ${saleNo}`,
            date: new Date().toISOString(),
          });
        }
      }

      // ধাপ ৬: টাকা পাওয়া গেলে ঠালি খাতায় অটো আয় যোগ করা
      let ledgerEntryId = null;
      if (effectivePaidNow > 0) {
        const ledgerRef = push(ref(database, 'ledger'));
        await set(ledgerRef, {
          type: 'income',
          category: 'খুচরা বিক্রয়',
          amount: effectivePaidNow,
          note: `খুচরা বিক্রয় ${saleNo} — ${customerName}`,
          date: new Date().toISOString(),
          auto_generated: true,
        });
        ledgerEntryId = ledgerRef.key;
        await update(ref(database, `retail_sales/${saleId}`), {
          ledger_entry_id: ledgerEntryId,
        });
      }

      setSuccess(`খুচরা বিক্রয় ${saleNo} সফলভাবে সংরক্ষণ হয়েছে`);
      await logActivity({
        userId: uid,
        action: 'খুচরা বিক্রয় তৈরি',
        target: `${saleNo} — ${customerName} — ৳${total}`,
      });
      resetForm();

      if (onSaved) {
        onSaved({ id: saleId, ...saleData, ledger_entry_id: ledgerEntryId });
      }
    } catch (err) {
      setError(err.message || 'বিক্রয় সংরক্ষণ করা যায়নি');
    } finally {
      setSaving(false);
    }
  };

  const SOURCE_TABS = [
    { key: 'company', label: 'কোম্পানির প্রোডাক্ট', icon: Building2 },
    { key: 'retail', label: 'খুচরা পণ্য', icon: ShoppingBag },
    { key: 'manual', label: 'নিজে লিখুন', icon: PenLine },
  ];

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

        <div className="flex gap-1 p-1 rounded-xl bg-background dark:bg-dark-background w-fit mb-3">
          <button
            type="button"
            onClick={() => setCustomerMode('walkin')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors
              ${customerMode === 'walkin' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary dark:text-dark-text-secondary'}`}
          >
            সরাসরি বিক্রয় (নগদ)
          </button>
          <button
            type="button"
            onClick={() => setCustomerMode('customer')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors
              ${customerMode === 'customer' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary dark:text-dark-text-secondary'}`}
          >
            নির্দিষ্ট কাস্টমার (বাকি ট্র্যাক)
          </button>
        </div>

        {customerMode === 'walkin' ? (
          <div className="flex flex-col gap-3">
            <input
              type="text"
              value={walkinName}
              onChange={(e) => setWalkinName(e.target.value)}
              placeholder="কাস্টমারের নাম (ঐচ্ছিক)"
              className="w-full rounded-xl border border-border dark:border-dark-border
                         bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                         px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-text-muted"
            />
            <input
              type="text"
              value={walkinPhone}
              onChange={(e) => setWalkinPhone(e.target.value)}
              placeholder="মোবাইল নম্বর (ঐচ্ছিক)"
              className="w-full rounded-xl border border-border dark:border-dark-border
                         bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                         px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-text-muted"
            />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <RetailCustomerSelector
              value={customerId}
              onChange={(id, customer) => {
                setCustomerId(id);
                setSelectedCustomer(customer);
              }}
            />
            {selectedCustomer && (
              <p className="text-xs text-text-secondary dark:text-dark-text-secondary px-1">
                বর্তমান বাকি:{' '}
                <span className="font-medium text-danger">৳{selectedCustomer.balance || 0}</span>
              </p>
            )}
          </div>
        )}
      </div>

      {/* পণ্য যোগ করুন */}
      <div
        className="bg-background-card dark:bg-dark-card rounded-2xl shadow-sm
                   border border-border dark:border-dark-border p-5"
      >
        <h2 className="flex items-center gap-2 text-base font-semibold text-text-primary dark:text-dark-text-primary mb-4">
          <ShoppingCart size={18} className="text-primary" />
          পণ্য যোগ করুন
        </h2>

        <div className="flex gap-1 p-1 rounded-xl bg-background dark:bg-dark-background w-fit mb-4 overflow-x-auto max-w-full">
          {SOURCE_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setItemSource(tab.key)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors
                  ${itemSource === tab.key ? 'bg-primary text-white shadow-sm' : 'text-text-secondary dark:text-dark-text-secondary'}`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {itemSource === 'company' && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CompanySelector
                value={stagingCompanyId}
                onChange={(id) => {
                  setStagingCompanyId(id);
                  setStagingCompanyProduct(null);
                }}
              />
              <ProductSelector
                companyId={stagingCompanyId}
                value={stagingCompanyProduct?.id || ''}
                onChange={(id, product) => {
                  setStagingCompanyProduct(product ? { id, ...product } : null);
                  if (product) setStagingCompanyPrice(String(product.mrp ?? ''));
                }}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <input
                type="number"
                value={stagingCompanyQty}
                onChange={(e) => setStagingCompanyQty(e.target.value)}
                placeholder="পরিমাণ"
                className="rounded-xl border border-border dark:border-dark-border
                           bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                           px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <input
                type="number"
                value={stagingCompanyPrice}
                onChange={(e) => setStagingCompanyPrice(e.target.value)}
                placeholder="মূল্য (৳)"
                className="rounded-xl border border-border dark:border-dark-border
                           bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                           px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                onClick={addCompanyItem}
                className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium text-white
                           bg-gradient-to-r from-primary to-primary-light"
              >
                <Plus size={16} />
                যোগ
              </button>
            </div>
          </div>
        )}

        {itemSource === 'retail' && (
          <div className="flex flex-col gap-3">
            <RetailProductSelector
              value={stagingRetailProduct?.id || ''}
              onChange={(id, product) => {
                setStagingRetailProduct(product ? { id, ...product } : null);
                if (product) setStagingRetailPrice(String(product.price ?? ''));
              }}
            />
            <div className="grid grid-cols-3 gap-3">
              <input
                type="number"
                step="0.01"
                value={stagingRetailQty}
                onChange={(e) => setStagingRetailQty(e.target.value)}
                placeholder={
                  stagingRetailProduct ? `পরিমাণ (${stagingRetailProduct.unit || 'পিস'})` : 'পরিমাণ'
                }
                className="rounded-xl border border-border dark:border-dark-border
                           bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                           px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <input
                type="number"
                value={stagingRetailPrice}
                onChange={(e) => setStagingRetailPrice(e.target.value)}
                placeholder="মূল্য (৳)"
                className="rounded-xl border border-border dark:border-dark-border
                           bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                           px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                onClick={addRetailItem}
                className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium text-white
                           bg-gradient-to-r from-primary to-primary-light"
              >
                <Plus size={16} />
                যোগ
              </button>
            </div>
          </div>
        )}

        {itemSource === 'manual' && (
          <div className="flex flex-col gap-3">
            <input
              type="text"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              placeholder="পণ্যের নাম লিখুন"
              className="w-full rounded-xl border border-border dark:border-dark-border
                         bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                         px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-text-muted"
            />
            <div className="grid grid-cols-3 gap-3">
              <input
                type="number"
                value={manualQty}
                onChange={(e) => setManualQty(e.target.value)}
                placeholder="পরিমাণ"
                className="rounded-xl border border-border dark:border-dark-border
                           bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                           px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <input
                type="number"
                value={manualPrice}
                onChange={(e) => setManualPrice(e.target.value)}
                placeholder="মূল্য (৳)"
                className="rounded-xl border border-border dark:border-dark-border
                           bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                           px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                onClick={addManualItem}
                className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium text-white
                           bg-gradient-to-r from-primary to-primary-light"
              >
                <Plus size={16} />
                যোগ
              </button>
            </div>
            <p className="text-xs text-text-muted dark:text-dark-text-secondary px-1">
              💡 এই পণ্যের কোনো স্টক ট্র্যাক হবে না, শুধু বিক্রয়ে যোগ হবে
            </p>
          </div>
        )}

        {/* যোগ করা আইটেমের লিস্ট */}
        {items.length > 0 && (
          <div className="flex flex-col gap-2 mt-4">
            {items.map((item) => (
              <div
                key={item.localId}
                className="flex items-center justify-between gap-2 bg-background dark:bg-dark-background
                           rounded-xl px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary dark:text-dark-text-primary truncate">
                    {item.name}
                    <span className="ml-1.5 text-[10px] font-normal text-text-muted">
                      (
                      {item.source === 'company'
                        ? 'কোম্পানি'
                        : item.source === 'retail'
                        ? 'খুচরা'
                        : 'ম্যানুয়াল'}
                      )
                    </span>
                  </p>
                  <p className="text-xs text-text-secondary dark:text-dark-text-secondary">
                    {item.qty}
                    {item.unit ? ` ${item.unit}` : ''} × ৳{item.price} = ৳{item.qty * item.price}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.localId)}
                  aria-label="মুছুন"
                  className="shrink-0 p-1.5 rounded-lg text-danger hover:bg-danger/10"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* সারসংক্ষেপ ও পেমেন্ট */}
      <div
        className="bg-background-card dark:bg-dark-card rounded-2xl shadow-sm
                   border border-border dark:border-dark-border p-5"
      >
        <h2 className="text-base font-semibold text-text-primary dark:text-dark-text-primary mb-4">
          সারসংক্ষেপ
        </h2>

        <div className="flex flex-col gap-2 text-sm mb-3">
          <div className="flex items-center justify-between text-text-secondary dark:text-dark-text-secondary">
            <span>সাবটোটাল</span>
            <span>৳{subtotal}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-text-secondary dark:text-dark-text-secondary">ছাড় (৳)</span>
            <input
              type="number"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              placeholder="0"
              className="w-28 rounded-lg border border-border dark:border-dark-border
                         bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                         px-2.5 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex items-center justify-between font-semibold text-text-primary dark:text-dark-text-primary border-t border-border dark:border-dark-border pt-2">
            <span>সর্বমোট</span>
            <span>৳{total}</span>
          </div>
        </div>

        {customerMode === 'customer' && (
          <div className="mb-3">
            <label className="block text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1.5">
              এখন কত টাকা পেলেন (বাকিটা কাস্টমারের হিসাবে বাকি হিসেবে থাকবে)
            </label>
            <input
              type="number"
              value={paidNow}
              onChange={(e) => setPaidNow(e.target.value)}
              placeholder="0 (কিছু না পেলে খালি রাখুন)"
              className="w-full rounded-xl border border-border dark:border-dark-border
                         bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                         px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-text-muted"
            />
          </div>
        )}

        {customerMode === 'walkin' && (
          <p className="text-xs text-text-muted dark:text-dark-text-secondary mb-3">
            💡 সরাসরি বিক্রয়ে পুরো টাকা (৳{total}) এখনই পাওয়া হিসেবে ধরা হবে
          </p>
        )}

        {error && (
          <p className="flex items-center gap-2 text-xs text-danger bg-danger/10 rounded-lg px-3 py-2 mb-3">
            <AlertCircle size={14} />
            {error}
          </p>
        )}
        {success && (
          <p className="flex items-center gap-2 text-xs text-success bg-success/10 rounded-lg px-3 py-2 mb-3">
            <CheckCircle2 size={14} />
            {success}
          </p>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="w-full rounded-xl py-3 text-sm font-semibold text-white
                     bg-gradient-to-r from-primary to-primary-light disabled:opacity-60"
        >
          {saving ? 'সংরক্ষণ হচ্ছে...' : 'বিক্রয় সংরক্ষণ করুন'}
        </button>
      </div>
    </div>
  );
  }

'use client';

import { useMemo, useState } from 'react';
import { ref, update } from 'firebase/database';
import { database, auth } from '@/lib/firebase';
import { logActivity } from '@/lib/activityLog';
import { money } from '@/lib/format';
import { AlertTriangle } from 'lucide-react';
import { useShopSales, useShopSalesmen } from './useShopData';
import SaleCard from './SaleCard';
import { cardCls, inputCls, btnPrimary, btnGhost, mutedCls } from './ui';

export default function ShopSalesList({ shopId }) {
  const { sales, loading } = useShopSales(shopId);
  const { salesmen } = useShopSalesmen(shopId);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [salesmanId, setSalesmanId] = useState('');
  const [limit, setLimit] = useState(50);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(
    () =>
      sales.filter(
        (s) =>
          (!from || s.date >= from) &&
          (!to || s.date <= to) &&
          (!salesmanId || s.salesman_id === salesmanId)
      ),
    [sales, from, to, salesmanId]
  );
  const total = filtered.reduce((sum, s) => sum + (Number(s.total) || 0), 0);

  // বাতিল করলে বিক্রয়ের সাথে খাতার বাকি এন্ট্রিটাও মুছে যায়
  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      const updates = {
        [`shop_sales/${shopId}/${toDelete.salesman_id}/${toDelete.id}`]: null,
      };
      if (toDelete.khata_entry_id) {
        updates[`shop_khata/${shopId}/${toDelete.salesman_id}/entries/${toDelete.khata_entry_id}`] = null;
      }
      await update(ref(database), updates);
      await logActivity({
        userId: auth.currentUser?.uid,
        action: 'দোকানের বিক্রয় বাতিল',
        target: `${toDelete.salesman_name || ''} — ৳${toDelete.total}`,
      });
      setToDelete(null);
    } catch (e) {
      alert('বাতিল করা যায়নি, আবার চেষ্টা করুন');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className={`${cardCls} grid grid-cols-1 sm:grid-cols-3 gap-3`}>
        <div>
          <label className="block text-xs text-text-secondary dark:text-dark-text-secondary mb-1">শুরুর তারিখ</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs text-text-secondary dark:text-dark-text-secondary mb-1">শেষ তারিখ</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs text-text-secondary dark:text-dark-text-secondary mb-1">সেলসম্যান</label>
          <select value={salesmanId} onChange={(e) => setSalesmanId(e.target.value)} className={inputCls}>
            <option value="">সবাই</option>
            {salesmen.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-sm text-text-primary dark:text-dark-text-primary">
        {filtered.length}টি বিক্রয় • মোট <span className="font-semibold">৳{money(total)}</span>
      </p>

      {loading ? (
        <p className={`text-sm ${mutedCls}`}>লোড হচ্ছে...</p>
      ) : filtered.length === 0 ? (
        <p className={`text-sm ${mutedCls}`}>কোনো বিক্রয় পাওয়া যায়নি</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.slice(0, limit).map((s) => (
            <SaleCard key={`${s.salesman_id}-${s.id}`} sale={s} showSalesman onDelete={setToDelete} />
          ))}
          {filtered.length > limit && (
            <button type="button" onClick={() => setLimit((l) => l + 50)} className={`${btnGhost} w-fit`}>
              আরও দেখুন
            </button>
          )}
        </div>
      )}

      {toDelete && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <div className={`${cardCls} max-w-sm w-full flex flex-col gap-3`}>
            <p className="flex items-center gap-2 text-sm font-semibold text-text-primary dark:text-dark-text-primary">
              <AlertTriangle size={18} className="text-danger" />
              বিক্রয় বাতিল করবেন?
            </p>
            <p className="text-xs text-text-secondary dark:text-dark-text-secondary">
              ৳{money(toDelete.total)} এর এই বিক্রয় স্থায়ীভাবে মুছে যাবে।
              {toDelete.due > 0 && ' এর সাথে খাতায় তোলা বাকিও মুছে যাবে।'}
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={confirmDelete} disabled={deleting} className={`${btnPrimary} flex-1 !from-danger !to-danger`}>
                {deleting ? 'বাতিল হচ্ছে...' : 'হ্যাঁ, বাতিল করুন'}
              </button>
              <button type="button" onClick={() => setToDelete(null)} className={btnGhost}>
                না
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

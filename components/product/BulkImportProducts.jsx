'use client';

import { useState } from 'react';
import { ref, update } from 'firebase/database';
import { database } from '@/lib/firebase';
import { UploadCloud, CheckCircle2, AlertCircle, FileJson } from 'lucide-react';

// একসাথে অনেকগুলো প্রোডাক্ট (JSON ফাইল থেকে) একটা কোম্পানির অধীনে যোগ করার টুল।
// প্রত্যাশিত ফরম্যাট: { "কোনো_আইডি": { name, cost_price, mrp, commission_percent,
// stock_qty, low_stock_threshold, warranty_months, ... }, ... }
// মূল আইডি (যেমন "laxfo0001") অপরিবর্তিত রেখেই Firebase-এ সেভ হয়।
export default function BulkImportProducts({ companyId, onImported }) {
  const [open, setOpen] = useState(false);
  const [rawText, setRawText] = useState('');
  const [parsed, setParsed] = useState(null); // পার্স হওয়া প্রোডাক্ট লিস্ট (প্রিভিউ)
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [importing, setImporting] = useState(false);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setSuccess('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      setRawText(ev.target.result);
      tryParse(ev.target.result);
    };
    reader.readAsText(file);
  };

  const tryParse = (text) => {
    setError('');
    setParsed(null);
    if (!text.trim()) return;
    try {
      const data = JSON.parse(text);
      if (typeof data !== 'object' || Array.isArray(data) || data === null) {
        setError('JSON ফরম্যাট ঠিক নেই — এটা { "আইডি": {...} } আকারে হতে হবে');
        return;
      }
      const entries = Object.entries(data);
      if (entries.length === 0) {
        setError('কোনো প্রোডাক্ট পাওয়া যায়নি');
        return;
      }
      // প্রতিটা এন্ট্রিতে অন্তত name ও mrp আছে কিনা যাচাই
      const invalid = entries.find(([, v]) => !v || !v.name || v.mrp === undefined);
      if (invalid) {
        setError(`"${invalid[0]}" এন্ট্রিতে name বা mrp নেই`);
        return;
      }
      setParsed(entries);
    } catch (err) {
      setError('JSON পড়া যায়নি — ফাইলটা ঠিকভাবে সম্পূর্ণ কিনা দেখুন');
    }
  };

  const handleImport = async () => {
    if (!companyId) {
      setError('আগে একটা কোম্পানি নির্বাচন করুন');
      return;
    }
    if (!parsed || parsed.length === 0) return;

    setImporting(true);
    setError('');
    try {
      const updates = {};
      parsed.forEach(([key, product]) => {
        updates[`companies/${companyId}/products/${key}`] = {
          name: product.name,
          cost_price: Number(product.cost_price) || 0,
          mrp: Number(product.mrp) || 0,
          commission_percent: Number(product.commission_percent) || 0,
          stock_qty: Number(product.stock_qty) || 0,
          low_stock_threshold: Number(product.low_stock_threshold) || 5,
          warranty_months: Number(product.warranty_months) || 0,
          ...(product.category ? { category: product.category } : {}),
          created_at: product.created_at || new Date().toISOString(),
        };
      });

      await update(ref(database), updates);

      setSuccess(`${parsed.length}টা প্রোডাক্ট সফলভাবে যোগ হয়েছে`);
      setParsed(null);
      setRawText('');
      if (onImported) onImported();
      setTimeout(() => setOpen(false), 1200);
    } catch (err) {
      setError('ইম্পোর্ট করা যায়নি, আবার চেষ্টা করুন');
    } finally {
      setImporting(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium
                   border border-border dark:border-dark-border
                   text-text-secondary dark:text-dark-text-secondary hover:border-primary"
      >
        <UploadCloud size={16} />
        একসাথে অনেক প্রোডাক্ট যোগ করুন (JSON)
      </button>
    );
  }

  return (
    <div
      className="bg-background-card dark:bg-dark-card rounded-2xl shadow-sm
                 border border-border dark:border-dark-border p-5 max-w-lg"
    >
      <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary dark:text-dark-text-primary mb-1">
        <FileJson size={16} />
        বাল্ক প্রোডাক্ট ইম্পোর্ট
      </h3>
      <p className="text-xs text-text-muted dark:text-dark-text-secondary mb-4">
        একটা JSON ফাইল আপলোড করুন — সব প্রোডাক্ট একসাথে বর্তমান নির্বাচিত কোম্পানিতে যোগ হবে
      </p>

      {!companyId && (
        <p className="flex items-center gap-2 text-xs text-danger bg-danger/10 rounded-lg px-3 py-2 mb-3">
          <AlertCircle size={14} />
          আগে উপর থেকে একটা কোম্পানি নির্বাচন করুন
        </p>
      )}

      <label
        className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed
                   border-border dark:border-dark-border p-6 cursor-pointer hover:border-primary transition-colors mb-3"
      >
        <UploadCloud size={24} className="text-text-muted" />
        <span className="text-sm text-text-secondary dark:text-dark-text-secondary">
          JSON ফাইল বাছাই করুন
        </span>
        <input type="file" accept=".json,application/json" onChange={handleFile} className="hidden" />
      </label>

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

      {parsed && (
        <div className="rounded-xl bg-background dark:bg-dark-background p-3 mb-3">
          <p className="text-sm font-medium text-text-primary dark:text-dark-text-primary mb-1">
            {parsed.length}টা প্রোডাক্ট পাওয়া গেছে
          </p>
          <p className="text-xs text-text-muted dark:text-dark-text-secondary">
            নমুনা: {parsed.slice(0, 3).map(([, p]) => p.name).join(', ')}
            {parsed.length > 3 ? '...' : ''}
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleImport}
          disabled={!parsed || importing || !companyId}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-white
                     bg-gradient-to-r from-primary to-primary-light disabled:opacity-40"
        >
          {importing ? 'যোগ হচ্ছে...' : parsed ? `${parsed.length}টা প্রোডাক্ট যোগ করুন` : 'প্রোডাক্ট যোগ করুন'}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setParsed(null);
            setRawText('');
            setError('');
          }}
          className="flex-1 rounded-xl py-2.5 text-sm font-medium border border-border dark:border-dark-border
                     text-text-secondary dark:text-dark-text-secondary"
        >
          বাতিল
        </button>
      </div>
    </div>
  );
}
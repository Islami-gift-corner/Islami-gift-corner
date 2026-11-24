'use client';

import { useState } from 'react';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { ref, get, remove } from 'firebase/database';
import { database, auth } from '@/lib/firebase';
import { logActivity } from '@/lib/activityLog';
import { Trash2, AlertTriangle, CheckCircle2, Lock, Eye, EyeOff, Info } from 'lucide-react';

// প্রোডাকশনে যাওয়ার আগে টেস্ট ডেটা মুছে ফেলার টুল।
// নিরাপত্তার জন্য অ্যাডমিনের নিজের পাসওয়ার্ড দিয়ে re-authenticate করা বাধ্যতামূলক।
//
// প্রতিটা ক্যাটাগরি স্বাধীনভাবে চেষ্টা করা হয় (Promise.allSettled) — একটা ক্যাটাগরি
// ব্যর্থ হলেও (যেমন Firebase রুলসে সুরক্ষিত থাকলে) বাকি ক্যাটাগরিগুলো আটকে যায় না।
// শেষে ঠিক কোনটা মুছেছে, কোনটা মুছেনি — তার স্পষ্ট সারসংক্ষেপ দেখানো হয়।
const LABELS = {
  companies: 'কোম্পানি ও পণ্য',
  parties: 'পার্টি',
  invoices: 'ইনভয়েস',
  ledger: 'অ্যাডমিনের ঠালি খাতা',
  ledger_notes: 'অ্যাডমিনের ঠালির নোট',
  stock_movements: 'স্টক মুভমেন্ট হিস্ট্রি',
  warranty_claims: 'ওয়ারেন্টি ক্লেইম',
  activity_log: 'অ্যাক্টিভিটি লগ',
  sr_ledger: 'SR-দের ঠালি খাতা',
  invoice_counter: 'ইনভয়েস কাউন্টার',
};

const LIST_NODES = [
  'companies',
  'parties',
  'invoices',
  'ledger',
  'ledger_notes',
  'stock_movements',
  'warranty_claims',
  'activity_log',
];

// একটা নোডের ভেতরের প্রতিটা সরাসরি চাইল্ড আলাদাভাবে মুছে ফেলে, ব্যর্থ হলেও
// বাকিগুলো চেষ্টা চালিয়ে যায়, এবং কতটা সফল/ব্যর্থ হলো তার হিসাব ফেরত দেয়
async function deleteEachChild(path) {
  const snap = await get(ref(database, path));
  const data = snap.val();
  if (!data) return { total: 0, failed: 0 };
  const keys = Object.keys(data);
  const results = await Promise.allSettled(
    keys.map((key) => remove(ref(database, `${path}/${key}`)))
  );
  const failed = results.filter((r) => r.status === 'rejected').length;
  return { total: keys.length, failed };
}

// sr_ledger/{uid}/entries/{id} ও sr_ledger/{uid}/notes/{id} — প্রতিটা SR-এর
// প্রতিটা এন্ট্রি/নোট আলাদাভাবে মুছে ফেলে (SR অ্যাকাউন্ট নিজে অক্ষত থাকে)
async function deleteSrLedgerData() {
  const snap = await get(ref(database, 'sr_ledger'));
  const data = snap.val();
  if (!data) return { total: 0, failed: 0 };
  const uids = Object.keys(data);
  let total = 0;
  let failed = 0;
  await Promise.all(
    uids.map(async (uid) => {
      const e = await deleteEachChild(`sr_ledger/${uid}/entries`);
      const n = await deleteEachChild(`sr_ledger/${uid}/notes`);
      total += e.total + n.total;
      failed += e.failed + n.failed;
    })
  );
  return { total, failed };
}

async function resetInvoiceCounter() {
  try {
    await remove(ref(database, 'invoice_counter/last_number'));
    return { total: 1, failed: 0 };
  } catch (err) {
    return { total: 1, failed: 1 };
  }
}

export default function ProductionReset() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState('idle'); // 'idle' | 'confirming' | 'done'
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);

  const user = auth.currentUser;

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');

    if (!password) {
      setError('আপনার পাসওয়ার্ড দিন');
      return;
    }

    setWorking(true);
    try {
      // ধাপ ১: পাসওয়ার্ড দিয়ে re-authenticate — এটা সফল না হলে কিছুই মুছবে না
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);

      // ধাপ ২: প্রতিটা ক্যাটাগরি আলাদাভাবে, একে অপরের উপর নির্ভর না করে
      const results = {};
      for (const node of LIST_NODES) {
        results[node] = await deleteEachChild(node);
      }
      results.sr_ledger = await deleteSrLedgerData();
      results.invoice_counter = await resetInvoiceCounter();

      setSummary(results);

      // ধাপ ৩: রিসেটের পর এটাই লগের প্রথম এন্ট্রি হবে (activity_log নিজেই সুরক্ষিত
      // থাকলেও নতুন এন্ট্রি লেখা সাধারণত অনুমোদিত থাকে)
      try {
        await logActivity({
          userId: user?.uid,
          action: 'প্রোডাকশন রিসেট সম্পন্ন — টেস্ট ডেটা মুছে ফেলা হয়েছে',
          target: '',
        });
      } catch (_) {
        // লগ লেখা ব্যর্থ হলেও রিসেট প্রক্রিয়া থামবে না
      }

      setStep('done');
    } catch (err) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError('পাসওয়ার্ড ভুল হয়েছে');
      } else if (err.code === 'auth/too-many-requests') {
        setError('অনেকবার ভুল চেষ্টা হয়েছে, কিছুক্ষণ পর আবার চেষ্টা করুন');
      } else {
        setError(`রিসেট করা যায়নি — কারণ: ${err.code || err.message || 'অজানা এরর'}`);
      }
    } finally {
      setWorking(false);
    }
  };

  if (step === 'done') {
    const failedCategories = summary
      ? Object.entries(summary).filter(([, v]) => v.failed > 0)
      : [];

    return (
      <div className="bg-success/10 rounded-2xl border border-success/30 p-5 flex flex-col gap-3">
        <p className="flex items-center gap-2 text-sm font-medium text-success">
          <CheckCircle2 size={16} />
          রিসেট সম্পন্ন হয়েছে
        </p>
        <p className="text-xs text-text-secondary dark:text-dark-text-secondary">
          লগইন অ্যাকাউন্টগুলো (অ্যাডমিন ও সব SR) অক্ষত আছে।
        </p>

        {summary && (
          <div className="rounded-xl bg-background dark:bg-dark-background p-3">
            <p className="text-xs font-medium text-text-primary dark:text-dark-text-primary mb-2">
              বিস্তারিত ফলাফল:
            </p>
            <div className="flex flex-col gap-1">
              {Object.entries(summary).map(([node, v]) => (
                <p
                  key={node}
                  className={`text-xs ${v.failed > 0 ? 'text-danger' : 'text-text-secondary dark:text-dark-text-secondary'}`}
                >
                  • {LABELS[node] || node} — {v.total - v.failed}/{v.total} মুছে গেছে
                  {v.failed > 0 ? ` (${v.failed}টা মুছা যায়নি)` : ''}
                </p>
              ))}
            </div>
          </div>
        )}

        {failedCategories.length > 0 && (
          <p className="flex items-start gap-2 text-xs text-text-secondary dark:text-dark-text-secondary bg-background dark:bg-dark-background rounded-lg px-3 py-2">
            <Info size={14} className="shrink-0 mt-0.5" />
            যেসব ক্যাটাগরিতে কিছু মুছা যায়নি, সেগুলো সম্ভবত Firebase-এ ইচ্ছাকৃতভাবে সুরক্ষিত
            (যেমন অ্যাক্টিভিটি লগ সাধারণত মুছতে দেওয়া হয় না, নিরাপত্তার জন্য)। বাকি সব ডেটা
            সফলভাবে মুছে গেছে।
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className="bg-background-card dark:bg-dark-card rounded-2xl shadow-sm
                 border border-danger/30 p-5 max-w-md"
    >
      <h3 className="flex items-center gap-2 text-sm font-semibold text-danger mb-1">
        <AlertTriangle size={16} />
        প্রোডাকশনের জন্য টেস্ট ডেটা রিসেট
      </h3>
      <p className="text-xs text-text-muted dark:text-dark-text-secondary mb-4">
        এটা স্থায়ীভাবে মুছে ফেলবে, ফেরত আনা যাবে না। আগে উপরের ব্যাকআপ ডাউনলোড করে রাখার পরামর্শ
        দিচ্ছি।
      </p>

      <div className="rounded-xl bg-danger/5 border border-danger/20 p-3 mb-3">
        <p className="text-xs font-medium text-text-primary dark:text-dark-text-primary mb-1.5">
          যা মুছে যাবে:
        </p>
        <p className="text-xs text-text-secondary dark:text-dark-text-secondary leading-relaxed">
          কোম্পানি ও পণ্যের লিস্ট • সব পার্টি • সব ইনভয়েস (নম্বর নতুন করে ১ থেকে শুরু হবে) •
          অ্যাডমিনের ঠালি খাতা • প্রতিটা SR-এর নিজস্ব ঠালি খাতা • স্টক মুভমেন্ট হিস্ট্রি • ওয়ারেন্টি
          ক্লেইম • অ্যাক্টিভিটি লগ (যদি Firebase-এ অনুমোদিত থাকে)
        </p>
      </div>

      <div className="rounded-xl bg-success/5 border border-success/20 p-3 mb-4">
        <p className="text-xs font-medium text-text-primary dark:text-dark-text-primary mb-1.5">
          যা অক্ষত থাকবে:
        </p>
        <p className="text-xs text-text-secondary dark:text-dark-text-secondary leading-relaxed">
          সব লগইন অ্যাকাউন্ট (অ্যাডমিন ও সব SR) • বিজনেস প্রোফাইল • ঠালির ডিফল্ট খাত লিস্ট
        </p>
      </div>

      {step !== 'confirming' ? (
        <button
          type="button"
          onClick={() => setStep('confirming')}
          className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium
                     text-danger border border-danger/40 hover:bg-danger/5"
        >
          <Trash2 size={16} />
          রিসেট করতে চাই
        </button>
      ) : (
        <form onSubmit={handleReset} className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1.5">
              অ্যাডমিন ইমেইল
            </label>
            <input
              type="text"
              value={user?.email || ''}
              disabled
              className="w-full rounded-xl border border-border dark:border-dark-border
                         bg-background dark:bg-dark-background text-text-muted
                         px-3 py-2.5 text-sm opacity-70"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1.5">
              নিশ্চিত করতে আপনার পাসওয়ার্ড দিন
            </label>
            <div className="relative">
              <Lock
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted dark:text-dark-text-secondary"
              />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                placeholder="••••••••"
                className="w-full rounded-xl border border-danger/40
                           bg-background dark:bg-dark-background
                           text-text-primary dark:text-dark-text-primary
                           pl-10 pr-10 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-danger"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted dark:text-dark-text-secondary"
                aria-label={showPassword ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখান'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="flex items-center gap-2 text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">
              <AlertTriangle size={14} />
              {error}
            </p>
          )}

          <div className="flex gap-2 mt-1">
            <button
              type="submit"
              disabled={working}
              className="flex-1 rounded-xl py-2.5 text-sm font-medium text-white bg-danger disabled:opacity-40"
            >
              {working ? 'মুছে ফেলা হচ্ছে...' : 'হ্যাঁ, স্থায়ীভাবে মুছে ফেলুন'}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep('idle');
                setPassword('');
                setError('');
              }}
              className="flex-1 rounded-xl py-2.5 text-sm font-medium border border-border dark:border-dark-border
                         text-text-secondary dark:text-dark-text-secondary"
            >
              বাতিল
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

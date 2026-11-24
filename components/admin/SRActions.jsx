'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ref, update, remove } from 'firebase/database';
import { sendPasswordResetEmail } from 'firebase/auth';
import { database, auth } from '@/lib/firebase';
import { logActivity } from '@/lib/activityLog';
import { ShieldOff, ShieldCheck, Trash2, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';

export default function SRActions({ sr }) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text }

  const isActive = sr.status !== 'inactive';

  const toggleStatus = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await update(ref(database, `users/${sr.id}`), {
        status: isActive ? 'inactive' : 'active',
      });
      await logActivity({
        userId: auth.currentUser?.uid,
        action: isActive ? 'SR ডিজেবল করা হয়েছে' : 'SR ইনেবল করা হয়েছে',
        target: sr.name,
      });
      setMessage({
        type: 'success',
        text: isActive ? 'SR সাময়িকভাবে ডিজেবল করা হয়েছে' : 'SR আবার সক্রিয় করা হয়েছে',
      });
    } catch (err) {
      setMessage({ type: 'error', text: 'পরিবর্তন করা যায়নি, আবার চেষ্টা করুন' });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await remove(ref(database, `users/${sr.id}`));
      await logActivity({
        userId: auth.currentUser?.uid,
        action: 'SR তালিকা থেকে সরানো হয়েছে',
        target: sr.name,
      });
      router.push('/admin/hire-sr');
    } catch (err) {
      setMessage({ type: 'error', text: 'মুছে ফেলা যায়নি, আবার চেষ্টা করুন' });
      setBusy(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!sr.email) {
      setMessage({ type: 'error', text: 'এই SR-এর কোনো ইমেইল পাওয়া যায়নি' });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await sendPasswordResetEmail(auth, sr.email);
      await logActivity({
        userId: auth.currentUser?.uid,
        action: 'পাসওয়ার্ড রিসেট মেইল পাঠানো হয়েছে',
        target: sr.name,
      });
      setMessage({
        type: 'success',
        text: `${sr.email} এই ঠিকানায় পাসওয়ার্ড রিসেটের লিংক পাঠানো হয়েছে। SR-কে বলুন ইমেইল চেক করে নতুন পাসওয়ার্ড সেট করে নিতে।`,
      });
    } catch (err) {
      setMessage({ type: 'error', text: 'মেইল পাঠানো যায়নি, আবার চেষ্টা করুন' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="bg-background-card dark:bg-dark-card rounded-2xl shadow-sm
                 border border-border dark:border-dark-border p-5 max-w-md"
    >
      <h3 className="text-sm font-semibold text-text-primary dark:text-dark-text-primary mb-1">
        একশন
      </h3>
      <p className="text-xs text-text-muted dark:text-dark-text-secondary mb-4">
        বর্তমান অবস্থা:{' '}
        <span className={isActive ? 'text-success font-medium' : 'text-danger font-medium'}>
          {isActive ? '● সক্রিয়' : '○ নিষ্ক্রিয়'}
        </span>
      </p>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={toggleStatus}
          disabled={busy}
          className={`flex items-center gap-2 rounded-xl py-2.5 px-4 text-sm font-medium transition-colors disabled:opacity-60
            ${
              isActive
                ? 'bg-warning/10 text-warning'
                : 'bg-success/10 text-success'
            }`}
        >
          {isActive ? <ShieldOff size={16} /> : <ShieldCheck size={16} />}
          {isActive ? 'সাময়িক ডিজেবল করুন' : 'আবার সক্রিয় করুন'}
        </button>

        <button
          type="button"
          onClick={handlePasswordReset}
          disabled={busy}
          className="flex items-center gap-2 rounded-xl py-2.5 px-4 text-sm font-medium
                     bg-primary/10 text-primary transition-colors disabled:opacity-60"
        >
          <KeyRound size={16} />
          পাসওয়ার্ড রিসেট মেইল পাঠান
        </button>

        {!confirmDelete ? (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            disabled={busy}
            className="flex items-center gap-2 rounded-xl py-2.5 px-4 text-sm font-medium
                       bg-danger/10 text-danger transition-colors disabled:opacity-60"
          >
            <Trash2 size={16} />
            SR ডিলিট করুন
          </button>
        ) : (
          <div className="rounded-xl bg-danger/10 p-3 flex flex-col gap-2">
            <p className="text-xs text-danger">
              এটা SR-কে তালিকা থেকে ও অ্যাপ থেকে পুরোপুরি মুছে ফেলবে। লগইন একাউন্টও Firebase
              Console থেকে আলাদাভাবে ডিলিট করে দেওয়া ভালো। আপনি কি নিশ্চিত?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={busy}
                className="flex-1 rounded-lg py-1.5 text-xs font-medium text-white bg-danger disabled:opacity-60"
              >
                হ্যাঁ, ডিলিট করুন
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={busy}
                className="flex-1 rounded-lg py-1.5 text-xs font-medium border border-border dark:border-dark-border
                           text-text-secondary dark:text-dark-text-secondary"
              >
                বাতিল
              </button>
            </div>
          </div>
        )}
      </div>

      {message && (
        <p
          className={`flex items-start gap-2 text-xs rounded-lg px-3 py-2 mt-3
            ${message.type === 'success' ? 'text-success bg-success/10' : 'text-danger bg-danger/10'}`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
          ) : (
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
          )}
          {message.text}
        </p>
      )}
    </div>
  );
}
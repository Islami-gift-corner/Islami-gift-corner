'use client';

import { useState, useEffect, useRef } from 'react';
import { ref, get, set } from 'firebase/database';
import { database } from '@/lib/firebase';
import { brand } from '@/lib/brand';
import {
  DownloadCloud,
  FileJson,
  FileSpreadsheet,
  Cloud,
  UploadCloud,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

// ⚠️ Google Drive-এ সরাসরি সংরক্ষণ করতে হলে এখানে নিজের Google Cloud OAuth Client ID বসাতে হবে।
// কীভাবে বানাবেন তা এই ফাইলের নিচে "গুগল ড্রাইভ সেটআপ নির্দেশনা" অংশে বিস্তারিত লেখা আছে।
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID_HERE.apps.googleusercontent.com';
const DRIVE_SCOPE =
  'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email';

const BACKUP_NODES = [
  'users',
  'business_profile',
  'companies',
  'stock_movements',
  'warranty_claims',
  'parties',
  'invoices',
  'invoice_counter',
  'ledger',
  'ledger_categories',
  'ledger_notes',
  'sr_ledger',
  'company_transactions',
  'bank_loans',
  'personal_debts',
  'activity_log',
];

// ডেটাবেজের রুট থেকে একসাথে পড়ার অনুমতি নেই (সিকিউরিটি রুলসে প্রতিটা শাখা আলাদাভাবে
// সুরক্ষিত), তাই প্রতিটা টপ-লেভেল শাখা আলাদাভাবে পড়ে পরে একসাথে জোড়া দেওয়া হয়।
// কোনো একটা নোড পড়তে ব্যর্থ হলেও (যেমন সেই নোডের জন্য read-অনুমতি সেট করা না থাকলে)
// বাকি নোডগুলো দিয়ে ব্যাকআপ ঠিকই তৈরি হবে — শুধু বাদ পড়া নোডের নাম আলাদাভাবে ফেরত দেওয়া হয়।
async function fetchAllData() {
  const data = {};
  const failedNodes = [];
  await Promise.all(
    BACKUP_NODES.map(async (node) => {
      try {
        const snapshot = await get(ref(database, node));
        if (snapshot.exists()) {
          data[node] = snapshot.val();
        }
      } catch (err) {
        failedNodes.push(node);
      }
    })
  );
  return { data, failedNodes };
}

// Google Identity Services স্ক্রিপ্ট লোড করা (একবারই)
function loadGoogleScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const existing = document.getElementById('google-identity-script');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.id = 'google-identity-script';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google স্ক্রিপ্ট লোড করা যায়নি'));
    document.body.appendChild(script);
  });
}

// পপ-আপে Google লগইন করিয়ে একটা অ্যাক্সেস টোকেন নেওয়া
// forceSelect: true দিলে আগে থেকে সংযুক্ত থাকলেও একাউন্ট বেছে নেওয়ার চান্স দেখাবে
function getGoogleAccessToken(forceSelect = false) {
  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      reject(new Error('Google সার্ভিস লোড হয়নি'));
      return;
    }
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: DRIVE_SCOPE,
      prompt: forceSelect ? 'select_account' : '',
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response.access_token);
        }
      },
    });
    tokenClient.requestAccessToken();
  });
}

// টোকেন দিয়ে কোন গুগল একাউন্ট সংযুক্ত আছে সেটার ইমেইল বের করা
async function fetchGoogleEmail(accessToken) {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.email || null;
  } catch {
    return null;
  }
}

// Drive API দিয়ে ফাইল আপলোড (multipart)
async function uploadJsonToDrive(accessToken, filename, jsonString) {
  const boundary = 'backup_boundary_7f3a9c';
  const metadata = { name: filename, mimeType: 'application/json' };
  const body =
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    `\r\n--${boundary}\r\n` +
    'Content-Type: application/json\r\n\r\n' +
    jsonString +
    `\r\n--${boundary}--`;

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );

  if (!res.ok) {
    throw new Error('Drive আপলোড ব্যর্থ হয়েছে');
  }
  return res.json();
}

export default function DataBackup() {
  const [loadingJson, setLoadingJson] = useState(false);
  const [loadingExcel, setLoadingExcel] = useState(false);
  const [loadingDrive, setLoadingDrive] = useState(false);
  const [connectedEmail, setConnectedEmail] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // রিস্টোর
  const fileInputRef = useRef(null);
  const [restoreFile, setRestoreFile] = useState(null);
  const [restorePreview, setRestorePreview] = useState(null);
  const [confirmText, setConfirmText] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState(null);

  useEffect(() => {
    loadGoogleScript().catch(() => {});
  }, []);

  const todayStr = () => new Date().toISOString().split('T')[0];

  const handleJsonBackup = async () => {
    setError('');
    setSuccess('');
    setLoadingJson(true);
    try {
      const { data, failedNodes } = await fetchAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${brand.slug}-backup-${todayStr()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      if (failedNodes.length > 0) {
        setError(
          `ব্যাকআপ ডাউনলোড হয়েছে, তবে এই অংশগুলো পড়া যায়নি (বাদ পড়েছে): ${failedNodes.join(', ')}`
        );
      } else {
        setSuccess('ব্যাকআপ সফলভাবে ডাউনলোড হয়েছে');
      }
    } catch (err) {
      setError(`ব্যাকআপ তৈরি করা যায়নি — কারণ: ${err.code || err.message || 'অজানা এরর'}`);
    } finally {
      setLoadingJson(false);
    }
  };

  const handleExcelBackup = async () => {
    setError('');
    setSuccess('');
    setLoadingExcel(true);
    try {
      const XLSX = await import('xlsx');
      const { data, failedNodes } = await fetchAllData();

      const workbook = XLSX.utils.book_new();

      const productRows = [];
      Object.entries(data.companies || {}).forEach(([companyId, company]) => {
        Object.entries(company.products || {}).forEach(([productId, product]) => {
          productRows.push({
            'কোম্পানি': company.name,
            'প্রোডাক্ট': product.name,
            'ক্রয়মূল্য': product.cost_price,
            'MRP': product.mrp,
            'কমিশন %': product.commission_percent,
            'স্টক': product.stock_qty,
          });
        });
      });
      if (productRows.length) {
        const sheet = XLSX.utils.json_to_sheet(productRows);
        XLSX.utils.book_append_sheet(workbook, sheet, 'Products');
      }

      const partyRows = Object.values(data.parties || {}).map((p) => ({
        'নাম': p.name,
        'ব্যবসার নাম': p.business_name,
        'ফোন': p.phone,
        'মোট বিক্রয়': p.total_purchase || 0,
        'পরিশোধিত': p.total_paid || 0,
        'বাকি': p.balance || 0,
      }));
      if (partyRows.length) {
        const sheet = XLSX.utils.json_to_sheet(partyRows);
        XLSX.utils.book_append_sheet(workbook, sheet, 'Parties');
      }

      const invoiceRows = Object.values(data.invoices || {}).map((inv) => ({
        'ইনভয়েস নং': inv.invoice_no,
        'তারিখ': inv.date ? new Date(inv.date).toLocaleDateString('bn-BD') : '',
        'পার্টি': inv.party?.name,
        'সাবটোটাল': inv.subtotal,
        'কমিশন': inv.commission?.total || 0,
        'স্ট্যাটাস': inv.status === 'paid' ? 'পরিশোধিত' : 'বাকি',
      }));
      if (invoiceRows.length) {
        const sheet = XLSX.utils.json_to_sheet(invoiceRows);
        XLSX.utils.book_append_sheet(workbook, sheet, 'Invoices');
      }

      const ledgerRows = Object.values(data.ledger || {}).map((e) => ({
        'ধরন': e.type === 'income' ? 'আয়' : 'ব্যয়',
        'খাত': e.category,
        'পরিমাণ': e.amount,
        'তারিখ': e.date ? new Date(e.date).toLocaleDateString('bn-BD') : '',
        'নোট': e.note || '',
      }));
      if (ledgerRows.length) {
        const sheet = XLSX.utils.json_to_sheet(ledgerRows);
        XLSX.utils.book_append_sheet(workbook, sheet, 'Ledger');
      }

      if (workbook.SheetNames.length === 0) {
        setError('এক্সপোর্ট করার মতো কোনো ডেটা পাওয়া যায়নি');
        return;
      }

      XLSX.writeFile(workbook, `${brand.slug}-backup-${todayStr()}.xlsx`);
      if (failedNodes.length > 0) {
        setError(
          `Excel ডাউনলোড হয়েছে, তবে এই অংশগুলো পড়া যায়নি (বাদ পড়েছে): ${failedNodes.join(', ')}`
        );
      } else {
        setSuccess('Excel সফলভাবে ডাউনলোড হয়েছে');
      }
    } catch (err) {
      setError(`Excel তৈরি করা যায়নি — কারণ: ${err.code || err.message || 'অজানা এরর'}`);
    } finally {
      setLoadingExcel(false);
    }
  };

  const handleDriveBackup = async (forceSelect = false) => {
    setError('');
    setSuccess('');

    if (GOOGLE_CLIENT_ID.includes('YOUR_GOOGLE_CLIENT_ID')) {
      setError('গুগল ড্রাইভ এখনো সেটআপ করা হয়নি — নিচের নির্দেশনা অনুযায়ী Client ID বসাতে হবে');
      return;
    }

    setLoadingDrive(true);
    try {
      await loadGoogleScript();
      const accessToken = await getGoogleAccessToken(forceSelect);

      const email = await fetchGoogleEmail(accessToken);
      if (email) setConnectedEmail(email);

      const { data, failedNodes } = await fetchAllData();
      const jsonString = JSON.stringify(data, null, 2);
      const result = await uploadJsonToDrive(accessToken, `${brand.slug}-backup-${todayStr()}.json`, jsonString);

      const skippedNote =
        failedNodes.length > 0 ? ` (এই অংশগুলো পড়া যায়নি: ${failedNodes.join(', ')})` : '';

      setSuccess(
        (result.webViewLink
          ? `${email ? email + ' — ' : ''}Google Drive-এ সংরক্ষণ হয়েছে ✅ (ফাইল খুলতে: ${result.webViewLink})`
          : 'Google Drive-এ সংরক্ষণ হয়েছে ✅') + skippedNote
      );
    } catch (err) {
      setError(`Google Drive-এ সংরক্ষণ করা যায়নি — কারণ: ${err.code || err.message || 'অজানা এরর'}`);
    } finally {
      setLoadingDrive(false);
    }
  };

  // ---- রিস্টোর ----

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    setRestoreMessage(null);
    setConfirmText('');
    if (!file) {
      setRestoreFile(null);
      setRestorePreview(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        const summary = BACKUP_NODES.filter((n) => parsed[n]).map((n) => ({
          node: n,
          count:
            typeof parsed[n] === 'object' && parsed[n] !== null
              ? Object.keys(parsed[n]).length
              : 1,
        }));
        setRestoreFile(parsed);
        setRestorePreview(summary);
      } catch (err) {
        setRestoreMessage({ type: 'error', text: 'ফাইলটা সঠিক ব্যাকআপ JSON না, পড়া যায়নি' });
        setRestoreFile(null);
        setRestorePreview(null);
      }
    };
    reader.readAsText(file);
  };

  const handleRestore = async () => {
    if (!restoreFile) return;
    if (confirmText.trim().toUpperCase() !== 'RESTORE') {
      setRestoreMessage({ type: 'error', text: 'নিশ্চিত করতে নিচে ঠিক "RESTORE" লিখুন' });
      return;
    }

    setRestoring(true);
    setRestoreMessage(null);
    try {
      const nodesToRestore = BACKUP_NODES.filter((n) => restoreFile[n] !== undefined);
      await Promise.all(
        nodesToRestore.map((node) => set(ref(database, node), restoreFile[node]))
      );
      setRestoreMessage({
        type: 'success',
        text: `রিস্টোর সম্পন্ন হয়েছে (${nodesToRestore.length}টা অংশ ফেরত বসানো হয়েছে)। অ্যাপ রিফ্রেশ করুন।`,
      });
      setRestoreFile(null);
      setRestorePreview(null);
      setConfirmText('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setRestoreMessage({ type: 'error', text: 'রিস্টোর করা যায়নি, আবার চেষ্টা করুন' });
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-md w-full">
      {/* ব্যাকআপ */}
      <div
        className="bg-background-card dark:bg-dark-card rounded-2xl shadow-sm
                   border border-border dark:border-dark-border p-5"
      >
        <h2 className="flex items-center gap-2 text-base font-semibold text-text-primary dark:text-dark-text-primary mb-1">
          <DownloadCloud size={18} className="text-primary" />
          ডেটা ব্যাকআপ
        </h2>
        <p className="text-xs text-text-muted dark:text-dark-text-secondary mb-4">
          নিয়মিত (সপ্তাহে অন্তত একবার) ব্যাকআপ নিয়ে নিরাপদে রাখুন
        </p>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => handleDriveBackup(false)}
            disabled={loadingDrive}
            className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-white
                       bg-gradient-to-r from-primary to-primary-light disabled:opacity-60"
          >
            <Cloud size={16} />
            {loadingDrive ? 'সংরক্ষণ হচ্ছে...' : 'Google Drive-এ সংরক্ষণ করুন'}
          </button>

          {connectedEmail && (
            <p className="text-[11px] text-text-muted dark:text-dark-text-secondary -mt-1 px-1">
              সংযুক্ত একাউন্ট: <span className="font-medium">{connectedEmail}</span>{' '}
              —{' '}
              <button
                type="button"
                onClick={() => handleDriveBackup(true)}
                className="text-primary underline"
              >
                একাউন্ট পরিবর্তন করুন
              </button>
            </p>
          )}
          {!connectedEmail && (
            <button
              type="button"
              onClick={() => handleDriveBackup(true)}
              className="text-[11px] text-primary underline -mt-1 px-1 self-start"
            >
              অন্য গুগল একাউন্টে সংরক্ষণ করতে চান? এখানে চাপুন
            </button>
          )}

          <button
            type="button"
            onClick={handleJsonBackup}
            disabled={loadingJson}
            className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium
                       border border-border dark:border-dark-border text-text-primary dark:text-dark-text-primary disabled:opacity-60"
          >
            <FileJson size={16} />
            {loadingJson ? 'তৈরি হচ্ছে...' : 'ফোনে ডাউনলোড করুন (JSON)'}
          </button>

          <button
            type="button"
            onClick={handleExcelBackup}
            disabled={loadingExcel}
            className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium
                       border border-border dark:border-dark-border text-text-primary dark:text-dark-text-primary disabled:opacity-60"
          >
            <FileSpreadsheet size={16} />
            {loadingExcel ? 'তৈরি হচ্ছে...' : 'সারসংক্ষেপ (Excel) ডাউনলোড করুন'}
          </button>
        </div>

        {error && (
          <p className="flex items-center gap-2 text-xs text-danger bg-danger/10 rounded-lg px-3 py-2 mt-3">
            <AlertCircle size={14} />
            {error}
          </p>
        )}
        {success && (
          <p className="flex items-center gap-2 text-xs text-success bg-success/10 rounded-lg px-3 py-2 mt-3 break-all">
            <CheckCircle2 size={14} className="shrink-0" />
            {success}
          </p>
        )}

        <p className="text-[11px] text-text-muted dark:text-dark-text-secondary mt-3">
          💡 JSON-এ সব ডেটা হুবহু থাকে (ফেরত বসানো যায়)। Excel-এ শুধু প্রোডাক্ট, পার্টি, ইনভয়েস
          ও ঠালি খাতার সারসংক্ষেপ থাকে (দেখা/শেয়ার করার জন্য সুবিধাজনক)।
        </p>
      </div>

      {/* রিস্টোর */}
      <div
        className="bg-background-card dark:bg-dark-card rounded-2xl shadow-sm
                   border border-border dark:border-dark-border p-5"
      >
        <h2 className="flex items-center gap-2 text-base font-semibold text-text-primary dark:text-dark-text-primary mb-1">
          <UploadCloud size={18} className="text-primary" />
          ব্যাকআপ থেকে রিস্টোর করুন
        </h2>
        <p className="text-xs text-danger bg-danger/10 rounded-lg px-3 py-2 mt-2 mb-4">
          ⚠️ সতর্কতা: রিস্টোর করলে বর্তমান ডেটা মুছে ব্যাকআপ ফাইলের ডেটা দিয়ে প্রতিস্থাপিত হবে।
          এটা ফেরানো যাবে না। শুধু তখনই করুন যখন নিশ্চিত যে বর্তমান ডেটা হারালে সমস্যা নেই।
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          onChange={handleFileSelect}
          className="w-full text-xs text-text-secondary dark:text-dark-text-secondary
                     file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:text-primary
                     file:px-3 file:py-2 file:text-xs file:font-medium"
        />

        {restorePreview && (
          <div className="mt-4 flex flex-col gap-3">
            <div className="rounded-xl bg-background dark:bg-dark-background p-3">
              <p className="text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-2">
                এই ফাইলে যা যা পাওয়া গেছে:
              </p>
              <div className="flex flex-col gap-1">
                {restorePreview.map(({ node, count }) => (
                  <p key={node} className="text-xs text-text-primary dark:text-dark-text-primary">
                    • {node} — {count}টা এন্ট্রি
                  </p>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1.5">
                নিশ্চিত করতে নিচে ইংরেজিতে <span className="font-semibold">RESTORE</span> লিখুন
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="RESTORE"
                className="w-full rounded-xl border border-danger/40
                           bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                           px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-danger placeholder:text-text-muted"
              />
            </div>

            <button
              type="button"
              onClick={handleRestore}
              disabled={restoring || confirmText.trim().toUpperCase() !== 'RESTORE'}
              className="w-full rounded-xl py-2.5 text-sm font-semibold text-white bg-danger disabled:opacity-50"
            >
              {restoring ? 'রিস্টোর হচ্ছে...' : 'নিশ্চিতভাবে রিস্টোর করুন'}
            </button>
          </div>
        )}

        {restoreMessage && (
          <p
            className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 mt-3
              ${restoreMessage.type === 'success' ? 'text-success bg-success/10' : 'text-danger bg-danger/10'}`}
          >
            {restoreMessage.type === 'success' ? (
              <CheckCircle2 size={14} />
            ) : (
              <AlertCircle size={14} />
            )}
            {restoreMessage.text}
          </p>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '@/lib/firebase';
import { exportElementToPdf } from '@/lib/pdfExport';
import { CalendarRange, FileDown, FileSpreadsheet } from 'lucide-react';

export default function SRStatementExport({ srId, srName }) {
  const [invoices, setInvoices] = useState([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [exporting, setExporting] = useState(false);
  const statementRef = useRef(null);

  useEffect(() => {
    const invoicesRef = ref(database, 'invoices');
    const unsubscribe = onValue(invoicesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.values(data).filter((inv) => inv.sr_id === srId);
        setInvoices(list);
      } else {
        setInvoices([]);
      }
    });
    return () => unsubscribe();
  }, [srId]);

  const filtered = invoices.filter((inv) => {
    const invDate = new Date(inv.date).setHours(0, 0, 0, 0);
    if (fromDate && invDate < new Date(fromDate).setHours(0, 0, 0, 0)) return false;
    if (toDate && invDate > new Date(toDate).setHours(0, 0, 0, 0)) return false;
    return true;
  });
  const totalAmount = filtered.reduce((sum, inv) => sum + (inv.subtotal || 0), 0);
  const totalCommission = filtered.reduce((sum, inv) => sum + (inv.commission?.total || 0), 0);

  const handlePdfDownload = async () => {
    setExporting(true);
    try {
      await exportElementToPdf(statementRef.current, `${srName}-statement.pdf`);
    } catch (err) {
      alert('PDF তৈরি করা যায়নি, আবার চেষ্টা করুন');
    } finally {
      setExporting(false);
    }
  };

  const handleExcelDownload = async () => {
    setExporting(true);
    try {
      const XLSX = await import('xlsx');
      const rows = filtered.map((inv) => ({
        'Invoice No': inv.invoice_no,
        Date: new Date(inv.date).toLocaleDateString('en-GB'),
        Party: inv.party?.name,
        Amount: inv.subtotal,
        Commission: inv.commission?.total || 0,
        Status: inv.status === 'paid' ? 'Paid' : 'Due',
      }));
      rows.push({});
      rows.push({ 'Invoice No': '', Date: 'Total', Amount: totalAmount, Commission: totalCommission });

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Statement');
      XLSX.writeFile(workbook, `${srName}-statement.xlsx`);
    } catch (err) {
      alert('Excel তৈরি করা যায়নি, আবার চেষ্টা করুন');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div
      className="bg-background-card dark:bg-dark-card rounded-2xl shadow-sm
                 border border-border dark:border-dark-border p-5"
    >
      <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary dark:text-dark-text-primary mb-3">
        <CalendarRange size={16} className="text-primary" />
        তারিখ-ভিত্তিক স্টেটমেন্ট ডাউনলোড
      </h3>

      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <div className="flex-1">
          <label className="block text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1.5">
            শুরুর তারিখ
          </label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full rounded-xl border border-border dark:border-dark-border
                       bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                       px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1.5">
            শেষ তারিখ
          </label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full rounded-xl border border-border dark:border-dark-border
                       bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                       px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <p className="text-xs text-text-secondary dark:text-dark-text-secondary mb-3">
        {filtered.length}টি ইনভয়েস পাওয়া গেছে (মোট ৳{totalAmount}, কমিশন ৳{totalCommission})
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handlePdfDownload}
          disabled={exporting || filtered.length === 0}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-medium
                     bg-gradient-to-r from-primary to-primary-light text-white disabled:opacity-50"
        >
          <FileDown size={15} />
          PDF
        </button>
        <button
          type="button"
          onClick={handleExcelDownload}
          disabled={exporting || filtered.length === 0}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-medium
                     border border-border dark:border-dark-border text-text-primary dark:text-dark-text-primary disabled:opacity-50"
        >
          <FileSpreadsheet size={15} />
          Excel
        </button>
      </div>

      {/* PDF এর জন্য লুকানো প্রিন্টেবল স্টেটমেন্ট */}
      <div className="fixed -left-[9999px] top-0">
        <div ref={statementRef} className="bg-white text-black p-8 w-[210mm]">
          <h1 className="text-lg font-bold text-center mb-1">SR Statement of Account</h1>
          <p className="text-center text-xs mb-4">
            {srName}
            {fromDate || toDate ? ` — ${fromDate || 'Start'} to ${toDate || 'Today'}` : ''}
          </p>
          <table className="w-full border-collapse border border-black text-xs">
            <thead>
              <tr>
                <th className="border border-black py-1.5 px-2 text-left">Invoice No</th>
                <th className="border border-black py-1.5 px-2 text-left">Date</th>
                <th className="border border-black py-1.5 px-2 text-left">Party</th>
                <th className="border border-black py-1.5 px-2 text-right">Amount</th>
                <th className="border border-black py-1.5 px-2 text-right">Commission</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv, i) => (
                <tr key={i}>
                  <td className="border border-black py-1.5 px-2">{inv.invoice_no}</td>
                  <td className="border border-black py-1.5 px-2">
                    {new Date(inv.date).toLocaleDateString('en-GB')}
                  </td>
                  <td className="border border-black py-1.5 px-2">{inv.party?.name}</td>
                  <td className="border border-black py-1.5 px-2 text-right">{inv.subtotal}</td>
                  <td className="border border-black py-1.5 px-2 text-right">
                    {inv.commission?.total || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-right text-sm font-bold mt-3">
            Total Amount: {totalAmount} | Total Commission: {totalCommission}
          </p>
        </div>
      </div>
    </div>
  );
}
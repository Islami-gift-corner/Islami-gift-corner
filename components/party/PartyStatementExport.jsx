'use client';

import { useState, useRef } from 'react';
import { exportElementToPdf } from '@/lib/pdfExport';
import StatementPages from '@/components/common/StatementPages';
import { CalendarRange, FileDown, FileSpreadsheet } from 'lucide-react';

export default function PartyStatementExport({ party, invoices, dues = [], payments = [] }) {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [exporting, setExporting] = useState(false);
  const statementRef = useRef(null);

  // ---- স্টেটমেন্টের সব ঘটনা (পূর্বের বকেয়া / ইনভয়েস / কালেকশন) একটা তালিকায় ----
  // কলাম: তারিখ | ইনভয়েস নং | ইনভয়েসের মোট মূল্য (পার্টির কাছে আসলে যত টাকার মাল দেওয়া হলো,
  // কমিশন বাদে) | আজকের কালেকশন | মোট বাকি (ধারাবাহিকভাবে)
  const usedPaymentIds = new Set();
  const events = [];

  dues.forEach((d) => {
    events.push({
      order: 0,
      date: d.date,
      label: `Previous Due${d.note ? ` (${d.note})` : ''}`,
      amount: Number(d.amount) || 0,
      collection: 0,
    });
  });

  invoices.forEach((inv) => {
    const net = (inv.subtotal || 0) - (inv.commission?.total || 0);
    let collection = 0;
    if (inv.status === 'paid') {
      // নগদ ইনভয়েসের সাথে তৈরি হওয়া কালেকশন এন্ট্রি (থাকলে) এই সারিতেই দেখানো হবে;
      // পুরনো ইনভয়েসে এন্ট্রি না থাকলে নেট টাকাটাই কালেকশন ধরা হবে
      const match = payments.find(
        (p) => !usedPaymentIds.has(p.id) && p.note === `ইনভয়েস ${inv.invoice_no}`
      );
      if (match) {
        usedPaymentIds.add(match.id);
        collection = Number(match.amount) || 0;
      } else {
        collection = net;
      }
    }
    events.push({ order: 1, date: inv.date, label: inv.invoice_no, amount: net, collection });
  });

  payments.forEach((p) => {
    if (usedPaymentIds.has(p.id)) return;
    events.push({
      order: 2,
      date: p.date,
      label: 'Collection',
      amount: 0,
      collection: Number(p.amount) || 0,
    });
  });

  events.sort((x, y) => new Date(x.date) - new Date(y.date) || x.order - y.order);

  // ধারাবাহিক মোট বাকি (শুরু থেকে)
  let running = 0;
  const withBalance = events.map((e) => {
    running += e.amount - e.collection;
    return { ...e, balance: running };
  });

  const dayStart = (d) => new Date(d).setHours(0, 0, 0, 0);
  const inRange = (e) => {
    const t = dayStart(e.date);
    if (fromDate && t < dayStart(fromDate)) return false;
    if (toDate && t > dayStart(toDate)) return false;
    return true;
  };

  const filtered = withBalance.filter(inRange);

  // শুরুর তারিখ দিলে তার আগের বাকি "Previous Balance" হিসেবে প্রথমে দেখানো হবে
  let openingBalance = 0;
  if (fromDate) {
    const before = withBalance.filter((e) => dayStart(e.date) < dayStart(fromDate));
    openingBalance = before.length ? before[before.length - 1].balance : 0;
  }

  const totalInvoiceAmount = filtered.reduce((sum, e) => sum + e.amount, 0);
  const totalCollection = filtered.reduce((sum, e) => sum + e.collection, 0);
  const closingBalance = filtered.length ? filtered[filtered.length - 1].balance : openingBalance;

  const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB');

  const tableRows = [];
  if (fromDate) {
    tableRows.push({ bold: true, shaded: true, cells: ['', 'Previous Balance', '', '', openingBalance] });
  }
  filtered.forEach((e) => {
    tableRows.push({
      cells: [fmtDate(e.date), e.label, e.amount || '', e.collection || '', e.balance],
    });
  });
  tableRows.push({
    bold: true,
    shaded: true,
    cells: ['', 'Total', totalInvoiceAmount, totalCollection, closingBalance],
  });

  const handlePdfDownload = async () => {
    setExporting(true);
    try {
      await exportElementToPdf(statementRef.current, `${party.name}-statement.pdf`);
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

      const rows = [];
      if (fromDate) {
        rows.push({
          Date: '',
          'Invoice No': 'Previous Balance',
          'Invoice Amount': '',
          Collection: '',
          'Total Due': openingBalance,
        });
      }
      filtered.forEach((e) => {
        rows.push({
          Date: fmtDate(e.date),
          'Invoice No': e.label,
          'Invoice Amount': e.amount || '',
          Collection: e.collection || '',
          'Total Due': e.balance,
        });
      });
      rows.push({
        Date: '',
        'Invoice No': 'Total',
        'Invoice Amount': totalInvoiceAmount,
        Collection: totalCollection,
        'Total Due': closingBalance,
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Statement');
      XLSX.writeFile(workbook, `${party.name}-statement.xlsx`);
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
        {filtered.length}টি এন্ট্রি (ইনভয়েস ৳{totalInvoiceAmount} · কালেকশন ৳{totalCollection} · বাকি ৳{closingBalance})
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

      {/* PDF এর জন্য লুকানো প্রিন্টেবল স্টেটমেন্ট (স্ক্রিনে দেখা যায় না, শুধু ক্যাপচার হয়) */}
      <div className="fixed -left-[9999px] top-0">
        <StatementPages
          innerRef={statementRef}
          title="Statement of Account"
          subtitle={`${party.name}${party.business_name ? ` (${party.business_name})` : ''}${
            party.phone ? ` · ${party.phone}` : ''
          }${fromDate || toDate ? ` — ${fromDate || 'Start'} to ${toDate || 'Today'}` : ''}`}
          columns={[
            { label: 'Date', width: '16%' },
            { label: 'Invoice No' },
            { label: 'Invoice Amount', align: 'right', width: '19%' },
            { label: "Today's Collection", align: 'right', width: '19%' },
            { label: 'Total Due', align: 'right', width: '16%' },
          ]}
          rows={tableRows}
          summary={
            <p className="text-right text-sm font-bold">Total Due: {closingBalance}</p>
          }
          summaryRows={3}
        />
      </div>
    </div>
  );
          }

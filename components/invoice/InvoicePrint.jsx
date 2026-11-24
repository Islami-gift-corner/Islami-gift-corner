'use client';

import { useState, useRef } from 'react';
import { auth } from '@/lib/firebase';
import { useBusiness } from '@/components/providers/BusinessProvider';
import { deleteInvoiceWithReversal } from '@/lib/invoiceUtils';
import { numberToWords } from '@/lib/numberToWords';
import { exportElementToPdf, exportElementToThermalPdf, printElementAsPdf } from '@/lib/pdfExport';
import { paginate } from '@/lib/pagination';
import {
  Printer,
  FileDown,
  FileSpreadsheet,
  ArrowLeft,
  Trash2,
  AlertTriangle,
  X,
} from 'lucide-react';


// লোগো: ব্যবসার প্রোফাইলের লোগো (না থাকলে ডিফল্ট লোগো)। যেকোনো মাপের লোগোই
// নির্দিষ্ট বক্সের ভেতরে অনুপাত ঠিক রেখে (object-contain) বসে — আলাদা ক্রপ লাগে না।
function Logo({ src, width, height, opacity = 1 }) {
  return (
    <div style={{ flexShrink: 0, width, height, opacity }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    </div>
  );
}

// জলছাপ: পেজের ঠিক মাঝখানে। transform ব্যবহার করা হয়নি — PDF বানানোর লাইব্রেরি
// (html2canvas) overflow:hidden-এর সাথে transform থাকলে ছবির অর্ধেক কেটে ফেলত;
// তাই flex দিয়ে মাঝখানে বসানো হয়েছে।
function Watermark({ src, width }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    >
      <Logo src={src} width={width} height={Math.round(width * 0.7)} opacity={0.12} />
    </div>
  );
}

// প্রতি পেজে সারির ধারণক্ষমতা (A4) — প্রতিটা পেজেই পূর্ণ হেডার থাকে
const FIRST_PAGE_ROWS = 25;
const NEXT_PAGE_ROWS = 25;
const LAST_PAGE_RESERVE = 10; // শেষ পেজে সারসংক্ষেপ + In Words + স্বাক্ষরের জায়গা
const rowWeight = (item) => Math.max(1, Math.ceil((item.product_name || '').length / 48));

export default function InvoicePrint({ invoice, onBack, allowDelete = false, onDeleted }) {
  const [paperSize, setPaperSize] = useState('a4'); // 'a4' | 'thermal'
  const [exporting, setExporting] = useState(false);
  const businessInfo = useBusiness();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const printRef = useRef(null);

  if (!invoice) return null;

  const netAmount = invoice.subtotal - (invoice.commission?.total || 0);
  const dueAmount = invoice.status === 'paid' ? 0 : netAmount;
  const cashAmount = invoice.status === 'paid' ? netAmount : 0;

  const handlePrint = async () => {
    // সরাসরি window.print() ব্যবহার করলে ব্রাউজার নিজে থেকে উপরে সাইটের নাম/তারিখ
    // আর নিচে ওয়েবসাইট লিংক যোগ করে দেয় — তাই আগে PDF বানিয়ে নতুন ট্যাবে খোলা হচ্ছে,
    // সেখান থেকে প্রিন্ট করলে শুধু আসল ইনভয়েসটাই প্রিন্ট হবে, কোনো অতিরিক্ত লেখা আসবে না।
    setExporting(true);
    try {
      await printElementAsPdf(printRef.current, { thermal: paperSize === 'thermal' });
    } catch (err) {
      if (err.message === 'popup-blocked') {
        alert(
          'ব্রাউজার পপআপ ব্লক করে দিয়েছে। ঠিকানার বারের পাশে পপআপ-ব্লক আইকনে ক্লিক করে এই সাইটের জন্য পপআপ অনুমতি দিয়ে আবার চেষ্টা করুন।'
        );
      } else {
        alert('প্রিন্ট প্রিভিউ খোলা যায়নি, আবার চেষ্টা করুন');
      }
    } finally {
      setExporting(false);
    }
  };

  const handlePdfDownload = async () => {
    setExporting(true);
    try {
      if (paperSize === 'thermal') {
        await exportElementToThermalPdf(printRef.current, `${invoice.invoice_no}.pdf`);
      } else {
        await exportElementToPdf(printRef.current, `${invoice.invoice_no}.pdf`);
      }
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

      const rows = invoice.items.map((item, index) => ({
        SL: index + 1,
        Item: item.product_name,
        Quantity: item.qty,
        Price: item.price,
        Total: item.qty * item.price,
      }));

      rows.push({});
      rows.push({ SL: '', Item: '', Quantity: '', Price: 'Total Price', Total: invoice.subtotal });
      rows.push({
        SL: '',
        Item: '',
        Quantity: '',
        Price: 'Total Commission',
        Total: invoice.commission?.total || 0,
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Invoice');
      XLSX.writeFile(workbook, `${invoice.invoice_no}.xlsx`);
    } catch (err) {
      alert('Excel তৈরি করা যায়নি, আবার চেষ্টা করুন');
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteInvoiceWithReversal({ invoice, userId: auth.currentUser?.uid });
      setConfirmDelete(false);
      if (onDeleted) onDeleted();
    } catch (err) {
      alert('ইনভয়েস ডিলিট করা যায়নি, আবার চেষ্টা করুন');
    } finally {
      setDeleting(false);
    }
  };

  const pages = paginate(invoice.items || [], {
    firstCapacity: FIRST_PAGE_ROWS,
    nextCapacity: NEXT_PAGE_ROWS,
    lastReserve: LAST_PAGE_RESERVE,
    weight: rowWeight,
  });

  const renderHeader = (thermal) => (
    <>
      <div className="flex items-center pb-1">
        <Logo src={businessInfo.logoUrl} width={thermal ? 56 : 96} height={thermal ? 56 : 96} />
        <div className="flex-1 text-center">
          <h1 className={`font-bold uppercase ${thermal ? 'text-sm' : 'text-xl'}`}>
            {businessInfo.name}
          </h1>
          {businessInfo.owner && (
            <p className={thermal ? 'text-[9px]' : 'text-xs'}>
              {businessInfo.ownerTitle}: {businessInfo.owner}
            </p>
          )}
          {businessInfo.address && (
            <p className={thermal ? 'text-[9px]' : 'text-xs'}>Address: {businessInfo.address}</p>
          )}
          {businessInfo.phones.length > 0 && (
            <p className={thermal ? 'text-[9px]' : 'text-xs'}>
              Phone: {businessInfo.phones.join(', ')}
            </p>
          )}
        </div>
        {/* লোগোর সমান জায়গা ডানে, যাতে মাঝের লেখাটা সত্যিকারভাবে সেন্টার থাকে */}
        <div className="shrink-0" style={{ width: thermal ? 56 : 96 }} />
      </div>
      <h2 className={`text-center font-semibold mt-1 mb-2 ${thermal ? 'text-xs' : 'text-base'}`}>
        INVOICE
      </h2>
    </>
  );

  const renderInfo = (thermal) => (
    <div className={`grid grid-cols-2 gap-x-4 gap-y-1 mb-3 ${thermal ? 'text-[9px]' : 'text-xs'}`}>
      <p>
        <span className="font-semibold">Invoice No:</span> {invoice.invoice_no}
      </p>
      <p>
        <span className="font-semibold">Date:</span> {new Date(invoice.date).toLocaleDateString('en-GB')}
      </p>
      <p>
        <span className="font-semibold">Customer Name:</span> {invoice.party?.name}
      </p>
      <p>
        <span className="font-semibold">Mobile:</span> {invoice.party?.phone || '-'}
      </p>
      <p className="col-span-2">
        <span className="font-semibold">Address:</span> {invoice.party?.address || '-'}
      </p>
    </div>
  );

  // startIndex: আগের পেজগুলোতে যতগুলো সারি গেছে — তার পর থেকে SL চলতে থাকবে
  const renderTable = (rows, startIndex, thermal) => (
    <table className="w-full border-collapse mb-3">
      <thead>
        <tr className={thermal ? 'text-[9px]' : 'text-xs'} style={{ borderBottom: '1px solid #ccc' }}>
          <th className="py-1.5 px-2 text-left font-semibold">SL</th>
          <th className="py-1.5 px-2 text-left font-semibold">Item</th>
          <th className="py-1.5 px-2 text-right font-semibold">Quantity</th>
          <th className="py-1.5 px-2 text-right font-semibold">Price</th>
          <th className="py-1.5 px-2 text-right font-semibold">Total</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((item, index) => (
          <tr
            key={startIndex + index}
            className={thermal ? 'text-[9px]' : 'text-xs'}
            style={{ borderBottom: '1px solid #f0f0f0' }}
          >
            <td className="py-1.5 px-2">{startIndex + index + 1}</td>
            <td className="py-1.5 px-2">{item.product_name}</td>
            <td className="py-1.5 px-2 text-right">{item.qty}</td>
            <td className="py-1.5 px-2 text-right">{item.price}</td>
            <td className="py-1.5 px-2 text-right">{item.qty * item.price}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderSummary = (thermal) => (
    <div className={`flex flex-col items-end gap-1 mb-2 ${thermal ? 'text-[9px]' : 'text-xs'}`}>
      <div className="flex justify-between w-48">
        <span>Total Price</span>
        <span className="font-semibold">{invoice.subtotal}</span>
      </div>
      <div className="flex justify-between w-48">
        <span>Regular Commission</span>
        <span>{invoice.commission?.base_amount || 0}</span>
      </div>
      <div className="flex justify-between w-48">
        <span>Extra Commission</span>
        <span>{invoice.commission?.extra_amount || 0}</span>
      </div>
      <div className="flex justify-between w-48">
        <span className="font-semibold">Total Commission</span>
        <span className="font-semibold">{invoice.commission?.total || 0}</span>
      </div>
      <div className="flex justify-between w-48 pt-1 mt-1" style={{ borderTop: '1px solid #ddd' }}>
        <span className="font-semibold">Net Amount</span>
        <span className="font-semibold">{netAmount}</span>
      </div>
      <div className="flex justify-between w-48">
        <span>Due</span>
        <span>{dueAmount}</span>
      </div>
      <div className="flex justify-between w-48">
        <span>Cash</span>
        <span>{cashAmount}</span>
      </div>
    </div>
  );

  const renderFooter = (thermal) => (
    <>
      <p className={thermal ? 'text-[9px] mb-6' : 'text-xs mb-10'}>
        <span className="font-semibold">In Words:</span> {numberToWords(netAmount)}
      </p>
      <div className={`flex justify-between ${thermal ? 'text-[9px]' : 'text-xs'}`}>
        <div className="text-center">
          <div className="w-32 pt-1" style={{ borderTop: '1px solid #000' }}>
            Signature of Customer
          </div>
        </div>
        <div className="text-center">
          <div className="w-32 pt-1" style={{ borderTop: '1px solid #000' }}>
            Cash Received
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div>
      {/* একশন বাটন — প্রিন্টের সময় লুকানো থাকবে */}
      <div className="print:hidden flex flex-wrap items-center gap-2 mb-5">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium
                       border border-border dark:border-dark-border
                       text-text-secondary dark:text-dark-text-secondary"
          >
            <ArrowLeft size={16} />
            তালিকায় ফিরুন
          </button>
        )}

        <div className="flex-1" />

        <div className="flex gap-1 p-1 rounded-xl bg-background-card dark:bg-dark-card border border-border dark:border-dark-border">
          <button
            type="button"
            onClick={() => setPaperSize('a4')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors
              ${paperSize === 'a4' ? 'bg-primary text-white' : 'text-text-secondary dark:text-dark-text-secondary'}`}
          >
            A4
          </button>
          <button
            type="button"
            onClick={() => setPaperSize('thermal')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors
              ${paperSize === 'thermal' ? 'bg-primary text-white' : 'text-text-secondary dark:text-dark-text-secondary'}`}
          >
            থার্মাল (৩")
          </button>
        </div>

        <button
          type="button"
          onClick={handlePrint}
          disabled={exporting}
          className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium
                     bg-gradient-to-r from-primary to-primary-light text-white disabled:opacity-60"
        >
          <Printer size={16} />
          {exporting ? 'তৈরি হচ্ছে...' : 'প্রিন্ট'}
        </button>
        <button
          type="button"
          onClick={handlePdfDownload}
          disabled={exporting}
          className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium
                     border border-border dark:border-dark-border text-text-primary dark:text-dark-text-primary disabled:opacity-60"
        >
          <FileDown size={16} />
          PDF
        </button>
        <button
          type="button"
          onClick={handleExcelDownload}
          disabled={exporting}
          className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium
                     border border-border dark:border-dark-border text-text-primary dark:text-dark-text-primary disabled:opacity-60"
        >
          <FileSpreadsheet size={16} />
          Excel
        </button>

        {allowDelete && (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium
                       bg-danger/10 text-danger"
          >
            <Trash2 size={16} />
            ডিলিট
          </button>
        )}
      </div>

      {/* আসল ইনভয়েস — সম্পূর্ণ ইংরেজি, সাদাকালো, বর্ডার/শ্যাডো সম্পূর্ণ ছাড়া হালকা ডিজাইন */}
      {paperSize === 'thermal' ? (
        <div ref={printRef} className="overflow-x-auto">
          <div className="relative bg-white text-black mx-auto flex flex-col overflow-hidden w-[80mm] text-[10px] p-3">
            <Watermark src={businessInfo.logoUrl} width={200} />
            <div className="relative z-10">
              {renderHeader(true)}
              {renderInfo(true)}
              {renderTable(invoice.items, 0, true)}
              {renderSummary(true)}
            </div>
            <div className="relative z-10 pt-6">{renderFooter(true)}</div>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div ref={printRef} className="mx-auto" style={{ width: '210mm' }}>
            {pages.map((pageItems, pi) => {
              const isLast = pi === pages.length - 1;
              const startIndex = pages.slice(0, pi).reduce((n, p) => n + p.length, 0);
              return (
                <div
                  key={pi}
                  data-pdf-page
                  className="relative bg-white text-black flex flex-col overflow-hidden mb-4 print:mb-0"
                  style={{ width: '210mm', height: '297mm', padding: '25.4mm 12mm 8mm' }}
                >
                  <Watermark src={businessInfo.logoUrl} width={420} />
                  <div className="relative z-10">
                    {renderHeader(false)}
                    {renderInfo(false)}
                    {renderTable(pageItems, startIndex, false)}
                    {isLast && renderSummary(false)}
                  </div>
                  {isLast && <div className="relative z-10 mt-auto pt-6">{renderFooter(false)}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ডিলিট কনফার্মেশন মডাল */}
      {confirmDelete && (
        <div
          className="print:hidden fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40"
          onClick={() => !deleting && setConfirmDelete(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-background-card dark:bg-dark-card rounded-2xl shadow-lg
                       border border-border dark:border-dark-border p-6"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-full bg-danger/10">
                  <AlertTriangle size={20} className="text-danger" />
                </div>
                <h2 className="text-base font-semibold text-text-primary dark:text-dark-text-primary">
                  ইনভয়েস ডিলিট করুন?
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="p-1 rounded-lg text-text-muted hover:bg-background dark:hover:bg-dark-background"
              >
                <X size={18} />
              </button>
            </div>

            <ul className="text-xs text-text-secondary dark:text-dark-text-secondary list-disc list-inside mb-5 flex flex-col gap-1">
              <li>বিক্রি হওয়া পণ্যের স্টক আবার ফেরত যোগ হবে</li>
              {invoice.party_id && <li>পার্টির বাকি/বিক্রয়ের হিসাব সমন্বয় হবে</li>}
              {invoice.ledger_entry_id && <li>ঠালি খাতার সংশ্লিষ্ট আয়ের এন্ট্রিও মুছে যাবে</li>}
              <li className="text-danger">এই কাজ ফিরিয়ে আনা যাবে না</li>
            </ul>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="flex-1 rounded-xl py-2.5 text-sm font-medium
                           border border-border dark:border-dark-border
                           text-text-secondary dark:text-dark-text-secondary disabled:opacity-60"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-xl py-2.5 text-sm font-medium text-white
                           bg-danger hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {deleting ? 'ডিলিট হচ্ছে...' : 'হ্যাঁ, ডিলিট করুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

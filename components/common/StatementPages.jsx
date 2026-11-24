'use client';

import { useBusiness } from '@/components/providers/BusinessProvider';
import { paginate } from '@/lib/pagination';

// প্রতি পেজের সারির ধারণক্ষমতা (A4)। প্রতিটা পেজে হেডার ও টেবিলের কলাম-হেডিং আবার আসে।
const FIRST_PAGE_ROWS = 30;
const NEXT_PAGE_ROWS = 34;

/**
 * যেকোনো স্টেটমেন্ট (পার্টি, মাসিক আয়-ব্যয় ইত্যাদি) A4 পেজে সাজানোর কম্পোনেন্ট।
 * লম্বা হলে একাধিক পেজে ভাগ হয় এবং প্রতিটা পেজের শুরুতে হেডার ও কলামের নাম থাকে।
 * স্ক্রিনে দেখানোর জন্য নয় — parent এটাকে লুকানো জায়গায় রেখে innerRef দিয়ে PDF বানায়
 * (pdfExport এখানকার data-pdf-page পেজগুলো আলাদা আলাদা A4 পেজ হিসেবে নেয়)।
 *
 * @param {string} title
 * @param {string} subtitle
 * @param {{label:string, align?:'left'|'right', width?:string}[]} columns
 * @param {{cells:(string|number)[], weight?:number, bold?:boolean, shaded?:boolean}[]} rows
 * @param {React.ReactNode} summary - শেষ পেজে টেবিলের নিচে যা দেখাবে
 * @param {number} summaryRows - summary কত সারির জায়গা নেবে (আনুমানিক)
 * @param {React.Ref} innerRef
 */
export default function StatementPages({
  title,
  subtitle,
  columns,
  rows,
  summary = null,
  summaryRows = 6,
  innerRef,
}) {
  const business = useBusiness();

  const pages = paginate(rows, {
    firstCapacity: FIRST_PAGE_ROWS,
    nextCapacity: NEXT_PAGE_ROWS,
    lastReserve: summaryRows,
    weight: (r) => r.weight || 1,
  });

  return (
    <div ref={innerRef} style={{ width: '210mm' }}>
      {pages.map((pageRows, pi) => {
        const isLast = pi === pages.length - 1;
        return (
          <div
            key={pi}
            data-pdf-page
            className="bg-white text-black flex flex-col overflow-hidden"
            style={{ width: '210mm', height: '297mm', padding: '10mm 12mm 10mm' }}
          >
            <div className="text-center mb-3">
              <h1 className="text-lg font-bold uppercase">{business.name}</h1>
              {business.address && <p className="text-[11px]">{business.address}</p>}
              {business.phones.length > 0 && (
                <p className="text-[11px]">Phone: {business.phones.join(', ')}</p>
              )}
              <h2 className="text-base font-semibold mt-2">{title}</h2>
              {subtitle && <p className="text-xs">{subtitle}</p>}
            </div>

            <table className="w-full border-collapse text-xs" style={{ border: '1px solid #000' }}>
              <thead>
                <tr style={{ background: '#f1f1f1' }}>
                  {columns.map((c) => (
                    <th
                      key={c.label}
                      className={`py-1.5 px-2 font-semibold ${c.align === 'right' ? 'text-right' : 'text-left'}`}
                      style={{ border: '1px solid #000', width: c.width }}
                    >
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r, ri) => (
                  <tr
                    key={ri}
                    className={r.bold ? 'font-semibold' : ''}
                    style={r.shaded ? { background: '#f7f7f7' } : undefined}
                  >
                    {r.cells.map((cell, ci) => (
                      <td
                        key={ci}
                        className={`py-1.5 px-2 ${columns[ci].align === 'right' ? 'text-right' : 'text-left'}`}
                        style={{ border: '1px solid #999' }}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            {isLast && summary && <div className="mt-4">{summary}</div>}

            <p className="mt-auto pt-2 text-[10px] text-right" style={{ color: '#777' }}>
              Page {pi + 1} of {pages.length}
            </p>
          </div>
        );
      })}
    </div>
  );
            }

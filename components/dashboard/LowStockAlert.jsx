'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ref, onValue } from 'firebase/database';
import { database } from '@/lib/firebase';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

export default function LowStockAlert() {
  const [companyGroups, setCompanyGroups] = useState([]); // [{ companyId, companyName, count }]
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const companiesRef = ref(database, 'companies');
    const unsubscribe = onValue(companiesRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setCompanyGroups([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }

      const groups = [];
      let total = 0;

      Object.entries(data).forEach(([companyId, company]) => {
        const products = company.products || {};
        let count = 0;
        Object.values(products).forEach((product) => {
          const stock = Number(product.stock_qty) || 0;
          const threshold = Number(product.low_stock_threshold) || 5;
          if (stock <= threshold) count += 1;
        });
        if (count > 0) {
          groups.push({ companyId, companyName: company.name, count });
          total += count;
        }
      });

      // যেই কোম্পানিতে সবচেয়ে বেশি লো স্টক প্রোডাক্ট, সেটা আগে
      groups.sort((a, b) => b.count - a.count);
      setCompanyGroups(groups);
      setTotalCount(total);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading || totalCount === 0) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-2 text-xs text-warning py-1.5"
      >
        <span className="flex items-center gap-1.5">
          <AlertTriangle size={13} />
          লো স্টক এলার্ট ({totalCount}টি প্রোডাক্ট)
        </span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {expanded && (
        <div className="flex flex-col gap-1.5 mt-1 mb-1">
          {companyGroups.map((group) => (
            <Link
              key={group.companyId}
              href="/admin/products"
              className="flex items-center justify-between text-sm bg-warning/5 rounded-xl px-3 py-2
                         hover:bg-warning/10 transition-colors"
            >
              <span className="text-text-primary dark:text-dark-text-primary">
                {group.companyName}
              </span>
              <span className="text-xs font-semibold text-warning">{group.count}টি প্রোডাক্ট</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
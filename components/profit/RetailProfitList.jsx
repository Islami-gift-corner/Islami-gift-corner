'use client';

import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '@/lib/firebase';
import { calculateRetailSaleProfit } from '@/lib/retailUtils';
import { ChevronDown, ChevronUp, ShoppingBag } from 'lucide-react';

export default function RetailProfitList() {
  const [sales, setSales] = useState([]);
  const [companies, setCompanies] = useState({});
  const [retailProducts, setRetailProducts] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const unsub1 = onValue(ref(database, 'retail_sales'), (s) => {
      const data = s.val();
      const list = data
        ? Object.entries(data)
            .map(([id, v]) => ({ id, ...v }))
            .sort((a, b) => new Date(b.date) - new Date(a.date))
        : [];
      setSales(list);
      setLoading(false);
    });
    const unsub2 = onValue(ref(database, 'companies'), (s) => setCompanies(s.val() || {}));
    const unsub3 = onValue(ref(database, 'retail_products'), (s) => setRetailProducts(s.val() || {}));
    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, []);

  if (loading) {
    return <p className="text-sm text-text-muted dark:text-dark-text-secondary">লোড হচ্ছে...</p>;
  }

  if (sales.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 py-12 rounded-2xl
                   border border-dashed border-border dark:border-dark-border"
      >
        <ShoppingBag size={28} className="text-text-muted" />
        <p className="text-sm text-text-muted dark:text-dark-text-secondary">
          এখনো কোনো খুচরা বিক্রয় নেই
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 max-w-2xl">
      {sales.map((sale) => {
        const { items, totalProfit, hasUnknownCost } = calculateRetailSaleProfit(
          sale,
          companies,
          retailProducts
        );
        const isOpen = expandedId === sale.id;

        return (
          <div
            key={sale.id}
            className="bg-background-card dark:bg-dark-card rounded-2xl shadow-sm
                       border border-border dark:border-dark-border overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setExpandedId(isOpen ? null : sale.id)}
              className="w-full flex items-center justify-between gap-3 p-4 text-left"
            >
              <div>
                <p className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">
                  {sale.sale_no}
                </p>
                <p className="text-xs text-text-secondary dark:text-dark-text-secondary">
                  {sale.customer_name} · {new Date(sale.date).toLocaleDateString('bn-BD')}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-success">৳{Math.round(totalProfit)}</span>
                {isOpen ? (
                  <ChevronUp size={16} className="text-text-muted" />
                ) : (
                  <ChevronDown size={16} className="text-text-muted" />
                )}
              </div>
            </button>

            {isOpen && (
              <div className="px-4 pb-4 flex flex-col gap-1.5 border-t border-border dark:border-dark-border pt-3">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary dark:text-dark-text-secondary">
                      {item.name} ({item.qty}
                      {item.unit ? ` ${item.unit}` : ''})
                      {item.source === 'manual' && (
                        <span className="ml-1 text-text-muted">— ম্যানুয়াল, প্রফিট গণনা হয়নি</span>
                      )}
                    </span>
                    <span
                      className={`font-medium ${
                        item.source === 'manual' ? 'text-text-muted' : 'text-success'
                      }`}
                    >
                      ৳{Math.round(item.item_profit)}
                    </span>
                  </div>
                ))}
                {hasUnknownCost && (
                  <p className="text-[11px] text-warning mt-1">
                    💡 এই বিক্রয়ে ম্যানুয়ালি লেখা পণ্য আছে, যার ক্রয়মূল্য জানা নেই — তাই তার প্রফিট
                    হিসাবে ধরা হয়নি।
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

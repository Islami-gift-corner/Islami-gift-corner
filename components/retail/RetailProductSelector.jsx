'use client';

import { useState, useEffect, useRef } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '@/lib/firebase';
import { ShoppingBag, Search, X } from 'lucide-react';

export default function RetailProductSelector({ value, onChange }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const productsRef = ref(database, 'retail_products');
    const unsubscribe = onValue(productsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([id, value]) => ({ id, ...value }));
        setProducts(list);
      } else {
        setProducts([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedProduct = products.find((p) => p.id === value);

  const filteredProducts = products.filter((p) =>
    p.name?.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleSelect = (product) => {
    onChange(product.id, product);
    setSearchText('');
    setShowDropdown(false);
  };

  const handleClear = () => {
    onChange('', null);
    setSearchText('');
  };

  if (loading) {
    return (
      <p className="text-sm text-text-muted dark:text-dark-text-secondary">
        খুচরা পণ্য লোড হচ্ছে...
      </p>
    );
  }

  if (products.length === 0) {
    return (
      <p className="text-sm text-text-muted dark:text-dark-text-secondary">
        এখনো কোনো খুচরা পণ্য যোগ করা হয়নি — আগে "খুচরা পণ্য" ট্যাব থেকে যোগ করুন
      </p>
    );
  }

  return (
    <div ref={wrapperRef} className="relative w-full">
      {selectedProduct && !showDropdown ? (
        <button
          type="button"
          onClick={() => setShowDropdown(true)}
          className="w-full flex items-center justify-between gap-2 rounded-xl border border-border dark:border-dark-border
                     bg-background dark:bg-dark-background text-left px-3 py-2.5"
        >
          <span className="flex items-center gap-2 text-sm text-text-primary dark:text-dark-text-primary truncate">
            <ShoppingBag size={16} className="shrink-0 text-text-muted" />
            <span className="truncate">
              {selectedProduct.name} (স্টক: {selectedProduct.stock_qty ?? 0}{' '}
              {selectedProduct.unit || 'পিস'})
            </span>
          </span>
          <X
            size={14}
            className="shrink-0 text-text-muted"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
          />
        </button>
      ) : (
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted dark:text-dark-text-secondary pointer-events-none"
          />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onFocus={() => setShowDropdown(true)}
            placeholder="খুচরা পণ্যের নাম লিখে সার্চ করুন..."
            className="w-full rounded-xl border border-border dark:border-dark-border
                       bg-background dark:bg-dark-background
                       text-text-primary dark:text-dark-text-primary text-sm
                       pl-9 pr-3 py-2.5
                       focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      )}

      {showDropdown && (
        <div
          className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-xl border border-border dark:border-dark-border
                     bg-background-card dark:bg-dark-card shadow-lg"
        >
          {filteredProducts.length === 0 ? (
            <p className="text-sm text-text-muted dark:text-dark-text-secondary px-3 py-3">
              কোনো পণ্য পাওয়া যায়নি
            </p>
          ) : (
            filteredProducts.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => handleSelect(product)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left text-sm
                           hover:bg-primary/5 border-b border-border dark:border-dark-border last:border-b-0"
              >
                <span className="text-text-primary dark:text-dark-text-primary truncate">
                  {product.name}
                </span>
                <span className="shrink-0 text-xs text-text-muted dark:text-dark-text-secondary">
                  স্টক: {product.stock_qty ?? 0} {product.unit || 'পিস'}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
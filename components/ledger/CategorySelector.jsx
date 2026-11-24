'use client';

import { useState, useEffect } from 'react';
import { ref, onValue, push, set } from 'firebase/database';
import { database } from '@/lib/firebase';
import { Tag } from 'lucide-react';

const DEFAULT_CATEGORIES = {
  income: ['বিক্রয়', 'পার্টি কালেকশন', 'অন্যান্য আয়'],
  expense: ['দোকান ভাড়া', 'বিদ্যুৎ বিল', 'পরিবহন', 'বেতন', 'ক্ষতি/ড্যামেজ', 'অন্যান্য ব্যয়'],
};

export default function CategorySelector({ type, value, onChange }) {
  const [categories, setCategories] = useState([]);
  const [showAddNew, setShowAddNew] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const categoriesRef = ref(database, `ledger_categories/${type}`);
    const unsubscribe = onValue(categoriesRef, (snapshot) => {
      const data = snapshot.val();
      const custom = data ? Object.values(data).map((v) => v.name) : [];
      // ডিফল্ট ক্যাটাগরি + ইউজারের যোগ করা কাস্টম ক্যাটাগরি, ডুপ্লিকেট বাদ দিয়ে
      const merged = [...new Set([...DEFAULT_CATEGORIES[type], ...custom])];
      setCategories(merged);
    });
    return () => unsubscribe();
  }, [type]);

  const handleSelectChange = (e) => {
    const selected = e.target.value;
    if (selected === '__new__') {
      setShowAddNew(true);
      return;
    }
    onChange(selected);
  };

  const handleAddNewCategory = async () => {
    if (!newCategory.trim()) return;
    setSaving(true);
    try {
      const newRef = push(ref(database, `ledger_categories/${type}`));
      await set(newRef, { name: newCategory.trim() });
      onChange(newCategory.trim());
      setNewCategory('');
      setShowAddNew(false);
    } catch (err) {
      alert('নতুন খাত যোগ করা যায়নি');
    } finally {
      setSaving(false);
    }
  };

  if (showAddNew) {
    return (
      <div className="flex gap-2">
        <input
          type="text"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="নতুন খাতের নাম"
          className="flex-1 rounded-xl border border-border dark:border-dark-border
                     bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                     px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-text-muted"
        />
        <button
          type="button"
          onClick={handleAddNewCategory}
          disabled={saving}
          className="rounded-xl px-4 py-2 text-sm font-medium text-white bg-primary disabled:opacity-60"
        >
          যোগ করুন
        </button>
        <button
          type="button"
          onClick={() => setShowAddNew(false)}
          className="rounded-xl px-3 py-2 text-sm text-text-secondary dark:text-dark-text-secondary border border-border dark:border-dark-border"
        >
          বাতিল
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <Tag
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted dark:text-dark-text-secondary pointer-events-none"
      />
      <select
        value={value || ''}
        onChange={handleSelectChange}
        className="w-full appearance-none rounded-xl border border-border dark:border-dark-border
                   bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary text-sm
                   pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
      >
        <option value="" disabled>
          খাত নির্বাচন করুন
        </option>
        {categories.map((cat) => (
          <option key={cat} value={cat}>
            {cat}
          </option>
        ))}
        <option value="__new__">+ নতুন খাত যোগ করুন</option>
      </select>
    </div>
  );
          }

'use client';

import { useState, useEffect } from 'react';
import { ref, onValue, update, remove } from 'firebase/database';
import { database, auth } from '@/lib/firebase';
import { logActivity } from '@/lib/activityLog';
import { Building2, Phone, MapPin, Percent, Pencil, Trash2, Check, X } from 'lucide-react';

export default function CompanyList() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    const companiesRef = ref(database, 'companies');
    const unsubscribe = onValue(companiesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([id, value]) => ({ id, ...value }));
        setCompanies(list);
      } else {
        setCompanies([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const startEdit = (company) => {
    setEditingId(company.id);
    setEditForm({
      name: company.name || '',
      address: company.address || '',
      phone: company.phone || '',
      default_commission_percent: company.default_commission_percent ?? 0,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async (id) => {
    try {
      await update(ref(database, `companies/${id}`), {
        name: editForm.name.trim(),
        address: editForm.address.trim(),
        phone: editForm.phone.trim(),
        default_commission_percent: Number(editForm.default_commission_percent) || 0,
      });
      setEditingId(null);
    } catch (err) {
      alert('আপডেট করা যায়নি, আবার চেষ্টা করুন');
    }
  };

  const handleDelete = async (id) => {
    try {
      const companyName = companies.find((c) => c.id === id)?.name || id;
      await remove(ref(database, `companies/${id}`));
      await logActivity({
        userId: auth.currentUser?.uid,
        action: 'কোম্পানি ডিলিট',
        target: companyName,
      });
      setConfirmDeleteId(null);
    } catch (err) {
      alert('ডিলিট করা যায়নি, আবার চেষ্টা করুন');
    }
  };

  if (loading) {
    return (
      <p className="text-sm text-text-muted dark:text-dark-text-secondary">
        লোড হচ্ছে...
      </p>
    );
  }

  if (companies.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 py-12 rounded-2xl
                   border border-dashed border-border dark:border-dark-border"
      >
        <Building2 size={28} className="text-text-muted" />
        <p className="text-sm text-text-muted dark:text-dark-text-secondary">
          এখনো কোনো কোম্পানি যোগ করা হয়নি
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {companies.map((company) => {
        const isEditing = editingId === company.id;

        return (
          <div
            key={company.id}
            className="bg-background-card dark:bg-dark-card rounded-2xl shadow-sm
                       border border-border dark:border-dark-border p-4"
          >
            {isEditing ? (
              <div className="flex flex-col gap-2.5">
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="কোম্পানির নাম"
                  className="w-full rounded-lg border border-border dark:border-dark-border
                             bg-background dark:bg-dark-background
                             text-text-primary dark:text-dark-text-primary
                             px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm((p) => ({ ...p, address: e.target.value }))}
                  placeholder="ঠিকানা"
                  className="w-full rounded-lg border border-border dark:border-dark-border
                             bg-background dark:bg-dark-background
                             text-text-primary dark:text-dark-text-primary
                             px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="ফোন"
                  className="w-full rounded-lg border border-border dark:border-dark-border
                             bg-background dark:bg-dark-background
                             text-text-primary dark:text-dark-text-primary
                             px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <input
                  type="number"
                  step="0.1"
                  value={editForm.default_commission_percent}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, default_commission_percent: e.target.value }))
                  }
                  placeholder="কমিশন %"
                  className="w-full rounded-lg border border-border dark:border-dark-border
                             bg-background dark:bg-dark-background
                             text-text-primary dark:text-dark-text-primary
                             px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <div className="flex gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => saveEdit(company.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium
                               text-white bg-gradient-to-r from-primary to-primary-light"
                  >
                    <Check size={16} />
                    সংরক্ষণ
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium
                               border border-border dark:border-dark-border
                               text-text-secondary dark:text-dark-text-secondary"
                  >
                    <X size={16} />
                    বাতিল
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="flex items-center gap-2 font-semibold text-text-primary dark:text-dark-text-primary">
                    <Building2 size={17} className="text-primary shrink-0" />
                    {company.name}
                  </h3>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(company)}
                      aria-label="এডিট করুন"
                      className="p-1.5 rounded-lg text-text-muted hover:bg-background dark:hover:bg-dark-background"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(company.id)}
                      aria-label="ডিলিট করুন"
                      className="p-1.5 rounded-lg text-danger hover:bg-danger/10"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 text-sm text-text-secondary dark:text-dark-text-secondary">
                  {company.address && (
                    <p className="flex items-center gap-2">
                      <MapPin size={14} className="shrink-0" />
                      {company.address}
                    </p>
                  )}
                  {company.phone && (
                    <p className="flex items-center gap-2">
                      <Phone size={14} className="shrink-0" />
                      {company.phone}
                    </p>
                  )}
                  <p className="flex items-center gap-2">
                    <Percent size={14} className="shrink-0" />
                    ডিফল্ট কমিশন: {company.default_commission_percent ?? 0}%
                  </p>
                </div>

                {confirmDeleteId === company.id && (
                  <div className="mt-3 p-3 rounded-xl bg-danger/10 flex flex-col gap-2">
                    <p className="text-xs text-danger">
                      এই কোম্পানি ডিলিট করলে এর সব প্রোডাক্টও মুছে যাবে। নিশ্চিত?
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleDelete(company.id)}
                        className="flex-1 rounded-lg py-1.5 text-xs font-medium text-white bg-danger"
                      >
                        হ্যাঁ, ডিলিট করুন
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="flex-1 rounded-lg py-1.5 text-xs font-medium border border-border dark:border-dark-border
                                   text-text-secondary dark:text-dark-text-secondary"
                      >
                        বাতিল
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { database } from '@/lib/firebase';
import { Building2, Image as ImageIcon, CheckCircle2, AlertCircle, Upload, Trash2 } from 'lucide-react';
import { brand } from '@/lib/brand';

// নতুন প্রতিষ্ঠানে প্রথমবার ফর্ম ফাঁকা থাকবে (শুধু নাম ব্র্যান্ড কনফিগ থেকে আসে)
const FALLBACK = {
  name: brand.name,
  owner: '',
  owner_title: 'Proprietor',
  phone1: '',
  phone2: '',
  address: '',
  logo_url: '',
};

// আপলোড করা ছবি ছোট করে (সর্বোচ্চ ৪০০px) data URL বানানো হয় — ডাটাবেসেই সেভ হয়,
// আলাদা স্টোরেজ/হোস্টিং লাগে না, আর PDF/প্রিন্টেও ঠিকমতো আসে
const MAX_LOGO_SIDE = 800;

function fileToResizedDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read-failed'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('bad-image'));
      img.onload = () => {
        const scale = Math.min(1, MAX_LOGO_SIDE / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function BusinessProfile() {
  const [form, setForm] = useState(FALLBACK);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const profileRef = ref(database, 'business_profile');
    const unsubscribe = onValue(profileRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setForm({
          name: data.name || FALLBACK.name,
          owner: data.owner || '',
          owner_title: data.owner_title || FALLBACK.owner_title,
          phone1: data.phone?.[0] || '',
          phone2: data.phone?.[1] || '',
          address: data.address || '',
          logo_url: data.logo_url || '',
        });
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (error) setError('');
  };

  const handleLogoFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('শুধু ছবির ফাইল (PNG/JPG) দিন');
      return;
    }
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      setForm((prev) => ({ ...prev, logo_url: dataUrl }));
      setError('');
      setSuccess('');
    } catch (err) {
      setError('ছবিটা পড়া যায়নি, অন্য ছবি দিয়ে চেষ্টা করুন');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.name.trim()) {
      setError('ব্যবসার নাম আবশ্যক');
      return;
    }

    setSaving(true);
    try {
      await update(ref(database, 'business_profile'), {
        name: form.name.trim(),
        owner: form.owner.trim(),
        owner_title: form.owner_title.trim() || 'Proprietor',
        phone: [form.phone1.trim(), form.phone2.trim()].filter(Boolean),
        address: form.address.trim(),
        logo_url: form.logo_url.trim(),
        updated_at: new Date().toISOString(),
      });
      setSuccess('বিজনেস প্রোফাইল আপডেট হয়েছে — সব ইনভয়েসে এখন থেকে এই তথ্য দেখাবে');
    } catch (err) {
      setError('আপডেট করা যায়নি, আবার চেষ্টা করুন');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-text-muted dark:text-dark-text-secondary">লোড হচ্ছে...</p>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">
      {/* ফর্ম */}
      <div
        className="bg-background-card dark:bg-dark-card rounded-2xl shadow-sm
                   border border-border dark:border-dark-border p-5"
      >
        <h2 className="flex items-center gap-2 text-base font-semibold text-text-primary dark:text-dark-text-primary mb-4">
          <Building2 size={18} className="text-primary" />
          ব্যবসার তথ্য
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1.5">
              ব্যবসার নাম *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={handleChange('name')}
              className="w-full rounded-xl border border-border dark:border-dark-border
                         bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                         px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1.5">
              মালিক / কর্তৃপক্ষের নাম
            </label>
            <input
              type="text"
              value={form.owner}
              onChange={handleChange('owner')}
              className="w-full rounded-xl border border-border dark:border-dark-border
                         bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                         px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1.5">
              পদবি (ইনভয়েসে নামের আগে দেখাবে)
            </label>
            <input
              type="text"
              value={form.owner_title}
              onChange={handleChange('owner_title')}
              placeholder="Proprietor / Managing Director / Owner"
              className="w-full rounded-xl border border-border dark:border-dark-border
                         bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                         px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-text-muted"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1.5">
                ফোন ১
              </label>
              <input
                type="text"
                value={form.phone1}
                onChange={handleChange('phone1')}
                className="w-full rounded-xl border border-border dark:border-dark-border
                           bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                           px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1.5">
                ফোন ২
              </label>
              <input
                type="text"
                value={form.phone2}
                onChange={handleChange('phone2')}
                className="w-full rounded-xl border border-border dark:border-dark-border
                           bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                           px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1.5">
              ঠিকানা
            </label>
            <input
              type="text"
              value={form.address}
              onChange={handleChange('address')}
              className="w-full rounded-xl border border-border dark:border-dark-border
                         bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                         px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1.5">
              লোগো (ঐচ্ছিক)
            </label>
            <div className="flex items-center gap-2 mb-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoFile}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-xl border border-border dark:border-dark-border
                           px-3 py-2 text-xs font-medium text-text-primary dark:text-dark-text-primary"
              >
                <Upload size={14} />
                ছবি আপলোড
              </button>
              {form.logo_url && (
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, logo_url: '' }))}
                  className="flex items-center gap-1.5 rounded-xl border border-border dark:border-dark-border
                             px-3 py-2 text-xs font-medium text-danger"
                >
                  <Trash2 size={14} />
                  সরান
                </button>
              )}
            </div>
            <p className="text-[11px] text-text-muted dark:text-dark-text-secondary mb-2">
              একটাই লোগো দিন: ইনভয়েসের হেডারে ছোট করে এবং মাঝখানে হালকা জলছাপ হিসেবে বসবে।
              PNG, স্বচ্ছ (transparent) ব্যাকগ্রাউন্ড, চওড়া লোগো হলে প্রায় ১০০০×৩০০, চৌকো হলে ৬০০×৬০০।
            </p>
            <div className="relative">
              <ImageIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={form.logo_url.startsWith('data:') ? '' : form.logo_url}
                onChange={handleChange('logo_url')}
                placeholder={form.logo_url.startsWith('data:') ? 'ছবি আপলোড করা আছে' : 'অথবা লোগোর লিংক দিন — খালি রাখলে ডিফল্ট লোগো'}
                className="w-full rounded-xl border border-border dark:border-dark-border
                           bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary
                           pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-text-muted"
              />
            </div>
          </div>

          {error && (
            <p className="flex items-center gap-2 text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">
              <AlertCircle size={14} />
              {error}
            </p>
          )}
          {success && (
            <p className="flex items-center gap-2 text-xs text-success bg-success/10 rounded-lg px-3 py-2">
              <CheckCircle2 size={14} />
              {success}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="mt-1 w-full rounded-xl py-2.5 text-sm font-medium text-white
                       bg-gradient-to-r from-primary to-primary-light disabled:opacity-60"
          >
            {saving ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
          </button>
        </form>
      </div>

      {/* ইনভয়েস হেডার প্রিভিউ */}
      <div>
        <h3 className="text-sm font-semibold text-text-primary dark:text-dark-text-primary mb-3">
          ইনভয়েস হেডার প্রিভিউ
        </h3>
        <div className="bg-white rounded-2xl border border-border dark:border-dark-border p-5">
          <div className="flex items-start gap-3">
            <div className="relative w-14 h-14 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={form.logo_url || brand.logo}
                alt="লোগো"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="font-bold text-primary text-base">{form.name}</h1>
              {form.owner && (
                <p className="text-xs text-gray-600">
                  {form.owner_title || 'Proprietor'}: {form.owner}
                </p>
              )}
              {(form.phone1 || form.phone2) && (
                <p className="text-xs text-gray-600">
                  ফোন: {[form.phone1, form.phone2].filter(Boolean).join(', ')}
                </p>
              )}
              {form.address && <p className="text-xs text-gray-600">{form.address}</p>}
            </div>
          </div>
        </div>
        <p className="text-xs text-text-muted dark:text-dark-text-secondary mt-2">
          💡 এখানে সংরক্ষণ করলে সব ইনভয়েসের হেডারে এই তথ্য স্বয়ংক্রিয়ভাবে বসবে।
        </p>
      </div>
    </div>
  );
  }

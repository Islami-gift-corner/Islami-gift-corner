import { brand } from '@/lib/brand';

// PWA ম্যানিফেস্ট — আগের স্ট্যাটিক manifest.json এর বদলে ব্র্যান্ড কনফিগ থেকে তৈরি হয়
export default function manifest() {
  return {
    name: brand.name,
    short_name: brand.shortName,
    description: brand.description,
    start_url: '/',
    display: 'standalone',
    background_color: '#F3F6F4',
    theme_color: brand.themeColor,
    orientation: 'portrait',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
  };
}

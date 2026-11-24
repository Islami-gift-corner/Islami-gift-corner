import './globals.css';
import ServiceWorkerRegister from '@/components/pwa/ServiceWorkerRegister';
import { BusinessProvider } from '@/components/providers/BusinessProvider';
import { brand } from '@/lib/brand';
import { buildThemeCss } from '@/lib/theme';

export const metadata = {
  title: brand.name,
  description: brand.description,
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-192.png',
  },
};

export const viewport = {
  themeColor: brand.themeColor,
};

export default function RootLayout({ children }) {
  return (
    <html lang="bn">
      <head>
        {/* NEXT_PUBLIC_THEME_COLOR থেকে তৈরি কালার প্যালেট */}
        <style dangerouslySetInnerHTML={{ __html: buildThemeCss(brand.themeColor) }} />
      </head>
      <body>
        <ServiceWorkerRegister />
        <BusinessProvider>{children}</BusinessProvider>
      </body>
    </html>
  );
}

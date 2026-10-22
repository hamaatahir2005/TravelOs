import type { Metadata, Viewport } from 'next';
import './globals.css';
import { readLanguage } from '@/lib/server-language';
export const metadata: Metadata = {
  title: 'Travel OS · Agency workspace',
  description: 'Private operations, tickets, visas and accounting for your travel agency.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Travel OS', statusBarStyle: 'default' },
  robots: { index: false, follow: false },
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#123C73' };
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await readLanguage();
  return (
    <html lang={lang} dir={lang === 'en' ? 'ltr' : 'rtl'} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}

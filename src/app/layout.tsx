import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import BottomNav from '@/components/BottomNav';
import './globals.css';

export const metadata: Metadata = {
  title: 'LeadFinder — Find Business Leads Worldwide',
  description:
    'Find local businesses with weak online presence across Germany, UK, USA, Saudi Arabia, UAE and more. Scrapes emails, scores website quality, generates personalized cold outreach in German, English and Arabic.',
  keywords: 'lead finder, business leads, cold outreach, email scraping, website quality, global leads',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'LeadFinder',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#020609',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-[#020609] text-slate-200">
        {children}
        <BottomNav />
        <Script
          id="sw-register"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js')}`,
          }}
        />
      </body>
    </html>
  );
}

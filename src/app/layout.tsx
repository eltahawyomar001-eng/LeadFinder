import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LeadFinder.de — Find Local Business Leads Across Germany',
  description:
    'Discover local German businesses with weak online presence. Powered by Google Places API. Generate WhatsApp outreach messages instantly.',
  keywords: 'lead finder, Germany, local business, WhatsApp, web design leads, Google Places',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-[#020609] text-slate-200">
        {children}
      </body>
    </html>
  );
}

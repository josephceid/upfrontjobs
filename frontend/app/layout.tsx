import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  metadataBase: new URL('https://upfrontjobs.co.uk'),
  title: {
    default: 'Upfront Jobs — Find jobs that show you the salary',
    template: '%s | Upfront Jobs',
  },
  description:
    'Every job on Upfront Jobs shows a real salary range. No "competitive salary" nonsense — just honest job listings.',
  openGraph: {
    siteName: 'Upfront Jobs',
    type: 'website',
    locale: 'en_GB',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}

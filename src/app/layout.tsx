import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import { Inter } from 'next/font/google';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'MozAssets - Enterprise Asset Management',
  description: 'Track, manage, and maintain your company assets with MozAssets by Mozetech',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`antialiased ${inter.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

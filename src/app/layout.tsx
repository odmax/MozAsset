import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'MozAssets - Enterprise Asset Management',
  description: 'Track, manage, and maintain your company assets with MozAssets by Mozetech',
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
};

const GADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {GADS_ID && process.env.NODE_ENV === 'production' && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${GADS_ID}`}></script>
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${GADS_ID}');
                `,
              }}
            />
          </>
        )}
      </head>
      <body className={`antialiased ${inter.variable}`}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}

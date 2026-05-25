import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from '@/app/components/ui/toaster';
import { AuthProvider } from '@/lib/authContext';

export const metadata: Metadata = {
  title: 'DawaiMitra | AI ফার্মাসিস্ট - বাংলাদেশ',
  description:
    'DawaiMitra হলো বাংলাদেশের জন্য একটি AI-চালিত ফার্মাসিস্ট অ্যাপ। ওষুধের ছবি স্ক্যান করুন বা নাম টাইপ করুন এবং তাৎক্ষণিক নিরাপত্তা পরামর্শ পান।',
  keywords: ['medicine', 'pharmacy', 'Bangladesh', 'AI', 'drug interaction', 'ওষুধ', 'ফার্মাসিস্ট'],
  authors: [{ name: 'DawaiMitra Team' }],
  manifest: '/manifest.json',
  icons: {
    icon: '/icon-192x192.png',
    apple: '/icon-192x192.png',
  },
  openGraph: {
    title: 'DawaiMitra | AI ফার্মাসিস্ট',
    description: 'বাংলাদেশের জন্য AI-চালিত ওষুধ নিরাপত্তা পরীক্ষক',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#0a1628',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="bn" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Noto+Sans+Bengali:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}

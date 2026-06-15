import Footer from '@/components/Footer';
import Header from '@/components/Header';
import Providers from '@/components/Providers';
import './globals.css';

export const metadata = {
  metadataBase: new URL('https://f1-xi-weld.vercel.app'),
  title: {
    default: 'Pit Lane Hub | Live F1 Data & Racing Stats',
    template: '%s | Pit Lane Hub',
  },
  description: 'Your ultimate destination for live F1 racing data, driver standings, race calendar, and real-time timing. Free and open source. By Abdulaziz.',
  keywords: ['F1', 'Formula 1', 'F1 standings', 'F1 live timing', 'F1 drivers', 'F1 schedule', 'racing', 'motorsport'],
  authors: [{ name: 'Abdulaziz', url: 'https://github.com/justAbdulaziz10' }],
  creator: 'Abdulaziz',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://f1-xi-weld.vercel.app',
    siteName: 'Pit Lane Hub',
    title: 'Pit Lane Hub | Live F1 Data & Racing Stats',
    description: 'Your ultimate destination for live F1 racing data, driver standings, race calendar, and real-time timing.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Pit Lane Hub - F1 Data',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pit Lane Hub | Live F1 Data',
    description: 'Live F1 racing data, standings, and real-time timing. Free & open source.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#E10600',
};


export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <a href="#main-content" className="skip-link">Skip to main content</a>
          <Header />
          <main id="main-content" className="app-main">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}

import Footer from '@/components/Footer';
import Header from '@/components/Header';
import Providers from '@/components/Providers';
import { jsonLdScript } from '@/lib/jsonld';
import { Archivo } from 'next/font/google';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site';
import './globals.css';

// One self-hosted family; the width axis gives condensed display type and normal-width body text.
const archivo = Archivo({
  subsets: ['latin', 'latin-ext'],
  axes: ['wdth'],
  display: 'swap',
  variable: '--font-archivo',
});

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'F1 Calendar, Live Timing & Standings for Fans',
    template: '%s | Pit Lane Hub',
  },
  description: SITE_DESCRIPTION,
  keywords: ['F1', 'Formula 1', 'F1 standings', 'F1 live timing', 'F1 drivers', 'F1 schedule', 'racing', 'motorsport'],
  authors: [{ name: 'Abdulaziz', url: 'https://github.com/justAbdulaziz10' }],
  creator: 'Abdulaziz',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: 'F1 Calendar, Live Timing & Standings for Fans',
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'F1 Calendar, Live Timing & Standings for Fans',
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: '/manifest.json',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#101218',
};


const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={archivo.variable}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(websiteJsonLd) }}
        />
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

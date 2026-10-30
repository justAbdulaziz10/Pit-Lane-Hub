import Footer from '@/components/Footer';
import Header from '@/components/Header';
import Providers from '@/components/Providers';
import { isLocale, localeAlternates, LOCALES } from '@/lib/i18n/config';
import { LocaleProvider } from '@/lib/i18n/LocaleProvider';
import { pick } from '@/lib/i18n/messages';
import common from '@/lib/i18n/messages/common';
import { jsonLdScript } from '@/lib/jsonld';
import { Inter, Outfit } from 'next/font/google';
import { notFound } from 'next/navigation';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
  variable: '--font-outfit',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-inter',
});

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const t = pick(common, lang);
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: t.siteTitle,
      template: '%s | Pit Lane Hub',
    },
    description: t.siteDescription,
    keywords: ['F1', 'Formula 1', 'F1 standings', 'F1 live timing', 'F1 drivers', 'F1 schedule'],
    authors: [{ name: 'Abdulaziz', url: 'https://github.com/justAbdulaziz10' }],
    creator: 'Abdulaziz',
    alternates: localeAlternates(lang, '/'),
    openGraph: {
      type: 'website',
      locale: 'en_US',
      url: SITE_URL,
      siteName: SITE_NAME,
      title: t.siteTitle,
      description: t.siteDescription,
    },
    twitter: {
      card: 'summary_large_image',
      title: t.siteTitle,
      description: t.siteDescription,
    },
    robots: {
      index: true,
      follow: true,
    },
    manifest: '/manifest.json',
  };
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0d0d0d',
};


export default async function RootLayout({ children, params }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = pick(common, lang);
  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    description: t.siteDescription,
    inLanguage: 'en',
  };
  const fonts = `${outfit.variable} ${inter.variable}`;

  return (
    <html lang="en" dir="ltr" className={fonts}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(websiteJsonLd) }}
        />
        <Providers>
          <LocaleProvider locale={lang}>
            <a href="#main-content" className="skip-link">{t.skipToContent}</a>
            <Header />
            <main id="main-content" className="app-main">
              {children}
            </main>
            <Footer lang={lang} />
          </LocaleProvider>
        </Providers>
      </body>
    </html>
  );
}

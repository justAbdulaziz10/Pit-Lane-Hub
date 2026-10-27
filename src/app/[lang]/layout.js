import Footer from '@/components/Footer';
import Header from '@/components/Header';
import Providers from '@/components/Providers';
import { isLocale, localeAlternates, localeDir, LOCALES } from '@/lib/i18n/config';
import { LocaleProvider } from '@/lib/i18n/LocaleProvider';
import { pick } from '@/lib/i18n/messages';
import common from '@/lib/i18n/messages/common';
import { jsonLdScript } from '@/lib/jsonld';
import { Archivo, IBM_Plex_Sans_Arabic } from 'next/font/google';
import { notFound } from 'next/navigation';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import './globals.css';

// One self-hosted family; the width axis gives condensed display type and normal-width body text.
const archivo = Archivo({
  subsets: ['latin', 'latin-ext'],
  axes: ['wdth'],
  display: 'swap',
  variable: '--font-archivo',
});

// Arabic text; Latin names inside Arabic pages keep Archivo (see globals.css).
const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-arabic',
  preload: false,
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
    keywords: ['F1', 'Formula 1', 'F1 standings', 'F1 live timing', 'F1 drivers', 'F1 schedule', 'فورمولا 1', 'ترتيب الفورمولا 1', 'جدول الفورمولا 1'],
    authors: [{ name: 'Abdulaziz', url: 'https://github.com/justAbdulaziz10' }],
    creator: 'Abdulaziz',
    alternates: localeAlternates(lang, '/'),
    openGraph: {
      type: 'website',
      locale: lang === 'ar' ? 'ar_SA' : 'en_US',
      alternateLocale: lang === 'ar' ? ['en_US'] : ['ar_SA'],
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
  themeColor: '#101218',
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
    inLanguage: lang,
  };
  const fonts = lang === 'ar' ? `${archivo.variable} ${plexArabic.variable}` : archivo.variable;

  return (
    <html lang={lang} dir={localeDir(lang)} className={fonts}>
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

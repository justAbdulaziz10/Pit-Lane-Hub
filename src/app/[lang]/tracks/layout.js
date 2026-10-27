import { localeAlternates, localePath } from '@/lib/i18n/config';
import tracksMessages from '@/lib/i18n/messages/tracks';
import { pick } from '@/lib/i18n/messages';
import { SITE_URL } from '@/lib/site';

export const revalidate = 3600;

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const t = pick(tracksMessages, lang);
  const path = '/tracks';
  const canonical = `${SITE_URL}${localePath(lang, path)}`;
  const image = `${SITE_URL}${localePath(lang, '/opengraph-image')}`;
  return {
    title: t.detailTitle,
    description: t.description,
    alternates: localeAlternates(lang, path),
    openGraph: {
      title: t.detailTitle,
      description: t.description,
      url: canonical,
      images: [{ url: image, width: 1200, height: 630 }],
      locale: lang === 'ar' ? 'ar_SA' : 'en_US',
    },
    twitter: { card: 'summary_large_image', images: [image] },
  };
}

export default function TracksLayout({ children }) {
  return children;
}

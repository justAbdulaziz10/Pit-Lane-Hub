import { localeAlternates, localePath } from '@/lib/i18n/config';
import tracksMessages from '@/lib/i18n/messages/tracks';
import { pick } from '@/lib/i18n/messages';

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const t = pick(tracksMessages, lang);
  return {
    title: t.detailTitle,
    description: t.description,
    alternates: localeAlternates(lang, '/tracks'),
    openGraph: {
      title: t.detailTitle,
      description: t.description,
      url: localePath(lang, '/tracks'),
      locale: lang === 'ar' ? 'ar_SA' : 'en_US',
    },
  };
}

export default function TracksLayout({ children }) {
  return children;
}

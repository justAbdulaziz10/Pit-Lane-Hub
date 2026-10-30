import history from '@/lib/i18n/messages/history';
import { pick } from '@/lib/i18n/messages';
import { localeAlternates, localePath } from '@/lib/i18n/config';

export default function HistoryLayout({ children }) {
  return children;
}

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const t = pick(history, lang);
  return {
    title: t.metadataTitle,
    description: t.metadataDescription,
    alternates: localeAlternates(lang, '/history'),
    openGraph: {
      title: t.metadataTitle,
      description: t.metadataDescription,
      url: localePath(lang, '/history'),
      images: [localePath(lang, '/opengraph-image')],
      locale: 'en_US',
    },
  };
}

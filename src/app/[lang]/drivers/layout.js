import drivers from '@/lib/i18n/messages/drivers';
import { pick } from '@/lib/i18n/messages';
import { localeAlternates, localePath } from '@/lib/i18n/config';

export default function DriversLayout({ children }) {
  return children;
}

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const t = pick(drivers, lang);
  return {
    title: t.metadataTitle,
    description: t.metadataDescription,
    alternates: localeAlternates(lang, '/drivers'),
    openGraph: {
      title: t.metadataTitle,
      description: t.metadataDescription,
      url: localePath(lang, '/drivers'),
      images: [localePath(lang, '/opengraph-image')],
      locale: 'en_US',
    },
  };
}

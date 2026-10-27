import teams from '@/lib/i18n/messages/teams';
import { pick } from '@/lib/i18n/messages';
import { localeAlternates, localePath } from '@/lib/i18n/config';

export default function TeamsLayout({ children }) {
  return children;
}

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const t = pick(teams, lang);
  return {
    title: t.metadataTitle,
    description: t.metadataDescription,
    alternates: localeAlternates(lang, '/teams'),
    openGraph: {
      title: t.metadataTitle,
      description: t.metadataDescription,
      url: localePath(lang, '/teams'),
      locale: lang === 'ar' ? 'ar_SA' : 'en_US',
    },
  };
}

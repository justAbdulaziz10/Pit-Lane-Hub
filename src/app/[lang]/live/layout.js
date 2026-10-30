import { localeAlternates, localePath } from '@/lib/i18n/config';
import liveMessages from '@/lib/i18n/messages/live';
import { pick } from '@/lib/i18n/messages';

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const t = pick(liveMessages, lang);
  return {
    title: t.pageTitle,
    description: t.description,
    alternates: localeAlternates(lang, '/live'),
    openGraph: {
      title: t.pageTitle,
      description: t.description,
      url: localePath(lang, '/live'),
      locale: 'en_US',
    },
  };
}

export default function LiveLayout({ children }) {
  return children;
}

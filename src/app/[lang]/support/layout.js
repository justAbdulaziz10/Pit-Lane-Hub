import { localizedPageMetadata } from '@/lib/i18n/metadata';
import { pick } from '@/lib/i18n/messages';
import supportMessages from '@/lib/i18n/messages/support';

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const t = pick(supportMessages, lang);
  return localizedPageMetadata(lang, '/support', {
    title: t.metadataTitle,
    description: t.metadataDescription,
  });
}

export default function SupportLayout({ children }) {
  return children;
}

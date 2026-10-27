import { notFound } from 'next/navigation';
import { localizedPageMetadata } from '@/lib/i18n/metadata';
import { pick } from '@/lib/i18n/messages';
import errorMessages from '@/lib/i18n/messages/errors';

export async function generateMetadata({ params }) {
    const { lang, missing } = await params;
    const path = Array.isArray(missing) && missing.length ? `/${missing.join('/')}` : '/';
    const t = pick(errorMessages, lang);
    return localizedPageMetadata(lang, path, {
        title: t.notFoundMetadataTitle,
        description: t.notFoundDescription,
    });
}

// Unknown URLs render the localized not-found page inside the [lang] layout.
export default function Missing() {
    notFound();
}

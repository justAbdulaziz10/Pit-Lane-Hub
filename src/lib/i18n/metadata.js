import { localeAlternates, localePath } from './config';

/** Shared localized SEO metadata shape for pages inside the [lang] route segment. */
export function localizedPageMetadata(lang, path, { title, description, ...extra } = {}) {
    return {
        title,
        description,
        alternates: localeAlternates(lang, path),
        openGraph: {
            title,
            description,
            url: localePath(lang, path),
            locale: lang === 'ar' ? 'ar_SA' : 'en_US',
        },
        ...extra,
    };
}

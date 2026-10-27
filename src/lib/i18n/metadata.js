import { localeAlternates, localePath } from './config';
import { pick } from './messages';
import errorMessages from './messages/errors';
import { SITE_NAME } from '../site';

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

function isNotFoundError(error) {
    return typeof error?.digest === 'string' && error.digest.startsWith('NEXT_HTTP_ERROR_FALLBACK;404');
}

/**
 * Runs a page's metadata builder, turning notFound() into not-found metadata. A notFound()
 * thrown from generateMetadata makes Next answer with a bare error document (no lang, dir or
 * content); returning metadata lets the page's own notFound() render the localized 404 instead.
 */
export async function metadataOrNotFound(lang, build) {
    try {
        return await build();
    } catch (error) {
        if (!isNotFoundError(error)) throw error;
        const t = pick(errorMessages, lang);
        return { title: { absolute: `${t.notFoundMetadataTitle} | ${SITE_NAME}` }, description: t.notFoundDescription, robots: { index: false } };
    }
}

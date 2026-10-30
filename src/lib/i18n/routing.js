import { DEFAULT_LOCALE, localePath, splitLocale } from './config';

// Next writes og:image/twitter:image URLs with the internal /en segment; serve them as is.
const METADATA_IMAGE = /\/(opengraph|twitter)-image(-[\w-]+)?$/;

/**
 * How the proxy handles a page request. Pure so it can be tested without Next:
 * - Legacy `/ar/...` URLs permanently redirect to the matching English URL.
 * - `/en/...` is never public: redirect to the unprefixed URL.
 * - Unprefixed paths render English via an internal rewrite to `/en/...`,
 */
export function resolveLocaleRoute({ pathname, search = '' }) {
    const legacyPath = String(pathname || '/').match(/^\/ar(?=\/|$)(.*)$/);
    if (legacyPath) {
        return { action: 'redirect', url: `${localePath(DEFAULT_LOCALE, legacyPath[1] || '/')}${search}` };
    }

    const { locale, path, prefixed } = splitLocale(pathname);
    if (prefixed && locale === DEFAULT_LOCALE && METADATA_IMAGE.test(path)) return { action: 'next', locale };
    if (prefixed && locale === DEFAULT_LOCALE) {
        return { action: 'redirect', url: `${localePath(DEFAULT_LOCALE, path)}${search}` };
    }
    if (prefixed) return { action: 'next', locale };
    return { action: 'rewrite', url: `/${DEFAULT_LOCALE}${path === '/' ? '' : path}${search}`, locale: DEFAULT_LOCALE };
}

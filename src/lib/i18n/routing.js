import { DEFAULT_LOCALE, isLocale, localePath, splitLocale } from './config';

const BOT = /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview/i;
// Next writes og:image/twitter:image URLs with the internal /en segment; serve them as is.
const METADATA_IMAGE = /\/(opengraph|twitter)-image(-[\w-]+)?$/;

/**
 * How the proxy handles a page request. Pure so it can be tested without Next:
 * - `/en/...` is never public: redirect to the unprefixed URL.
 * - `/ar/...` passes through to the [lang] routes.
 * - Unprefixed paths render English via an internal rewrite to `/en/...`,
 *   unless a visitor who chose Arabic (cookie) opens a page directly; bots and
 *   client-side (RSC/prefetch) requests are never redirected.
 */
export function resolveLocaleRoute({ pathname, search = '', cookieLocale, userAgent = '', isDocument = true }) {
    const { locale, path, prefixed } = splitLocale(pathname);
    if (prefixed && locale === DEFAULT_LOCALE && METADATA_IMAGE.test(path)) return { action: 'next', locale };
    if (prefixed && locale === DEFAULT_LOCALE) {
        return { action: 'redirect', url: `${localePath(DEFAULT_LOCALE, path)}${search}` };
    }
    if (prefixed) return { action: 'next', locale };
    if (isLocale(cookieLocale) && cookieLocale !== DEFAULT_LOCALE && isDocument && !BOT.test(userAgent)) {
        return { action: 'redirect', url: `${localePath(cookieLocale, path)}${search}`, temporary: true };
    }
    return { action: 'rewrite', url: `/${DEFAULT_LOCALE}${path === '/' ? '' : path}${search}`, locale: DEFAULT_LOCALE };
}

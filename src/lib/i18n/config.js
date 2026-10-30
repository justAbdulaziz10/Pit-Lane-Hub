export const LOCALES = Object.freeze(['en']);
export const DEFAULT_LOCALE = 'en';

export function isLocale(value) {
    return LOCALES.includes(value);
}

/**
 * Public URL of an app path. English keeps the unprefixed URLs the site has
 * always had; query strings and hashes are kept.
 */
export function localePath(locale, path = '/') {
    const value = String(path || '/');
    const split = value.search(/[?#]/);
    const pathname = split === -1 ? value : value.slice(0, split);
    const suffix = split === -1 ? '' : value.slice(split);
    const clean = `/${pathname.replace(/^\/+/, '')}`;
    if (!isLocale(locale) || locale === DEFAULT_LOCALE) return `${clean}${suffix}`;
    return `${clean === '/' ? `/${locale}` : `/${locale}${clean}`}${suffix}`;
}

/** Split a public pathname into its locale and the app path without the prefix. */
export function splitLocale(pathname) {
    const value = String(pathname || '/');
    const match = value.match(/^\/([a-z]{2})(?=\/|$)(.*)$/);
    if (match && isLocale(match[1])) return { locale: match[1], path: match[2] || '/', prefixed: true };
    return { locale: DEFAULT_LOCALE, path: value || '/', prefixed: false };
}

/** Metadata `alternates` for a page: its canonical English URL. */
export function localeAlternates(locale, path) {
    return { canonical: localePath(locale, path) };
}

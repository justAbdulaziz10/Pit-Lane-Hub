import { DEFAULT_LOCALE } from './config';

/**
 * Pick a namespace's strings for a locale. Namespaces live in ./messages/<ns>.js
 * as `{ en: {...}, ar: {...} }`; missing Arabic keys fall back to English.
 */
export function pick(namespace, locale) {
    const fallback = namespace[DEFAULT_LOCALE];
    if (locale === DEFAULT_LOCALE || !namespace[locale]) return fallback;
    return { ...fallback, ...namespace[locale] };
}

/** Fill `{name}` placeholders: fill('Round {round}', { round: 3 }) → 'Round 3'. */
export function fill(template, values = {}) {
    return String(template).replace(/\{(\w+)\}/g, (match, key) => (key in values ? String(values[key]) : match));
}

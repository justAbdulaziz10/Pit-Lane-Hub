// Arabic UI keeps the Gregorian calendar and Western digits, as Arabic F1
// coverage does for dates, lap times and points.
const INTL_LOCALES = Object.freeze({ en: 'en-GB', ar: 'ar-u-ca-gregory-nu-latn' });

export function intlLocale(locale) {
    return INTL_LOCALES[locale] || INTL_LOCALES.en;
}

export function formatNumber(locale, value, options) {
    return new Intl.NumberFormat(intlLocale(locale), options).format(value);
}

export function formatDate(locale, value, options = { day: 'numeric', month: 'long', year: 'numeric' }) {
    return new Intl.DateTimeFormat(intlLocale(locale), options).format(new Date(value));
}

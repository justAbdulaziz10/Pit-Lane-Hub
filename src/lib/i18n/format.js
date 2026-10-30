const INTL_LOCALE = 'en-GB';

export function intlLocale() {
    return INTL_LOCALE;
}

export function formatNumber(_locale, value, options) {
    return new Intl.NumberFormat(INTL_LOCALE, options).format(value);
}

export function formatDate(_locale, value, options = { day: 'numeric', month: 'long', year: 'numeric' }) {
    return new Intl.DateTimeFormat(INTL_LOCALE, options).format(new Date(value));
}

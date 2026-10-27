// Pure helpers for LocalTime and Countdown (kept JSX-free so they are unit-testable).
import { intlLocale, formatNumber } from '@/lib/i18n/format';
import timeMessages from '@/lib/i18n/messages/time';
import { pick } from '@/lib/i18n/messages';

const FORMATS = Object.freeze({
    datetime: { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' },
    date: { day: 'numeric', month: 'short', year: 'numeric' },
    dayMonth: { day: 'numeric', month: 'short' },
    weekdayDate: { weekday: 'short', day: 'numeric', month: 'short' },
    time: { hour: '2-digit', minute: '2-digit' },
});

function hasTime(options) {
    return Boolean(options.hour || options.minute);
}

/** Format an ISO instant; on the server (and during hydration) always in UTC with a label. */
export function formatInstant(iso, format = 'datetime', { local = false, locale = 'en' } = {}) {
    const date = new Date(iso);
    if (!Number.isFinite(date.getTime())) return null;
    const options = FORMATS[format] || FORMATS.datetime;
    if (local) {
        const parts = new Intl.DateTimeFormat(intlLocale(locale), {
            ...options,
            ...(hasTime(options) ? { timeZoneName: 'short' } : {}),
        }).formatToParts(date);
        // After Arabic letters the bidi algorithm treats "+3" as an Arabic number and shows
        // "3+"; a left-to-right isolate around just the offset keeps its sign in front.
        return parts.map(({ type, value }) => (
            type === 'timeZoneName' && locale === 'ar'
                ? value.replace(/([+\-\u2212]\d[\d:]*)$/, '\u2066$1\u2069')
                : value
        )).join('');
    }
    const text = new Intl.DateTimeFormat(intlLocale(locale), { ...options, timeZone: 'UTC' }).format(date);
    return hasTime(options) ? `${text} ${pick(timeMessages, locale).utc}` : text;
}

export function hasTimeFormat(format = 'datetime') {
    return hasTime(FORMATS[format] || FORMATS.datetime);
}

export function countdownUnitLabel(locale, unit, count) {
    const messages = pick(timeMessages, locale);
    const category = new Intl.PluralRules(locale === 'ar' ? 'ar' : 'en').select(count);
    return messages[unit]?.[category] || messages[unit]?.other || unit;
}

export function countdownAnnouncement(locale, parts) {
    const messages = pick(timeMessages, locale);
    const values = [
        ['day', parts.days],
        ['hour', parts.hours],
        ['minute', parts.minutes],
    ];
    const phrase = values.map(([unit, value]) => {
        if (locale === 'ar' && new Intl.PluralRules('ar').select(value) === 'two') return messages[unit].two;
        return `${formatNumber(locale, value)} ${countdownUnitLabel(locale, unit, value)}`;
    }).join(locale === 'ar' ? '، ' : ', ');
    return `${phrase} ${messages.toGo}`;
}

export function countdownParts(targetMs, nowMs) {
    const remaining = Math.max(0, targetMs - nowMs);
    const totalSeconds = Math.floor(remaining / 1000);
    return {
        done: remaining === 0,
        days: Math.floor(totalSeconds / 86400),
        hours: Math.floor((totalSeconds % 86400) / 3600),
        minutes: Math.floor((totalSeconds % 3600) / 60),
        seconds: totalSeconds % 60,
    };
}

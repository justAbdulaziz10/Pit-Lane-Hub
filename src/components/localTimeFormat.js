// Pure helpers for LocalTime and Countdown (kept JSX-free so they are unit-testable).

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
export function formatInstant(iso, format = 'datetime', { local = false } = {}) {
    const date = new Date(iso);
    if (!Number.isFinite(date.getTime())) return null;
    const options = FORMATS[format] || FORMATS.datetime;
    if (local) {
        return new Intl.DateTimeFormat(undefined, {
            ...options,
            ...(hasTime(options) ? { timeZoneName: 'short' } : {}),
        }).format(date);
    }
    const text = new Intl.DateTimeFormat('en-GB', { ...options, timeZone: 'UTC' }).format(date);
    return hasTime(options) ? `${text} UTC` : text;
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

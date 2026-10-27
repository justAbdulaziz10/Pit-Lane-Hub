import scheduleMessages from '@/lib/i18n/messages/schedule';
import { fill, pick } from '@/lib/i18n/messages';
import { formatNumber } from '@/lib/i18n/format';

export const STATUS_LABELS = Object.freeze({
    live: 'Live',
    weekend: 'Race weekend',
    completed: 'Completed',
    upcoming: 'Upcoming',
    cancelled: 'Cancelled',
});

export function statusLabel(status, locale = 'en') {
    const labels = pick(scheduleMessages, locale).status;
    return labels[status] || STATUS_LABELS[status] || status;
}

/** Status of a testing meeting from its start and end dates. */
export function meetingStatus(meeting, now = Date.now()) {
    if (meeting.is_cancelled) return 'cancelled';
    const start = Date.parse(meeting.dateStart || '');
    const end = Date.parse(meeting.dateEnd || '');
    if (Number.isFinite(end) && now > end) return 'completed';
    if (Number.isFinite(start) && now >= start) return 'live';
    return 'upcoming';
}

/** The round to highlight: live or in progress first, otherwise the next one. */
export function nextRound(rounds) {
    return rounds.find((event) => event.status === 'live')
        || rounds.find((event) => event.status === 'weekend')
        || rounds.find((event) => event.status === 'upcoming')
        || null;
}

/** Compute a calendar round's live/completed state from ISO data in the browser. */
export function roundStatus(event, now = Date.now()) {
    const live = (event.sessionWindows || []).some((window) => {
        const start = Date.parse(window.start || '');
        const end = Date.parse(window.end || '');
        return Number.isFinite(start) && Number.isFinite(end) && now >= start && now <= end;
    });
    if (live) return 'live';

    const raceStart = Date.parse(event.raceStart || '');
    if (Number.isFinite(raceStart) && now >= raceStart + 3 * 60 * 60 * 1000) return 'completed';
    const raceDayEnd = Date.parse(event.raceDate ? `${event.raceDate}T23:59:59Z` : '');
    if (!Number.isFinite(raceStart) && Number.isFinite(raceDayEnd) && now > raceDayEnd) return 'completed';
    return 'upcoming';
}

/** Put the active weekend first and then the nearest uncompleted race. */
export function calendarRoundRows(rounds, now = Date.now()) {
    const rows = rounds.map((event) => ({ event, status: roundStatus(event, now) }));
    const completed = rows.filter((row) => row.status === 'completed')
        .sort((a, b) => Date.parse(b.event.raceStart || '') - Date.parse(a.event.raceStart || ''));
    const upcoming = rows.filter((row) => row.status !== 'completed')
        .sort((a, b) => Date.parse(a.event.raceStart || '') - Date.parse(b.event.raceStart || ''));
    if (upcoming.length > 0 && upcoming[0].status !== 'live') upcoming[0] = { ...upcoming[0], status: 'next' };
    return { upcoming, completed };
}

/** Stable server render order from cached API status; browser time replaces it after hydration. */
export function initialCalendarRoundRows(rounds) {
    const rows = rounds.map((event) => ({ event, status: event.status || 'upcoming' }));
    const completed = rows.filter((row) => row.status === 'completed')
        .sort((a, b) => Date.parse(b.event.raceStart || '') - Date.parse(a.event.raceStart || ''));
    const upcoming = rows.filter((row) => row.status !== 'completed')
        .sort((a, b) => Date.parse(a.event.raceStart || '') - Date.parse(b.event.raceStart || ''));
    if (upcoming.length > 0 && !['live', 'weekend'].includes(upcoming[0].status)) {
        upcoming[0] = { ...upcoming[0], status: 'next' };
    }
    return { upcoming, completed };
}

export function upcomingSessionTimes(event, locale = 'en') {
    const t = pick(scheduleMessages, locale);
    return [
        ['qualifying', t.qualifying],
        ['sprintQualifying', t.sprintQualifying],
        ['sprint', t.sprint],
    ].filter(([key]) => event.sessions?.[key]).map(([key, label]) => ({
        key,
        label,
        iso: event.sessions[key],
    }));
}

export function nextSessionTime(event, now = Date.now()) {
    const next = Object.values(event.sessions || {})
        .filter((iso) => Number.isFinite(Date.parse(iso || '')) && Date.parse(iso) > now)
        .sort((a, b) => Date.parse(a) - Date.parse(b));
    return next[0] || event.raceStart || null;
}

export function testingLabel(index, locale = 'en') {
    const t = pick(scheduleMessages, locale);
    return fill(t.testNumber, { number: formatNumber(locale, index + 1) });
}

export function webcalUrl(siteUrl) {
    return `${siteUrl.replace(/^https?:\/\//, 'webcal://')}/calendar.ics`;
}

/** Request time for server components that render once per request (after connection()). */
export function requestTime() {
    return Date.now();
}

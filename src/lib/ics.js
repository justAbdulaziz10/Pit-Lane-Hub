// RFC 5545 iCalendar generation for the season calendar subscription.

const CRLF = '\r\n';
const MAX_LINE_OCTETS = 75;

/** Session order, labels and fallback durations (minutes) when no real end time is known. */
export const ICS_SESSIONS = Object.freeze([
    { key: 'firstPractice', label: 'Practice 1', minutes: 60 },
    { key: 'secondPractice', label: 'Practice 2', minutes: 60 },
    { key: 'thirdPractice', label: 'Practice 3', minutes: 60 },
    { key: 'sprintQualifying', label: 'Sprint Qualifying', minutes: 45 },
    { key: 'sprint', label: 'Sprint', minutes: 60 },
    { key: 'qualifying', label: 'Qualifying', minutes: 60 },
    { key: 'race', label: 'Race', minutes: 120 },
]);

/** Escape a TEXT property value (RFC 5545 section 3.3.11). */
export function escapeText(value) {
    return String(value ?? '')
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\r\n|\r|\n/g, '\\n');
}

/** Fold a content line at 75 octets without splitting a UTF-8 character (section 3.1). */
export function foldLine(line) {
    const encoder = new TextEncoder();
    const parts = [];
    let current = '';
    let currentOctets = 0;
    for (const character of line) {
        const octets = encoder.encode(character).length;
        // Continuation lines start with a space, which counts toward their 75 octets.
        const limit = parts.length === 0 ? MAX_LINE_OCTETS : MAX_LINE_OCTETS - 1;
        if (currentOctets + octets > limit) {
            parts.push(current);
            current = '';
            currentOctets = 0;
        }
        current += character;
        currentOctets += octets;
    }
    parts.push(current);
    return parts.join(`${CRLF} `);
}

/** Format a date as a UTC DATE-TIME (YYYYMMDDTHHMMSSZ). */
export function formatUtc(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (!Number.isFinite(date.getTime())) throw new TypeError(`Invalid date: ${value}`);
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function slug(value) {
    return String(value || '')
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function sessionEnd(event, startIso, minutes) {
    const start = Date.parse(startIso);
    // Prefer the real end time OpenF1 published for this session.
    const window = (event.sessionWindows || []).find((item) => Date.parse(item.start) === start);
    const end = Date.parse(window?.end || '');
    return Number.isFinite(end) && end > start ? end : start + minutes * 60000;
}

/**
 * Turn calendar rounds into one VEVENT descriptor per scheduled session.
 * UIDs use season, circuit and Grand Prix name, so they stay stable when
 * rounds are renumbered after a cancellation.
 */
export function sessionEvents(rounds, { siteUrl = '', domain = 'pitlanehub' } = {}) {
    const events = [];
    for (const event of rounds || []) {
        const place = [event.circuit?.name, event.circuit?.locality, event.circuit?.country]
            .filter(Boolean)
            .join(', ');
        for (const session of ICS_SESSIONS) {
            const start = event.sessions?.[session.key];
            if (!start || !Number.isFinite(Date.parse(start))) continue;
            events.push({
                uid: `${event.year}-${slug(event.circuit?.id || event.circuit?.name)}-${slug(event.raceName)}-${slug(session.key)}@${domain}`,
                start: Date.parse(start),
                end: sessionEnd(event, start, session.minutes),
                summary: `${event.raceName}: ${session.label}`,
                location: place,
                description: `Round ${event.round} of the ${event.year} Formula 1 World Championship`,
                url: event.meetingKey != null && siteUrl ? `${siteUrl}/race/${event.meetingKey}` : null,
            });
        }
    }
    return events.sort((a, b) => a.start - b.start);
}

/** Build a complete VCALENDAR document with CRLF line endings. */
export function buildCalendar({ name, description, events, now = Date.now(), prodId = '-//Pit Lane Hub//F1 Calendar//EN' }) {
    const stamp = formatUtc(now);
    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        `PRODID:${prodId}`,
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        `X-WR-CALNAME:${escapeText(name)}`,
        'X-WR-TIMEZONE:UTC',
        'REFRESH-INTERVAL;VALUE=DURATION:PT6H',
        'X-PUBLISHED-TTL:PT6H',
    ];
    if (description) lines.push(`X-WR-CALDESC:${escapeText(description)}`);
    for (const event of events) {
        lines.push(
            'BEGIN:VEVENT',
            `UID:${event.uid}`,
            `DTSTAMP:${stamp}`,
            `DTSTART:${formatUtc(event.start)}`,
            `DTEND:${formatUtc(event.end)}`,
            `SUMMARY:${escapeText(event.summary)}`,
        );
        if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
        if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`);
        if (event.url) lines.push(`URL:${event.url}`);
        lines.push('TRANSP:TRANSPARENT', 'END:VEVENT');
    }
    lines.push('END:VCALENDAR');
    return lines.map(foldLine).join(CRLF) + CRLF;
}

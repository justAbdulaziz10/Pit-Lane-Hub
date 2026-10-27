export const STATUS_LABELS = Object.freeze({
    live: 'Live',
    weekend: 'Race weekend',
    completed: 'Completed',
    upcoming: 'Upcoming',
    cancelled: 'Cancelled',
});

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

export function webcalUrl(siteUrl) {
    return `${siteUrl.replace(/^https?:\/\//, 'webcal://')}/calendar.ics`;
}

/** Request time for server components that render once per request (after connection()). */
export function requestTime() {
    return Date.now();
}

import { getEventByMeetingKey } from '@/lib/f1/season';
import { notFound } from 'next/navigation';
import { cache } from 'react';

/** Resolve a meeting key once per request; unknown or malformed keys 404. */
export const loadEvent = cache(async (key) => {
    if (!/^\d{1,7}$/.test(String(key || ''))) notFound();
    const resolved = await getEventByMeetingKey(key);
    if (!resolved) notFound();
    return resolved;
});

export function eventYear(resolved) {
    if (resolved.kind === 'race') return resolved.event.year;
    return new Date(resolved.meeting.dateStart || Date.now()).getUTCFullYear();
}

export function eventTitle(resolved) {
    const year = eventYear(resolved);
    if (resolved.kind === 'race') return `${year} ${resolved.event.raceName}`;
    const name = resolved.meeting.name;
    return name.includes(String(year)) ? name : `${year} ${name}`;
}

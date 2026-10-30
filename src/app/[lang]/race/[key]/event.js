import { getEventByMeetingKey } from '@/lib/f1/season';
import { raceName } from '@/lib/i18n/f1-names';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { getSeasonYear } from '@/lib/f1/year';

/** Resolve a stable year-round key or a legacy numeric meeting key; unknown keys 404. */
export const loadEvent = cache(async (key) => {
    const value = String(key || '');
    const isYearRoute = /^\d{4}-\d{1,2}$/.test(value);
    const raceRoute = /^(\d{4})-\d{1,2}$/.exec(value);
    if (!isYearRoute && !/^\d{1,7}$/.test(value)) notFound();
    if (raceRoute) {
        const year = Number(raceRoute[1]);
        if (year < 1950 || year > getSeasonYear() + 1) notFound();
    }
    const resolved = await getEventByMeetingKey(value);
    if (!resolved) notFound();
    return resolved;
});

export function eventYear(resolved) {
    if (resolved.kind === 'race') return resolved.event.year;
    return new Date(resolved.meeting.dateStart || Date.now()).getUTCFullYear();
}

export function eventTitle(resolved) {
    const year = eventYear(resolved);
    if (resolved.kind === 'race') return `${year} ${raceName(resolved.event.raceName)}`;
    const name = resolved.meeting.name;
    const withoutYear = name.replace(new RegExp(`^${year}\\s+`), '');
    const localizedName = resolved.kind === 'cancelled' ? raceName(withoutYear) : withoutYear;
    return `${year} ${localizedName}`;
}

import { getEventByMeetingKey } from '@/lib/f1/season';
import { countryName, raceName } from '@/lib/i18n/f1-names';
import raceMessages from '@/lib/i18n/messages/race';
import { pick } from '@/lib/i18n/messages';
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

export function eventTitle(resolved, locale = 'en') {
    const year = eventYear(resolved);
    if (resolved.kind === 'race') return `${year} ${raceName(resolved.event.raceName, locale)}`;
    const name = resolved.meeting.name;
    if (locale === 'ar' && resolved.kind === 'testing') {
        const place = resolved.meeting.circuitShortName || countryName(resolved.meeting.country, locale);
        return `${year} ${place} · ${pick(raceMessages, locale).preSeasonTesting}`;
    }
    const withoutYear = name.replace(new RegExp(`^${year}\\s+`), '');
    const localizedName = resolved.kind === 'cancelled' ? raceName(withoutYear, locale) : withoutYear;
    return `${year} ${localizedName}`;
}

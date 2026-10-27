import { getGrid } from '@/lib/f1/drivers';
import { getCalendar } from '@/lib/f1/season';
import { getTeams } from '@/lib/f1/teams';
import { getSeasonYear } from '@/lib/f1/year';
import { SITE_URL } from '@/lib/site';
import { connection } from 'next/server';

const STATIC_ROUTES = [
    ['', 'daily', 1],
    ['/schedule', 'daily', 0.9],
    ['/standings', 'daily', 0.9],
    ['/live', 'daily', 0.8],
    ['/drivers', 'weekly', 0.8],
    ['/teams', 'weekly', 0.8],
    ['/compare', 'monthly', 0.6],
    ['/tracks', 'monthly', 0.6],
    ['/history', 'monthly', 0.6],
    ['/support', 'monthly', 0.4],
];

export function staticEntries(now = new Date()) {
    return STATIC_ROUTES.map(([path, changeFrequency, priority]) => ({
        url: `${SITE_URL}${path}`,
        lastModified: now,
        changeFrequency,
        priority,
    }));
}

/** A race page changes when its weekend runs; afterwards it is final. */
function raceLastModified(event, now) {
    const raceStart = Date.parse(event.raceStart || '');
    if (!Number.isFinite(raceStart)) return now;
    const settled = new Date(raceStart + 6 * 3600000);
    return settled < now ? settled : now;
}

export function dynamicEntries({ calendar, grid, teams }, now = new Date()) {
    const races = calendar.rounds
        .filter((event) => event.meetingKey != null)
        .map((event) => ({
            url: `${SITE_URL}/race/${event.meetingKey}`,
            lastModified: raceLastModified(event, now),
            changeFrequency: event.status === 'completed' ? 'monthly' : 'daily',
            priority: 0.7,
        }));
    const drivers = grid
        .filter((driver) => driver.racingNumber != null)
        .map((driver) => ({
            url: `${SITE_URL}/driver/${driver.racingNumber}`,
            lastModified: now,
            changeFrequency: 'weekly',
            priority: 0.6,
        }));
    const teamEntries = teams
        .filter((team) => team.constructorId)
        .map((team) => ({
            url: `${SITE_URL}/team/${team.constructorId}`,
            lastModified: now,
            changeFrequency: 'weekly',
            priority: 0.6,
        }));
    return [...races, ...drivers, ...teamEntries];
}

export default async function sitemap() {
    await connection();
    const now = new Date();
    const year = getSeasonYear();
    try {
        const [calendar, grid, teams] = await Promise.all([getCalendar(year), getGrid(year), getTeams(year)]);
        return [...staticEntries(now), ...dynamicEntries({ calendar, grid, teams }, now)];
    } catch (error) {
        // The one allowed fallback: search engines still get the static routes.
        console.error('Sitemap data failed; serving static routes only', error);
        return staticEntries(now);
    }
}

import { getGrid } from '@/lib/f1/drivers';
import { driverPath } from '@/app/[lang]/driver/[number]/driver-data';
import { LOCALES, localePath } from '@/lib/i18n/config';
import { getCalendar } from '@/lib/f1/season';
import { getTeams } from '@/lib/f1/teams';
import { getCircuitView } from '@/lib/f1/circuits';
import { getSeasonYear } from '@/lib/f1/year';
import { SITE_URL } from '@/lib/site';

export const revalidate = 3600;

const SITEMAP_SNAPSHOT = '__pitLaneHubCompleteSitemap';

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
        .filter((event) => event.routeKey != null)
        .map((event) => ({
            url: `${SITE_URL}/race/${event.routeKey}`,
            lastModified: raceLastModified(event, now),
            changeFrequency: event.status === 'completed' ? 'monthly' : 'daily',
            priority: 0.7,
        }));
    const drivers = grid
        .filter((driver) => driver.driverId)
        .map((driver) => ({
            url: `${SITE_URL}${driverPath(driver)}`,
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
    const circuitIds = [...new Set(calendar.rounds.map((event) => event.circuit?.id).filter(Boolean))];
    const circuits = circuitIds
        .filter((circuitId) => getCircuitView(circuitId))
        .map((circuitId) => ({
            url: `${SITE_URL}/tracks/${circuitId}`,
            lastModified: now,
            changeFrequency: 'yearly',
            priority: 0.5,
        }));
    return [...races, ...drivers, ...teamEntries, ...circuits];
}

/** One entry per language for every page, each listing all language versions. */
export function withLanguages(entries) {
    return entries.flatMap((entry) => {
        const path = entry.url.slice(SITE_URL.length) || '/';
        const url = (locale) => {
            const localized = localePath(locale, path);
            return `${SITE_URL}${localized === '/' ? '' : localized}`;
        };
        const languages = Object.fromEntries(LOCALES.map((locale) => [locale, url(locale)]));
        return LOCALES.map((locale) => ({
            ...entry,
            url: languages[locale],
            alternates: { languages: { ...languages, 'x-default': languages.en } },
        }));
    });
}

export default async function sitemap() {
    const now = new Date();
    const year = getSeasonYear();
    try {
        const [calendar, grid, teams] = await Promise.all([getCalendar(year), getGrid(year), getTeams(year)]);
        const entries = withLanguages([...staticEntries(now), ...dynamicEntries({ calendar, grid, teams }, now)]);
        globalThis[SITEMAP_SNAPSHOT] = entries;
        return entries;
    } catch (error) {
        const snapshot = globalThis[SITEMAP_SNAPSHOT];
        if (Array.isArray(snapshot) && snapshot.length > 0) return snapshot;
        console.error('Sitemap refresh failed without a complete snapshot', error);
        throw error;
    }
}

import { getAllTimeDriver, isValidDriverId } from '@/lib/f1/compare';
import { getSeasonDriverList, nationalityInfo, resolveDriver } from '@/lib/f1/drivers';
import { cacheF1Data, F1_CACHE_TAGS, fetchJolpicaPages } from '@/lib/f1/http';
import { canonicalTeamName, ensureTeamColorContrast } from '@/lib/f1/team-utils';
import { getSeasonYear } from '@/lib/f1/year';
import { pick } from '@/lib/i18n/messages';
import driverMessages from '@/lib/i18n/messages/drivers';
import { driverPath } from './driver-path';

const FALLBACK_COLOUR = '#E10600';
export { driverPath } from './driver-path';

/**
 * Resolve a /driver/[number] segment: a racing number, driverId or code on the
 * current grid, or the driverId of any driver since 1950. Numeric legacy URLs
 * resolve through the season entry list so a driver missing the latest session
 * still redirects to their stable driverId URL.
 */
export async function resolveDriverRoute(segment) {
    const value = decodeURIComponent(String(segment || '')).trim();
    if (!value || value.length > 40) return null;

    const id = value.toLowerCase();
    let current = null;
    try {
        current = await resolveDriver(value);
    } catch (error) {
        // A driverId still resolves from the all-time snapshot; a racing number needs the season list.
        if (/^\d+$/.test(id)) throw error;
    }
    if (current) {
        const driver = {
            ...current,
            current: true,
            team: current.team ? canonicalTeamName(current.team) : null,
            colour: ensureTeamColorContrast(current.teamColour || FALLBACK_COLOUR),
        };
        return { driver, path: driverPath(driver) };
    }

    let driverId = id;
    let seasonEntry = null;
    if (/^\d+$/.test(id)) {
        const seasonDrivers = await getSeasonDriverList(getSeasonYear());
        seasonEntry = seasonDrivers.find((driver) => driver.number === Number(id)) || null;
        if (!seasonEntry?.driverId) return null;
        driverId = seasonEntry.driverId;
    }
    if (!isValidDriverId(driverId)) return null;
    const historical = await getAllTimeDriver(driverId);
    if (!historical) return null;
    const driver = {
        ...historical,
        ...(seasonEntry || {}),
        driverId,
        current: false,
        racingNumber: seasonEntry?.number ?? null,
        team: null,
        headshot: null,
        flag: nationalityInfo(historical.nationality).flag,
        colour: FALLBACK_COLOUR,
    };
    return { driver, path: driverPath(driver) };
}

function mapSeasonResult(race) {
    const result = race.Results?.[0] || {};
    return {
        season: Number(race.season),
        round: Number(race.round),
        raceName: race.raceName,
        date: race.date || null,
        grid: Number.isFinite(Number(result.grid)) ? Number(result.grid) : null,
        position: Number.isFinite(Number(result.position)) ? Number(result.position) : null,
        positionText: result.positionText || null,
        status: result.status || null,
        points: Number(result.points) || 0,
        constructorId: result.Constructor?.constructorId || null,
    };
}

export function gridFinishDelta(result) {
    const grid = Number(result?.grid);
    const finish = Number(result?.position);
    if (!Number.isFinite(grid) || grid < 1 || !Number.isFinite(finish) || finish < 1) return null;
    return grid - finish;
}

async function loadSeasonResults(driverId, year) {
    const races = await fetchJolpicaPages(`${year}/drivers/${driverId}/results`, {
        select: (mrData) => mrData?.RaceTable?.Races || [],
        revalidate: 900,
        tags: [F1_CACHE_TAGS.results],
    });
    return races.map(mapSeasonResult);
}

const cachedSeasonResults = cacheF1Data(loadSeasonResults, ['driver-season-results'], 900, [F1_CACHE_TAGS.results]);

/** A driver's race results for one season, oldest first. */
export function getDriverSeasonResults(driverId, year) {
    if (!isValidDriverId(driverId)) throw new TypeError('A valid Jolpica driverId is required');
    return cachedSeasonResults(driverId, Number(year));
}

/** Classified position as fans read it: "P1", or the Jolpica status code for non-finishers. */
export function finishLabel(result, locale = 'en') {
    const t = pick(driverMessages, locale);
    const text = String(result?.positionText || '');
    if (/^\d+$/.test(text)) return `P${text}`;
    const labels = locale === 'ar'
        ? {
            R: t.statDnf,
            D: t.disqualified,
            E: t.excluded,
            W: t.withdrawn,
            F: t.didNotQualify,
            N: t.notClassified,
        }
        : { R: 'DNF', D: 'DSQ', E: 'EX', W: 'WD', F: 'DNQ', N: 'NC' };
    return labels[text] || result?.status || '—';
}

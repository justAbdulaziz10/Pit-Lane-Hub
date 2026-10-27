import { DRIVER_ID_PATTERN, getCareerStats } from './career';
import {
    cacheF1Data,
    F1_CACHE_TAGS,
    fetchJolpicaPage,
    fetchJolpicaPages,
    UpstreamError,
} from './http';

const PAGE_LIMIT = 100;
/** Jolpica records fastest-lap ranks from this season on; earlier counts are missing. */
export const FASTEST_LAP_DATA_FROM = 2004;
/** No driver has more than ~430 entries; this caps a single lookup at 800 rows. */
export const MAX_RESULT_PAGES = 8;

/** 'full', 'partial' (career started before the data) or 'none' (career ended before it). */
export function fastestLapCoverage(firstSeason, lastSeason) {
    if (!firstSeason || !lastSeason) return 'full';
    if (lastSeason < FASTEST_LAP_DATA_FROM) return 'none';
    return firstSeason < FASTEST_LAP_DATA_FROM ? 'partial' : 'full';
}

export function isValidDriverId(value) {
    return typeof value === 'string' && DRIVER_ID_PATTERN.test(value);
}

function mapDriver(driver) {
    return {
        driverId: driver.driverId,
        code: driver.code || null,
        number: driver.permanentNumber ? Number(driver.permanentNumber) : null,
        firstName: driver.givenName || '',
        lastName: driver.familyName || '',
        fullName: [driver.givenName, driver.familyName].filter(Boolean).join(' '),
        nationality: driver.nationality || null,
        dateOfBirth: driver.dateOfBirth || null,
        url: driver.url || null,
    };
}

async function loadAllTimeDrivers() {
    const drivers = await fetchJolpicaPages('drivers', {
        select: (mrData) => mrData?.DriverTable?.Drivers || [],
        revalidate: 604800,
        tags: [F1_CACHE_TAGS.drivers],
    });
    return drivers.map(mapDriver);
}

const cachedAllTimeDrivers = cacheF1Data(loadAllTimeDrivers, ['compare-all-time-drivers'], 604800, [F1_CACHE_TAGS.drivers]);

/** Look up any driver since 1950 by Jolpica driverId; null when the id is unknown. */
export async function getAllTimeDriver(driverId) {
    if (!isValidDriverId(driverId)) return null;
    const drivers = await cachedAllTimeDrivers();
    return drivers.find((driver) => driver.driverId === driverId) || null;
}

function mapResultRow(race, result) {
    const position = Number(result.position);
    return {
        season: Number(race.season),
        round: Number(race.round),
        raceName: race.raceName,
        date: race.date || null,
        position: Number.isFinite(position) ? position : null,
        positionText: result.positionText || null,
        grid: Number.isFinite(Number(result.grid)) ? Number(result.grid) : null,
        points: Number(result.points) || 0,
        status: result.status || null,
        constructorId: result.Constructor?.constructorId || null,
        // The name the team raced under that year (Toro Rosso in 2015, not Racing Bulls).
        team: result.Constructor?.name || null,
    };
}

/**
 * Every race result of a driver. Jolpica counts and pages result rows (a race can
 * hold several rows for one driver in the 1950s shared-car era), so the next offset
 * is the number of rows received so far, and paging stops at MRData.total.
 */
export async function fetchDriverResults(driverId, {
    maxPages = MAX_RESULT_PAGES,
    revalidate = 21600,
} = {}) {
    if (!isValidDriverId(driverId)) throw new TypeError('A valid Jolpica driverId is required');
    const path = `drivers/${driverId}/results`;
    const rows = [];
    let driver = null;
    let total = null;
    let pages = 0;

    while (total === null || rows.length < total) {
        if (pages >= maxPages) {
            throw new UpstreamError(`Jolpica results for ${driverId} exceed ${maxPages} pages`, { source: 'Jolpica', url: path });
        }
        const payload = await fetchJolpicaPage(path, {
            offset: rows.length,
            limit: PAGE_LIMIT,
            revalidate,
            tags: [F1_CACHE_TAGS.results, F1_CACHE_TAGS.career],
        });
        pages += 1;
        const mrData = payload?.MRData;
        const pageTotal = Number(mrData?.total);
        const races = mrData?.RaceTable?.Races;
        if (!Number.isFinite(pageTotal) || !Array.isArray(races)) {
            throw new UpstreamError('Jolpica returned an invalid results page', { source: 'Jolpica', url: path });
        }
        if (total === null) total = pageTotal;
        const pageRows = races.flatMap((race) => (race.Results || []).map((result) => {
            if (!driver && result.Driver) driver = mapDriver(result.Driver);
            return mapResultRow(race, result);
        }));
        if (pageRows.length === 0) {
            if (rows.length < total) {
                throw new UpstreamError('Jolpica pagination ended before MRData.total', { source: 'Jolpica', url: path });
            }
            break;
        }
        rows.push(...pageRows);
    }
    return { driver, total, results: rows.slice(0, total) };
}

const cachedDriverResults = cacheF1Data(
    (driverId) => fetchDriverResults(driverId),
    ['compare-driver-results-v2'],
    21600,
    [F1_CACHE_TAGS.results, F1_CACHE_TAGS.career],
);

export function getDriverResults(driverId) {
    if (!isValidDriverId(driverId)) throw new TypeError('A valid Jolpica driverId is required');
    return cachedDriverResults(driverId);
}

function raceKey(row) {
    return `${row.season}-${String(row.round).padStart(2, '0')}`;
}

/** One entry per race: a driver's best classified row and the teams he drove for. */
function byRace(results) {
    const races = new Map();
    for (const row of results) {
        const key = raceKey(row);
        const entry = races.get(key) || { ...row, constructorIds: new Set() };
        if (row.constructorId) entry.constructorIds.add(row.constructorId);
        if (row.position != null && (entry.position == null || row.position < entry.position)) {
            entry.position = row.position;
            entry.positionText = row.positionText;
        }
        races.set(key, entry);
    }
    return races;
}

/**
 * Head-to-head over the races both drivers entered: who was classified ahead
 * (Jolpica's position is the full classification order, retirements included),
 * with the subset where they drove for the same team.
 */
export function headToHead(resultsA, resultsB) {
    const racesA = byRace(resultsA);
    const racesB = byRace(resultsB);
    const summary = {
        races: 0,
        aheadA: 0,
        aheadB: 0,
        teammateRaces: 0,
        teammateAheadA: 0,
        teammateAheadB: 0,
        first: null,
        last: null,
    };
    const shared = [...racesA.keys()].filter((key) => racesB.has(key)).sort();
    for (const key of shared) {
        const a = racesA.get(key);
        const b = racesB.get(key);
        if (a.position == null || b.position == null || a.position === b.position) continue;
        const teammates = [...a.constructorIds].some((id) => b.constructorIds.has(id));
        const aWins = a.position < b.position;
        summary.races += 1;
        if (aWins) summary.aheadA += 1;
        else summary.aheadB += 1;
        if (teammates) {
            summary.teammateRaces += 1;
            if (aWins) summary.teammateAheadA += 1;
            else summary.teammateAheadB += 1;
        }
        const race = { season: a.season, round: a.round, raceName: a.raceName };
        if (!summary.first) summary.first = race;
        summary.last = race;
    }
    return summary;
}

/** Career span and teams in the order the driver first raced for them. */
export function careerSummary(results) {
    const sorted = [...results].sort((x, y) => x.season - y.season || x.round - y.round);
    const teams = [];
    for (const row of sorted) {
        if (row.team && !teams.includes(row.team)) teams.push(row.team);
    }
    const points = sorted.reduce((sum, row) => sum + row.points, 0);
    return {
        firstSeason: sorted[0]?.season ?? null,
        lastSeason: sorted.at(-1)?.season ?? null,
        teams,
        points: Math.round(points * 100) / 100,
    };
}

/**
 * Compare two drivers from any era. Returns null when either id is unknown.
 * Results and career totals are cached per driver, so a pair costs nothing
 * once both drivers have been seen.
 */
export async function compareDrivers(idA, idB) {
    if (!isValidDriverId(idA) || !isValidDriverId(idB)) throw new TypeError('Valid Jolpica driverIds are required');
    const [driverA, driverB] = await Promise.all([getAllTimeDriver(idA), getAllTimeDriver(idB)]);
    if (!driverA || !driverB) return null;
    const [resultsA, resultsB, statsA, statsB] = await Promise.all([
        getDriverResults(idA),
        getDriverResults(idB),
        getCareerStats(idA),
        getCareerStats(idB),
    ]);
    return {
        drivers: [
            { ...driverA, ...careerSummary(resultsA.results), stats: statsA },
            { ...driverB, ...careerSummary(resultsB.results), stats: statsB },
        ],
        headToHead: headToHead(resultsA.results, resultsB.results),
    };
}

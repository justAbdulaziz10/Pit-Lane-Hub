import {
    cacheF1Data,
    F1_CACHE_TAGS,
    fetchJolpicaPage,
    fetchJolpicaPages,
    UpstreamError,
} from './http';
import { getSeasonYear } from './year';

export const FIRST_DRIVERS_CHAMPIONSHIP_YEAR = 1950;
export const FIRST_CONSTRUCTORS_CHAMPIONSHIP_YEAR = 1958;
// Jolpica constructor ids are lowercase words joined by "_" or "-" (e.g. "red_bull", "cooper-climax").
export const CONSTRUCTOR_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,59}$/;

const CURRENT_SEASON_REVALIDATE = 300;
const PAST_SEASON_REVALIDATE = 86400;

/**
 * Parse a `?year=` value. Missing or empty means the current season; anything
 * that is not a four-digit year within [min, current] returns null.
 */
export function parseSeasonYear(value, {
    min = FIRST_DRIVERS_CHAMPIONSHIP_YEAR,
    current = getSeasonYear(),
} = {}) {
    if (value === undefined || value === null) return current;
    if (Array.isArray(value)) return null;
    const text = String(value).trim();
    if (text === '') return current;
    if (!/^\d{4}$/.test(text)) return null;
    const year = Number(text);
    return year >= min && year <= current ? year : null;
}

export function hasConstructorsChampionship(year) {
    return Number(year) >= FIRST_CONSTRUCTORS_CHAMPIONSHIP_YEAR;
}

function toNumber(value) {
    const number = Number(value);
    return value !== undefined && value !== null && value !== '' && Number.isFinite(number) ? number : null;
}

export function mapDriverStanding(item) {
    const driver = item?.Driver || {};
    return {
        position: toNumber(item?.position),
        positionText: item?.positionText ?? item?.position ?? null,
        points: toNumber(item?.points) ?? 0,
        wins: toNumber(item?.wins) ?? 0,
        driver: {
            id: driver.driverId,
            code: driver.code || null,
            number: toNumber(driver.permanentNumber),
            firstName: driver.givenName || '',
            lastName: driver.familyName || '',
            nationality: driver.nationality || null,
        },
        teams: (item?.Constructors || []).map((constructor) => ({
            id: constructor.constructorId,
            name: constructor.name,
        })),
    };
}

export function mapConstructorStanding(item) {
    const constructor = item?.Constructor || {};
    return {
        position: toNumber(item?.position),
        positionText: item?.positionText ?? item?.position ?? null,
        points: toNumber(item?.points) ?? 0,
        wins: toNumber(item?.wins) ?? 0,
        team: {
            id: constructor.constructorId,
            name: constructor.name,
            nationality: constructor.nationality || null,
        },
    };
}

/**
 * Jolpica pages standings by entry (max 100), so a season with more entrants
 * (e.g. 1952) spreads one StandingsList over several pages. Flatten the
 * entries, tagged with their round, so pages can be merged.
 */
function flattenStandings(key) {
    return (mrData) => (mrData?.StandingsTable?.StandingsLists || [])
        .flatMap((list) => (list?.[key] || []).map((entry) => ({ round: toNumber(list.round), entry })));
}

/** Keep the latest round only and order by position (unclassified last, upstream order kept). */
export function buildStandings(year, rows, mapEntry) {
    const round = rows.reduce((latest, row) => (row.round !== null && row.round > latest ? row.round : latest), -1);
    const latest = rows.filter((row) => row.round === round);
    const standings = latest
        .map((row, index) => ({ index, value: mapEntry(row.entry) }))
        .sort((a, b) => (a.value.position ?? Infinity) - (b.value.position ?? Infinity) || a.index - b.index)
        .map((item) => item.value);
    return {
        year: Number(year),
        round: round >= 0 ? round : null,
        standings,
    };
}

function standingsLoader(kind) {
    const key = kind === 'drivers' ? 'DriverStandings' : 'ConstructorStandings';
    const path = kind === 'drivers' ? 'driverstandings' : 'constructorstandings';
    const mapEntry = kind === 'drivers' ? mapDriverStanding : mapConstructorStanding;
    return (revalidate) => async (year) => {
        const rows = await fetchJolpicaPages(`${year}/${path}`, {
            select: flattenStandings(key),
            revalidate,
            tags: [F1_CACHE_TAGS.standings],
        });
        return buildStandings(year, rows, mapEntry);
    };
}

const driverLoader = standingsLoader('drivers');
const constructorLoader = standingsLoader('constructors');
const tags = [F1_CACHE_TAGS.standings];

const cachedDriverStandings = {
    current: cacheF1Data(driverLoader(CURRENT_SEASON_REVALIDATE), ['standings-drivers-current'], CURRENT_SEASON_REVALIDATE, tags),
    past: cacheF1Data(driverLoader(PAST_SEASON_REVALIDATE), ['standings-drivers-past'], PAST_SEASON_REVALIDATE, tags),
};
const cachedConstructorStandings = {
    current: cacheF1Data(constructorLoader(CURRENT_SEASON_REVALIDATE), ['standings-constructors-current'], CURRENT_SEASON_REVALIDATE, tags),
    past: cacheF1Data(constructorLoader(PAST_SEASON_REVALIDATE), ['standings-constructors-past'], PAST_SEASON_REVALIDATE, tags),
};

function checkedYear(year, min) {
    const value = Number(year);
    const current = getSeasonYear();
    if (!Number.isInteger(value) || value < min || value > current) {
        throw new RangeError(`No championship standings exist for ${year}`);
    }
    return { value, bucket: value === current ? 'current' : 'past' };
}

/** Driver standings after the latest round: { year, round, standings }. Empty before round 1. */
export function getDriverStandings(year = getSeasonYear()) {
    const { value, bucket } = checkedYear(year, FIRST_DRIVERS_CHAMPIONSHIP_YEAR);
    return cachedDriverStandings[bucket](value);
}

/** Constructor standings after the latest round (the championship started in 1958). */
export function getConstructorStandings(year = getSeasonYear()) {
    const { value, bucket } = checkedYear(year, FIRST_CONSTRUCTORS_CHAMPIONSHIP_YEAR);
    return cachedConstructorStandings[bucket](value);
}

async function jolpicaTotal(path, revalidate) {
    const payload = await fetchJolpicaPage(path, { limit: 1, revalidate, tags: [F1_CACHE_TAGS.teams] });
    const total = Number(payload?.MRData?.total);
    if (!Number.isFinite(total)) {
        throw new UpstreamError('Jolpica returned a response without MRData.total', { source: 'Jolpica', url: path });
    }
    return { total, payload };
}

async function loadConstructor(constructorId) {
    const { payload } = await jolpicaTotal(`constructors/${constructorId}`, PAST_SEASON_REVALIDATE);
    const constructor = payload?.MRData?.ConstructorTable?.Constructors?.[0];
    if (!constructor || constructor.constructorId !== constructorId) return null;
    return {
        constructorId: constructor.constructorId,
        name: constructor.name,
        nationality: constructor.nationality || null,
        url: constructor.url || null,
    };
}

async function loadConstructorRecord(constructorId) {
    const [wins, races, seasons] = await Promise.all([
        jolpicaTotal(`constructors/${constructorId}/results/1`, 3600),
        jolpicaTotal(`constructors/${constructorId}/races`, 3600),
        jolpicaTotal(`constructors/${constructorId}/seasons`, 3600),
    ]);
    return { wins: wins.total, races: races.total, seasons: seasons.total };
}

const cachedConstructor = cacheF1Data(loadConstructor, ['constructor'], PAST_SEASON_REVALIDATE, [F1_CACHE_TAGS.teams]);
const cachedConstructorRecord = cacheF1Data(loadConstructorRecord, ['constructor-record'], 3600, [F1_CACHE_TAGS.teams]);

export function isConstructorId(value) {
    return typeof value === 'string' && CONSTRUCTOR_ID_PATTERN.test(value);
}

/** Jolpica constructor by id, or null when the id is malformed or unknown. */
export async function getConstructor(constructorId) {
    if (!isConstructorId(constructorId)) return null;
    return cachedConstructor(constructorId);
}

/** All-time totals: race wins, races entered and seasons entered. */
export function getConstructorRecord(constructorId) {
    if (!isConstructorId(constructorId)) throw new TypeError('A valid Jolpica constructorId is required');
    return cachedConstructorRecord(constructorId);
}

/**
 * Race dates by round. The calendar's raceStart is null for seasons whose
 * races have no start time in Jolpica (most of the pre-2005 archive), so the
 * history view reads the calendar date itself. Same request as the calendar
 * loader, so the fetch cache shares it.
 */
async function loadRaceDates(year) {
    const races = await fetchJolpicaPages(`${year}/races`, {
        select: (mrData) => mrData?.RaceTable?.Races || [],
        revalidate: 3600,
        tags: [F1_CACHE_TAGS.calendar],
    });
    return races
        .filter((race) => /^\d{4}-\d{2}-\d{2}$/.test(String(race?.date || '')))
        .map((race) => ({ round: Number(race.round), date: race.date }));
}

const cachedRaceDates = cacheF1Data(loadRaceDates, ['race-dates'], 3600, [F1_CACHE_TAGS.calendar]);

/** Map of round -> 'YYYY-MM-DD' race date for a season. */
export async function getRaceDates(year) {
    const { value } = checkedYear(year, FIRST_DRIVERS_CHAMPIONSHIP_YEAR);
    const rows = await cachedRaceDates(value);
    return new Map(rows.map((row) => [row.round, row.date]));
}

/** Years in which the constructor won the constructors' championship, oldest first. */
export function constructorChampionshipYears(champions, constructorId) {
    return (champions?.constructors || [])
        .filter((item) => item.constructorId === constructorId)
        .map((item) => Number(item.year))
        .sort((a, b) => a - b);
}

/**
 * `getTeams()` lists everyone who scored for a team this season, including
 * drivers since replaced. Keep the drivers on the current grid; if none of them
 * are (grid unavailable or not yet published), keep the season list.
 */
export function currentGridDrivers(team, grid) {
    const drivers = team?.drivers || [];
    const onGrid = new Set((grid || []).map((driver) => driver.driverId).filter(Boolean));
    const current = drivers.filter((driver) => onGrid.has(driver.driverId));
    return current.length > 0 ? current : drivers;
}

/**
 * Lookups built from the current season's teams (`getTeams()`): readable team
 * colours and canonical names by constructorId, and driver page links for the
 * drivers on the current grid (`getGrid()`; falls back to the team lists).
 */
export function currentSeasonLookups(teams, grid = []) {
    const colorById = new Map();
    const nameById = new Map();
    const driverHrefById = new Map();
    const linkable = [];
    for (const team of teams || []) {
        if (!team?.constructorId) continue;
        colorById.set(team.constructorId, team.color);
        nameById.set(team.constructorId, team.name);
        linkable.push(...(team.drivers || []));
    }
    const drivers = grid && grid.length > 0 ? grid : linkable;
    for (const driver of drivers) {
        const key = driver.racingNumber ?? driver.number ?? driver.driverId;
        if (driver.driverId && key != null) driverHrefById.set(driver.driverId, `/driver/${encodeURIComponent(key)}`);
    }
    return { colorById, nameById, driverHrefById };
}

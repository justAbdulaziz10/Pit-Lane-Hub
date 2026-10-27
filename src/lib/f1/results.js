import {
    cacheF1Data,
    F1_CACHE_TAGS,
    fetchJolpicaPages,
    fetchOpenF1Json,
    UpstreamError,
} from './http';
import { getGrid } from './drivers';
import { canonicalTeamNameForId } from './team-utils';
import { getSeasonYear } from './year';

const HOUR = 3600000;
const RECENT_WINDOW_MS = 4 * 24 * HOUR;

/** Result endpoints and the MRData key that holds their rows. */
const RESULT_KINDS = Object.freeze({
    race: { path: 'results', rows: 'Results' },
    qualifying: { path: 'qualifying', rows: 'QualifyingResults' },
    sprint: { path: 'sprint', rows: 'SprintResults' },
});

/** How long after a session starts before its results are worth requesting. */
const SESSION_DONE_AFTER_MS = Object.freeze({
    race: 2 * HOUR,
    qualifying: 1.25 * HOUR,
    sprint: HOUR,
});

function toNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function mapDriver(driver = {}) {
    return {
        id: driver.driverId || null,
        code: driver.code || null,
        number: toNumber(driver.permanentNumber),
        firstName: driver.givenName || '',
        lastName: driver.familyName || '',
        nationality: driver.nationality || null,
    };
}

function mapTeam(constructor, season) {
    if (!constructor) return null;
    return {
        id: constructor.constructorId || null,
        name: canonicalTeamNameForId(constructor.constructorId, constructor.name, season),
    };
}

/** Map a Jolpica race or sprint result row. */
export function mapResultRow(row, season = getSeasonYear()) {
    const fastestRank = toNumber(row?.FastestLap?.rank);
    return {
        position: toNumber(row?.position),
        positionText: row?.positionText || row?.position || null,
        number: toNumber(row?.number),
        driver: mapDriver(row?.Driver),
        team: mapTeam(row?.Constructor, season),
        grid: toNumber(row?.grid),
        laps: toNumber(row?.laps),
        status: row?.status || null,
        time: row?.Time?.time || null,
        points: toNumber(row?.points) ?? 0,
        fastestLap: row?.FastestLap?.Time?.time
            ? { rank: fastestRank, lap: toNumber(row.FastestLap.lap), time: row.FastestLap.Time.time }
            : null,
    };
}

/** Map a Jolpica qualifying row. */
export function mapQualifyingRow(row, season = getSeasonYear()) {
    return {
        position: toNumber(row?.position),
        number: toNumber(row?.number),
        driver: mapDriver(row?.Driver),
        team: mapTeam(row?.Constructor, season),
        q1: row?.Q1 || null,
        q2: row?.Q2 || null,
        q3: row?.Q3 || null,
    };
}

/** The classified fastest lap of a race, or null when Jolpica has none. */
export function fastestLapOf(results) {
    const ranked = (results || []).filter((row) => row.fastestLap?.time);
    return ranked.find((row) => row.fastestLap.rank === 1)
        || [...ranked].sort((a, b) => (a.fastestLap.rank ?? Infinity) - (b.fastestLap.rank ?? Infinity))[0]
        || null;
}

/**
 * Text for the time/gap column: total time for the winner, gap for finishers,
 * laps behind for lapped cars, otherwise the classification status.
 */
export function gapText(row, leaderLaps) {
    if (/^\+\d+ Laps?$/.test(row.status || '')) return row.status;
    // Jolpica attaches a time to lapped cars too; the lap deficit is what counts.
    if (row.status === 'Lapped') {
        if (Number.isFinite(leaderLaps) && Number.isFinite(row.laps) && leaderLaps > row.laps) {
            const behind = leaderLaps - row.laps;
            return `+${behind} ${behind === 1 ? 'Lap' : 'Laps'}`;
        }
        return 'Lapped';
    }
    if (row.time) return row.time;
    return row.status || '';
}

/** Whether a session has been run long enough ago for results to be expected. */
export function sessionDone(kind, startIso, now = Date.now()) {
    const start = Date.parse(startIso || '');
    return Number.isFinite(start) && now >= start + SESSION_DONE_AFTER_MS[kind];
}

/** Results of a weekend that ended recently change often; older ones are final. */
export function isRecentWeekend(raceStartIso, now = Date.now()) {
    const raceStart = Date.parse(raceStartIso || '');
    return !Number.isFinite(raceStart) || now - raceStart < RECENT_WINDOW_MS;
}

async function loadSessionResults(year, round, kind, revalidate) {
    const config = RESULT_KINDS[kind];
    if (!config) throw new TypeError(`Unknown result kind: ${kind}`);
    const rows = await fetchJolpicaPages(`${Number(year)}/${Number(round)}/${config.path}`, {
        select: (mrData) => {
            const races = mrData?.RaceTable?.Races;
            if (!Array.isArray(races)) return null;
            return races[0]?.[config.rows] || [];
        },
        revalidate,
        tags: [F1_CACHE_TAGS.results],
    });
    return kind === 'qualifying'
        ? rows.map((row) => mapQualifyingRow(row, Number(year)))
        : rows.map((row) => mapResultRow(row, Number(year)));
}

const cachedRecentResults = cacheF1Data(
    (year, round, kind) => loadSessionResults(year, round, kind, 300),
    ['session-results-recent'],
    300,
    [F1_CACHE_TAGS.results],
);

const cachedArchivedResults = cacheF1Data(
    (year, round, kind) => loadSessionResults(year, round, kind, 86400),
    ['session-results-archive'],
    86400,
    [F1_CACHE_TAGS.results],
);

/**
 * Results for one session of a round. Throws UpstreamError on failure.
 * Pass the race start so recent weekends refresh every five minutes.
 */
export function getSessionResults(year, round, kind, { raceStart = null, now = Date.now() } = {}) {
    if (!RESULT_KINDS[kind]) throw new TypeError(`Unknown result kind: ${kind}`);
    const loader = isRecentWeekend(raceStart, now) ? cachedRecentResults : cachedArchivedResults;
    return loader(Number(year), Number(round), kind);
}

export function getRaceResults(year, round, options) {
    return getSessionResults(year, round, 'race', options);
}

/**
 * Results for every session of a calendar event that has already been run.
 * A session that hasn't run yet is null; a run session with no published
 * classification yet is an empty array.
 */
export async function getWeekendResults(event, now = Date.now()) {
    const options = { raceStart: event.raceStart, now };
    const load = (kind, start) => (sessionDone(kind, start, now)
        ? getSessionResults(event.year, event.round, kind, options)
        : Promise.resolve(null));
    const [race, qualifying, sprint] = await Promise.all([
        load('race', event.sessions?.race || event.raceStart),
        load('qualifying', event.sessions?.qualifying),
        load('sprint', event.sessions?.sprint),
    ]);
    return { race, qualifying, sprint };
}

async function loadRaceStrategy(meetingKey) {
    const sessions = await fetchOpenF1Json(`sessions?meeting_key=${encodeURIComponent(meetingKey)}`);
    if (!Array.isArray(sessions)) {
        throw new UpstreamError('OpenF1 returned an invalid session list', { source: 'OpenF1' });
    }
    const race = sessions.find((session) => session.session_name === 'Race');
    if (!race?.session_key) return { stints: [], pitStops: [], drivers: [] };
    const sessionKey = encodeURIComponent(race.session_key);
    const [stints, pitStops, drivers] = await Promise.all([
        fetchOpenF1Json(`stints?session_key=${sessionKey}`),
        fetchOpenF1Json(`pit?session_key=${sessionKey}`),
        fetchOpenF1Json(`drivers?session_key=${sessionKey}`),
    ]);
    if (![stints, pitStops, drivers].every(Array.isArray)) {
        throw new UpstreamError('OpenF1 returned an invalid strategy response', { source: 'OpenF1' });
    }
    return {
        stints: stints.map((row) => ({
            driver_number: row.driver_number,
            stint_number: row.stint_number,
            lap_start: row.lap_start,
            lap_end: row.lap_end,
            compound: row.compound || null,
        })),
        pitStops: pitStops.map((row) => ({
            driverNumber: row.driver_number,
            lap: row.lap_number ?? null,
            duration: row.pit_duration ?? row.lane_duration ?? null,
        })),
        drivers: drivers.map((row) => ({
            number: row.driver_number,
            code: row.name_acronym || null,
            lastName: row.last_name || null,
        })),
    };
}

const cachedRaceStrategy = cacheF1Data(loadRaceStrategy, ['race-strategy'], 3600, [F1_CACHE_TAGS.results]);

/** Tyre stints and pit stops of a finished race from OpenF1. Throws on failure. */
export function getRaceStrategy(meetingKey) {
    return cachedRaceStrategy(String(meetingKey));
}

/** driverId -> current racing number, for linking results to /driver/<number>. */
export async function getDriverNumbers(year = getSeasonYear()) {
    const grid = await getGrid(year);
    return Object.fromEntries(grid
        .filter((driver) => driver.driverId && driver.racingNumber != null)
        .map((driver) => [driver.driverId, driver.racingNumber]));
}

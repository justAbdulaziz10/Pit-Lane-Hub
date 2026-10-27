import {
    cacheF1Data,
    F1_CACHE_TAGS,
    fetchJolpicaPage,
    fetchOpenF1Json,
    UpstreamError,
} from './http';

const DAY = 24 * 60 * 60;
const THIRTY_DAYS = 30 * DAY;

/** Jolpica's circuit result endpoint returns one winner row per Grand Prix. */
export function mapCircuitHistory(mrData) {
    const races = mrData?.RaceTable?.Races;
    if (!Array.isArray(races)) return { firstGrandPrixYear: null, winners: [] };

    const winners = races.flatMap((race) => {
        const result = race?.Results?.[0];
        const year = Number(race?.season);
        const driver = result?.Driver;
        const team = result?.Constructor;
        if (!Number.isFinite(year) || !driver?.driverId) return [];
        return [{
            year,
            round: Number(race.round) || null,
            raceName: race.raceName || null,
            driverId: driver.driverId,
            firstName: driver.givenName || '',
            lastName: driver.familyName || '',
            teamId: team?.constructorId || null,
            teamName: team?.name || null,
        }];
    }).sort((a, b) => b.year - a.year || (b.round || 0) - (a.round || 0));

    const firstGrandPrixYear = winners.length > 0
        ? Math.min(...winners.map((winner) => winner.year))
        : null;
    return { firstGrandPrixYear, winners: winners.slice(0, 5) };
}

async function loadCircuitHistory(circuitId) {
    const response = await fetchJolpicaPage(`circuits/${encodeURIComponent(circuitId)}/results/1`, {
        limit: 100,
        revalidate: THIRTY_DAYS,
        tags: [F1_CACHE_TAGS.circuits],
    });
    return mapCircuitHistory(response?.MRData);
}

const cachedCircuitHistory = cacheF1Data(
    loadCircuitHistory,
    ['circuit-history'],
    THIRTY_DAYS,
    [F1_CACHE_TAGS.circuits],
);

/** Circuit history is supplemental; upstream failures leave the circuit page usable. */
export async function getCircuitHistory(circuitId) {
    try {
        return await cachedCircuitHistory(String(circuitId || ''));
    } catch (error) {
        console.error('Circuit history unavailable', error);
        return null;
    }
}

/** Winners for all rounds are served from Jolpica's single results/1 response. */
export function mapSeasonWinners(mrData) {
    const races = mrData?.RaceTable?.Races;
    if (!Array.isArray(races)) return [];
    return races.flatMap((race) => {
        const result = race?.Results?.[0];
        const driver = result?.Driver;
        if (!driver?.driverId) return [];
        return [{
            round: Number(race.round),
            driverId: driver.driverId,
            firstName: driver.givenName || '',
            lastName: driver.familyName || '',
            teamName: result.Constructor?.name || null,
        }];
    }).filter((winner) => Number.isFinite(winner.round));
}

async function loadSeasonWinners(year) {
    const response = await fetchJolpicaPage(`${Number(year)}/results/1`, {
        limit: 100,
        revalidate: 3600,
        tags: [F1_CACHE_TAGS.results],
    });
    return mapSeasonWinners(response?.MRData);
}

const cachedSeasonWinners = cacheF1Data(
    loadSeasonWinners,
    ['season-winners'],
    3600,
    [F1_CACHE_TAGS.results],
);

export function getSeasonWinners(year) {
    return cachedSeasonWinners(Number(year));
}

/** Refresh strategy frequently near the race, then store complete results for a month. */
export function strategyRevalidateSeconds(raceStart, now = Date.now()) {
    const start = Date.parse(raceStart || '');
    if (!Number.isFinite(start)) return 300;
    return now - start > DAY * 1000 ? THIRTY_DAYS : 300;
}

/** Empty or incomplete stint lists must throw before entering Next's data cache. */
export function isCompleteStrategy(strategy, expectedNumbers = []) {
    const stints = strategy?.stints;
    if (!Array.isArray(stints) || stints.length === 0) return false;
    if (stints.some((stint) => (
        !Number.isFinite(Number(stint?.driver_number))
        || !Number.isFinite(Number(stint?.lap_start))
        || !Number.isFinite(Number(stint?.lap_end))
        || Number(stint.lap_end) < Number(stint.lap_start)
    ))) return false;

    const expected = [...new Set(expectedNumbers.map(Number).filter(Number.isFinite))];
    if (expected.length === 0) return false;
    const represented = new Set(stints.map((stint) => Number(stint.driver_number)));
    return expected.every((number) => represented.has(number));
}

async function loadCompleteStrategy(meetingKey, expectedNumbers) {
    const sessions = await fetchOpenF1Json(`sessions?meeting_key=${encodeURIComponent(meetingKey)}`);
    if (!Array.isArray(sessions)) {
        throw new UpstreamError('OpenF1 returned an invalid session list', { source: 'OpenF1' });
    }
    const race = sessions.find((session) => session.session_name === 'Race');
    if (!race?.session_key) throw new UpstreamError('OpenF1 has no race session for this meeting', { source: 'OpenF1' });

    const sessionKey = encodeURIComponent(race.session_key);
    const [stints, pitStops, drivers] = await Promise.all([
        fetchOpenF1Json(`stints?session_key=${sessionKey}`),
        fetchOpenF1Json(`pit?session_key=${sessionKey}`),
        fetchOpenF1Json(`drivers?session_key=${sessionKey}`),
    ]);
    if (![stints, pitStops, drivers].every(Array.isArray)) {
        throw new UpstreamError('OpenF1 returned an invalid strategy response', { source: 'OpenF1' });
    }

    const strategy = {
        stints: stints.map((row) => ({
            driver_number: Number(row.driver_number),
            stint_number: Number(row.stint_number) || null,
            lap_start: Number(row.lap_start),
            lap_end: Number(row.lap_end),
            compound: row.compound || null,
        })),
        pitStops: pitStops.map((row) => ({
            driverNumber: Number(row.driver_number),
            lap: row.lap_number == null ? null : Number(row.lap_number),
            duration: Number(row.pit_duration ?? row.lane_duration) || null,
        })),
        drivers: drivers.map((row) => ({
            number: Number(row.driver_number),
            code: row.name_acronym || null,
            lastName: row.last_name || null,
        })),
    };

    if (!isCompleteStrategy(strategy, expectedNumbers)) {
        throw new UpstreamError('OpenF1 strategy is empty or incomplete', { source: 'OpenF1' });
    }
    return strategy;
}

const cachedRecentStrategy = cacheF1Data(
    loadCompleteStrategy,
    ['race-strategy-near-start'],
    300,
    [F1_CACHE_TAGS.results],
);
const cachedArchivedStrategy = cacheF1Data(
    loadCompleteStrategy,
    ['race-strategy-archive'],
    THIRTY_DAYS,
    [F1_CACHE_TAGS.results],
);

export function getRaceStrategy(meetingKey, { raceStart, now = Date.now(), expectedNumbers = [] } = {}) {
    if (meetingKey == null) throw new TypeError('A meeting key is required for race strategy');
    const loader = strategyRevalidateSeconds(raceStart, now) === 300
        ? cachedRecentStrategy
        : cachedArchivedStrategy;
    return loader(String(meetingKey), expectedNumbers);
}

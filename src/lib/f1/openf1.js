import { getCurrentYear } from './constants';
import { fetchJson, OPENF1_BASE_URL, UpstreamError } from './http';

async function cachedRows(path, revalidate) {
    let payload;
    try {
        payload = await fetchJson(`${OPENF1_BASE_URL}/${path}`, {
            source: 'OpenF1',
            fetchOptions: { next: { revalidate, tags: ['f1-openf1-legacy'] } },
        });
    } catch (error) {
        // OpenF1 answers 404 "No results found." for an empty query result.
        if (error instanceof UpstreamError && error.status === 404) return [];
        throw error;
    }
    if (!Array.isArray(payload)) {
        throw new UpstreamError('OpenF1 returned an invalid list response', { source: 'OpenF1', url: path });
    }
    return payload;
}
/** Fetch drivers for a session. */
export async function getDrivers(sessionKey = null) {
    const key = sessionKey == null ? 'latest' : encodeURIComponent(sessionKey);
    const drivers = await cachedRows(`drivers?session_key=${key}`, 5);
    return drivers.map((driver) => ({ ...driver, country_code: driver.country_code || null }));
}

/** Fetch the latest session known to OpenF1. */
export async function getCurrentSession() {
    const sessions = await cachedRows('sessions?session_key=latest', 5);
    return sessions[0] || null;
}

/** Fetch all sessions for a season. */
export function getSessions(year = getCurrentYear()) {
    return cachedRows(`sessions?year=${encodeURIComponent(year)}`, 3600);
}

/** Fetch race weekends for a season. */
export function getMeetings(year = getCurrentYear()) {
    return cachedRows(`meetings?year=${encodeURIComponent(year)}`, 3600);
}

/** Reduce an OpenF1 position time-series to the latest position per driver. */
export function latestPositions(positions = []) {
    const latest = new Map();
    for (const position of positions) {
        if (position?.driver_number == null || position?.position == null) continue;
        latest.set(position.driver_number, position.position);
    }
    return latest;
}

/** Fetch position data for a session. */
export function getPositions(sessionKey = 'latest') {
    return cachedRows(`position?session_key=${encodeURIComponent(sessionKey)}`, 5);
}

/** Fetch lap times. */
export function getLapTimes(sessionKey = 'latest', driverNumber = null) {
    const driver = driverNumber == null ? '' : `&driver_number=${encodeURIComponent(driverNumber)}`;
    return cachedRows(`laps?session_key=${encodeURIComponent(sessionKey)}${driver}`, 5);
}

/** Fetch the most recent weather reading. */
export async function getWeather(sessionKey = 'latest') {
    const readings = await cachedRows(`weather?session_key=${encodeURIComponent(sessionKey)}`, 5);
    return readings.at(-1) || null;
}

/** Fetch tire stint data. */
export function getStints(sessionKey = 'latest') {
    return cachedRows(`stints?session_key=${encodeURIComponent(sessionKey)}`, 5);
}

/** Fetch pit stop data. */
export function getPitStops(sessionKey = 'latest') {
    return cachedRows(`pit?session_key=${encodeURIComponent(sessionKey)}`, 5);
}

// OpenF1 API wrapper - free, no signup required.
import { CURRENT_YEAR, DRIVER_NATIONALITIES } from './constants';

const BASE_URL = 'https://api.openf1.org/v1';

/**
 * Fetch drivers for a session.
 * @param {number|null} sessionKey - Optional session key (defaults to latest).
 */
export async function getDrivers(sessionKey = null) {
    try {
        const url = `${BASE_URL}/drivers?session_key=${sessionKey || 'latest'}`;
        const response = await fetch(url, { next: { revalidate: 60 } });
        if (!response.ok) throw new Error('Failed to fetch drivers');
        const drivers = await response.json();

        // Inject nationalities if missing.
        return drivers.map((d) => ({
            ...d,
            country_code: d.country_code || DRIVER_NATIONALITIES[d.driver_number] || 'INT',
        }));
    } catch (error) {
        console.error('Error fetching drivers:', error);
        return [];
    }
}

/**
 * Fetch current session info.
 */
export async function getCurrentSession() {
    try {
        const response = await fetch(`${BASE_URL}/sessions?session_key=latest`, {
            next: { revalidate: 60 },
        });
        if (!response.ok) throw new Error('Failed to fetch session');
        const data = await response.json();
        return data[0] || null;
    } catch (error) {
        console.error('Error fetching session:', error);
        return null;
    }
}

/**
 * Fetch all sessions for a year.
 * @param {number} year
 */
export async function getSessions(year = CURRENT_YEAR) {
    try {
        const response = await fetch(`${BASE_URL}/sessions?year=${year}`, {
            next: { revalidate: 3600 },
        });
        if (!response.ok) throw new Error('Failed to fetch sessions');
        return await response.json();
    } catch (error) {
        console.error('Error fetching sessions:', error);
        return [];
    }
}

/**
 * Fetch meetings (race weekends) for a year.
 * @param {number} year
 */
export async function getMeetings(year = CURRENT_YEAR) {
    try {
        const response = await fetch(`${BASE_URL}/meetings?year=${year}`, {
            next: { revalidate: 3600 },
        });
        if (!response.ok) throw new Error('Failed to fetch meetings');
        return await response.json();
    } catch (error) {
        console.error('Error fetching meetings:', error);
        return [];
    }
}

/**
 * Reduce an OpenF1 position time-series to the latest position per driver.
 * The endpoint returns one row per position change; the last row for a driver
 * is their current position.
 * @param {Array<{driver_number:number, position:number, date?:string}>} positions
 * @returns {Map<number, number>} driver_number -> latest position
 */
export function latestPositions(positions = []) {
    const latest = new Map();
    for (const p of positions) {
        if (p?.driver_number == null || p?.position == null) continue;
        latest.set(p.driver_number, p.position);
    }
    return latest;
}

/**
 * Fetch position data for a session.
 * @param {number|string} sessionKey
 */
export async function getPositions(sessionKey = 'latest') {
    try {
        const response = await fetch(`${BASE_URL}/position?session_key=${sessionKey}`, {
            next: { revalidate: 10 },
        });
        if (!response.ok) throw new Error('Failed to fetch positions');
        return await response.json();
    } catch (error) {
        console.error('Error fetching positions:', error);
        return [];
    }
}

/**
 * Fetch lap times.
 * @param {number|string} sessionKey
 * @param {number|null} driverNumber
 */
export async function getLapTimes(sessionKey = 'latest', driverNumber = null) {
    try {
        let url = `${BASE_URL}/laps?session_key=${sessionKey}`;
        if (driverNumber) url += `&driver_number=${driverNumber}`;
        const response = await fetch(url, { next: { revalidate: 10 } });
        if (!response.ok) throw new Error('Failed to fetch lap times');
        return await response.json();
    } catch (error) {
        console.error('Error fetching lap times:', error);
        return [];
    }
}

/**
 * Fetch weather data (latest reading).
 * @param {number|string} sessionKey
 */
export async function getWeather(sessionKey = 'latest') {
    try {
        const response = await fetch(`${BASE_URL}/weather?session_key=${sessionKey}`, {
            next: { revalidate: 60 },
        });
        if (!response.ok) throw new Error('Failed to fetch weather');
        const data = await response.json();
        return data[data.length - 1] || null;
    } catch (error) {
        console.error('Error fetching weather:', error);
        return null;
    }
}

/**
 * Fetch stints data (tire strategies).
 * @param {number|string} sessionKey
 */
export async function getStints(sessionKey = 'latest') {
    try {
        const response = await fetch(`${BASE_URL}/stints?session_key=${sessionKey}`, {
            next: { revalidate: 30 },
        });
        if (!response.ok) throw new Error('Failed to fetch stints');
        return await response.json();
    } catch (error) {
        console.error('Error fetching stints:', error);
        return [];
    }
}

/**
 * Fetch pit stop data.
 * @param {number|string} sessionKey
 */
export async function getPitStops(sessionKey = 'latest') {
    try {
        const response = await fetch(`${BASE_URL}/pit?session_key=${sessionKey}`, {
            next: { revalidate: 30 },
        });
        if (!response.ok) throw new Error('Failed to fetch pit stops');
        return await response.json();
    } catch (error) {
        console.error('Error fetching pit stops:', error);
        return [];
    }
}

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { cacheStore, cacheConfigs } = vi.hoisted(() => ({
    cacheStore: new Map(),
    cacheConfigs: [],
}));

vi.mock('next/cache', () => ({
    unstable_cache: (callback, keyParts = [], options = {}) => {
        cacheConfigs.push({ keyParts, options });
        return (...args) => {
            const key = JSON.stringify([keyParts, args]);
            if (cacheStore.has(key)) return cacheStore.get(key);
            const result = Promise.resolve().then(() => callback(...args));
            cacheStore.set(key, result);
            result.catch(() => cacheStore.delete(key));
            return result;
        };
    },
}));

import { getGrid, resolveDriver } from '@/lib/f1/drivers';
import { getOpenF1GridData } from '@/lib/f1/openf1-data';
import { getCalendar, getEventByMeetingKey, getNextRace } from '@/lib/f1/season';

const jsonResponse = (payload, { status = 200, headers = {} } = {}) => ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => headers[name.toLowerCase()] || null },
    json: async () => payload,
});

const mrData = (total, tables) => ({ MRData: { total: String(total), ...tables } });

const seasonDrivers = [
    { driverId: 'norris', code: 'NOR', permanentNumber: '4', givenName: 'Lando', familyName: 'Norris', nationality: 'British' },
    { driverId: 'lawson', code: 'LAW', permanentNumber: '30', givenName: 'Liam', familyName: 'Lawson', nationality: 'New Zealander' },
];

const races = [
    {
        season: '2026',
        round: '1',
        raceName: 'Australian Grand Prix',
        date: '2026-10-01',
        time: '05:00:00Z',
        Circuit: { circuitId: 'albert_park', circuitName: 'Albert Park', Location: { country: 'Australia' } },
    },
    {
        season: '2026',
        round: '2',
        raceName: 'Bahrain Grand Prix',
        date: '2026-11-05',
        time: '15:00:00Z',
        FirstPractice: { date: '2026-11-03', time: '12:00:00Z' },
        Circuit: { circuitId: 'bahrain', circuitName: 'Bahrain International Circuit', Location: { country: 'Bahrain' } },
    },
];

const latestResults = [
    { number: '4', Driver: seasonDrivers[0], Constructor: { constructorId: 'mclaren', name: 'McLaren' } },
    { number: '30', Driver: seasonDrivers[1], Constructor: { constructorId: 'racing_bulls', name: 'Racing Bulls' } },
];

beforeEach(() => {
    cacheStore.clear();
    vi.stubEnv('OPENF1_USERNAME', '');
    vi.stubEnv('OPENF1_PASSWORD', '');
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-27T12:00:00Z'));
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.useRealTimers();
});

function installUpstreamFailure(mode) {
    const fetchMock = vi.fn(async (input, options) => {
        const url = new URL(input);
        if (url.hostname === 'api.openf1.org') {
            if (mode === 'timeout') {
                return new Promise((resolve, reject) => {
                    const abort = () => {
                        const error = new Error('aborted');
                        error.name = 'AbortError';
                        reject(error);
                    };
                    if (options.signal.aborted) abort();
                    else options.signal.addEventListener('abort', abort, { once: true });
                });
            }
            const status = mode === '429' ? 429 : mode === '503' ? 503 : 401;
            const headers = mode === '429' ? { 'retry-after': '3600' } : {};
            return jsonResponse({ message: 'blocked' }, { status, headers });
        }

        if (url.pathname.endsWith('/2026/races.json')) {
            const offset = Number(url.searchParams.get('offset') || 0);
            return jsonResponse(mrData(races.length, {
                RaceTable: { Races: races.slice(offset, offset + 100) },
            }));
        }
        if (url.pathname.endsWith('/2026/drivers.json')) {
            return jsonResponse(mrData(seasonDrivers.length, { DriverTable: { Drivers: seasonDrivers } }));
        }
        if (url.pathname.endsWith('/2026/1/results.json')) {
            return jsonResponse(mrData(latestResults.length, { RaceTable: { Races: [{ Results: latestResults }] } }));
        }
        throw new Error(`Unexpected fixture request: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
}

function installNoCompletedRaceFixtures({ openF1Down = false, includeDebutant = false } = {}) {
    const futureRaces = [
        {
            season: '2026',
            round: '1',
            raceName: 'Future Grand Prix',
            date: '2026-11-05',
            time: '15:00:00Z',
            Circuit: { circuitId: 'future', circuitName: 'Future Circuit', Location: { country: 'Bahrain' } },
        },
    ];
    const openDrivers = [
        {
            driver_number: 4,
            name_acronym: 'NOR',
            first_name: 'Lando',
            last_name: 'Norris',
            full_name: 'Lando Norris',
            team_name: 'Haas F1 Team',
            headshot_url: 'https://example.test/norris.png',
            team_colour: 'FF0000',
        },
        ...(includeDebutant ? [{
            driver_number: 99,
            name_acronym: 'ROK',
            first_name: 'Rookie',
            last_name: 'Driver',
            full_name: 'Rookie Driver',
            team_name: 'Haas F1 Team',
            headshot_url: 'https://example.test/rookie.png',
            team_colour: 'FF0000',
        }] : []),
    ];

    const fetchMock = vi.fn(async (input) => {
        const url = new URL(input);
        if (url.hostname === 'api.openf1.org') {
            if (openF1Down) return jsonResponse({ message: 'unavailable' }, { status: 503 });
            if (url.pathname.endsWith('/sessions')) {
                return jsonResponse([{ session_key: 902, session_name: 'Race', date_start: '2026-10-25T05:00:00Z' }]);
            }
            if (url.pathname.endsWith('/drivers')) return jsonResponse(openDrivers);
            return jsonResponse([]);
        }
        if (url.pathname.endsWith('/2026/races.json')) {
            return jsonResponse(mrData(futureRaces.length, { RaceTable: { Races: futureRaces } }));
        }
        if (url.pathname.endsWith('/2026/drivers.json')) {
            return jsonResponse(mrData(seasonDrivers.length, { DriverTable: { Drivers: seasonDrivers } }));
        }
        throw new Error(`Unexpected fixture request: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
}

describe('OpenF1 enrichment failure fallback', () => {
    it.each(['401', '429', '503', 'timeout'])('keeps calendar, next race, grid and lookups available on a cold cache when OpenF1 returns %s', async (mode) => {
        const fetchMock = installUpstreamFailure(mode);
        const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
        warning.mockClear();
        const now = Date.now();

        const calendar = await getCalendar(2026, now);
        expect(calendar.rounds).toHaveLength(2);
        expect(calendar.rounds[0]).toMatchObject({ meetingKey: null, routeKey: '2026-1' });
        expect(await getNextRace(2026, now)).toMatchObject({ round: 2, routeKey: '2026-2' });

        const grid = await getGrid(2026);
        expect(grid).toHaveLength(2);
        expect(grid[0]).toMatchObject({ driverId: 'norris', racingNumber: 4, team: 'McLaren', inLatestSession: null });
        expect(await resolveDriver('LAW', 2026)).toMatchObject({ driverId: 'lawson', racingNumber: 30 });
        expect(await getEventByMeetingKey('2026-2')).toMatchObject({ kind: 'race', event: { round: 2 } });

        expect(warning, JSON.stringify(warning.mock.calls.map(([message]) => message)))
            .toHaveBeenCalledTimes(3);
        expect(warning.mock.calls.every(([message]) => String(message).includes(mode === 'timeout' ? 'timed out' : `HTTP ${mode}`))).toBe(true);
        const openRequests = fetchMock.mock.calls.filter(([input]) => new URL(input).hostname === 'api.openf1.org');
        expect(openRequests.some(([input]) => String(input).includes('/token'))).toBe(false);
    }, 15000);

    it('caches meeting and calendar-session enrichment separately for a day', () => {
        expect(cacheConfigs.find(({ keyParts }) => keyParts.includes('openf1-meetings'))?.options.revalidate).toBe(86400);
        expect(cacheConfigs.find(({ keyParts }) => keyParts.includes('openf1-calendar-sessions'))?.options.revalidate).toBe(86400);
    });

    it('uses OpenF1 team data when the season has no completed Jolpica race, and leaves team null when OpenF1 is down', async () => {
        installNoCompletedRaceFixtures();
        const healthyGrid = await getGrid(2026);
        expect(healthyGrid.find(({ driverId }) => driverId === 'norris')?.team).toBe('Haas');

        cacheStore.clear();
        installNoCompletedRaceFixtures({ openF1Down: true });
        const fallbackGrid = await getGrid(2026);
        expect(fallbackGrid.find(({ driverId }) => driverId === 'norris')?.team).toBeNull();
    });

    it('appends OpenF1-only debutants to the grid', async () => {
        installNoCompletedRaceFixtures({ includeDebutant: true });

        const grid = await getGrid(2026);
        expect(grid.find(({ code }) => code === 'ROK')).toMatchObject({
            driverId: null,
            racingNumber: 99,
            number: 99,
            firstName: 'Rookie',
            lastName: 'Driver',
            fullName: 'Rookie Driver',
            team: 'Haas',
            headshot: 'https://example.test/rookie.png',
            teamColour: '#FF0000',
            sessionKey: 902,
            inLatestSession: true,
        });
    });

    it('retains every Jolpica season entrant and marks latest-session membership when OpenF1 has a partial entry list', async () => {
        vi.stubGlobal('fetch', vi.fn(async (input) => {
            const url = new URL(input);
            if (url.hostname === 'api.openf1.org' && url.pathname.endsWith('/sessions')) {
                return jsonResponse([{ session_key: 901, session_name: 'Race', date_start: '2026-10-25T05:00:00Z' }]);
            }
            if (url.hostname === 'api.openf1.org' && url.pathname.endsWith('/drivers')) {
                return jsonResponse([{ driver_number: 4, name_acronym: 'NOR', headshot_url: 'https://example.test/norris.png', team_colour: 'FF8000' }]);
            }
            if (url.pathname.endsWith('/2026/races.json')) return jsonResponse(mrData(races.length, { RaceTable: { Races: races } }));
            if (url.pathname.endsWith('/2026/drivers.json')) return jsonResponse(mrData(seasonDrivers.length, { DriverTable: { Drivers: seasonDrivers } }));
            if (url.pathname.endsWith('/2026/1/results.json')) return jsonResponse(mrData(latestResults.length, { RaceTable: { Races: [{ Results: latestResults }] } }));
            if (url.hostname === 'api.openf1.org') return jsonResponse([]);
            throw new Error(`Unexpected fixture request: ${url}`);
        }));

        const grid = await getGrid(2026);

        expect(grid.map(({ driverId, inLatestSession }) => [driverId, inLatestSession])).toEqual([
            ['norris', true],
            ['lawson', false],
        ]);
        expect(grid[0]).toMatchObject({ headshot: 'https://example.test/norris.png', teamColour: '#FF8000' });
        expect(grid[1].headshot).toBeNull();
    });

    it('caps candidate session driver lookups at three', async () => {
        const driverLookups = [];
        vi.stubGlobal('fetch', vi.fn(async (input) => {
            const url = new URL(input);
            if (url.pathname.endsWith('/sessions')) {
                return jsonResponse([1, 2, 3, 4, 5].map((session_key) => ({
                    session_key,
                    session_name: 'Race',
                    date_start: `2026-10-${String(20 - session_key).padStart(2, '0')}T12:00:00Z`,
                })));
            }
            if (url.pathname.endsWith('/drivers')) {
                driverLookups.push(url.searchParams.get('session_key'));
                return jsonResponse([]);
            }
            throw new Error(`Unexpected fixture request: ${url}`);
        }));

        await getOpenF1GridData(2026);

        expect(driverLookups).toHaveLength(3);
        expect(driverLookups).toEqual(['1', '2', '3']);
    });
});

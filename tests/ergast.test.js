import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ unstable_cache: (callback) => callback }));

import {
    getConstructorInfo,
    getConstructorSeasonResults,
    getDriverCareerStats,
    getDriverSeasonResults,
    getDriverStandings,
    getQualifyingResults,
    getSchedule,
    getSeasonDrivers,
    resolveErgastId,
} from '@/lib/f1/ergast';
import { UpstreamError } from '@/lib/f1/http';

function inferTotal(payload) {
    const mrData = payload?.MRData;
    if (!mrData || mrData.total != null) return payload;
    const rows = mrData.DriverTable?.Drivers
        || mrData.ConstructorTable?.Constructors
        || mrData.RaceTable?.Races
        || mrData.StandingsTable?.StandingsLists
        || [];
    return { ...payload, MRData: { ...mrData, total: String(rows.length) } };
}

function mockFetchOnce(payload, ok = true, status = ok ? 200 : 404) {
    vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok, status, headers: { get: () => null }, json: async () => inferTotal(payload) })
    );
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('getDriverStandings', () => {
    it('maps the Ergast standings payload to a flat shape', async () => {
        mockFetchOnce({
            MRData: {
                StandingsTable: {
                    StandingsLists: [
                        {
                            DriverStandings: [
                                {
                                    position: '1',
                                    points: '25',
                                    wins: '1',
                                    Driver: {
                                        driverId: 'max_verstappen',
                                        code: 'VER',
                                        permanentNumber: '3',
                                        givenName: 'Max',
                                        familyName: 'Verstappen',
                                        nationality: 'Dutch',
                                    },
                                    Constructors: [{ constructorId: 'red_bull', name: 'Red Bull', nationality: 'Austrian' }],
                                },
                            ],
                        },
                    ],
                },
            },
        });

        const standings = await getDriverStandings();
        expect(standings).toHaveLength(1);
        expect(standings[0]).toMatchObject({
            position: 1,
            points: 25,
            wins: 1,
            driver: { lastName: 'Verstappen', code: 'VER' },
            team: { name: 'Red Bull' },
        });
    });

    it('throws a typed error on failure', async () => {
        mockFetchOnce(null, false);
        await expect(getDriverStandings()).rejects.toBeInstanceOf(UpstreamError);
    });
});

describe('getDriverCareerStats', () => {
    it('keeps the legacy shape and derives totals from MRData totals', async () => {
        const totals = { results: 251, 'results/1': 73, 'results/2': 40, 'results/3': 24, 'grid/1/results': 50, 'fastest/1/results': 38, seasons: 12 };
        vi.stubGlobal('fetch', vi.fn(async (input) => {
            const url = new URL(input);
            const match = url.pathname.match(/drivers\/max_verstappen\/(.+)\.json$/);
            const races = url.pathname.match(/\/(\d{4})\/races\.json$/);
            if (races) return { ok: true, status: 200, headers: { get: () => null }, json: async () => ({ MRData: { total: '0', RaceTable: { Races: [] } } }) };
            if (url.hostname === 'api.openf1.org') return { ok: true, status: 200, headers: { get: () => null }, json: async () => [] };
            const total = totals[match?.[1]];
            if (total == null) throw new Error(`Unexpected request ${url}`);
            return { ok: true, status: 200, headers: { get: () => null }, json: async () => ({ MRData: { total: String(total) } }) };
        }));

        const stats = await getDriverCareerStats('max_verstappen');

        expect(stats).toEqual({
            totalRaces: 251,
            wins: 73,
            podiums: 137,
            poles: 50,
            fastestLaps: 38,
            championships: 4,
            seasons: 12,
        });
    });

    it('rejects ids that are not Jolpica driver ids', async () => {
        await expect(getDriverCareerStats('../../etc')).rejects.toBeInstanceOf(TypeError);
    });

    it('throws a typed error on failure', async () => {
        mockFetchOnce({}, false, 500);
        await expect(getDriverCareerStats('nobody')).rejects.toBeInstanceOf(UpstreamError);
    });
});

describe('getSchedule', () => {
    it('maps races and flags sprint weekends', async () => {
        mockFetchOnce({
            MRData: {
                RaceTable: {
                    Races: [
                        {
                            season: '2026',
                            round: '1',
                            raceName: 'Australian Grand Prix',
                            date: '2026-03-08',
                            time: '05:00:00Z',
                            Circuit: { circuitId: 'albert_park', circuitName: 'Albert Park', Location: { locality: 'Melbourne', country: 'Australia' } },
                            Sprint: { date: '2026-03-07', time: '05:00:00Z' },
                        },
                    ],
                },
            },
        });
        const schedule = await getSchedule(2026);
        expect(schedule).toHaveLength(1);
        expect(schedule[0]).toMatchObject({ round: 1, raceName: 'Australian Grand Prix', hasSprint: true });
        expect(schedule[0].circuit.country).toBe('Australia');
    });
});

describe('getQualifyingResults', () => {
    it('maps Q1/Q2/Q3 times', async () => {
        mockFetchOnce({
            MRData: {
                RaceTable: {
                    Races: [
                        {
                            raceName: 'Bahrain Grand Prix',
                            round: '1',
                            QualifyingResults: [
                                {
                                    position: '1',
                                    Driver: { driverId: 'leclerc', code: 'LEC', givenName: 'Charles', familyName: 'Leclerc', permanentNumber: '16' },
                                    Constructor: { name: 'Ferrari' },
                                    Q1: '1:30.0', Q2: '1:29.5', Q3: '1:29.0',
                                },
                            ],
                        },
                    ],
                },
            },
        });
        const quali = await getQualifyingResults(2026, 1);
        expect(quali.results[0]).toMatchObject({ position: 1, q3: '1:29.0', driver: { code: 'LEC' } });
    });
});

describe('getDriverSeasonResults', () => {
    it('maps a season of race results', async () => {
        mockFetchOnce({
            MRData: {
                RaceTable: {
                    Races: [
                        { round: '1', raceName: 'Australian GP', date: '2026-03-08', Circuit: { Location: { country: 'Australia' } }, Results: [{ position: '2', grid: '3', points: '18', status: 'Finished' }] },
                    ],
                },
            },
        });
        const results = await getDriverSeasonResults('norris', 2026);
        expect(results[0]).toMatchObject({ round: 1, position: 2, grid: 3, points: 18 });
    });
});

describe('getSeasonDrivers + resolveErgastId', () => {
    const payload = {
        MRData: {
            DriverTable: {
                Drivers: [
                    { driverId: 'norris', code: 'NOR', permanentNumber: '1', givenName: 'Lando', familyName: 'Norris', nationality: 'British' },
                    { driverId: 'max_verstappen', code: 'VER', permanentNumber: '3', givenName: 'Max', familyName: 'Verstappen', nationality: 'Dutch' },
                ],
            },
        },
    };

    it('lists season drivers with parsed numbers', async () => {
        mockFetchOnce(payload);
        const drivers = await getSeasonDrivers(2026);
        expect(drivers).toHaveLength(2);
        expect(drivers[0]).toMatchObject({ id: 'norris', number: 1 });
    });

    it('resolves an Ergast id from a driver number', async () => {
        mockFetchOnce(payload);
        expect(await resolveErgastId(1, {})).toBe('norris');
        mockFetchOnce(payload);
        expect(await resolveErgastId(3, {})).toBe('max_verstappen');
    });

    it('does not guess from a stale number map when absent from the live list', async () => {
        mockFetchOnce({ MRData: { DriverTable: { Drivers: [] } } });
        expect(await resolveErgastId(44, { 44: 'hamilton' })).toBeNull();
    });
});

describe('getConstructorInfo', () => {
    it('maps the constructor payload', async () => {
        mockFetchOnce({
            MRData: { ConstructorTable: { Constructors: [{ constructorId: 'ferrari', name: 'Ferrari', nationality: 'Italian', url: 'http://x' }] } },
        });
        expect(await getConstructorInfo('ferrari')).toMatchObject({ id: 'ferrari', name: 'Ferrari', nationality: 'Italian' });
    });

    it('returns null when missing', async () => {
        mockFetchOnce({ MRData: { ConstructorTable: { Constructors: [] } } });
        expect(await getConstructorInfo('nope')).toBeNull();
    });
});

describe('getConstructorSeasonResults', () => {
    it('combines both cars and sums points per race', async () => {
        mockFetchOnce({
            MRData: {
                RaceTable: {
                    Races: [
                        {
                            round: '1',
                            raceName: 'Bahrain GP',
                            date: '2026-03-08',
                            Circuit: { Location: { country: 'Bahrain' } },
                            Results: [
                                { position: '1', points: '25', status: 'Finished', Driver: { code: 'LEC' } },
                                { position: '4', points: '12', status: 'Finished', Driver: { code: 'HAM' } },
                            ],
                        },
                    ],
                },
            },
        });
        const results = await getConstructorSeasonResults('ferrari', 2026);
        expect(results[0].points).toBe(37);
        expect(results[0].cars).toHaveLength(2);
        expect(results[0].cars[0]).toMatchObject({ code: 'LEC', position: 1 });
    });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
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

function mockFetchOnce(payload, ok = true) {
    vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok, json: async () => payload })
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
                                        permanentNumber: '1',
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

    it('returns an empty array on failure', async () => {
        mockFetchOnce(null, false);
        expect(await getDriverStandings()).toEqual([]);
    });
});

describe('getDriverCareerStats', () => {
    it('counts wins, podiums, poles and fastest laps from race results', async () => {
        mockFetchOnce({
            MRData: {
                RaceTable: {
                    Races: [
                        { Results: [{ position: '1', grid: '1', points: '25', FastestLap: { rank: '1' }, status: 'Finished' }] },
                        { Results: [{ position: '3', grid: '4', points: '15', status: 'Finished' }] },
                        { Results: [{ position: '18', grid: '10', points: '0', status: 'Accident' }] },
                    ],
                },
            },
        });

        const stats = await getDriverCareerStats('max_verstappen');
        expect(stats.totalRaces).toBe(3);
        expect(stats.wins).toBe(1);
        expect(stats.podiums).toBe(2);
        expect(stats.poles).toBe(1);
        expect(stats.fastestLaps).toBe(1);
        expect(stats.dnfs).toBe(1);
        expect(stats.careerPoints).toBe(40);
        expect(stats.championships).toBe(4); // from DRIVER_TITLES
    });

    it('returns null on failure', async () => {
        mockFetchOnce(null, false);
        expect(await getDriverCareerStats('nobody')).toBeNull();
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
                    { driverId: 'max_verstappen', code: 'VER', permanentNumber: '1', givenName: 'Max', familyName: 'Verstappen', nationality: 'Dutch' },
                    { driverId: 'norris', code: 'NOR', permanentNumber: '4', givenName: 'Lando', familyName: 'Norris', nationality: 'British' },
                ],
            },
        },
    };

    it('lists season drivers with parsed numbers', async () => {
        mockFetchOnce(payload);
        const drivers = await getSeasonDrivers(2026);
        expect(drivers).toHaveLength(2);
        expect(drivers[0]).toMatchObject({ id: 'max_verstappen', number: 1 });
    });

    it('resolves an Ergast id from a driver number', async () => {
        mockFetchOnce(payload);
        expect(await resolveErgastId(4, {})).toBe('norris');
    });

    it('falls back to the static map when not in the live list', async () => {
        mockFetchOnce({ MRData: { DriverTable: { Drivers: [] } } });
        expect(await resolveErgastId(44, { 44: 'hamilton' })).toBe('hamilton');
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

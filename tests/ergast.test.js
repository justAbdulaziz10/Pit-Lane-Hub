import { afterEach, describe, expect, it, vi } from 'vitest';
import { getDriverCareerStats, getDriverStandings } from '@/lib/f1/ergast';

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

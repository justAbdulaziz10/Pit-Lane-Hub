import { afterEach, describe, expect, it, vi } from 'vitest';

const cacheConfigs = vi.hoisted(() => []);
const getCalendarMock = vi.hoisted(() => vi.fn());

vi.mock('next/cache', () => ({
    unstable_cache: (callback, keyParts, options) => {
        cacheConfigs.push({ keyParts, options });
        return callback;
    },
}));
vi.mock('@/lib/f1/season', () => ({ getCalendar: (...args) => getCalendarMock(...args) }));

import { careerTotals } from '@/lib/f1/career';
import { careerSummary } from '@/lib/f1/compare';
import { getChampions, getSeasonSummary } from '@/lib/f1/history';
import { mapResultRow } from '@/lib/f1/results';

function response(payload) {
    return {
        ok: true,
        status: 200,
        headers: { get: () => null },
        json: async () => payload,
    };
}

function installFixtureFetch(fixtures) {
    const fetchMock = vi.fn(async (input) => {
        const path = new URL(input).pathname.replace('/ergast/f1/', '').replace(/\.json$/, '');
        return response(fixtures[path] || { MRData: { total: '0' } });
    });
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
}

afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
});

describe('D15 historic constructor names', () => {
    it('keeps the constructor name Jolpica used for that season', () => {
        const row = {
            position: '1',
            Constructor: { constructorId: 'toro_rosso', name: 'Toro Rosso' },
        };

        expect(mapResultRow(row, 2019).team.name).toBe('Toro Rosso');
    });
});

describe('D16 finale champion completeness', () => {
    it('does not add a champion from standings before the calendar final round', async () => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-12-10T00:00:00Z'));
        getCalendarMock.mockResolvedValue({ rounds: [{ round: 23, raceStart: '2026-12-06T13:00:00Z' }] });
        installFixtureFetch({
            '2026/driverstandings/1': {
                MRData: {
                    total: '1',
                    StandingsTable: { StandingsLists: [{
                        round: '22',
                        DriverStandings: [{ Driver: { driverId: 'pre_final_leader', givenName: 'Early', familyName: 'Leader' } }],
                    }] },
                },
            },
            '2026/constructorstandings/1': {
                MRData: {
                    total: '1',
                    StandingsTable: { StandingsLists: [{
                        round: '22',
                        ConstructorStandings: [{ Constructor: { constructorId: 'early_team', name: 'Early Team' } }],
                    }] },
                },
            },
        });

        const champions = await getChampions();

        expect(champions.drivers.some((champion) => champion.year === 2026)).toBe(false);
        expect(champions.constructors.some((champion) => champion.year === 2026)).toBe(false);
        const cache = cacheConfigs.find(({ keyParts }) => keyParts.at(-1) === 'champions');
        expect(cache.options.revalidate).toBe(300);
    });
});

describe('D17 and D15 historic standings', () => {
    it('shows the final constructor under its season-specific name', async () => {
        getCalendarMock.mockResolvedValue({ rounds: [{ round: 24, raceName: 'Final Grand Prix', raceStart: '2025-12-01T12:00:00Z' }] });
        installFixtureFetch({
            '2025/results/1': {
                MRData: { total: '0', RaceTable: { Races: [] } },
            },
            '2025/driverstandings': {
                MRData: {
                    total: '1',
                    StandingsTable: { StandingsLists: [{
                        season: '2025',
                        round: '24',
                        DriverStandings: [{
                            position: '1',
                            points: '100',
                            wins: '4',
                            Driver: { driverId: 'lawson', givenName: 'Liam', familyName: 'Lawson' },
                            Constructors: [
                                { constructorId: 'red_bull', name: 'Red Bull Racing' },
                                { constructorId: 'rb', name: 'Racing Bulls' },
                            ],
                        }],
                    }] },
                },
            },
            '2025/constructorstandings': {
                MRData: { total: '0', StandingsTable: { StandingsLists: [] } },
            },
        });

        const summary = await getSeasonSummary(2025);

        expect(summary.driverStandings[0].team).toEqual({ id: 'rb', name: 'Racing Bulls' });
    });
});

describe('D19 qualifying pole positions and coverage', () => {
    it('counts qualifying P1 results instead of grid P1 and reports partial coverage', () => {
        const results = [
            { season: 1990, grid: 1, position: 1 },
            { season: 2020, grid: 4, position: 1 },
            { season: 2021, grid: 8, position: 2 },
        ];
        const qualifying = [
            { season: 1990, position: '1' },
            { season: 2020, position: '2' },
            { season: 2021, position: '1' },
        ];

        const totals = careerTotals('example_driver', results, 0, qualifying);

        expect(totals.poles).toBe(2);
        expect(totals.poleCoverage).toBe('partial');
    });
});

describe('D20 sprint points', () => {
    it('includes sprint points in the career points total', () => {
        const races = [{ season: 2024, round: 1, points: 25 }];
        const sprints = [{ season: 2024, round: 1, points: 8 }];

        expect(careerSummary(races, sprints).points).toBe(33);
    });
});

describe('D21 entries label', () => {
    it('exposes the result-row count as entries rather than starts', () => {
        const totals = careerTotals('example_driver', [
            { season: 1950, position: null, grid: 1, status: 'Did not start' },
            { season: 1950, position: null, grid: 2, status: 'Withdrew' },
        ], 0);

        expect(totals.entries).toBe(2);
        expect(totals.starts).toBeUndefined();
    });
});

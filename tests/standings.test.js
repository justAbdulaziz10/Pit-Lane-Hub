import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ unstable_cache: (callback) => callback }));

import {
    buildStandings,
    constructorChampionshipYears,
    currentGridDrivers,
    currentSeasonLookups,
    getConstructor,
    getConstructorRecord,
    getConstructorStandings,
    getDriverStandings,
    getRaceDates,
    hasConstructorsChampionship,
    mapDriverStanding,
    parseSeasonYear,
} from '@/lib/f1/standings';

const jsonResponse = (payload, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: async () => payload,
});

function installFetch(handler) {
    const fetchMock = vi.fn(async (input) => {
        const url = new URL(input);
        const result = await handler(url);
        return result?.status ? jsonResponse(result.body, result.status) : jsonResponse(result);
    });
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
}

function standingsPayload(total, lists) {
    return { MRData: { total: String(total), StandingsTable: { StandingsLists: lists } } };
}

function driverRow(position, id, points, wins, constructors = [['mercedes', 'Mercedes']], extra = {}) {
    return {
        position: position == null ? undefined : String(position),
        positionText: position == null ? 'D' : String(position),
        points: String(points),
        wins: String(wins),
        Driver: {
            driverId: id,
            code: id.slice(0, 3).toUpperCase(),
            permanentNumber: extra.number ? String(extra.number) : undefined,
            givenName: `First ${id}`,
            familyName: `Last ${id}`,
            nationality: 'British',
        },
        Constructors: constructors.map(([constructorId, name]) => ({ constructorId, name })),
    };
}

beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-27T12:00:00Z'));
});

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

describe('parseSeasonYear', () => {
    it('defaults to the current season when the parameter is missing or empty', () => {
        expect(parseSeasonYear(undefined, { current: 2026 })).toBe(2026);
        expect(parseSeasonYear('', { current: 2026 })).toBe(2026);
        expect(parseSeasonYear(undefined)).toBe(2026);
    });

    it('accepts four-digit years within the championship range', () => {
        expect(parseSeasonYear('1950', { current: 2026 })).toBe(1950);
        expect(parseSeasonYear(' 2026 ', { current: 2026 })).toBe(2026);
        expect(parseSeasonYear('1958', { min: 1958, current: 2026 })).toBe(1958);
    });

    it('rejects out-of-range, malformed and repeated values', () => {
        for (const value of ['1949', '2027', '20x6', '26', '02026', '2026.0', '-2026', 'abcd']) {
            expect(parseSeasonYear(value, { current: 2026 })).toBeNull();
        }
        expect(parseSeasonYear('1957', { min: 1958, current: 2026 })).toBeNull();
        expect(parseSeasonYear(['2024', '2025'], { current: 2026 })).toBeNull();
    });

    it('knows the constructors championship began in 1958', () => {
        expect(hasConstructorsChampionship(1957)).toBe(false);
        expect(hasConstructorsChampionship(1958)).toBe(true);
    });
});

describe('standings mapping', () => {
    it('maps a Jolpica driver standing including every constructor driven for', () => {
        const mapped = mapDriverStanding(driverRow(2, 'tsunoda', 30.5, 0, [['rb', 'RB F1 Team'], ['red_bull', 'Red Bull']], { number: 22 }));
        expect(mapped).toEqual({
            position: 2,
            positionText: '2',
            points: 30.5,
            wins: 0,
            driver: {
                id: 'tsunoda',
                code: 'TSU',
                number: 22,
                firstName: 'First tsunoda',
                lastName: 'Last tsunoda',
                nationality: 'British',
            },
            teams: [{ id: 'rb', name: 'RB F1 Team' }, { id: 'red_bull', name: 'Red Bull' }],
        });
    });

    it('keeps the latest round and orders unclassified entries last', () => {
        const rows = [
            { round: 17, entry: driverRow(1, 'old', 1, 0) },
            { round: 18, entry: driverRow(null, 'schumacher', 78, 5) },
            { round: 18, entry: driverRow(2, 'b', 10, 0) },
            { round: 18, entry: driverRow(1, 'a', 20, 1) },
        ];
        const result = buildStandings(1997, rows, mapDriverStanding);
        expect(result.round).toBe(18);
        expect(result.standings.map((row) => row.driver.id)).toEqual(['a', 'b', 'schumacher']);
        expect(result.standings[2]).toMatchObject({ position: null, positionText: 'D' });
    });
});

describe('getDriverStandings / getConstructorStandings', () => {
    it('merges a season whose standings span several Jolpica pages', async () => {
        const all = Array.from({ length: 103 }, (_, index) => driverRow(index + 1, `d${index + 1}`, 103 - index, 0));
        const fetchMock = installFetch((url) => {
            expect(url.pathname).toBe('/ergast/f1/1952/driverstandings.json');
            const offset = Number(url.searchParams.get('offset'));
            const page = all.slice(offset, offset + 100);
            return standingsPayload(103, [{ season: '1952', round: '8', DriverStandings: page }]);
        });

        const result = await getDriverStandings(1952);
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(result.year).toBe(1952);
        expect(result.round).toBe(8);
        expect(result.standings).toHaveLength(103);
        expect(result.standings.at(-1).driver.id).toBe('d103');
    });

    it('returns an empty table before round 1 instead of last season', async () => {
        const fetchMock = installFetch((url) => {
            expect(url.pathname).toBe('/ergast/f1/2026/driverstandings.json');
            return standingsPayload(0, []);
        });
        const result = await getDriverStandings(2026);
        expect(result).toEqual({ year: 2026, round: null, standings: [] });
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('maps constructor standings', async () => {
        installFetch(() => standingsPayload(2, [{
            season: '2025',
            round: '24',
            ConstructorStandings: [
                { position: '2', positionText: '2', points: '469', wins: '4', Constructor: { constructorId: 'mercedes', name: 'Mercedes', nationality: 'German' } },
                { position: '1', positionText: '1', points: '833', wins: '14', Constructor: { constructorId: 'mclaren', name: 'McLaren', nationality: 'British' } },
            ],
        }]));
        const result = await getConstructorStandings(2025);
        expect(result.round).toBe(24);
        expect(result.standings[0]).toEqual({
            position: 1,
            positionText: '1',
            points: 833,
            wins: 14,
            team: { id: 'mclaren', name: 'McLaren', nationality: 'British' },
        });
    });

    it('rejects seasons without a championship before calling upstream', () => {
        const fetchMock = installFetch(() => standingsPayload(0, []));
        expect(() => getDriverStandings(1949)).toThrow(RangeError);
        expect(() => getDriverStandings(2027)).toThrow(RangeError);
        expect(() => getConstructorStandings(1957)).toThrow(RangeError);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('throws when upstream fails instead of returning empty standings', async () => {
        installFetch(() => ({ status: 404, body: {} }));
        await expect(getDriverStandings(2024)).rejects.toThrow('Jolpica returned HTTP 404');
    });
});

describe('constructor history', () => {
    it('returns null for malformed ids without calling upstream', async () => {
        const fetchMock = installFetch(() => ({}));
        for (const id of ['', 'Red Bull', '../x', 'a'.repeat(61), undefined]) {
            expect(await getConstructor(id)).toBeNull();
        }
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('returns null for an unknown constructor and the record for a known one', async () => {
        installFetch((url) => {
            if (url.pathname.endsWith('/constructors/bogus.json')) {
                return { MRData: { total: '0', ConstructorTable: { Constructors: [] } } };
            }
            return { MRData: { total: '1', ConstructorTable: { Constructors: [{ constructorId: 'cooper-climax', name: 'Cooper-Climax', nationality: 'British', url: 'https://example.test' }] } } };
        });
        expect(await getConstructor('bogus')).toBeNull();
        expect(await getConstructor('cooper-climax')).toEqual({
            constructorId: 'cooper-climax',
            name: 'Cooper-Climax',
            nationality: 'British',
            url: 'https://example.test',
        });
    });

    it('reads wins, races and seasons from MRData.total', async () => {
        const fetchMock = installFetch((url) => {
            const totals = {
                '/ergast/f1/constructors/mclaren/results/1.json': 203,
                '/ergast/f1/constructors/mclaren/races.json': 990,
                '/ergast/f1/constructors/mclaren/seasons.json': 59,
            };
            expect(url.searchParams.get('limit')).toBe('1');
            return { MRData: { total: String(totals[url.pathname]) } };
        });
        expect(await getConstructorRecord('mclaren')).toEqual({ wins: 203, races: 990, seasons: 59 });
        expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('lists championship years for a constructor from the champions list', () => {
        const champions = {
            constructors: [
                { year: 1998, constructorId: 'mclaren' },
                { year: 2025, constructorId: 'mclaren' },
                { year: 1974, constructorId: 'mclaren' },
                { year: 2024, constructorId: 'mclaren' },
                { year: 2023, constructorId: 'red_bull' },
            ],
        };
        expect(constructorChampionshipYears(champions, 'mclaren')).toEqual([1974, 1998, 2024, 2025]);
        expect(constructorChampionshipYears(champions, 'haas')).toEqual([]);
    });
});

describe('getRaceDates', () => {
    it('maps rounds to calendar dates for seasons without start times', async () => {
        installFetch(() => ({
            MRData: {
                total: '2',
                RaceTable: { Races: [
                    { round: '1', date: '1950-05-13', raceName: 'British Grand Prix' },
                    { round: '2', date: '1950-05-21', raceName: 'Monaco Grand Prix' },
                ] },
            },
        }));
        const dates = await getRaceDates(1950);
        expect(dates.get(1)).toBe('1950-05-13');
        expect(dates.get(2)).toBe('1950-05-21');
    });
});

describe('currentSeasonLookups', () => {
    it('builds colour, name and driver link maps keyed by Jolpica ids', () => {
        const lookups = currentSeasonLookups([
            {
                constructorId: 'red_bull',
                name: 'Red Bull Racing',
                color: '#4781D7',
                drivers: [{ driverId: 'max_verstappen', racingNumber: 3 }, { driverId: 'hadjar', racingNumber: 6 }],
            },
            {
                constructorId: 'rb',
                name: 'Racing Bulls',
                color: '#6C98FF',
                drivers: [{ driverId: 'lawson', racingNumber: null, number: 30 }, { driverId: 'lindblad', racingNumber: null }],
            },
        ]);
        expect(lookups.colorById.get('rb')).toBe('#6C98FF');
        expect(lookups.nameById.get('red_bull')).toBe('Red Bull Racing');
        expect(lookups.driverHrefById.get('max_verstappen')).toBe('/driver/3');
        expect(lookups.driverHrefById.get('lawson')).toBe('/driver/30');
        expect(lookups.driverHrefById.get('lindblad')).toBe('/driver/lindblad');
        expect(currentSeasonLookups(null).colorById.size).toBe(0);
    });

    it('links only drivers on the current grid when the grid is known', () => {
        const teams = [{
            constructorId: 'rb',
            name: 'Racing Bulls',
            color: '#6C98FF',
            drivers: [{ driverId: 'lawson', racingNumber: 30 }, { driverId: 'tsunoda', racingNumber: 22 }],
        }];
        const lookups = currentSeasonLookups(teams, [{ driverId: 'lawson', racingNumber: 30 }]);
        expect(lookups.driverHrefById.get('lawson')).toBe('/driver/30');
        expect(lookups.driverHrefById.has('tsunoda')).toBe(false);
    });
});

describe('currentGridDrivers', () => {
    const team = {
        constructorId: 'rb',
        drivers: [{ driverId: 'lawson' }, { driverId: 'lindblad' }, { driverId: 'tsunoda' }],
    };

    it('drops drivers who scored for the team this season but are no longer on the grid', () => {
        const grid = [{ driverId: 'lawson' }, { driverId: 'lindblad' }, { driverId: 'max_verstappen' }];
        expect(currentGridDrivers(team, grid).map((driver) => driver.driverId)).toEqual(['lawson', 'lindblad']);
    });

    it('keeps the season list when the grid is unavailable', () => {
        expect(currentGridDrivers(team, [])).toHaveLength(3);
        expect(currentGridDrivers({}, [])).toEqual([]);
    });
});

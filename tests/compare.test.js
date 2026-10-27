import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ unstable_cache: (callback) => callback }));

import { careerSummary, fastestLapCoverage, fetchDriverResults, getAllTimeDriver, headToHead, isValidDriverId } from '@/lib/f1/compare';

const jsonResponse = (payload) => ({
    ok: true,
    status: 200,
    headers: { get: () => null },
    json: async () => payload,
});

function raceRow(season, round, positions, constructorId = 'ferrari') {
    return {
        season: String(season),
        round: String(round),
        raceName: `Race ${season}-${round}`,
        date: `${season}-06-01`,
        Results: positions.map((position) => ({
            position: String(position),
            positionText: String(position),
            points: '0',
            grid: '5',
            status: 'Finished',
            Driver: { driverId: 'fangio', givenName: 'Juan', familyName: 'Fangio', nationality: 'Argentine' },
            Constructor: { constructorId, name: 'Ferrari' },
        })),
    };
}

/** Serve `rows` result rows, paging by result rows like Jolpica; `pageSize` lets a page come back short. */
function installResultsFetch(totalRows, { pageSize = 100, rowsPerRace = () => 1 } = {}) {
    const races = [];
    let count = 0;
    let round = 1;
    while (count < totalRows) {
        const n = Math.min(rowsPerRace(round), totalRows - count);
        races.push({ round, rows: Array.from({ length: n }, (_, i) => count + i + 1) });
        count += n;
        round += 1;
    }
    const flat = races.flatMap((race) => race.rows.map((row) => ({ round: race.round, row })));
    const offsets = [];
    const fetchMock = vi.fn(async (input) => {
        const url = new URL(input);
        const offset = Number(url.searchParams.get('offset'));
        const limit = Number(url.searchParams.get('limit'));
        offsets.push(offset);
        const slice = flat.slice(offset, offset + Math.min(limit, pageSize));
        const byRound = new Map();
        for (const item of slice) {
            byRound.set(item.round, [...(byRound.get(item.round) || []), item.row]);
        }
        return jsonResponse({
            MRData: {
                total: String(totalRows),
                RaceTable: {
                    Races: [...byRound.entries()].map(([r, rows]) => raceRow(1950 + Math.floor((r - 1) / 10), ((r - 1) % 10) + 1, rows)),
                },
            },
        });
    });
    vi.stubGlobal('fetch', fetchMock);
    return { fetchMock, offsets };
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('fetchDriverResults pagination', () => {
    it('pages with offset = rows received so far until MRData.total', async () => {
        const { offsets } = installResultsFetch(250);
        const { results, total, driver } = await fetchDriverResults('fangio');
        expect(total).toBe(250);
        expect(results).toHaveLength(250);
        expect(offsets).toEqual([0, 100, 200]);
        expect(driver.fullName).toBe('Juan Fangio');
        expect(new URL(vi.mocked(fetch).mock.calls[0][0]).pathname).toBe('/ergast/f1/drivers/fangio/results.json');
    });

    it('counts result rows, not races, when a race holds several rows', async () => {
        const { offsets } = installResultsFetch(130, { rowsPerRace: (round) => (round % 2 ? 2 : 1) });
        const { results } = await fetchDriverResults('fangio');
        expect(results).toHaveLength(130);
        expect(offsets).toEqual([0, 100]);
    });

    it('continues from the rows actually returned when a page is short', async () => {
        const { offsets } = installResultsFetch(150, { pageSize: 60 });
        const { results } = await fetchDriverResults('fangio');
        expect(results).toHaveLength(150);
        expect(offsets).toEqual([0, 60, 120]);
    });

    it('stops after one request for a driver with no results', async () => {
        const { offsets } = installResultsFetch(0);
        const { results } = await fetchDriverResults('nobody');
        expect(results).toEqual([]);
        expect(offsets).toEqual([0]);
    });

    it('refuses to page past the request bound', async () => {
        installResultsFetch(1000);
        await expect(fetchDriverResults('fangio', { maxPages: 3 })).rejects.toThrow(/exceed 3 pages/);
    });

    it('rejects ids that do not match the Jolpica pattern before any request', async () => {
        const { fetchMock } = installResultsFetch(1);
        await expect(fetchDriverResults('../constructors')).rejects.toThrow(TypeError);
        await expect(fetchDriverResults('Max Verstappen')).rejects.toThrow(TypeError);
        expect(fetchMock).not.toHaveBeenCalled();
    });
});

describe('getAllTimeDriver', () => {
    it('finds any driver since 1950 from the full driver list', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({
            MRData: {
                total: '2',
                DriverTable: {
                    Drivers: [
                        { driverId: 'senna', givenName: 'Ayrton', familyName: 'Senna', nationality: 'Brazilian', dateOfBirth: '1960-03-21' },
                        { driverId: 'max_verstappen', code: 'VER', permanentNumber: '3', givenName: 'Max', familyName: 'Verstappen', nationality: 'Dutch' },
                    ],
                },
            },
        })));
        expect(await getAllTimeDriver('senna')).toMatchObject({ fullName: 'Ayrton Senna', dateOfBirth: '1960-03-21' });
        expect(await getAllTimeDriver('unknown_driver')).toBeNull();
        expect(await getAllTimeDriver('<script>')).toBeNull();
    });
});

function row(season, round, position, constructorId) {
    return { season, round, raceName: `R${round}`, position, positionText: String(position), constructorId, team: constructorId, points: 0 };
}

describe('headToHead', () => {
    it('counts who was classified ahead in shared races only', () => {
        const a = [row(2020, 1, 1, 'mercedes'), row(2020, 2, 5, 'mercedes'), row(2020, 3, 2, 'mercedes'), row(2021, 1, 1, 'mercedes')];
        const b = [row(2020, 1, 2, 'red_bull'), row(2020, 2, 3, 'red_bull'), row(2020, 3, 9, 'red_bull')];
        expect(headToHead(a, b)).toMatchObject({
            races: 3,
            aheadA: 2,
            aheadB: 1,
            teammateRaces: 0,
            first: { season: 2020, round: 1 },
            last: { season: 2020, round: 3 },
        });
    });

    it('splits out races as teammates', () => {
        const a = [row(2019, 1, 3, 'ferrari'), row(2019, 2, 1, 'ferrari'), row(2020, 1, 4, 'mclaren')];
        const b = [row(2019, 1, 2, 'ferrari'), row(2019, 2, 6, 'ferrari'), row(2020, 1, 8, 'ferrari')];
        const summary = headToHead(a, b);
        expect(summary).toMatchObject({ races: 3, aheadA: 2, aheadB: 1, teammateRaces: 2, teammateAheadA: 1, teammateAheadB: 1 });
    });

    it('uses a driver\'s best row when he shared cars in one race', () => {
        const a = [row(1954, 3, 9, 'maserati'), row(1954, 3, 2, 'maserati')];
        const b = [row(1954, 3, 4, 'ferrari')];
        expect(headToHead(a, b)).toMatchObject({ races: 1, aheadA: 1, aheadB: 0 });
    });

    it('is empty when the drivers never met', () => {
        expect(headToHead([row(1960, 1, 1, 'cooper')], [row(2020, 1, 1, 'mercedes')])).toMatchObject({ races: 0, aheadA: 0, aheadB: 0, first: null });
    });
});

describe('careerSummary', () => {
    it('reports the span, teams in order and total points', () => {
        const results = [
            { ...row(2016, 5, 1, 'red_bull'), team: 'Red Bull Racing', points: 25 },
            { ...row(2015, 1, 10, 'toro_rosso'), team: 'Racing Bulls', points: 0.5 },
        ];
        expect(careerSummary(results)).toEqual({ firstSeason: 2015, lastSeason: 2016, teams: ['Racing Bulls', 'Red Bull Racing'], points: 25.5 });
    });
});

describe('fastestLapCoverage', () => {
    it('flags careers that predate Jolpica fastest-lap data', () => {
        expect(fastestLapCoverage(1984, 1994)).toBe('none');
        expect(fastestLapCoverage(1991, 2012)).toBe('partial');
        expect(fastestLapCoverage(2015, 2026)).toBe('full');
    });
});

describe('isValidDriverId', () => {
    it('accepts Jolpica ids and nothing else', () => {
        expect(isValidDriverId('max_verstappen')).toBe(true);
        expect(isValidDriverId('de_graffenried')).toBe(true);
        for (const bad of ['', 'a', 'MAX', 'max verstappen', '../x', 'x?y=1', 'a'.repeat(41), 33, null]) {
            expect(isValidDriverId(bad)).toBe(false);
        }
    });
});

describe('compare server actions', () => {
    let actions;
    let rateLimit;
    let compareDrivers;
    let searchDrivers;

    beforeEach(async () => {
        vi.resetModules();
        rateLimit = vi.fn(async () => ({ success: true }));
        compareDrivers = vi.fn(async (a, b) => ({ drivers: [{ driverId: a }, { driverId: b }], headToHead: {} }));
        searchDrivers = vi.fn(async () => [{ driverId: 'senna', fullName: 'Ayrton Senna', code: null, nationality: 'Brazilian', url: 'x' }]);
        vi.doMock('next/headers', () => ({ headers: async () => new Headers({ 'x-forwarded-for': '203.0.113.7' }) }));
        vi.doMock('@/lib/rate-limit', () => ({
            rateLimit,
            getClientIp: (headers) => headers.get('x-forwarded-for'),
        }));
        vi.doMock('@/lib/f1/compare', () => ({
            compareDrivers,
            isValidDriverId: (value) => typeof value === 'string' && /^[a-z0-9_]{2,40}$/.test(value),
        }));
        vi.doMock('@/lib/f1/drivers', () => ({ searchDrivers }));
        actions = await import('@/app/actions/compare-actions');
    });

    afterEach(() => {
        vi.doUnmock('next/headers');
        vi.doUnmock('@/lib/rate-limit');
        vi.doUnmock('@/lib/f1/compare');
        vi.doUnmock('@/lib/f1/drivers');
    });

    it('rejects invalid or identical ids without touching the rate limiter or upstream', async () => {
        for (const [a, b] of [['senna', '../drivers'], ['senna', 'senna'], ['Senna', 'prost'], [{}, 'prost']]) {
            expect(await actions.compareDriversAction(a, b)).toEqual({ ok: false, error: 'invalid' });
        }
        expect(rateLimit).not.toHaveBeenCalled();
        expect(compareDrivers).not.toHaveBeenCalled();
    });

    it('rate-limits per client IP and skips upstream when the limit is hit', async () => {
        rateLimit.mockResolvedValueOnce({ success: false });
        expect(await actions.compareDriversAction('senna', 'prost')).toEqual({ ok: false, error: 'rate-limited' });
        expect(rateLimit).toHaveBeenCalledWith('compare:203.0.113.7', { limit: 20, windowMs: 60_000 });
        expect(compareDrivers).not.toHaveBeenCalled();
    });

    it('returns the comparison for valid ids', async () => {
        const result = await actions.compareDriversAction('senna', 'prost');
        expect(result.ok).toBe(true);
        expect(compareDrivers).toHaveBeenCalledWith('senna', 'prost');
    });

    it('reports unknown drivers and upstream failures as error codes', async () => {
        compareDrivers.mockResolvedValueOnce(null);
        expect(await actions.compareDriversAction('senna', 'nobody_here')).toEqual({ ok: false, error: 'not-found' });
        compareDrivers.mockRejectedValueOnce(new Error('Jolpica returned HTTP 503'));
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        expect(await actions.compareDriversAction('senna', 'prost')).toEqual({ ok: false, error: 'unavailable' });
        spy.mockRestore();
    });

    it('searches with a bounded query and returns only public fields', async () => {
        expect(await actions.searchDriversAction('s')).toEqual({ ok: true, drivers: [] });
        expect(searchDrivers).not.toHaveBeenCalled();
        const result = await actions.searchDriversAction(`  senna${'x'.repeat(100)}`);
        expect(searchDrivers.mock.calls[0][0]).toHaveLength(40);
        expect(result.drivers[0]).toEqual({ driverId: 'senna', fullName: 'Ayrton Senna', code: null, nationality: 'Brazilian' });
        rateLimit.mockResolvedValueOnce({ success: false });
        expect(await actions.searchDriversAction('prost')).toEqual({ ok: false, error: 'rate-limited' });
        expect(await actions.searchDriversAction(42)).toEqual({ ok: false, error: 'invalid' });
    });
});

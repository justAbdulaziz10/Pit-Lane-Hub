import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ unstable_cache: (callback) => callback }));

import { ACTIVE_RESULTS_REVALIDATE, getAllTimeDriver, getCareerStats, RETIRED_RESULTS_REVALIDATE } from '@/lib/f1/compare';
import { getAllTimeDrivers, searchDrivers } from '@/lib/f1/drivers';
import { fetchJson } from '@/lib/f1/http';
import { getSeasonSummary } from '@/lib/f1/history';

const jsonResponse = (payload, { status = 200, headers = {} } = {}) => ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => headers[name.toLowerCase()] || null },
    json: async () => payload,
});

const debutant = { driverId: 'lindblad', code: 'LIN', permanentNumber: '41', givenName: 'Arvid', familyName: 'Lindblad', nationality: 'British' };
const norris = { driverId: 'norris', code: 'NOR', permanentNumber: '4', givenName: 'Lando', familyName: 'Norris', nationality: 'British' };

/** Serve the season driver list and MRData totals; record every request with its revalidate. */
function installJolpica() {
    const calls = [];
    vi.stubGlobal('fetch', vi.fn(async (input, options) => {
        const url = new URL(input);
        if (url.hostname.includes('openf1')) return jsonResponse([]);
        const path = url.pathname.replace(/^.*\/f1\//, '').replace(/\.json$/, '');
        calls.push({ path, revalidate: options?.next?.revalidate });
        if (/^\d{4}\/drivers$/.test(path)) {
            return jsonResponse({ MRData: { total: '2', DriverTable: { Drivers: [norris, debutant] } } });
        }
        return jsonResponse({ MRData: { total: '0', RaceTable: { Races: [] }, StandingsTable: { StandingsLists: [] } } });
    }));
    return calls;
}

afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
});

describe('all-time drivers', () => {
    it('serves history from the snapshot and adds debutants from the season list', async () => {
        const calls = installJolpica();
        const drivers = await getAllTimeDrivers(2026);
        expect(drivers.length).toBeGreaterThan(850);
        expect(drivers.find((driver) => driver.driverId === 'senna')).toMatchObject({
            fullName: 'Ayrton Senna',
            dateOfBirth: '1960-03-21',
            url: expect.stringContaining('wikipedia'),
        });
        expect(drivers.filter((driver) => driver.driverId === 'norris')).toHaveLength(1);
        expect(drivers.find((driver) => driver.driverId === 'lindblad')).toMatchObject({ fullName: 'Arvid Lindblad' });
        // One season-list request, never the paged all-drivers endpoint.
        expect(calls.map((call) => call.path)).toEqual(['2026/drivers']);
    });

    it('still answers from the snapshot when Jolpica is down', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({}, { status: 404 })));
        expect(await getAllTimeDriver('fangio')).toMatchObject({ lastName: 'Fangio' });
        expect((await searchDrivers('schumacher')).map((driver) => driver.driverId)).toEqual(
            expect.arrayContaining(['michael_schumacher', 'ralf_schumacher']),
        );
        expect(await getAllTimeDriver('nobody_here')).toBeNull();
    });
});

describe('driver results cache lifetime', () => {
    it('caches retired drivers for a month and active drivers for hours, with no per-stat requests', async () => {
        const calls = installJolpica();
        await getCareerStats('senna');
        const senna = calls.filter((call) => call.path.startsWith('drivers/senna/'));
        expect(senna).toEqual([{ path: 'drivers/senna/results', revalidate: RETIRED_RESULTS_REVALIDATE }]);

        await getCareerStats('norris');
        const norris = calls.filter((call) => call.path.startsWith('drivers/norris/'));
        expect(norris).toEqual([{ path: 'drivers/norris/results', revalidate: ACTIVE_RESULTS_REVALIDATE }]);
    });
});

describe('season summary cache lifetime', () => {
    it('treats past seasons as final and the current one as live', async () => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-10-27T12:00:00Z'));
        const calls = installJolpica();
        await getSeasonSummary(1988);
        await getSeasonSummary(2026);
        const revalidateFor = (prefix) => new Set(calls
            .filter((call) => call.path.startsWith(prefix) && !call.path.endsWith('races'))
            .map((call) => call.revalidate));
        expect(revalidateFor('1988/')).toEqual(new Set([2592000]));
        expect(revalidateFor('2026/')).toEqual(new Set([300]));
    });
});

describe('fetchJson throttling', () => {
    it('waits out one short 429 and then gives up instead of retrying again', async () => {
        const fetchMock = vi.fn(async () => jsonResponse({}, { status: 429, headers: { 'retry-after': '0.01' } }));
        vi.stubGlobal('fetch', fetchMock);
        await expect(fetchJson('https://example.test/data', { retries: 3 }))
            .rejects.toMatchObject({ name: 'UpstreamError', status: 429 });
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('fails fast when Retry-After signals an exhausted quota', async () => {
        const fetchMock = vi.fn(async () => jsonResponse({}, { status: 429, headers: { 'retry-after': '3600' } }));
        vi.stubGlobal('fetch', fetchMock);
        const start = Date.now();
        await expect(fetchJson('https://example.test/data')).rejects.toMatchObject({ status: 429 });
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(Date.now() - start).toBeLessThan(500);
    });
});

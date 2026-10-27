import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ unstable_cache: (callback) => callback }));

import { ACTIVE_RESULTS_REVALIDATE, getAllTimeDriver, getCareerStats, RETIRED_RESULTS_REVALIDATE } from '@/lib/f1/compare';
import { getAllTimeDrivers, searchDrivers } from '@/lib/f1/drivers';
import { F1_USER_AGENT, fetchJson, fetchJolpicaPage, fetchOpenF1Json, getOpenF1Token } from '@/lib/f1/http';
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
    vi.unstubAllEnvs();
    vi.useRealTimers();
    delete globalThis.__pitLaneOpenF1TokenCache;
    if (globalThis.__pitLaneJolpicaPacer) globalThis.__pitLaneJolpicaPacer.blockedUntil = 0;
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
    it('caches driver race and qualifying data for retired and active drivers', async () => {
        const calls = installJolpica();
        await getCareerStats('senna');
        const senna = calls.filter((call) => call.path.startsWith('drivers/senna/'))
            .sort((a, b) => a.path.localeCompare(b.path));
        expect(senna).toEqual([
            { path: 'drivers/senna/qualifying', revalidate: RETIRED_RESULTS_REVALIDATE },
            { path: 'drivers/senna/results', revalidate: RETIRED_RESULTS_REVALIDATE },
        ]);

        await getCareerStats('norris');
        const norris = calls.filter((call) => call.path.startsWith('drivers/norris/'))
            .sort((a, b) => a.path.localeCompare(b.path));
        expect(norris).toEqual([
            { path: 'drivers/norris/qualifying', revalidate: ACTIVE_RESULTS_REVALIDATE },
            { path: 'drivers/norris/results', revalidate: ACTIVE_RESULTS_REVALIDATE },
        ]);
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

describe('OpenF1 authentication and request identity', () => {
    it('memoizes one token for 50 calls and refreshes after expiry', async () => {
        delete globalThis.__pitLaneOpenF1TokenCache;
        vi.stubEnv('OPENF1_USERNAME', 'fixture-user');
        vi.stubEnv('OPENF1_PASSWORD', 'fixture-password');
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-10-27T00:00:00Z'));
        let tokenRequests = 0;
        vi.stubGlobal('fetch', vi.fn(async (input) => {
            if (new URL(input).href === 'https://api.openf1.org/token') {
                tokenRequests += 1;
                return jsonResponse({ access_token: `fixture-token-${tokenRequests}`, expires_in: 3600 });
            }
            return jsonResponse([]);
        }));

        const initial = await Promise.all(Array.from({ length: 50 }, () => fetchOpenF1Json('meetings?year=2026')));
        expect(initial).toHaveLength(50);
        expect(tokenRequests).toBe(1);

        vi.setSystemTime(new Date('2026-10-27T00:54:59Z'));
        await fetchOpenF1Json('meetings?year=2026');
        expect(tokenRequests).toBe(1);

        vi.setSystemTime(new Date('2026-10-27T01:00:01Z'));
        await expect(getOpenF1Token()).resolves.toBe('fixture-token-2');
        expect(tokenRequests).toBe(2);
    });

    it('sends the canonical User-Agent and bearer token, refreshing once after a 401', async () => {
        delete globalThis.__pitLaneOpenF1TokenCache;
        vi.stubEnv('OPENF1_USERNAME', 'fixture-user');
        vi.stubEnv('OPENF1_PASSWORD', 'fixture-password');
        const requests = [];
        const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
        let tokenRequests = 0;
        vi.stubGlobal('fetch', vi.fn(async (input, options) => {
            const url = new URL(input);
            requests.push({ url, options });
            if (url.href === 'https://api.openf1.org/token') {
                tokenRequests += 1;
                expect(options.method).toBe('POST');
                expect(options.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
                return jsonResponse({ access_token: `auth-token-${tokenRequests}`, expires_in: 3600 });
            }
            if (url.hostname === 'api.jolpi.ca') return jsonResponse({ MRData: { total: '0', RaceTable: { Races: [] } } });
            if (options.headers.Authorization === 'Bearer auth-token-1') return jsonResponse({}, { status: 401 });
            return jsonResponse([]);
        }));

        await fetchJolpicaPage('2026/races');
        await expect(fetchOpenF1Json('meetings?year=2026')).resolves.toEqual([]);

        expect(tokenRequests).toBe(2);
        expect(requests.every(({ options }) => options.headers['User-Agent'] === F1_USER_AGENT)).toBe(true);
        expect(requests.filter(({ url }) => url.hostname === 'api.openf1.org' && url.pathname === '/v1/meetings')
            .map(({ options }) => options.headers.Authorization)).toEqual([
            'Bearer auth-token-1',
            'Bearer auth-token-2',
        ]);
        expect(warning).not.toHaveBeenCalled();
    });

    it('logs one safe warning for a failed authenticated call without exposing secrets', async () => {
        delete globalThis.__pitLaneOpenF1TokenCache;
        vi.stubEnv('OPENF1_USERNAME', 'private-fixture-user');
        vi.stubEnv('OPENF1_PASSWORD', 'private-fixture-password');
        const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.stubGlobal('fetch', vi.fn(async (input) => {
            if (new URL(input).href === 'https://api.openf1.org/token') {
                return jsonResponse({ access_token: 'private-fixture-token', expires_in: 3600 });
            }
            return jsonResponse({}, { status: 403 });
        }));

        await expect(fetchOpenF1Json('meetings?year=2026')).rejects.toMatchObject({ status: 403 });

        expect(warning).toHaveBeenCalledTimes(1);
        const warningText = JSON.stringify(warning.mock.calls);
        expect(warningText).toContain('HTTP 403');
        expect(warningText).not.toContain('private-fixture');
    });
});

describe('Jolpica burst protection', () => {
    it('shares one upstream request between concurrent cold misses for the same page', async () => {
        const fetchMock = vi.fn(async () => jsonResponse({ MRData: { total: '0' } }));
        vi.stubGlobal('fetch', fetchMock);
        const results = await Promise.all(Array.from({ length: 10 }, () => fetchJolpicaPage('2026/driverstandings')));
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(results.every((result) => result.MRData.total === '0')).toBe(true);
        await fetchJolpicaPage('2026/driverstandings');
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('stops calling Jolpica while its quota is spent, then resumes', async () => {
        vi.useFakeTimers({ toFake: ['Date'] });
        const fetchMock = vi.fn(async () => jsonResponse({}, { status: 429, headers: { 'retry-after': '30' } }));
        vi.stubGlobal('fetch', fetchMock);
        await expect(fetchJolpicaPage('2026/races')).rejects.toMatchObject({ status: 429 });
        const callsAfterThrottle = fetchMock.mock.calls.length;
        await expect(fetchJolpicaPage('2026/results')).rejects.toMatchObject({ status: 429 });
        expect(fetchMock).toHaveBeenCalledTimes(callsAfterThrottle);

        vi.setSystemTime(Date.now() + 31000);
        fetchMock.mockImplementation(async () => jsonResponse({ MRData: { total: '0' } }));
        await expect(fetchJolpicaPage('2026/results')).resolves.toMatchObject({ MRData: { total: '0' } });
    });
});

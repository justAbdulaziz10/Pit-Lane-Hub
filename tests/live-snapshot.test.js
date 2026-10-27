import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getOpenF1Token, fetchOpenF1Json } = vi.hoisted(() => ({
    getOpenF1Token: vi.fn(),
    fetchOpenF1Json: vi.fn(),
}));

vi.mock('@/lib/f1/http', () => ({
    cacheF1Data: (fn) => fn,
    getOpenF1Token,
    fetchOpenF1Json,
    UpstreamError: class UpstreamError extends Error {},
}));

vi.mock('@/lib/f1/year', () => ({ getSeasonYear: () => 2026 }));

import { GET } from '@/app/api/live/route';
import { getLiveSnapshot } from '@/lib/f1/live';

const session = {
    session_key: 9001,
    meeting_key: 900,
    session_name: 'Race',
    session_type: 'Race',
    circuit_short_name: 'Austin',
    location: 'Austin',
    country_name: 'United States',
    date_start: '2026-11-01T18:00:00Z',
    date_end: '2026-11-01T20:00:00Z',
};

function liveFixture({ positionDate, messages = [], intervals = [], lastLap = null, sessionResults = [] }) {
    fetchOpenF1Json.mockImplementation(async (path) => {
        if (path === 'sessions?year=2026') return [session];
        if (path.startsWith('drivers?')) return [{ driver_number: 1, name_acronym: 'DRV', full_name: 'Driver One' }];
        if (path.startsWith('position?')) return [{ driver_number: 1, position: 1, date: positionDate }];
        if (path.startsWith('session_result?')) return sessionResults;
        if (path.startsWith('intervals?')) return intervals;
        if (path.startsWith('race_control?')) return messages;
        if (path.startsWith('laps?')) return lastLap ? [lastLap] : [];
        if (path.startsWith('stints?') || path.startsWith('weather?')) return [];
        throw new Error(`Unexpected OpenF1 fixture request: ${path}`);
    });
}

describe('live snapshot resilience and session windows', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        getOpenF1Token.mockReset();
        fetchOpenF1Json.mockReset();
        getOpenF1Token.mockResolvedValue('fixture-token');
    });

    afterEach(() => vi.useRealTimers());

    it('returns a typed non-retrying auth state when credentials are absent', async () => {
        getOpenF1Token.mockResolvedValue(null);
        fetchOpenF1Json.mockRejectedValue(Object.assign(new Error('HTTP 401'), { status: 401, source: 'OpenF1' }));

        const response = await GET();

        expect(response.status).toBe(200);
        expect(await response.json()).toMatchObject({ unavailable: 'auth' });
    });

    it.each([401, 403])('returns a typed auth state when OpenF1 rejects credentials with %s', async (status) => {
        fetchOpenF1Json.mockRejectedValue(Object.assign(new Error(`HTTP ${status}`), { status, source: 'OpenF1' }));

        const response = await GET();

        expect(response.status).toBe(200);
        expect(await response.json()).toMatchObject({ unavailable: 'auth' });
    });

    it('keeps server failures retryable and advertises a short retry delay', async () => {
        fetchOpenF1Json.mockRejectedValue(Object.assign(new Error('HTTP 503'), { status: 503, source: 'OpenF1' }));

        const response = await GET();

        expect(response.status).toBe(503);
        expect(response.headers.get('Retry-After')).toBe('5');
    });

    it('keeps a red-flagged race live past date_end and grace until a chequered flag appears', async () => {
        vi.setSystemTime(new Date('2026-11-01T21:01:00Z'));
        liveFixture({
            positionDate: '2026-11-01T20:10:00Z',
            messages: [{ flag: 'RED', date: '2026-11-01T20:10:00Z', message: 'SESSION SUSPENDED' }],
        });

        const snapshot = await getLiveSnapshot();

        expect(snapshot.isLive).toBe(true);
    });

    it('keeps a finished-window session live while a position or interval row is under two minutes old', async () => {
        vi.setSystemTime(new Date('2026-11-01T22:01:00Z'));
        liveFixture({
            positionDate: '2026-11-01T20:00:00Z',
            intervals: [{ driver_number: 1, gap_to_leader: 0, interval: 0, date: '2026-11-01T22:00:30Z' }],
            messages: [
                { flag: 'RED', date: '2026-11-01T20:10:00Z', message: 'SESSION SUSPENDED' },
                { flag: 'CHEQUERED', date: '2026-11-01T20:30:00Z', message: 'CHEQUERED FLAG' },
            ],
        });

        const snapshot = await getLiveSnapshot();

        expect(snapshot.isLive).toBe(true);
    });

    it('maps DSQ, DNS, and DNF results and sorts them after classified finishers', async () => {
        vi.setSystemTime(new Date('2026-11-01T22:01:00Z'));
        fetchOpenF1Json.mockImplementation(async (path) => {
            if (path === 'sessions?year=2026') return [session];
            if (path.startsWith('drivers?')) return [1, 2, 3, 4].map((driver_number) => ({
                driver_number,
                name_acronym: `D${driver_number}`,
                full_name: `Driver ${driver_number}`,
            }));
            if (path.startsWith('position?')) return [
                { driver_number: 1, position: 1, date: '2026-11-01T20:00:00Z' },
                { driver_number: 2, position: 2, date: '2026-11-01T20:00:00Z' },
            ];
            if (path.startsWith('session_result?')) return [
                { driver_number: 2, position: 2, dnf: true },
                { driver_number: 3, dns: true },
                { driver_number: 4, position: 4, dsq: true },
            ];
            if (path.startsWith('race_control?')) return [{ flag: 'CHEQUERED', date: '2026-11-01T20:00:00Z' }];
            if (path.startsWith('intervals?')) return [];
            if (path.startsWith('stints?') || path.startsWith('laps?') || path.startsWith('weather?')) return [];
            throw new Error(`Unexpected OpenF1 fixture request: ${path}`);
        });

        const snapshot = await getLiveSnapshot();

        expect(snapshot.positions.map((row) => [row.driverNumber, row.status])).toEqual([
            [1, null], [2, 'DNF'], [4, 'DSQ'], [3, 'DNS'],
        ]);
    });

    it('anchors finished-race timing windows before late stewards messages', async () => {
        vi.setSystemTime(new Date('2026-11-01T22:00:00Z'));
        liveFixture({
            positionDate: '2026-11-01T20:00:00Z',
            intervals: [{ driver_number: 1, gap_to_leader: 0, interval: 0, date: '2026-11-01T20:00:00Z' }],
            lastLap: { driver_number: 1, lap_number: 44, lap_duration: 90.3, date_start: '2026-11-01T19:59:30Z' },
            messages: [
                { flag: 'CHEQUERED', date: '2026-11-01T20:00:00Z', message: 'CHEQUERED FLAG' },
                { category: 'Stewards', date: '2026-11-01T21:45:00Z', message: 'NO FURTHER ACTION' },
            ],
        });

        const snapshot = await getLiveSnapshot();

        expect(fetchOpenF1Json.mock.calls.filter(([path]) => path.startsWith('intervals?')).at(-1)[0])
            .toContain('date>=2026-11-01T19%3A50%3A00.000Z');
        expect(snapshot.positions[0]).toMatchObject({ gapToLeader: 0, lastLap: { duration: 90.3 } });
    });
});

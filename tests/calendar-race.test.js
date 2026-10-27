import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ unstable_cache: (callback) => callback }));
vi.mock('next/server', () => ({ connection: async () => {} }));

import { meetingStatus, nextRound, webcalUrl } from '@/app/schedule/status';
import { dynamicEntries, staticEntries } from '@/app/sitemap';
import { countdownParts, formatInstant } from '@/components/localTimeFormat';
import {
    fastestLapOf,
    gapText,
    getSessionResults,
    getWeekendResults,
    isRecentWeekend,
    mapQualifyingRow,
    mapResultRow,
    sessionDone,
} from '@/lib/f1/results';
import { buildCalendar, escapeText, foldLine, formatUtc, sessionEvents } from '@/lib/ics';

const jsonResponse = (payload, { status = 200 } = {}) => ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: async () => payload,
});

afterEach(() => {
    vi.unstubAllGlobals();
});

const event = {
    year: 2026,
    round: 19,
    raceName: 'Mexico City Grand Prix',
    circuit: { id: 'rodriguez', name: 'Autódromo Hermanos Rodríguez', locality: 'Mexico City', country: 'Mexico' },
    meetingKey: 1298,
    raceStart: '2026-11-01T20:00:00.000Z',
    sessions: {
        firstPractice: '2026-10-30T18:30:00.000Z',
        secondPractice: '2026-10-30T22:00:00.000Z',
        thirdPractice: '2026-10-31T17:30:00.000Z',
        sprintQualifying: null,
        sprint: null,
        qualifying: '2026-10-31T21:00:00.000Z',
        race: '2026-11-01T20:00:00.000Z',
    },
    sessionWindows: [{ start: '2026-10-30T18:30:00+00:00', end: '2026-10-30T19:30:00+00:00' }],
};

function unfold(text) {
    return text.replace(/\r\n /g, '');
}

describe('ics generator', () => {
    it('escapes TEXT values', () => {
        expect(escapeText('Spa, Belgium; wet\\dry\nnight')).toBe('Spa\\, Belgium\\; wet\\\\dry\\nnight');
    });

    it('folds long lines at 75 octets without splitting UTF-8 characters', () => {
        const line = `SUMMARY:${'é'.repeat(80)}`;
        const folded = foldLine(line);
        const parts = folded.split('\r\n');
        expect(parts.length).toBeGreaterThan(1);
        const encoder = new TextEncoder();
        for (const part of parts) expect(encoder.encode(part).length).toBeLessThanOrEqual(75);
        for (const part of parts.slice(1)) expect(part.startsWith(' ')).toBe(true);
        expect(unfold(folded)).toBe(line);
    });

    it('formats UTC date-times', () => {
        expect(formatUtc('2026-11-01T20:00:00.000Z')).toBe('20261101T200000Z');
        expect(() => formatUtc('nope')).toThrow();
    });

    it('creates one event per scheduled session with stable UIDs and real end times', () => {
        const events = sessionEvents([event], { siteUrl: 'https://example.com', domain: 'example.com' });
        expect(events.map((item) => item.summary)).toEqual([
            'Mexico City Grand Prix: Practice 1',
            'Mexico City Grand Prix: Practice 2',
            'Mexico City Grand Prix: Practice 3',
            'Mexico City Grand Prix: Qualifying',
            'Mexico City Grand Prix: Race',
        ]);
        expect(events[0].uid).toBe('2026-rodriguez-mexico-city-grand-prix-firstpractice@example.com');
        // FP1 end comes from the OpenF1 session window; the race uses the fallback duration.
        expect(new Date(events[0].end).toISOString()).toBe('2026-10-30T19:30:00.000Z');
        expect(new Date(events.at(-1).end).toISOString()).toBe('2026-11-01T22:00:00.000Z');
        // Renumbering a round does not change UIDs.
        const renumbered = sessionEvents([{ ...event, round: 17 }], { domain: 'example.com' });
        expect(renumbered.map((item) => item.uid)).toEqual(events.map((item) => item.uid));
        expect(new Set(events.map((item) => item.uid)).size).toBe(events.length);
    });

    it('builds a valid VCALENDAR document', () => {
        const events = sessionEvents([event], { siteUrl: 'https://example.com', domain: 'example.com' });
        const ics = buildCalendar({ name: 'F1 2026, Pit Lane Hub', events, now: Date.parse('2026-10-27T00:00:00Z') });
        expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:')).toBe(true);
        expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
        expect(ics).not.toMatch(/[^\r]\n/);
        const lines = unfold(ics).split('\r\n');
        expect(lines.filter((line) => line === 'BEGIN:VEVENT')).toHaveLength(5);
        expect(lines.filter((line) => line === 'END:VEVENT')).toHaveLength(5);
        expect(lines).toContain('X-WR-CALNAME:F1 2026\\, Pit Lane Hub');
        expect(lines).toContain('DTSTART:20261101T200000Z');
        expect(lines).toContain('DTEND:20261101T220000Z');
        expect(lines).toContain('DTSTAMP:20261027T000000Z');
        expect(lines).toContain('LOCATION:Autódromo Hermanos Rodríguez\\, Mexico City\\, Mexico');
        expect(lines).toContain('URL:https://example.com/race/1298');
        const encoder = new TextEncoder();
        for (const line of ics.split('\r\n')) expect(encoder.encode(line).length).toBeLessThanOrEqual(75);
    });
});

const jolpicaRow = (position, overrides = {}) => ({
    number: String(position),
    position: String(position),
    positionText: String(position),
    points: position === 1 ? '25' : '18',
    Driver: { driverId: `driver_${position}`, permanentNumber: String(position), code: `D${position}X`, givenName: 'First', familyName: `Last${position}` },
    Constructor: { constructorId: 'haas', name: 'Haas F1 Team' },
    grid: '3',
    laps: '56',
    status: 'Finished',
    ...overrides,
});

describe('results mapping', () => {
    it('maps race rows with canonical team names and fastest lap', () => {
        const row = mapResultRow(jolpicaRow(1, {
            Time: { time: '1:35:16.650' },
            FastestLap: { rank: '1', lap: '55', Time: { time: '1:39.086' } },
        }));
        expect(row).toMatchObject({
            position: 1,
            grid: 3,
            laps: 56,
            points: 25,
            time: '1:35:16.650',
            team: { id: 'haas', name: 'Haas' },
            driver: { id: 'driver_1', lastName: 'Last1', number: 1 },
            fastestLap: { rank: 1, lap: 55, time: '1:39.086' },
        });
    });

    it('maps qualifying rows', () => {
        expect(mapQualifyingRow({ ...jolpicaRow(2), Q1: '1:35.0', Q2: '1:34.5' })).toMatchObject({ position: 2, q1: '1:35.0', q2: '1:34.5', q3: null });
    });

    it('describes gaps, lapped cars and retirements', () => {
        expect(gapText({ time: '+5.123', status: 'Finished' }, 56)).toBe('+5.123');
        expect(gapText({ time: null, status: 'Lapped', laps: 55 }, 56)).toBe('+1 Lap');
        // Jolpica also sends a misleading time for lapped cars.
        expect(gapText({ time: '+6.344', status: 'Lapped', laps: 55 }, 56)).toBe('+1 Lap');
        expect(gapText({ time: null, status: 'Lapped', laps: 53 }, 56)).toBe('+3 Laps');
        expect(gapText({ time: null, status: '+2 Laps', laps: 54 }, 56)).toBe('+2 Laps');
        expect(gapText({ time: null, status: 'Retired', laps: 24 }, 56)).toBe('Retired');
    });

    it('finds the fastest lap even when rank 1 is missing', () => {
        const rows = [
            { fastestLap: { rank: 3, time: '1:40' } },
            { fastestLap: { rank: 2, time: '1:39' } },
            { fastestLap: null },
        ];
        expect(fastestLapOf(rows).fastestLap.rank).toBe(2);
        expect(fastestLapOf([])).toBeNull();
    });

    it('knows when sessions are done and weekends are recent', () => {
        const now = Date.parse('2026-11-01T21:30:00Z');
        expect(sessionDone('race', '2026-11-01T20:00:00Z', now)).toBe(false);
        expect(sessionDone('race', '2026-11-01T19:00:00Z', now)).toBe(true);
        expect(sessionDone('qualifying', null, now)).toBe(false);
        expect(isRecentWeekend('2026-11-01T20:00:00Z', now)).toBe(true);
        expect(isRecentWeekend('2026-03-08T04:00:00Z', now)).toBe(false);
    });

    it('fetches only sessions that have run and maps Jolpica results', async () => {
        const requested = [];
        vi.stubGlobal('fetch', vi.fn(async (input) => {
            const url = new URL(input);
            requested.push(url.pathname);
            if (url.pathname.endsWith('/2026/19/results.json')) {
                return jsonResponse({ MRData: { total: '2', RaceTable: { Races: [{ Results: [jolpicaRow(1), jolpicaRow(2)] }] } } });
            }
            if (url.pathname.endsWith('/2026/19/qualifying.json')) {
                return jsonResponse({ MRData: { total: '0', RaceTable: { Races: [] } } });
            }
            return jsonResponse({}, { status: 404 });
        }));
        const results = await getWeekendResults(event, Date.parse('2026-11-02T00:00:00Z'));
        expect(results.race.map((row) => row.position)).toEqual([1, 2]);
        expect(results.qualifying).toEqual([]);
        expect(results.sprint).toBeNull();
        expect(requested.some((path) => path.includes('sprint'))).toBe(false);
    });

    it('throws when Jolpica fails instead of returning empty results', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({}, { status: 400 })));
        await expect(getSessionResults(2026, 19, 'race', { raceStart: event.raceStart })).rejects.toThrow(/HTTP 400/);
        expect(() => getSessionResults(2026, 19, 'nope')).toThrow(TypeError);
    });
});

describe('local time and countdown', () => {
    it('renders UTC with a label on the server', () => {
        expect(formatInstant('2026-11-01T20:00:00Z', 'datetime')).toBe('Sun 1 Nov, 20:00 UTC');
        expect(formatInstant('2026-11-01T20:00:00Z', 'date')).toBe('1 Nov 2026');
        expect(formatInstant('garbage')).toBeNull();
    });

    it('splits the remaining time', () => {
        const target = Date.parse('2026-11-01T20:00:00Z');
        expect(countdownParts(target, target - ((2 * 86400 + 3 * 3600 + 4 * 60 + 5) * 1000))).toEqual({
            done: false, days: 2, hours: 3, minutes: 4, seconds: 5,
        });
        expect(countdownParts(target, target + 1000).done).toBe(true);
    });
});

describe('schedule helpers', () => {
    it('highlights the live, in-progress or next round', () => {
        const rounds = [
            { round: 1, status: 'completed' },
            { round: 2, status: 'weekend' },
            { round: 3, status: 'upcoming' },
        ];
        expect(nextRound(rounds).round).toBe(2);
        expect(nextRound([{ round: 1, status: 'completed' }])).toBeNull();
    });

    it('computes testing and cancelled meeting status', () => {
        const meeting = { dateStart: '2026-02-11T07:00:00Z', dateEnd: '2026-02-13T16:00:00Z' };
        expect(meetingStatus(meeting, Date.parse('2026-02-01T00:00:00Z'))).toBe('upcoming');
        expect(meetingStatus(meeting, Date.parse('2026-02-12T00:00:00Z'))).toBe('live');
        expect(meetingStatus(meeting, Date.parse('2026-03-01T00:00:00Z'))).toBe('completed');
        expect(meetingStatus({ ...meeting, is_cancelled: true })).toBe('cancelled');
    });

    it('builds the webcal subscription URL', () => {
        expect(webcalUrl('https://example.com')).toBe('webcal://example.com/calendar.ics');
    });
});

describe('sitemap entries', () => {
    it('lists races by meeting key, current drivers by number, teams by id and circuits once', () => {
        const now = new Date('2026-10-27T00:00:00Z');
        const entries = dynamicEntries({
            calendar: { rounds: [{ ...event, status: 'upcoming' }, { ...event, meetingKey: null }] },
            grid: [{ racingNumber: 12 }, { racingNumber: null }],
            teams: [{ constructorId: 'mercedes' }],
        }, now);
        const paths = entries.map((entry) => new URL(entry.url).pathname);
        expect(paths).toEqual(['/race/1298', '/driver/12', '/team/mercedes', `/tracks/${event.circuit.id}`]);
        expect(staticEntries(now).map((entry) => new URL(entry.url).pathname)).toContain('/schedule');
    });
});

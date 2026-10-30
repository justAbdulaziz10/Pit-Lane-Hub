import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ unstable_cache: (callback) => callback }));

import { getCircuitGeometry } from '@/lib/f1/circuits';
import { getCareerStats } from '@/lib/f1/compare';
import { getGrid, resolveDriver } from '@/lib/f1/drivers';
import { fetchJolpicaPages, fetchJson, UpstreamError } from '@/lib/f1/http';
import { getChampions } from '@/lib/f1/history';
import { getLiveSnapshot } from '@/lib/f1/live';
import { getCalendar, getEventByMeetingKey, getEventByRound, getNextRace } from '@/lib/f1/season';
import { ensureTeamColorContrast, teamColorContrastRatio } from '@/lib/f1/team-utils';
import { getTeams } from '@/lib/f1/teams';
import { getTrackInfo } from '@/lib/tracks';

const jsonResponse = (payload, { status = 200, headers = {} } = {}) => ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => headers[name.toLowerCase()] || null },
    json: async () => payload,
});

function driver(id, code, number, firstName, lastName, nationality) {
    return {
        driverId: id,
        code,
        permanentNumber: String(number),
        givenName: firstName,
        familyName: lastName,
        nationality,
    };
}

function installFetch(handler) {
    const fetchMock = vi.fn(async (input, options) => {
        const url = new URL(input);
        return jsonResponse(await handler(url, options));
    });
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
}

function mrData(total, tables) {
    return { MRData: { total: String(total), ...tables } };
}

function calendarFixture() {
    const races = [
        {
            season: '2026',
            round: '1',
            raceName: 'Bahrain Grand Prix',
            date: '2026-10-12',
            time: '15:00:00Z',
            Circuit: { circuitId: 'bahrain', circuitName: 'Bahrain International Circuit', Location: { locality: 'Sakhir', country: 'Bahrain' } },
            Race: { date: '2026-10-12', time: '15:00:00Z' },
        },
        {
            season: '2026',
            round: '18',
            raceName: 'United States Grand Prix',
            date: '2026-10-25',
            time: '19:00:00Z',
            FirstPractice: { date: '2026-10-23', time: '16:00:00Z' },
            Race: { date: '2026-10-25', time: '19:00:00Z' },
            Circuit: { circuitId: 'americas', circuitName: 'Circuit of the Americas', Location: { locality: 'Austin', country: 'USA' } },
        },
    ];
    const meetings = [
        {
            meeting_key: 1001,
            meeting_name: 'Bahrain Grand Prix',
            circuit_short_name: 'Sakhir',
            country_name: 'Bahrain',
            date_start: '2026-10-10T00:00:00Z',
            date_end: '2026-10-12T00:00:00Z',
            is_cancelled: true,
        },
        {
            meeting_key: 999,
            meeting_name: 'Pre-Season Testing',
            circuit_short_name: 'Austin',
            country_name: 'United States',
            date_start: '2026-10-23T10:00:00Z',
            date_end: '2026-10-25T10:00:00Z',
        },
        {
            meeting_key: 1818,
            meeting_name: 'United States Grand Prix',
            circuit_short_name: 'Austin',
            country_name: 'United States',
            date_start: '2026-10-23T10:00:00Z',
            date_end: '2026-10-25T21:00:00Z',
        },
    ];
    const sessions = [
        { meeting_key: 1818, session_key: 181, session_name: 'Practice 1', date_start: '2026-10-23T16:00:00Z', date_end: '2026-10-23T18:00:00Z' },
        { meeting_key: 1818, session_key: 182, session_name: 'Race', date_start: '2026-10-25T19:00:00Z', date_end: '2026-10-25T21:00:00Z' },
    ];
    return { races, meetings, sessions };
}

function installCalendarFetch({ races, meetings, sessions }) {
    return installFetch((url) => {
        if (url.hostname === 'api.jolpi.ca' && url.pathname.endsWith('/2026/races.json')) {
            return mrData(races.length, { RaceTable: { Races: races.slice(Number(url.searchParams.get('offset') || 0), Number(url.searchParams.get('offset') || 0) + 100) } });
        }
        if (url.pathname.endsWith('/meetings')) return meetings;
        if (url.pathname.endsWith('/sessions')) return sessions;
        throw new Error(`Unexpected test request: ${url}`);
    });
}

beforeEach(() => {
    vi.stubEnv('OPENF1_USERNAME', '');
    vi.stubEnv('OPENF1_PASSWORD', '');
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.useRealTimers();
});

describe('Jolpica HTTP core', () => {
    it('follows MRData.total through all 446 rows at offsets of 100', async () => {
        const requests = [];
        installFetch((url) => {
            requests.push(url);
            const offset = Number(url.searchParams.get('offset'));
            return mrData(446, { DriverTable: { Drivers: Array.from({ length: Math.min(100, 446 - offset) }, (_, index) => ({ id: offset + index })) } });
        });

        const rows = await fetchJolpicaPages('drivers', { select: (data) => data.DriverTable.Drivers });

        expect(rows).toHaveLength(446);
        expect(requests.map((url) => Number(url.searchParams.get('offset')))).toEqual([0, 100, 200, 300, 400]);
        expect(requests.every((url) => url.searchParams.get('limit') === '100')).toBe(true);
    });

    it('throws a typed error on an upstream failure instead of returning an empty list', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ message: 'down' }, { status: 404 })));
        await expect(fetchJolpicaPages('drivers', { select: (data) => data.DriverTable.Drivers }))
            .rejects.toBeInstanceOf(UpstreamError);
    });

    it('retries 429 and 5xx responses and observes Retry-After', async () => {
        let attempt = 0;
        const fetchMock = vi.fn(async () => {
            attempt += 1;
            if (attempt === 1) return jsonResponse({}, { status: 429, headers: { 'retry-after': '0.02' } });
            if (attempt === 2) return jsonResponse({}, { status: 503 });
            return jsonResponse({ ready: true });
        });
        vi.stubGlobal('fetch', fetchMock);
        const start = Date.now();

        await expect(fetchJson('https://example.test/data', { retries: 2 })).resolves.toEqual({ ready: true });

        expect(fetchMock).toHaveBeenCalledTimes(3);
        expect(Date.now() - start).toBeGreaterThanOrEqual(15);
    });

    it('aborts requests after the configured timeout', async () => {
        vi.stubGlobal('fetch', vi.fn((url, options) => new Promise((resolve, reject) => {
            options.signal.addEventListener('abort', () => {
                const error = new Error('aborted');
                error.name = 'AbortError';
                reject(error);
            });
        })));
        await expect(fetchJson('https://example.test/slow', { timeoutMs: 5, retries: 0 }))
            .rejects.toMatchObject({ name: 'UpstreamError', message: expect.stringContaining('timed out') });
    });
});

describe('season calendar', () => {
    it('reproduces the cold-cache calendar failure when OpenF1 returns 401', async () => {
        const { races } = calendarFixture();
        vi.stubGlobal('fetch', vi.fn(async (input) => {
            const url = new URL(input);
            if (url.hostname === 'api.jolpi.ca') {
                return jsonResponse(mrData(races.length, { RaceTable: { Races: races } }));
            }
            return jsonResponse({ message: 'unauthorized' }, { status: 401 });
        }));

        const calendar = await getCalendar(2026);
        expect(calendar.rounds).toHaveLength(2);
    });

    it('excludes cancelled meetings, preserves Jolpica round 18, and never joins testing', async () => {
        vi.setSystemTime(new Date('2026-10-23T20:00:00Z'));
        installCalendarFetch(calendarFixture());

        const calendar = await getCalendar(2026);

        expect(calendar.rounds.map((event) => event.round)).toEqual([18]);
        expect(calendar.rounds[0]).toMatchObject({ meetingKey: 1818, status: 'weekend' });
        expect(calendar.rounds[0].sessions).toMatchObject({
            firstPractice: '2026-10-23T16:00:00.000Z',
            race: '2026-10-25T19:00:00.000Z',
        });
        expect(calendar.cancelled.map((meeting) => meeting.meetingKey)).toContain(1001);
        expect(calendar.testing.map((meeting) => meeting.meetingKey)).toContain(999);
        expect(await getEventByMeetingKey(999, 2026)).toMatchObject({ kind: 'testing' });
        expect(await getEventByMeetingKey(1001, 2026)).toMatchObject({ kind: 'cancelled' });
        expect(await getEventByMeetingKey(1818, 2026)).toMatchObject({ kind: 'race', event: { round: 18 } });
        expect(await getEventByMeetingKey('2026-18')).toMatchObject({ kind: 'race', event: { round: 18, meetingKey: 1818, routeKey: '2026-18' } });
        expect(await getEventByMeetingKey('../etc', 2026)).toBeNull();
        expect((await getEventByRound(2026, 18))?.raceName).toBe('United States Grand Prix');
    });

    it('marks completion three hours after Race, not after First Practice', async () => {
        vi.setSystemTime(new Date('2026-10-22T20:00:00Z'));
        installCalendarFetch(calendarFixture());
        expect((await getCalendar(2026)).rounds[0].status).toBe('upcoming');

        vi.setSystemTime(new Date('2026-10-23T20:00:00Z'));
        installCalendarFetch(calendarFixture());
        expect((await getCalendar(2026)).rounds[0].status).toBe('weekend');

        vi.setSystemTime(new Date('2026-10-25T21:59:00Z'));
        installCalendarFetch(calendarFixture());
        expect((await getCalendar(2026)).rounds[0].status).not.toBe('completed');

        vi.setSystemTime(new Date('2026-10-25T22:01:00Z'));
        installCalendarFetch(calendarFixture());
        expect((await getCalendar(2026)).rounds[0].status).toBe('completed');
    });

    it('joins a relocated Grand Prix by weekend even when the countries differ', async () => {
        vi.setSystemTime(new Date('2026-10-27T08:00:00Z'));
        installCalendarFetch({
            races: [{
                season: '2026',
                round: '16',
                raceName: 'Bahrain Grand Prix in Malaysia',
                date: '2026-10-04',
                time: '07:00:00Z',
                Circuit: { circuitId: 'sepang', circuitName: 'Sepang International Circuit', Location: { locality: 'Kuala Lumpur', country: 'Malaysia' } },
            }],
            meetings: [{
                meeting_key: 1308,
                meeting_name: 'Bahrain Grand Prix',
                circuit_short_name: 'Kuala Lumpur',
                country_name: 'Bahrain',
                date_start: '2026-10-02T03:30:00Z',
                date_end: '2026-10-04T09:00:00Z',
                is_cancelled: false,
            }],
            sessions: [],
        });
        const calendar = await getCalendar(2026);
        expect(calendar.rounds[0]).toMatchObject({ round: 16, meetingKey: 1308, status: 'completed' });
    });

    it('marks an event live only while one of its mapped sessions is in progress', async () => {
        vi.setSystemTime(new Date('2026-10-23T17:00:00Z'));
        installCalendarFetch(calendarFixture());
        expect((await getCalendar(2026)).rounds[0].status).toBe('live');
    });

    it('uses Jolpica session starts for 60-minute live windows and stable route keys', async () => {
        vi.setSystemTime(new Date('2026-10-27T11:59:00Z'));
        installCalendarFetch({
            races: [{
                season: '2026',
                round: '1',
                raceName: 'Australian Grand Prix',
                date: '2026-11-01',
                time: '05:00:00Z',
                FirstPractice: { date: '2026-10-27', time: '11:00:00Z' },
                Circuit: { circuitId: 'albert_park', circuitName: 'Albert Park', Location: { country: 'Australia' } },
            }],
            meetings: [],
            sessions: [],
        });

        const calendar = await getCalendar(2026);
        expect(calendar.rounds[0]).toMatchObject({ meetingKey: null, routeKey: '2026-1', status: 'live' });
        expect(calendar.rounds[0].sessionWindows).toContainEqual({
            session: 'firstPractice',
            start: '2026-10-27T11:00:00.000Z',
            end: '2026-10-27T12:00:00.000Z',
        });
        expect(await getEventByMeetingKey('2026-1')).toMatchObject({ kind: 'race', event: { round: 1 } });
    });

    it('maps Jolpica 2023 SprintShootout to sprint qualifying', async () => {
        const race = {
            season: '2023',
            round: '4',
            raceName: 'Azerbaijan Grand Prix',
            date: '2023-04-30',
            time: '11:00:00Z',
            SprintShootout: { date: '2023-04-29', time: '09:30:00Z' },
            Circuit: { circuitId: 'baku', circuitName: 'Baku City Circuit', Location: { country: 'Azerbaijan' } },
        };
        installFetch((url) => {
            if (url.hostname === 'api.jolpi.ca' && url.pathname.endsWith('/2023/races.json')) {
                return mrData(1, { RaceTable: { Races: [race] } });
            }
            if (url.hostname === 'api.openf1.org') return [];
            throw new Error(`Unexpected test request: ${url}`);
        });

        expect((await getCalendar(2023)).rounds[0].sessions.sprintQualifying)
            .toBe('2023-04-29T09:30:00.000Z');
    });

    it('targets the Race session start for the next race countdown', async () => {
        vi.setSystemTime(new Date('2026-10-23T20:00:00Z'));
        installCalendarFetch(calendarFixture());

        const nextRace = await getNextRace(2026);

        expect(nextRace.round).toBe(18);
        expect(nextRace.raceStart).toBe('2026-10-25T19:00:00.000Z');
        expect(nextRace.raceStart).not.toBe('2026-10-23T10:00:00.000Z');
    });
});

describe('grid and driver resolution', () => {
    it('uses a year Race session instead of a later practice session and resolves numbers dynamically', async () => {
        vi.setSystemTime(new Date('2026-10-27T00:00:00Z'));
        const sessions = [
            { session_key: 200, session_name: 'Race', date_start: '2026-10-25T19:00:00Z' },
            { session_key: 300, session_name: 'Practice 1', date_start: '2026-10-26T16:00:00Z' },
            { session_key: 100, session_name: 'Pre-Season Testing', date_start: '2026-02-01T10:00:00Z' },
        ];
        const openDrivers = [
            { driver_number: 1, name_acronym: 'NOR', first_name: 'Lando', last_name: 'Norris', full_name: 'Lando Norris', country_code: null, team_name: 'McLaren', team_colour: 'FF8000', headshot_url: 'https://example.test/norris.png' },
            { driver_number: 3, name_acronym: 'VER', first_name: 'Max', last_name: 'Verstappen', full_name: 'Max Verstappen', country_code: null, team_name: 'Red Bull Racing', team_colour: '3671C6' },
        ];
        const seasonDrivers = [
            driver('norris', 'NOR', 1, 'Lando', 'Norris', 'British'),
            driver('max_verstappen', 'VER', 3, 'Max', 'Verstappen', 'Dutch'),
        ];
        const latestRace = {
            season: '2026',
            round: '1',
            raceName: 'Australian Grand Prix',
            date: '2026-10-25',
            time: '19:00:00Z',
            Circuit: { circuitId: 'albert_park', circuitName: 'Albert Park', Location: { country: 'Australia' } },
        };
        const latestResults = [
            { number: '1', Driver: seasonDrivers[0], Constructor: { constructorId: 'mclaren', name: 'McLaren' } },
            { number: '3', Driver: seasonDrivers[1], Constructor: { constructorId: 'red_bull', name: 'Red Bull Racing' } },
        ];
        const fetchMock = installFetch((url) => {
            if (url.hostname === 'api.openf1.org' && url.pathname.endsWith('/meetings')) return [];
            if (url.hostname === 'api.openf1.org' && url.pathname.endsWith('/sessions')) return sessions;
            if (url.hostname === 'api.openf1.org' && url.pathname.endsWith('/drivers')) {
                expect(url.searchParams.get('session_key')).toBe('200');
                return openDrivers;
            }
            if (url.pathname.endsWith('/2026/races.json')) return mrData(1, { RaceTable: { Races: [latestRace] } });
            if (url.pathname.endsWith('/2026/1/results.json')) return mrData(2, { RaceTable: { Races: [{ Results: latestResults }] } });
            if (url.pathname.endsWith('/2026/drivers.json')) return mrData(seasonDrivers.length, { DriverTable: { Drivers: seasonDrivers } });
            throw new Error(`Unexpected test request: ${url}`);
        });

        const grid = await getGrid(2026);
        const norris = await resolveDriver(1, 2026);
        const verstappen = await resolveDriver(3, 2026);

        expect(grid.map((entry) => entry.racingNumber)).toEqual([1, 3]);
        expect(grid.map((entry) => entry.inLatestSession)).toEqual([true, true]);
        expect(norris).toMatchObject({ driverId: 'norris', nationalityCode: 'GBR', countryCode: 'GBR', flag: '🇬🇧' });
        expect(verstappen.driverId).toBe('max_verstappen');
        expect(fetchMock.mock.calls.some(([input]) => String(input).includes('session_key=300'))).toBe(false);
    });
});

describe('teams and career/history data', () => {
    it('joins teams by constructor ID and driver membership, normalizing names and colors', async () => {
        vi.setSystemTime(new Date('2026-10-27T00:00:00Z'));
        const constructors = [
            { constructorId: 'red_bull', name: 'Red Bull' },
            { constructorId: 'racing_bulls', name: 'RB F1 Team' },
        ];
        const openDrivers = [
            { driver_number: 3, name_acronym: 'VER', first_name: 'Max', last_name: 'Verstappen', team_name: 'Red Bull Racing', team_colour: '181818' },
            { driver_number: 22, name_acronym: 'TSU', first_name: 'Yuki', last_name: 'Tsunoda', team_name: 'Racing Bulls', team_colour: '6692FF' },
        ];
        const seasonDrivers = [
            driver('max_verstappen', 'VER', 3, 'Max', 'Verstappen', 'Dutch'),
            driver('tsunoda', 'TSU', 22, 'Yuki', 'Tsunoda', 'Japanese'),
            // Scored for Racing Bulls earlier in the season, since replaced.
            driver('lawson', 'LAW', 30, 'Liam', 'Lawson', 'New Zealander'),
        ];
        const latestRace = {
            season: '2026',
            round: '1',
            raceName: 'Australian Grand Prix',
            date: '2026-10-25',
            time: '19:00:00Z',
            Circuit: { circuitId: 'albert_park', circuitName: 'Albert Park', Location: { country: 'Australia' } },
        };
        installFetch((url) => {
            if (url.hostname === 'api.openf1.org' && url.pathname.endsWith('/meetings')) return [];
            if (url.hostname === 'api.openf1.org' && url.pathname.endsWith('/sessions')) return [{ session_key: 200, session_name: 'Race', date_start: '2026-10-25T19:00:00Z' }];
            if (url.hostname === 'api.openf1.org' && url.pathname.endsWith('/drivers')) return openDrivers;
            if (url.hostname === 'api.jolpi.ca' && url.pathname.endsWith('/2026/races.json')) return mrData(1, { RaceTable: { Races: [latestRace] } });
            if (url.hostname === 'api.jolpi.ca' && url.pathname.endsWith('/2026/1/results.json')) return mrData(2, { RaceTable: { Races: [{ Results: [
                { number: '3', Driver: seasonDrivers[0], Constructor: constructors[0] },
                { number: '22', Driver: seasonDrivers[1], Constructor: constructors[1] },
            ] }] } });
            if (url.hostname === 'api.jolpi.ca' && url.pathname.endsWith('/2026/constructors.json')) return mrData(2, { ConstructorTable: { Constructors: constructors } });
            if (url.hostname === 'api.jolpi.ca' && url.pathname.endsWith('/2026/drivers.json')) return mrData(3, { DriverTable: { Drivers: seasonDrivers } });
            if (url.hostname === 'api.jolpi.ca' && url.pathname.endsWith('/2026/driverstandings.json')) {
                return mrData(1, { StandingsTable: { StandingsLists: [{ season: '2026', round: '18', DriverStandings: [
                    { Driver: seasonDrivers[0], Constructors: [{ constructorId: 'red_bull', name: 'Red Bull' }] },
                    { Driver: seasonDrivers[1], Constructors: [{ constructorId: 'racing_bulls', name: 'RB F1 Team' }] },
                    { Driver: seasonDrivers[2], Constructors: [{ constructorId: 'racing_bulls', name: 'RB F1 Team' }] },
                ] }] } });
            }
            throw new Error(`Unexpected test request: ${url}`);
        });

        const teams = await getTeams(2026);

        expect(teams.map((team) => team.name)).toEqual(['Red Bull Racing', 'Racing Bulls']);
        expect(teams[0].drivers.map((entry) => entry.driverId)).toEqual(['max_verstappen']);
        expect(teams[1].drivers.map((entry) => entry.driverId)).toEqual(['tsunoda']);
        const adjustedColor = ensureTeamColorContrast('#181818');
        expect(adjustedColor).not.toBe('#181818');
        expect(teamColorContrastRatio(adjustedColor, '#0D0D0D')).toBeGreaterThanOrEqual(3);
    });

    it('falls back to the season livery colour when OpenF1 gives the grid no team colours', async () => {
        vi.setSystemTime(new Date('2026-10-27T00:00:00Z'));
        const constructors = [{ constructorId: 'ferrari', name: 'Ferrari' }];
        const hamilton = driver('hamilton', 'HAM', 44, 'Lewis', 'Hamilton', 'British');
        installFetch((url) => {
            if (url.hostname === 'api.openf1.org') return [];
            if (url.hostname === 'api.jolpi.ca' && url.pathname.endsWith('/2026/races.json')) return mrData(0, { RaceTable: { Races: [] } });
            if (url.hostname === 'api.jolpi.ca' && url.pathname.endsWith('/2026/constructors.json')) return mrData(1, { ConstructorTable: { Constructors: constructors } });
            if (url.hostname === 'api.jolpi.ca' && url.pathname.endsWith('/2026/drivers.json')) return mrData(1, { DriverTable: { Drivers: [hamilton] } });
            if (url.hostname === 'api.jolpi.ca' && url.pathname.endsWith('/2026/driverstandings.json')) {
                return mrData(1, { StandingsTable: { StandingsLists: [{ season: '2026', round: '18', DriverStandings: [
                    { Driver: hamilton, Constructors: constructors },
                ] }] } });
            }
            throw new Error(`Unexpected test request: ${url}`);
        });

        const [ferrari] = await getTeams(2026);

        expect(ferrari.color).toBe(ensureTeamColorContrast('#ED1131'));
    });

    it('derives career totals from the result rows and titles from the champions list', async () => {
        const race = (season, round, position, grid, fastest) => ({
            season: String(season),
            round: String(round),
            raceName: `Race ${round}`,
            date: `${season}-05-01`,
            Results: [{
                position: position == null ? undefined : String(position),
                positionText: position == null ? 'R' : String(position),
                grid: String(grid),
                points: '0',
                status: position == null ? 'Engine' : 'Finished',
                FastestLap: fastest ? { rank: '1' } : { rank: '5' },
                Driver: { driverId: 'norris', givenName: 'Lando', familyName: 'Norris' },
                Constructor: { constructorId: 'mclaren', name: 'McLaren' },
            }],
        });
        const races = [
            race(2024, 1, 1, 1, true),
            race(2024, 2, 2, 3, false),
            race(2025, 1, 3, 1, false),
            race(2025, 2, 1, 2, true),
            race(2025, 3, null, 1, false),
        ];
        const qualifying = races.map((item, index) => ({
            season: item.season,
            round: item.round,
            raceName: item.raceName,
            QualifyingResults: [{ position: index === 0 || index === 3 ? '1' : '2' }],
        }));
        const fetchMock = installFetch((url) => {
            if (url.hostname === 'api.openf1.org') return [];
            if (url.pathname.endsWith('/2026/races.json')) return mrData(0, { RaceTable: { Races: [] } });
            if (/\/\d{4}\/drivers\.json$/.test(url.pathname)) return mrData(0, { DriverTable: { Drivers: [] } });
            if (url.pathname.endsWith('/drivers/norris/results.json')) return mrData(races.length, { RaceTable: { Races: races } });
            if (url.pathname.endsWith('/drivers/norris/qualifying.json')) return mrData(qualifying.length, { RaceTable: { Races: qualifying } });
            throw new Error(`Unexpected test request: ${url}`);
        });

        const stats = await getCareerStats('norris');

        expect(stats).toEqual({
            driverId: 'norris',
            entries: 5,
            wins: 2,
            podiums: 4,
            poles: 2,
            poleCoverage: 'full',
            fastestLaps: 2,
            championships: 1,
            seasons: 2,
        });
        const careerRequests = fetchMock.mock.calls.map(([input]) => new URL(input).pathname).filter((path) => path.includes('/drivers/norris/'));
        expect(careerRequests.sort()).toEqual([
            '/ergast/f1/drivers/norris/qualifying.json',
            '/ergast/f1/drivers/norris/results.json',
        ]);
    });

    it('includes Norris as 2025 champion but excludes the unfinished 2026 season', async () => {
        vi.setSystemTime(new Date('2026-10-27T00:00:00Z'));
        const finale = { season: '2026', round: '23', raceName: 'Abu Dhabi Grand Prix', date: '2026-12-06', time: '13:00:00Z', Circuit: { circuitId: 'yas_marina', circuitName: 'Yas Marina Circuit', Location: { locality: 'Abu Dhabi', country: 'UAE' } } };
        const fetchMock = installFetch((url) => {
            if (url.pathname.endsWith('/2026/races.json')) return mrData(1, { RaceTable: { Races: [finale] } });
            if (url.pathname.endsWith('/meetings') || url.pathname.endsWith('/sessions')) return [];
            throw new Error(`Unexpected test request: ${url}`);
        });

        const champions = await getChampions();

        expect(champions.drivers.at(-1)).toMatchObject({ year: 2025, driverId: 'norris' });
        expect(champions.constructors.at(-1)).toMatchObject({ year: 2025, constructorId: 'mclaren' });
        expect(champions.drivers.filter((item) => item.driverId === 'hill')).toHaveLength(2);
        expect(champions.drivers.some((item) => item.year === 2026)).toBe(false);
        expect(fetchMock.mock.calls.some(([input]) => String(input).includes('standings'))).toBe(false);
    });

    it('adds a newly completed season from the API', async () => {
        vi.setSystemTime(new Date('2026-12-07T00:00:00Z'));
        const finale = { season: '2026', round: '23', raceName: 'Abu Dhabi Grand Prix', date: '2026-12-06', time: '13:00:00Z', Circuit: { circuitId: 'yas_marina', circuitName: 'Yas Marina Circuit', Location: { locality: 'Abu Dhabi', country: 'UAE' } } };
        installFetch((url) => {
            if (url.pathname.endsWith('/2026/races.json')) return mrData(1, { RaceTable: { Races: [finale] } });
            if (url.pathname.endsWith('/2027/races.json')) return mrData(0, { RaceTable: { Races: [] } });
            if (url.pathname.endsWith('/2026/driverstandings/1.json')) return mrData(1, { StandingsTable: { StandingsLists: [{ season: '2026', round: '23', DriverStandings: [{ position: '1', Driver: { driverId: 'antonelli', code: 'ANT', givenName: 'Andrea Kimi', familyName: 'Antonelli', nationality: 'Italian' } }] }] } });
            if (url.pathname.endsWith('/2026/constructorstandings/1.json')) return mrData(1, { StandingsTable: { StandingsLists: [{ season: '2026', round: '23', ConstructorStandings: [{ position: '1', Constructor: { constructorId: 'mercedes', name: 'Mercedes', nationality: 'German' } }] }] } });
            if (url.pathname.endsWith('/meetings') || url.pathname.endsWith('/sessions')) return [];
            throw new Error(`Unexpected test request: ${url}`);
        });

        const champions = await getChampions();

        expect(champions.drivers.at(-1)).toMatchObject({ year: 2026, driverId: 'antonelli' });
        expect(champions.constructors.at(-1)).toMatchObject({ year: 2026, constructorId: 'mercedes' });
    });
});

describe('circuit mapping', () => {
    it('maps the 2026 circuit IDs exactly and does not infer Spa from Spanish Grand Prix', () => {
        const currentIds = [
            'albert_park', 'shanghai', 'suzuka', 'bahrain', 'jeddah', 'miami', 'gilles_villeneuve',
            'monaco', 'catalunya', 'red_bull_ring', 'silverstone', 'spa', 'hungaroring', 'zandvoort',
            'monza', 'madring', 'baku', 'marina_bay', 'americas', 'rodriguez', 'interlagos',
            'vegas', 'losail', 'yas_marina', 'sepang',
        ];
        for (const circuitId of currentIds) expect(getCircuitGeometry(circuitId), circuitId).not.toBeNull();
        expect(getCircuitGeometry('madring').name).toBe('Circuito de Madring');
        expect(getCircuitGeometry('spa').name).toContain('Spa-Francorchamps');
        expect(getTrackInfo('Spanish Grand Prix')).toBeNull();
        expect(getTrackInfo('Spanish Grand Prix', 'madring')?.title).toBe('Circuito de Madring');
    });

    it('labels current layouts with the official lap length, not the trace length', () => {
        expect(getCircuitGeometry('losail').length).toBe(5419);
        expect(getCircuitGeometry('marina_bay').length).toBe(4940);
        expect(getCircuitGeometry('catalunya').length).toBe(4657);
        expect(getCircuitGeometry('americas').length).toBe(5513);
        expect(getCircuitGeometry('monaco').length).toBe(3337);
    });
});

describe('live snapshot', () => {
    it('returns live positions, gaps, last laps, stints, weather, and race control without cache', async () => {
        vi.setSystemTime(new Date('2026-10-27T12:00:00Z'));
        vi.stubEnv('OPENF1_USERNAME', 'fixture-user');
        vi.stubEnv('OPENF1_PASSWORD', 'fixture-password');
        const requested = [];
        installFetch((url, options) => {
            requested.push({ url, options });
            if (url.pathname.endsWith('/token')) return { access_token: 'fixture-token' };
            if (url.pathname.endsWith('/sessions')) return [{ session_key: 500, session_name: 'Race', date_start: '2026-10-27T11:00:00Z', date_end: '2026-10-27T14:00:00Z' }];
            if (url.pathname.endsWith('/drivers')) return [{ driver_number: 1, name_acronym: 'NOR', full_name: 'Lando Norris', team_name: 'McLaren', team_colour: 'FF8000' }];
            if (url.pathname.endsWith('/position')) return [
                { driver_number: 1, position: 2, date: '2026-10-27T11:59:00Z' },
                { driver_number: 1, position: 1, date: '2026-10-27T12:00:00Z' },
            ];
            if (url.pathname.endsWith('/intervals')) return [{ driver_number: 1, gap_to_leader: 0, interval: 0, date: '2026-10-27T12:00:00Z' }];
            if (url.pathname.endsWith('/laps')) return [
                { driver_number: 1, lap_number: 1, lap_duration: 91.2 },
                { driver_number: 1, lap_number: 2, lap_duration: 90.8 },
            ];
            if (url.pathname.endsWith('/stints')) return [{ driver_number: 1, stint_number: 1, compound: 'SOFT', tyre_age_at_start: 0, lap_start: 1, lap_end: 20 }];
            if (url.pathname.endsWith('/weather')) return [{ date: '2026-10-27T11:00:00Z', air_temperature: 23 }, { date: '2026-10-27T12:00:00Z', air_temperature: 25 }];
            if (url.pathname.endsWith('/race_control')) return [{ date: '2026-10-27T11:59:00Z', message: 'Earlier' }, { date: '2026-10-27T12:00:00Z', message: 'Latest' }];
            if (url.pathname.endsWith('/session_result')) return [];
            throw new Error(`Unexpected test request: ${url}`);
        });

        const snapshot = await getLiveSnapshot();

        expect(snapshot.isLive).toBe(true);
        expect(snapshot.positions[0]).toMatchObject({
            driverNumber: 1,
            position: 1,
            gapToLeader: 0,
            interval: 0,
            lastLap: { lapNumber: 2, duration: 90.8 },
            stint: { compound: 'SOFT', age: 2 },
            team: 'McLaren',
            teamColor: '#FF8000',
        });
        expect(snapshot.isRace).toBe(true);
        expect(snapshot.session).toMatchObject({ key: 500, name: 'Race' });
        expect(snapshot.weather.airTemperature).toBe(25);
        expect(snapshot.raceControl[0].message).toBe('Latest');
        expect(requested.every(({ options }) => options.cache === 'no-store')).toBe(true);
    });

    it('ranks practice and qualifying by best lap and skips race intervals', async () => {
        vi.setSystemTime(new Date('2026-10-27T12:00:00Z'));
        vi.stubEnv('OPENF1_USERNAME', 'fixture-user');
        vi.stubEnv('OPENF1_PASSWORD', 'fixture-password');
        const requested = [];
        installFetch((url) => {
            requested.push(url);
            if (url.pathname.endsWith('/token')) return { access_token: 'fixture-token' };
            if (url.pathname.endsWith('/sessions')) return [{ session_key: 501, session_name: 'Qualifying', session_type: 'Qualifying', date_start: '2026-10-27T11:00:00Z', date_end: '2026-10-27T13:00:00Z' }];
            if (url.pathname.endsWith('/drivers')) return [
                { driver_number: 1, name_acronym: 'NOR', team_name: 'McLaren' },
                { driver_number: 3, name_acronym: 'VER', team_name: 'Red Bull Racing' },
            ];
            if (url.pathname.endsWith('/position')) return [
                { driver_number: 3, position: 1, date: '2026-10-27T11:50:00Z' },
                { driver_number: 1, position: 2, date: '2026-10-27T11:50:00Z' },
            ];
            if (url.pathname.endsWith('/laps')) return [
                { driver_number: 3, lap_number: 3, lap_duration: 78.5 },
                { driver_number: 3, lap_number: 4, lap_duration: null },
                { driver_number: 1, lap_number: 2, lap_duration: 78.9 },
                { driver_number: 1, lap_number: 3, lap_duration: 79.4 },
            ];
            if (/\/(stints|race_control|weather|session_result)$/.test(url.pathname)) return [];
            throw new Error(`Unexpected test request: ${url}`);
        });

        const snapshot = await getLiveSnapshot();

        expect(snapshot.isRace).toBe(false);
        expect(requested.some((url) => url.pathname.endsWith('/intervals'))).toBe(false);
        expect(requested.find((url) => url.pathname.endsWith('/laps')).searchParams.has('date_start>')).toBe(false);
        expect(snapshot.positions.map((row) => [row.code, row.bestLap?.duration, row.gapToLeader])).toEqual([
            ['VER', 78.5, 0],
            ['NOR', 78.9, 0.4],
        ]);
        expect(snapshot.positions[1].lastLap.lapNumber).toBe(3);
    });
});


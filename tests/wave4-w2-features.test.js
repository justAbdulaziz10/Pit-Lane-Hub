import { describe, expect, it, vi } from 'vitest';

const httpMocks = vi.hoisted(() => ({
    fetchJolpicaPage: vi.fn(),
    fetchOpenF1Json: vi.fn(),
    cacheF1Data: vi.fn((callback) => callback),
}));
const routeMocks = vi.hoisted(() => ({ getEventByMeetingKey: vi.fn() }));

vi.mock('@/lib/f1/http', () => ({
    cacheF1Data: httpMocks.cacheF1Data,
    F1_CACHE_TAGS: { circuits: 'circuits', results: 'results' },
    fetchJolpicaPage: httpMocks.fetchJolpicaPage,
    fetchOpenF1Json: httpMocks.fetchOpenF1Json,
    UpstreamError: class UpstreamError extends Error {},
}));
vi.mock('@/lib/f1/season', () => ({ getEventByMeetingKey: routeMocks.getEventByMeetingKey }));

import { calendarRoundRows, initialCalendarRoundRows, nextSessionTime, roundStatus, testingLabel, upcomingSessionTimes } from '@/app/[lang]/schedule/status';
import { gapToPoleSeconds, podiumColorToken, PODIUM_COLOR_TOKENS, qualifyingCutlinePositions } from '@/app/[lang]/race/[key]/presentation';
import { getCircuitHistory, isCompleteStrategy, mapCircuitHistory, mapSeasonWinners, getRaceStrategy, strategyRevalidateSeconds } from '@/lib/f1/race-extras';
import { formatInstant } from '@/components/localTimeFormat';
import { loadEvent } from '@/app/[lang]/race/[key]/event';

const circuitFixture = {
    RaceTable: {
        Races: [
            { season: '2025', round: '7', raceName: 'Fixture Grand Prix', Results: [{ Driver: { driverId: 'driver_new', givenName: 'Ari', familyName: 'Example' }, Constructor: { constructorId: 'team_new', name: 'Example Racing' } }] },
            { season: '1961', round: '4', Results: [{ Driver: { driverId: 'driver_old', givenName: 'Sam', familyName: 'Example' }, Constructor: { name: 'Historic Team' } }] },
            ...[2024, 2023, 2022, 2021].map((season, index) => ({
                season: String(season), round: String(index + 1),
                Results: [{ Driver: { driverId: `driver_${season}`, givenName: 'Fixture', familyName: String(season) }, Constructor: { name: 'Fixture Racing' } }],
            })),
        ],
    },
};

const round = (overrides = {}) => ({
    raceStart: '2026-11-01T20:00:00.000Z',
    raceDate: '2026-11-01',
    sessionWindows: [{ start: '2026-10-31T20:00:00Z', end: '2026-10-31T21:00:00Z' }],
    sessions: { qualifying: '2026-10-31T20:00:00Z', sprint: '2026-10-31T16:00:00Z' },
    ...overrides,
});

describe('race route key resolution', () => {
    it('resolves stable route keys and legacy numeric meeting keys', async () => {
        const resolved = { kind: 'race', event: { year: 2026, round: 18, routeKey: 1818 } };
        routeMocks.getEventByMeetingKey.mockResolvedValue(resolved);
        await expect(loadEvent('2026-18')).resolves.toBe(resolved);
        await expect(loadEvent('1818')).resolves.toBe(resolved);
        expect(routeMocks.getEventByMeetingKey).toHaveBeenNthCalledWith(1, '2026-18');
        expect(routeMocks.getEventByMeetingKey).toHaveBeenNthCalledWith(2, '1818');
    });

    it('turns an unknown route key into a 404 before lookup', async () => {
        routeMocks.getEventByMeetingKey.mockClear();
        await expect(loadEvent('unknown')).rejects.toMatchObject({ digest: expect.stringContaining('404') });
        expect(routeMocks.getEventByMeetingKey).not.toHaveBeenCalled();
    });
});

describe('calendar status and local session times', () => {
    it('computes next, live, and completed status from ISO timestamps', () => {
        const event = round();
        expect(roundStatus(event, Date.parse('2026-10-30T12:00:00Z'))).toBe('upcoming');
        expect(roundStatus(event, Date.parse('2026-10-31T20:30:00Z'))).toBe('live');
        expect(roundStatus(event, Date.parse('2026-11-02T00:00:00Z'))).toBe('completed');
        expect(calendarRoundRows([round({ raceStart: '2026-12-01T00:00:00Z' }), event], Date.parse('2026-11-01T00:00:00Z')).upcoming[0].status).toBe('next');
        expect(initialCalendarRoundRows([
            round({ status: 'completed', raceStart: '2026-10-01T00:00:00Z' }),
            round({ status: 'upcoming', raceStart: '2026-12-01T00:00:00Z' }),
        ]).upcoming[0].status).toBe('next');
    });

    it('labels the two preseason tests in English', () => {
        expect([testingLabel(0, 'en'), testingLabel(1, 'en')]).toEqual(['Test 1', 'Test 2']);
    });

    it('exposes qualifying and sprint ISO times to LocalTime and formats the browser-local value', () => {
        const times = upcomingSessionTimes(round(), 'en');
        expect(times.map(({ key }) => key)).toEqual(['qualifying', 'sprint']);
        expect(times[0].iso).toBe('2026-10-31T20:00:00Z');
        const iso = '2026-10-31T20:00:00Z';
        const actual = formatInstant(iso, 'datetime', { local: true, locale: 'en' });
        const expected = new Intl.DateTimeFormat('en-GB', {
            weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
        }).format(new Date(iso));
        expect(actual).toBe(expected);
        expect(actual).not.toContain('UTC');
        expect(nextSessionTime(round(), Date.parse('2026-10-31T17:00:00Z'))).toBe('2026-10-31T20:00:00Z');
    });

    it('renders upcoming first, puts the sprint tag on the sprint card, and uses visitor-local LocalTime', async () => {
        const { readFileSync } = await import('node:fs');
        const source = readFileSync(new URL('../src/app/[lang]/schedule/CalendarRounds.js', import.meta.url), 'utf8');
        const localTime = readFileSync(new URL('../src/components/LocalTime.js', import.meta.url), 'utf8');
        expect(source.indexOf('aria-labelledby="upcoming-heading"')).toBeLessThan(source.indexOf('aria-labelledby="completed-heading"'));
        expect(source).toContain('{isSprint && <span className={styles.sprintTag}>{t.sprintTag}</span>}');
        expect(source).toContain('<LocalTime iso={event.sessions[key]} format="datetime"');
        expect(source).toContain('<Countdown target={nextSessionTime(event, now)}');
        expect(localTime).toContain('formatInstant(iso, format, { local: isClient, locale })');
    });

    it('shows completed round winners with their driver name and team colour', async () => {
        const { readFileSync } = await import('node:fs');
        const source = readFileSync(new URL('../src/app/[lang]/schedule/CalendarRounds.js', import.meta.url), 'utf8');
        expect(source).toContain('className={styles.completedWinner}');
        expect(source).toContain('<bdi dir="ltr">{winnerName}</bdi>');
        expect(source).toContain('{winner.teamName && <span className={styles.winnerTeam}>');
        expect(source).toContain("'--winner-color': winner?.color || 'transparent'");
    });
});

describe('race presentation helpers', () => {
    it('calculates gap to pole from qualifying lap times', () => {
        const results = [
            { position: 1, q1: '1:30.000', q2: '1:29.400', q3: '1:29.000' },
            { position: 2, q1: '1:30.200', q2: '1:29.600', q3: '1:29.125' },
        ];
        expect(gapToPoleSeconds(results[1], results)).toBe(0.125);
        expect(gapToPoleSeconds({ position: 3 }, results)).toBeNull();
    });

    it('places Q1 and Q2 cut lines at the first eliminated positions', () => {
        const results = Array.from({ length: 20 }, (_, index) => ({ position: index + 1 }));
        expect(qualifyingCutlinePositions(results)).toEqual({ q1: 16, q2: 11 });
    });

    it('uses one shared podium token set and includes the tyre lap axis', async () => {
        expect(podiumColorToken(1)).toBe('--gold');
        expect(podiumColorToken(2)).toBe('--silver');
        expect(podiumColorToken(3)).toBe('--bronze');
        expect(Object.keys(PODIUM_COLOR_TOKENS)).toEqual(['1', '2', '3']);
        const { readFileSync } = await import('node:fs');
        const strategy = readFileSync(new URL('../src/app/[lang]/race/[key]/Strategy.js', import.meta.url), 'utf8');
        const page = readFileSync(new URL('../src/app/[lang]/race/[key]/page.js', import.meta.url), 'utf8');
        const results = readFileSync(new URL('../src/app/[lang]/race/[key]/ResultTables.js', import.meta.url), 'utf8');
        expect(strategy).toContain('className={styles.tyreAxisTrack}');
        expect(page).toContain('href={`#${id}`}');
        for (const id of ['results', 'qualifying', 'sprint', 'strategy', 'map']) expect(page.includes(`id="${id}"`) || (id === 'strategy' && strategy.includes('id="strategy"')) || (id === 'map' && readFileSync(new URL('../src/app/[lang]/race/[key]/RaceMap.js', import.meta.url), 'utf8').includes('id="map"'))).toBe(true);
        expect(results.match(/className=\{styles\.teamRow\}/g).length).toBeGreaterThanOrEqual(2);
        expect(results).toContain('podiumColorToken(row.position)');
    });
});

describe('race strategy cache policy', () => {
    it('refreshes within 24 hours and retains a complete archive for 30 days', () => {
        const start = Date.parse('2026-11-01T20:00:00Z');
        expect(strategyRevalidateSeconds('2026-11-01T20:00:00Z', start - 23 * 60 * 60 * 1000)).toBe(300);
        expect(strategyRevalidateSeconds('2026-11-01T20:00:00Z', start + 24 * 60 * 60 * 1000)).toBe(300);
        expect(strategyRevalidateSeconds('2026-11-01T20:00:00Z', start + 24 * 60 * 60 * 1000 + 1)).toBe(30 * 24 * 60 * 60);
    });

    it('rejects empty or partial strategy before it can enter the data cache', async () => {
        expect(isCompleteStrategy({ stints: [] }, [1])).toBe(false);
        expect(isCompleteStrategy({ stints: [{ driver_number: 1, lap_start: 1, lap_end: 50 }] }, [1, 2])).toBe(false);
        httpMocks.fetchOpenF1Json.mockImplementation(async (path) => {
            if (path.startsWith('sessions?')) return [{ session_name: 'Race', session_key: 26 }];
            if (path.startsWith('stints?')) return [];
            return [];
        });
        await expect(getRaceStrategy(18, { raceStart: '2026-11-01T20:00:00Z', expectedNumbers: [1] })).rejects.toThrow(/empty or incomplete/);
    });
});

describe('Jolpica circuit history', () => {
    it('maps first Grand Prix year and the five latest winners from the fixture', () => {
        const history = mapCircuitHistory(circuitFixture);
        expect(history.firstGrandPrixYear).toBe(1961);
        expect(history.winners).toHaveLength(5);
        expect(history.winners[0]).toMatchObject({ year: 2025, driverId: 'driver_new', teamName: 'Example Racing' });
        expect(mapSeasonWinners(circuitFixture).map(({ round }) => round)).toEqual([7, 4, 1, 2, 3, 4]);
    });

    it('makes one cached 30-day Jolpica request and degrades gracefully on failure', async () => {
        httpMocks.fetchJolpicaPage.mockResolvedValue({ MRData: circuitFixture });
        await expect(getCircuitHistory('monza')).resolves.toMatchObject({ firstGrandPrixYear: 1961 });
        expect(httpMocks.fetchJolpicaPage).toHaveBeenCalledTimes(1);
        expect(httpMocks.fetchJolpicaPage).toHaveBeenCalledWith('circuits/monza/results/1', expect.objectContaining({ revalidate: 30 * 24 * 60 * 60 }));

        httpMocks.fetchJolpicaPage.mockRejectedValueOnce(new Error('fixture failure'));
        const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
        await expect(getCircuitHistory('silverstone')).resolves.toBeNull();
        errorLog.mockRestore();
    });
});

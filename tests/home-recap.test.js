import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const homeMocks = vi.hoisted(() => ({
    getGrid: vi.fn(),
    getSeasonSummary: vi.fn(),
    getDriverNumbers: vi.fn(),
    getRaceResults: vi.fn(),
    getCalendar: vi.fn(),
    getNextRace: vi.fn(),
    getLastRace: vi.fn(),
    getTeams: vi.fn(),
    getDriverStandings: vi.fn(),
}));

vi.mock('next/server', () => ({ connection: async () => {} }));
vi.mock('next/link', async () => {
    const React = await import('react');
    return { default: ({ href, children, ...props }) => React.createElement('a', { href, ...props }, children) };
});
vi.mock('@/components/LocalTime', () => ({ default: () => null, Countdown: () => null }));
vi.mock('@/app/[lang]/schedule/status', () => ({
    requestTime: () => Date.parse('2026-11-01T08:00:00Z'),
    webcalUrl: () => 'webcal://example.test/calendar.ics',
}));
vi.mock('@/lib/f1/history', () => ({ getSeasonSummary: (...args) => homeMocks.getSeasonSummary(...args) }));
vi.mock('@/lib/f1/drivers', () => ({ getGrid: (...args) => homeMocks.getGrid(...args) }));
vi.mock('@/lib/f1/results', () => ({
    fastestLapOf: (results) => results.find((row) => row.fastestLap?.time) || null,
    getDriverNumbers: (...args) => homeMocks.getDriverNumbers(...args),
    getRaceResults: (...args) => homeMocks.getRaceResults(...args),
}));
vi.mock('@/lib/f1/season', () => ({
    getCalendar: (...args) => homeMocks.getCalendar(...args),
    getLastRace: (...args) => homeMocks.getLastRace(...args),
    getNextRace: (...args) => homeMocks.getNextRace(...args),
}));
vi.mock('@/lib/f1/teams', () => ({ getTeams: (...args) => homeMocks.getTeams(...args) }));
vi.mock('@/lib/f1/standings', () => ({ getDriverStandings: (...args) => homeMocks.getDriverStandings(...args) }));

import { renderToStaticMarkup } from 'react-dom/server';
import Home from '@/app/[lang]/page';

const lastRace = {
    year: 2026,
    round: 21,
    raceName: 'Regression Grand Prix',
    routeKey: '2026-21',
    raceStart: '2026-10-25T20:00:00Z',
    circuit: { id: 'test', name: 'Test Circuit', locality: 'Test', country: 'Test' },
};

function row({ id, lastName, position, positionText, status, grid }) {
    return {
        position,
        positionText,
        status,
        grid,
        driver: { id, firstName: 'Test', lastName, number: 1 },
        team: { id: 'test_team', name: 'Test Team' },
    };
}

async function renderHome() {
    const page = await Home({ params: Promise.resolve({ lang: 'en' }) });
    return renderToStaticMarkup(page);
}

beforeEach(() => {
    homeMocks.getGrid.mockResolvedValue([]);
    homeMocks.getSeasonSummary.mockResolvedValue({ year: 2026, races: [], driverStandings: [], constructorStandings: [] });
    homeMocks.getDriverNumbers.mockResolvedValue({});
    homeMocks.getRaceResults.mockResolvedValue([]);
    homeMocks.getCalendar.mockResolvedValue({ year: 2026, rounds: [] });
    homeMocks.getNextRace.mockResolvedValue(null);
    homeMocks.getLastRace.mockResolvedValue(lastRace);
    homeMocks.getTeams.mockResolvedValue([]);
    homeMocks.getDriverStandings.mockResolvedValue({ round: 0, standings: [] });
});

afterEach(() => vi.clearAllMocks());

describe('home recap', () => {
    it('renders the racing hero and restored paddock destinations without stale claims', async () => {
        const markup = await renderHome();

        expect(markup).toContain('Your F1');
        expect(markup).toContain('Command Center');
        expect(markup).toContain('Explore the Paddock');
        expect(markup).toContain('Live Timing');
        expect(markup).not.toContain('100% Free F1 Data');
        expect(markup).not.toContain('F2/F3');
    });

    it('renders a featured photo card from the optional driver grid', async () => {
        homeMocks.getGrid.mockResolvedValue([{
            driverId: 'hamilton',
            racingNumber: 44,
            code: 'HAM',
            firstName: 'Lewis',
            lastName: 'Hamilton',
            headshot: null,
            team: 'Ferrari',
            teamColour: '#E10600',
            flag: '🇬🇧',
            nationalityCode: 'GBR',
        }]);

        const markup = await renderHome();

        expect(markup).toContain('href="/driver/44"');
        expect(markup).toContain('Lewis');
        expect(markup).toContain('Hamilton');
        expect(markup).toContain('Ferrari');
        expect(markup).toContain('HAM');
    });

    it('counts retired and not-classified rows as DNFs, excluding DSQ, withdrawn, DNS, F and E', async () => {
        homeMocks.getRaceResults.mockResolvedValue([
            row({ id: 'retired', lastName: 'Retired', position: 17, positionText: 'R', status: 'Engine', grid: 25 }),
            row({ id: 'not_classified', lastName: 'Unclassified', position: 18, positionText: 'N', status: 'Not classified', grid: 24 }),
            row({ id: 'disqualified', lastName: 'Disqualified', position: 19, positionText: 'D', status: 'Disqualified', grid: 23 }),
            row({ id: 'withdrawn', lastName: 'Withdrawn', position: 20, positionText: 'W', status: 'Withdrew', grid: 22 }),
            row({ id: 'dns', lastName: 'DidNotStart', position: 21, positionText: 'R', status: 'DNS', grid: 21 }),
            row({ id: 'failed', lastName: 'FailedToQualify', position: 22, positionText: 'F', status: 'Failed to qualify', grid: 20 }),
            row({ id: 'excluded', lastName: 'Excluded', position: 23, positionText: 'E', status: 'Excluded', grid: 19 }),
        ]);

        const markup = await renderHome();

        expect(markup).toMatch(/<dt>DNFs<\/dt><dd><bdi dir="ltr">2<\/bdi><\/dd>/);
    });

    it('chooses the biggest mover from numeric finishers only', async () => {
        homeMocks.getRaceResults.mockResolvedValue([
            row({ id: 'retiree', lastName: 'Retiree', position: 18, positionText: 'R', status: 'Engine', grid: 26 }),
            row({ id: 'finisher', lastName: 'Finisher', position: 8, positionText: '8', status: 'Finished', grid: 12 }),
        ]);

        const markup = await renderHome();
        const facts = markup.slice(markup.indexOf('<dl'), markup.indexOf('</dl>') + 5);

        expect(facts).toContain('Finisher');
        expect(facts).not.toContain('Retiree');
    });

    it.each(['driver numbers', 'race results', 'teams', 'featured drivers'])('renders when optional %s data rejects', async (optionalData) => {
        const failure = new Error(`${optionalData} unavailable`);
        if (optionalData === 'driver numbers') homeMocks.getDriverNumbers.mockRejectedValue(failure);
        if (optionalData === 'race results') homeMocks.getRaceResults.mockRejectedValue(failure);
        if (optionalData === 'teams') homeMocks.getTeams.mockRejectedValue(failure);
        if (optionalData === 'featured drivers') homeMocks.getGrid.mockRejectedValue(failure);

        await expect(renderHome()).resolves.toContain('Regression Grand Prix');
    });
});

describe('home upstream failures', () => {
    it('renders with empty cards when every core season call rejects', async () => {
        const throttled = () => Promise.reject(new Error('jolpica 429'));
        homeMocks.getNextRace.mockImplementation(throttled);
        homeMocks.getLastRace.mockImplementation(throttled);
        homeMocks.getSeasonSummary.mockImplementation(throttled);
        homeMocks.getCalendar.mockImplementation(throttled);
        homeMocks.getDriverStandings.mockImplementation(throttled);

        await expect(renderHome()).resolves.toContain('Next race');
    });

    it('does not crown the leader when the calendar is unavailable', async () => {
        homeMocks.getSeasonSummary.mockResolvedValue({
            year: 2026,
            races: [],
            driverStandings: [
                { position: 1, points: 300, driver: { id: 'lead', firstName: 'Test', lastName: 'Leader' }, team: { id: 'test_team', name: 'Test Team' } },
                { position: 2, points: 100, driver: { id: 'chase', firstName: 'Test', lastName: 'Chaser' }, team: { id: 'test_team', name: 'Test Team' } },
            ],
            constructorStandings: [],
        });
        homeMocks.getCalendar.mockRejectedValue(new Error('jolpica 429'));

        expect(await renderHome()).not.toContain('title-fight-heading');
    });
});

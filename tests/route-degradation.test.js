import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const reviewMocks = vi.hoisted(() => ({
    notFound: vi.fn(),
    permanentRedirect: vi.fn(),
    getCalendar: vi.fn(),
    getEventByMeetingKey: vi.fn(),
    getNextRace: vi.fn(),
    getLastRace: vi.fn(),
    getCachedLiveSnapshot: vi.fn(),
    getTeams: vi.fn(),
    getGrid: vi.fn(),
    getConstructor: vi.fn(),
    getConstructorRecord: vi.fn(),
    getConstructorStandings: vi.fn(),
    getChampions: vi.fn(),
    getSeasonSummary: vi.fn(),
    resolveDriverRoute: vi.fn(),
    getAllTimeDriver: vi.fn(),
    getCareerStats: vi.fn(),
    getDriverQualifyingResults: vi.fn(),
    getDriverResults: vi.fn(),
    getDriverSeasonResults: vi.fn(),
}));

vi.mock('react', async (importOriginal) => {
    const React = await importOriginal();
    return { ...React, cache: (callback) => callback };
});
vi.mock('next/server', () => ({ connection: async () => {} }));
vi.mock('next/navigation', () => ({
    notFound: (...args) => {
        reviewMocks.notFound(...args);
        throw new Error('NOT_FOUND');
    },
    permanentRedirect: (...args) => {
        reviewMocks.permanentRedirect(...args);
        throw new Error(`REDIRECT:${args[0]}`);
    },
}));
vi.mock('next/link', async () => {
    const React = await import('react');
    return { default: ({ href, children, ...props }) => React.createElement('a', { href, ...props }, children) };
});
vi.mock('@/lib/f1/season', () => ({
    getCalendar: (...args) => reviewMocks.getCalendar(...args),
    getEventByMeetingKey: (...args) => reviewMocks.getEventByMeetingKey(...args),
    getNextRace: (...args) => reviewMocks.getNextRace(...args),
    getLastRace: (...args) => reviewMocks.getLastRace(...args),
}));
vi.mock('@/lib/f1/live', () => ({ getCachedLiveSnapshot: (...args) => reviewMocks.getCachedLiveSnapshot(...args) }));
vi.mock('@/lib/f1/teams', () => ({ getTeams: (...args) => reviewMocks.getTeams(...args) }));
vi.mock('@/lib/f1/drivers', () => ({
    getGrid: (...args) => reviewMocks.getGrid(...args),
    nationalityInfo: () => ({ flag: null }),
}));
vi.mock('@/lib/f1/standings', () => ({
    constructorChampionshipYears: () => [],
    currentGridDrivers: (team, grid) => grid,
    getConstructor: (...args) => reviewMocks.getConstructor(...args),
    getConstructorRecord: (...args) => reviewMocks.getConstructorRecord(...args),
    getConstructorStandings: (...args) => reviewMocks.getConstructorStandings(...args),
}));
vi.mock('@/lib/f1/history', () => ({
    getChampions: (...args) => reviewMocks.getChampions(...args),
    getSeasonSummary: (...args) => reviewMocks.getSeasonSummary(...args),
}));
vi.mock('@/lib/f1/compare', () => ({
    careerSummary: () => ({ firstSeason: null, lastSeason: null }),
    FASTEST_LAP_DATA_FROM: 2010,
    fastestLapCoverage: () => 'none',
    getAllTimeDriver: (...args) => reviewMocks.getAllTimeDriver(...args),
    getCareerStats: (...args) => reviewMocks.getCareerStats(...args),
    getDriverQualifyingResults: (...args) => reviewMocks.getDriverQualifyingResults(...args),
    getDriverResults: (...args) => reviewMocks.getDriverResults(...args),
    headToHead: () => ({ aheadA: 0, aheadB: 0 }),
    qualifyingHeadToHead: () => ({ aheadA: 0, aheadB: 0 }),
}));
vi.mock('@/lib/f1/career', () => ({ FULL_POLE_DATA_FROM: 1950, POLE_DATA_FROM: 1950 }));
vi.mock('@/lib/f1/year', () => ({ getSeasonYear: () => 2026 }));
vi.mock('@/app/[lang]/driver/[number]/driver-data', () => ({
    finishLabel: () => '',
    getDriverSeasonResults: (...args) => reviewMocks.getDriverSeasonResults(...args),
    gridFinishDelta: () => null,
    resolveDriverRoute: (...args) => reviewMocks.resolveDriverRoute(...args),
}));
vi.mock('@/app/[lang]/schedule/status', () => ({ requestTime: () => Date.parse('2026-10-28T12:00:00Z') }));

import { Children, isValidElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import DriverPage, { generateMetadata as driverMetadata } from '@/app/[lang]/driver/[number]/page';
import TeamDetailPage from '@/app/[lang]/team/[id]/page';
import LivePage from '@/app/[lang]/live/page';
import TracksPage from '@/app/[lang]/tracks/page';
import { loadEvent } from '@/app/[lang]/race/[key]/event';

const driver = {
    driverId: 'alpha',
    racingNumber: 22,
    code: 'ALP',
    firstName: 'Alex',
    lastName: 'Alpha',
    fullName: 'Alex Alpha',
    nationality: 'Testlandian',
    current: true,
    team: 'Test Team',
    colour: '#123456',
};

function hasSection(node, labelledBy) {
    if (Array.isArray(node)) return node.some((child) => hasSection(child, labelledBy));
    if (!isValidElement(node)) return false;
    return node.props['aria-labelledby'] === labelledBy
        || Children.toArray(node.props.children).some((child) => hasSection(child, labelledBy));
}

beforeEach(() => {
    reviewMocks.notFound.mockClear();
    reviewMocks.permanentRedirect.mockClear();
    reviewMocks.getCalendar.mockResolvedValue({ year: 2026, rounds: [] });
    reviewMocks.getEventByMeetingKey.mockResolvedValue({ kind: 'race', event: { year: 2026, round: 1, raceName: 'Test GP' } });
    reviewMocks.getNextRace.mockResolvedValue(null);
    reviewMocks.getLastRace.mockResolvedValue(null);
    reviewMocks.getCachedLiveSnapshot.mockResolvedValue({ session: null, drivers: [] });
    reviewMocks.getTeams.mockResolvedValue([]);
    reviewMocks.getGrid.mockResolvedValue([]);
    reviewMocks.getConstructor.mockResolvedValue({ constructorId: 'unknown_team', name: 'Unknown Team', nationality: null });
    reviewMocks.getConstructorRecord.mockResolvedValue({ wins: 0, races: 0, seasons: 0 });
    reviewMocks.getConstructorStandings.mockResolvedValue({ standings: [] });
    reviewMocks.getChampions.mockResolvedValue({ drivers: [], constructors: [] });
    reviewMocks.getSeasonSummary.mockResolvedValue({ driverStandings: [] });
    reviewMocks.resolveDriverRoute.mockResolvedValue({ driver, path: '/driver/alpha' });
    reviewMocks.getAllTimeDriver.mockResolvedValue(driver);
    reviewMocks.getCareerStats.mockResolvedValue(null);
    reviewMocks.getDriverQualifyingResults.mockResolvedValue([]);
    reviewMocks.getDriverResults.mockResolvedValue({ results: [] });
    reviewMocks.getDriverSeasonResults.mockResolvedValue([]);
});

afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
});

describe('driver route', () => {
    it('does not redirect an OpenF1-only driver whose canonical driverId path is null', async () => {
        reviewMocks.resolveDriverRoute.mockResolvedValue({
            driver: { ...driver, driverId: null, fullName: 'Reserve Driver', lastName: 'Reserve' },
            path: null,
        });

        const page = await DriverPage({ params: Promise.resolve({ lang: 'en', number: '22' }) });

        expect(reviewMocks.permanentRedirect).not.toHaveBeenCalled();
        expect(page).toBeTruthy();
    });

    it('uses the requested number URL as metadata canonical when the driverId path is null', async () => {
        reviewMocks.resolveDriverRoute.mockResolvedValue({
            driver: { ...driver, driverId: null, fullName: 'Reserve Driver', lastName: 'Reserve' },
            path: null,
        });

        const metadata = await driverMetadata({ params: Promise.resolve({ lang: 'en', number: '22' }) });

        expect(metadata.alternates.canonical).toBe('/driver/22');
    });

    it('hides teammate head-to-head when no races or qualifying sessions are available', async () => {
        reviewMocks.getTeams.mockResolvedValue([{ name: 'Test Team', drivers: [driver, { ...driver, driverId: 'beta', lastName: 'Beta' }] }]);
        reviewMocks.getGrid.mockResolvedValue([driver, { ...driver, driverId: 'beta', lastName: 'Beta' }]);

        const page = await DriverPage({ params: Promise.resolve({ lang: 'en', number: 'alpha' }) });

        expect(hasSection(page, 'teammate-heading')).toBe(false);
    });
});

describe('optional route data', () => {
    it('keeps a team page available when current grid enrichment rejects', async () => {
        reviewMocks.getTeams.mockRejectedValue(new Error('teams 429'));
        reviewMocks.getGrid.mockRejectedValue(new Error('grid 429'));

        await expect(TeamDetailPage({ params: Promise.resolve({ lang: 'en', id: 'unknown_team' }) })).resolves.toBeTruthy();
    });

    it('keeps live timing available when race labels reject', async () => {
        reviewMocks.getNextRace.mockRejectedValue(new Error('calendar 429'));
        reviewMocks.getLastRace.mockRejectedValue(new Error('calendar 429'));

        await expect(LivePage({ params: Promise.resolve({ lang: 'en' }) })).resolves.toBeTruthy();
    });

    it('does not link a calendar circuit without a circuit view', async () => {
        reviewMocks.getCalendar.mockResolvedValue({
            year: 2026,
            rounds: [
                { round: 1, circuit: { id: 'albert_park', name: 'Albert Park', locality: 'Melbourne', country: 'Australia' } },
                { round: 2, circuit: { id: 'future_circuit', name: 'Future Circuit', locality: 'Somewhere', country: 'Testland' } },
            ],
        });

        const page = await TracksPage({ params: Promise.resolve({ lang: 'en' }) });
        const markup = renderToStaticMarkup(page);

        expect(markup).not.toContain('/tracks/future_circuit');
    });
});

describe('race route year bounds', () => {
    it('rejects years before 1950 before resolving an upstream meeting or race', async () => {
        await expect(loadEvent('1949-1')).rejects.toThrow('NOT_FOUND');
        expect(reviewMocks.getEventByMeetingKey).not.toHaveBeenCalled();
    });

    it('rejects years more than one season ahead', async () => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-10-28T12:00:00Z'));

        await expect(loadEvent('2028-1')).rejects.toThrow('NOT_FOUND');
        expect(reviewMocks.getEventByMeetingKey).not.toHaveBeenCalled();
    });
});

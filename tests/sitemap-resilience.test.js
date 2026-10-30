import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    getCalendar: vi.fn(),
    getGrid: vi.fn(),
    getTeams: vi.fn(),
}));

vi.mock('next/server', () => ({ connection: async () => {} }));
vi.mock('@/lib/f1/season', () => ({ getCalendar: mocks.getCalendar }));
vi.mock('@/lib/f1/drivers', () => ({ getGrid: mocks.getGrid }));
vi.mock('@/lib/f1/teams', () => ({ getTeams: mocks.getTeams }));

import sitemap from '@/app/sitemap';
import robots from '@/app/robots';

const completeData = {
    calendar: {
        year: 2026,
        rounds: [{
            year: 2026,
            round: 18,
            routeKey: '2026-18',
            meetingKey: 1818,
            raceStart: '2026-10-25T19:00:00Z',
            status: 'completed',
            circuit: { id: 'americas' },
        }],
    },
    grid: [{ racingNumber: 44 }],
    teams: [{ constructorId: 'ferrari' }],
};

describe('sitemap upstream failure behavior', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.getCalendar.mockResolvedValue(completeData.calendar);
        mocks.getGrid.mockResolvedValue(completeData.grid);
        mocks.getTeams.mockResolvedValue(completeData.teams);
    });

    it('uses a previous complete sitemap when refresh data fails', async () => {
        const complete = await sitemap();
        expect(complete.some((entry) => entry.url.includes('/race/'))).toBe(true);

        mocks.getCalendar.mockRejectedValue(new Error('fixture upstream failure'));
        const fallback = await sitemap();

        expect(fallback.map((entry) => entry.url)).toEqual(complete.map((entry) => entry.url));
    });

    it('returns one English URL per page and no legacy URLs or language alternates', async () => {
        const entries = await sitemap();
        expect(entries.length).toBeGreaterThan(0);
        expect(entries.every(({ url }) => !new URL(url).pathname.startsWith('/ar'))).toBe(true);
        expect(entries.every((entry) => !entry.alternates)).toBe(true);
        expect(JSON.stringify(robots())).not.toContain('/ar');
    });
});

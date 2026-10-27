import { describe, expect, it } from 'vitest';
import { latestList } from '@/lib/f1/history';
import { eventStatus } from '@/lib/f1/season';

describe('latestList', () => {
    it('merges standings pages for the latest round', () => {
        const lists = [
            { round: '7', DriverStandings: [{ position: '1' }] },
            { round: '8', DriverStandings: Array.from({ length: 100 }, (_, i) => ({ position: String(i + 1) })) },
            { round: '8', DriverStandings: [{ position: '101' }, { position: '102' }, { position: '103' }] },
        ];
        const merged = latestList(lists);
        expect(merged.round).toBe('8');
        expect(merged.DriverStandings).toHaveLength(103);
    });

    it('returns null for no lists', () => {
        expect(latestList([])).toBeNull();
    });
});

describe('eventStatus for races without a start time', () => {
    it('completes after race day when only the date is known', () => {
        const event = { raceStart: null, raceDate: '1952-08-03', sessions: {} };
        expect(eventStatus(event, Date.parse('1952-08-03T12:00:00Z'))).toBe('upcoming');
        expect(eventStatus(event, Date.parse('1952-08-04T00:00:01Z'))).toBe('completed');
    });
});

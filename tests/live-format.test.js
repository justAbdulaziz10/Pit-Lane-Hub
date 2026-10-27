import { describe, expect, it } from 'vitest';
import { formatGap, formatLapTime, pollInterval, sessionPhase } from '@/lib/f1/live-format';

describe('live formatting', () => {
    it('formats lap times', () => {
        expect(formatLapTime(78.5)).toBe('1:18.500');
        expect(formatLapTime(59.0123)).toBe('59.012');
        expect(formatLapTime(100.566)).toBe('1:40.566');
        expect(formatLapTime(null)).toBe('—');
        expect(formatLapTime(0)).toBe('—');
    });

    it('formats numeric and lapped gaps', () => {
        expect(formatGap(13.078)).toBe('+13.078');
        expect(formatGap('+1 LAP')).toBe('+1 LAP');
        expect(formatGap(null)).toBe('—');
        expect(formatGap(0, { leader: true })).toBe('Leader');
    });

    it('polls fast only while live', () => {
        expect(pollInterval({ isLive: true })).toBe(5000);
        expect(pollInterval({ isLive: false })).toBe(60000);
    });

    it('derives the session phase', () => {
        const session = { start: '2026-11-01T20:00:00Z' };
        expect(sessionPhase(null, false)).toBe('none');
        expect(sessionPhase(session, true)).toBe('live');
        expect(sessionPhase(session, false, Date.parse('2026-10-30T00:00:00Z'))).toBe('upcoming');
        expect(sessionPhase(session, false, Date.parse('2026-11-02T00:00:00Z'))).toBe('finished');
    });
});

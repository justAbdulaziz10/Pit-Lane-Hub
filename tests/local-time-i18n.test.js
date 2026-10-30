import { describe, expect, it } from 'vitest';
import { statusLabel } from '@/app/[lang]/schedule/status';
import { countdownAnnouncement, countdownUnitLabel, formatInstant } from '@/components/localTimeFormat';
import { sessionLabel } from '@/lib/i18n/messages/time';

describe('English time and session labels', () => {
    it('keeps UTC date and time formatting stable', () => {
        expect(formatInstant('2026-11-01T20:00:00Z', 'datetime')).toBe('Sun 1 Nov, 20:00 UTC');
        expect(formatInstant('2026-11-01T20:00:00Z', 'date')).toBe('1 Nov 2026');
    });

    it('uses English plural forms in countdown announcements', () => {
        expect(countdownUnitLabel('en', 'day', 3)).toBe('days');
        expect(countdownAnnouncement('en', { days: 2, hours: 3, minutes: 4 })).toBe('2 days, 3 hours, 4 minutes to go');
    });

    it('keeps English F1 session and weekend status labels, preserving unknown names', () => {
        expect(sessionLabel('Race', 'en')).toBe('Race');
        expect(sessionLabel('Unknown session', 'en')).toBe('Unknown session');
        expect(statusLabel('completed', 'en')).toBe('Completed');
        expect(statusLabel('upcoming', 'en')).toBe('Upcoming');
    });
});

import { describe, expect, it } from 'vitest';
import { statusLabel } from '@/app/[lang]/schedule/status';
import { countdownAnnouncement, countdownUnitLabel, formatInstant } from '@/components/localTimeFormat';
import { sessionLabel } from '@/lib/i18n/messages/time';

describe('localized time and session labels', () => {
    it('keeps English UTC formatting stable and formats Arabic dates with Western digits', () => {
        expect(formatInstant('2026-11-01T20:00:00Z', 'datetime')).toBe('Sun 1 Nov, 20:00 UTC');
        const arabic = formatInstant('2026-11-01T20:00:00Z', 'date', { locale: 'ar' });
        expect(arabic).toContain('1');
        expect(arabic).toContain('2026');
        expect(arabic).toContain('نوفمبر');
        expect(formatInstant('2026-11-01T20:00:00Z', 'datetime', { locale: 'ar' })).toContain('UTC');
    });

    it('keeps the local time zone offset readable inside Arabic text', () => {
        const arabic = formatInstant('2026-11-01T20:00:00Z', 'datetime', { local: true, locale: 'ar' });
        expect(arabic).toMatch(/\u2066[^\u2069]+\u2069/);
        expect(formatInstant('2026-11-01T20:00:00Z', 'datetime', { local: true })).not.toContain('\u2066');
    });

    it('uses Arabic plural forms in countdown announcements', () => {
        expect(countdownUnitLabel('ar', 'day', 3)).toBe('أيام');
        expect(countdownAnnouncement('ar', { days: 2, hours: 3, minutes: 4 })).toBe('يومان، 3 ساعات، 4 دقائق متبقية');
        expect(countdownAnnouncement('en', { days: 2, hours: 3, minutes: 4 })).toBe('2 days, 3 hours, 4 minutes to go');
    });

    it('translates F1 session and weekend status labels, preserving unknown session names', () => {
        expect(sessionLabel('Practice 1', 'ar')).toBe('التجارب الحرة 1');
        expect(sessionLabel('sprintQualifying', 'ar')).toBe('تصفيات السباق السريع');
        expect(sessionLabel('Race', 'ar')).toBe('السباق');
        expect(sessionLabel('Race', 'en')).toBe('Race');
        expect(sessionLabel('Unknown session', 'ar')).toBe('Unknown session');
        expect(statusLabel('completed', 'ar')).toBe('مكتمل');
        expect(statusLabel('upcoming', 'en')).toBe('Upcoming');
    });
});

import { describe, expect, it } from 'vitest';
import { getCurrentYear, getTeamColor } from '@/lib/f1/constants';

describe('getTeamColor', () => {
    it('matches teams by partial, case-insensitive name', () => {
        expect(getTeamColor('Red Bull Racing')).toBe('#3671C6');
        expect(getTeamColor('scuderia ferrari')).toBe('#E8002D');
        expect(getTeamColor('McLaren F1 Team')).toBe('#FF8000');
    });

    it('falls back to white for unknown teams', () => {
        expect(getTeamColor('Unknown Team')).toBe('#FFFFFF');
        expect(getTeamColor(undefined)).toBe('#FFFFFF');
    });
});

describe('getCurrentYear', () => {
    it('returns the real current year', () => {
        expect(getCurrentYear()).toBe(new Date().getFullYear());
    });
});

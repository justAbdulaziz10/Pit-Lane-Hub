import { describe, expect, it } from 'vitest';
import { getCompound, stintsByDriver } from '@/lib/f1/tyres';

describe('getCompound', () => {
    it('maps known compounds case-insensitively', () => {
        expect(getCompound('SOFT').short).toBe('S');
        expect(getCompound('medium').label).toBe('Medium');
        expect(getCompound('Hard').color).toBe('#F0F0F0');
    });

    it('falls back to unknown', () => {
        expect(getCompound('').short).toBe('?');
        expect(getCompound('rocket').label).toBe('Unknown');
    });
});

describe('stintsByDriver', () => {
    it('groups, sorts by stint number, and computes lap counts', () => {
        const stints = [
            { driver_number: 1, stint_number: 2, lap_start: 21, lap_end: 50, compound: 'HARD' },
            { driver_number: 1, stint_number: 1, lap_start: 1, lap_end: 20, compound: 'MEDIUM' },
            { driver_number: 4, stint_number: 1, lap_start: 1, lap_end: 30, compound: 'SOFT' },
        ];
        const grouped = stintsByDriver(stints);
        expect(grouped.get(1).map((s) => s.stint_number)).toEqual([1, 2]);
        expect(grouped.get(1)[0].laps).toBe(20);
        expect(grouped.get(1)[1].laps).toBe(30);
        expect(grouped.get(4)[0].laps).toBe(30);
    });

    it('handles empty/invalid input', () => {
        expect(stintsByDriver().size).toBe(0);
        expect(stintsByDriver([{ stint_number: 1 }]).size).toBe(0);
    });
});

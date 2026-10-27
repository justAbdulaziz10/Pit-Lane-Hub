import { describe, expect, it } from 'vitest';
import { circuitOutline, formatCircuitLength } from '@/lib/f1/circuit-svg';

describe('circuitOutline', () => {
    it('projects coordinates into a padded 1000x1000 path, north up', () => {
        const outline = circuitOutline([[10, 50], [10.01, 50], [10.01, 50.01], [10, 50.01]]);
        expect(outline.viewBox).toBe('0 0 1000 1000');
        expect(outline.d.startsWith('M')).toBe(true);
        expect(outline.d.split('L')).toHaveLength(4);
        const coords = outline.d.replace(/[ML]/g, ' ').trim().split(/\s+/).map(Number);
        for (const value of coords) {
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThanOrEqual(1000);
        }
        // Higher latitude is drawn higher (smaller y).
        const [, firstY] = outline.start;
        expect(coords[7]).toBeLessThan(firstY);
        expect(outline.center.lat).toBeCloseTo(50.005, 6);
        expect(outline.center.lng).toBeCloseTo(10.005, 6);
    });

    it('rejects empty or invalid geometry', () => {
        expect(circuitOutline([])).toBeNull();
        expect(circuitOutline([[Number.NaN, 1]])).toBeNull();
        expect(circuitOutline(null)).toBeNull();
    });

    it('formats metres as kilometres', () => {
        expect(formatCircuitLength(5891)).toBe('5.891 km');
        expect(formatCircuitLength(null)).toBeNull();
    });
});

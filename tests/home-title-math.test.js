import { describe, expect, it } from 'vitest';
import { calculateTitleMath } from '@/app/[lang]/_home/title-math';

const standings = [
    { position: 1, points: 300, driver: { id: 'leader' } },
    { position: 2, points: 170, driver: { id: 'second' } },
    { position: 3, points: 120, driver: { id: 'third' } },
];

describe('home title maths', () => {
    it('calculates the P2 and P3 gaps and remaining race and sprint points', () => {
        const result = calculateTitleMath({ standings, remainingRaces: 2, remainingSprints: 1 });

        expect(result).toMatchObject({
            gapToSecond: 130,
            gapToThird: 180,
            pointsRemaining: 58,
            mathematicallyDecided: true,
        });
    });

    it('leaves the title open when the leader gap equals all remaining points', () => {
        const result = calculateTitleMath({
            standings: [{ position: 1, points: 100 }, { position: 2, points: 42 }],
            remainingRaces: 2,
            remainingSprints: 1,
        });

        expect(result.pointsRemaining).toBe(58);
        expect(result.gapToSecond).toBe(58);
        expect(result.mathematicallyDecided).toBe(false);
    });

    it('handles a season with no remaining races or sprints', () => {
        const result = calculateTitleMath({
            standings: [{ position: 1, points: 101 }, { position: 2, points: 100 }],
            remainingRaces: 0,
            remainingSprints: 0,
        });

        expect(result.pointsRemaining).toBe(0);
        expect(result.mathematicallyDecided).toBe(true);
    });

    it('does not count sprint points on a non-sprint weekend', () => {
        expect(calculateTitleMath({ standings, remainingRaces: 1, remainingSprints: 0 }).pointsRemaining).toBe(25);
        expect(calculateTitleMath({ standings, remainingRaces: 1, remainingSprints: 1 }).pointsRemaining).toBe(33);
    });
});

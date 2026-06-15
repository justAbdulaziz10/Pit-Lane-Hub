import { describe, expect, it } from 'vitest';
import { toggleValue } from '@/lib/useFavorites';

describe('toggleValue', () => {
    it('adds a value when absent', () => {
        expect(toggleValue([1, 4], 16)).toEqual([1, 4, 16]);
    });

    it('removes a value when present', () => {
        expect(toggleValue([1, 4, 16], 4)).toEqual([1, 16]);
    });

    it('does not mutate the input', () => {
        const input = [1, 2];
        toggleValue(input, 3);
        expect(input).toEqual([1, 2]);
    });
});

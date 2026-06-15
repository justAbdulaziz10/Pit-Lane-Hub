import { describe, expect, it } from 'vitest';
import { getHighQualityPhoto } from '@/lib/photos';

describe('getHighQualityPhoto', () => {
    it('upgrades small/1col URLs to large/2col', () => {
        const input = 'https://media.formula1.com/d_driver/1col/image_small.png';
        expect(getHighQualityPhoto(input)).toBe(
            'https://media.formula1.com/d_driver/2col/image_large.png'
        );
    });

    it('returns null for empty input', () => {
        expect(getHighQualityPhoto(null)).toBeNull();
        expect(getHighQualityPhoto(undefined)).toBeNull();
        expect(getHighQualityPhoto('')).toBeNull();
    });
});

import { describe, expect, it } from 'vitest';
import { circuitLength } from '@/app/[lang]/tracks/length';

describe('circuitLength', () => {
    it('formats the English unit and keeps three decimals', () => {
        expect(circuitLength('5.419 km', 'en')).toBe('5.419 km');
    });

    it('passes unknown formats through', () => {
        expect(circuitLength(null, 'en')).toBeNull();
    });
});

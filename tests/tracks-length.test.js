import { describe, expect, it } from 'vitest';
import { circuitLength } from '@/app/[lang]/tracks/length';

describe('circuitLength', () => {
    it('localizes the unit and keeps three decimals with Western digits', () => {
        expect(circuitLength('5.419 km', 'en')).toBe('5.419 km');
        expect(circuitLength('5.419 km', 'ar')).toBe('5.419 كم');
    });

    it('passes unknown formats through', () => {
        expect(circuitLength(null, 'ar')).toBeNull();
    });
});

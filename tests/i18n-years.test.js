import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { formatNumber } from '@/lib/i18n/format';

// CompareContent contains JSX, which Vitest's current config does not transform.
// Extract and call the helper itself so the test stays pure and network-free.
const componentSource = readFileSync(new URL('../src/components/CompareContent.js', import.meta.url), 'utf8');
const spanSource = componentSource.match(/^export function span\(driver, locale\) \{[\s\S]*?^\}/m)?.[0]?.replace(/^export /, '');
if (!spanSource) throw new Error('Could not find CompareContent span helper');
const span = new Function('formatNumber', `${spanSource}; return span;`)(formatNumber);

describe('year formatting', () => {
    it('supports disabling grouping for years', () => {
        expect(formatNumber('en', 2007, { useGrouping: false })).toBe('2007');
    });

    it('renders career season spans with ungrouped English years', () => {
        const driver = { firstSeason: 2007, lastSeason: 2026 };
        expect(span(driver, 'en')).toBe('2007–2026');
    });
});

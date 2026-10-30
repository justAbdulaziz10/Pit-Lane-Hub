import { describe, expect, it } from 'vitest';
import { DEFAULT_LOCALE, LOCALES, localeAlternates, localePath, splitLocale } from '@/lib/i18n/config';
import { formatDate, formatNumber, intlLocale } from '@/lib/i18n/format';
import { resolveLocaleRoute } from '@/lib/i18n/routing';
import { proxy } from '@/proxy';

describe('English-only locale paths', () => {
    it('keeps English URLs unprefixed and preserves query strings and hashes', () => {
        expect(LOCALES).toEqual(['en']);
        expect(DEFAULT_LOCALE).toBe('en');
        expect(localePath('en', '/driver/1')).toBe('/driver/1');
        expect(localePath('en', '/history?year=1976#top')).toBe('/history?year=1976#top');
    });

    it('keeps the English internal segment and unknown-prefix behavior', () => {
        expect(splitLocale('/en/teams')).toEqual({ locale: 'en', path: '/teams', prefixed: true });
        expect(splitLocale('/fr/teams')).toEqual({ locale: 'en', path: '/fr/teams', prefixed: false });
        expect(splitLocale('/racing-thing')).toEqual({ locale: 'en', path: '/racing-thing', prefixed: false });
    });

    it('emits only the canonical English URL', () => {
        expect(localeAlternates('en', '/teams')).toEqual({ canonical: '/teams' });
    });
});

describe('English formatting', () => {
    it('uses en-GB for dates and numbers', () => {
        expect(intlLocale()).toBe('en-GB');
        expect(formatNumber('en', 1234.5)).toBe('1,234.5');
        expect(formatDate('en', '2026-10-25T19:00:00Z', {
            day: 'numeric', month: 'long', timeZone: 'UTC',
        })).toBe('25 October');
    });
});

describe('proxy locale routing', () => {
    const requestFor = (path, userAgent = '') => {
        const url = new URL(path, 'https://pitlane.test');
        return { nextUrl: url, url: url.toString(), headers: new Headers({ 'user-agent': userAgent }) };
    };

    it('rewrites English internally and removes the internal /en prefix', () => {
        expect(resolveLocaleRoute({ pathname: '/' })).toEqual({ action: 'rewrite', url: '/en', locale: 'en' });
        expect(resolveLocaleRoute({ pathname: '/history', search: '?year=1976' })).toEqual({
            action: 'rewrite', url: '/en/history?year=1976', locale: 'en',
        });
        expect(resolveLocaleRoute({ pathname: '/en/teams', search: '?x=1' })).toEqual({
            action: 'redirect', url: '/teams?x=1',
        });
        expect(resolveLocaleRoute({ pathname: '/en' })).toEqual({ action: 'redirect', url: '/' });
    });

    it('permanently redirects the legacy prefix for pages and bots, preserving the query', () => {
        expect(resolveLocaleRoute({ pathname: '/ar' })).toEqual({ action: 'redirect', url: '/' });
        expect(resolveLocaleRoute({
            pathname: '/ar/drivers',
            search: '?x=1',
            userAgent: 'Googlebot/2.1',
        })).toEqual({ action: 'redirect', url: '/drivers?x=1' });

        const rootResponse = proxy(requestFor('/ar'));
        expect(rootResponse.status).toBe(308);
        expect(rootResponse.headers.get('location')).toBe('https://pitlane.test/');

        const botResponse = proxy(requestFor('/ar/drivers?x=1', 'Googlebot/2.1'));
        expect(botResponse.status).toBe(308);
        expect(botResponse.headers.get('location')).toBe('https://pitlane.test/drivers?x=1');
    });

    it('keeps the existing behavior for unknown two-letter prefixes', () => {
        expect(resolveLocaleRoute({ pathname: '/fr/teams' })).toEqual({
            action: 'rewrite', url: '/en/fr/teams', locale: 'en',
        });
    });
});

describe('metadata image routes', () => {
    it('serves generated images under the internal segment without redirecting', () => {
        expect(resolveLocaleRoute({ pathname: '/en/opengraph-image' }).action).toBe('next');
        expect(resolveLocaleRoute({ pathname: '/en/driver/1/opengraph-image-1a2b3c' }).action).toBe('next');
        expect(resolveLocaleRoute({ pathname: '/en/driver/1' }).action).toBe('redirect');
    });
});

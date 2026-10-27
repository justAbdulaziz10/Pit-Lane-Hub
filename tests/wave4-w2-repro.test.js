import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const scheduleSource = read('src/app/[lang]/schedule/CalendarRounds.js');
const schedulePageSource = read('src/app/[lang]/schedule/page.js');
const raceSource = read('src/app/[lang]/race/[key]/page.js');
const raceResolverSource = read('src/app/[lang]/race/[key]/event.js');
const raceImageSource = read('src/app/[lang]/race/[key]/opengraph-image.js');
const circuitListSource = read('src/app/[lang]/tracks/page.js');
const circuitPageSource = read('src/app/[lang]/tracks/[circuitId]/page.js');
const sitemapSource = read('src/app/sitemap.js');
const scheduleCss = read('src/app/[lang]/schedule/page.module.css');
const globalCss = read('src/app/[lang]/globals.css');

function rule(css, selector) {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`))?.[1] || '';
}

function color(css, value) {
    const token = value.match(/^var\((--[\w-]+)\)$/)?.[1];
    const resolved = token
        ? globalCss.match(new RegExp(`${token}\\s*:\\s*([^;]+)`))?.[1].trim()
        : value;
    if (!resolved) throw new Error(`Unresolved CSS color: ${value}`);
    const hex = resolved.match(/^#([\da-f]{6})$/i);
    if (hex) return [0, 2, 4].map((offset) => Number.parseInt(hex[1].slice(offset, offset + 2), 16) / 255);
    const rgba = resolved.match(/^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/i);
    if (rgba) return [Number(rgba[1]) / 255, Number(rgba[2]) / 255, Number(rgba[3]) / 255, Number(rgba[4])];
    throw new Error(`Unsupported CSS color: ${resolved}`);
}

function composite(foreground, background) {
    if (foreground.length < 4) return foreground;
    return foreground.slice(0, 3).map((channel, index) => (
        channel * foreground[3] + background[index] * (1 - foreground[3])
    ));
}

function contrast(a, b) {
    const luminance = (channels) => {
        const linear = channels.map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
        return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
    };
    const first = luminance(a);
    const second = luminance(b);
    return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

describe('Wave 4 W2 bug reproductions', () => {
    it('builds race links from the stable routeKey', () => {
        expect(scheduleSource.includes('`/race/${event.routeKey}`'), 'schedule uses routeKey').toBe(true);
        expect(circuitPageSource.includes('event.routeKey'), 'circuit page uses routeKey').toBe(true);
        expect(sitemapSource.includes('event.routeKey'), 'sitemap uses routeKey').toBe(true);
        expect(!scheduleSource.includes('`/race/${event.meetingKey}`'), 'schedule avoids meetingKey URLs').toBe(true);
    });

    it('accepts both stable route keys and legacy numeric meeting keys', () => {
        expect(raceResolverSource.includes('^\\d{4}-\\d{1,2}$'), 'resolver accepts year-round keys').toBe(true);
        expect(raceResolverSource.includes('^\\d{1,7}$'), 'resolver retains numeric meeting keys').toBe(true);
        expect(raceResolverSource.includes('getEventByMeetingKey(value)'), 'resolver retains numeric lookup').toBe(true);
    });

    it('keeps owned content links locale-aware', () => {
        const sources = [
            scheduleSource,
            raceSource,
            read('src/app/[lang]/race/[key]/RaceMap.js'),
            read('src/app/[lang]/race/[key]/ResultTables.js'),
            circuitListSource,
            circuitPageSource,
        ];
        for (const source of sources) {
            for (const match of source.matchAll(/<Link\b[^>]*?\bhref=\{([^}]+)\}/gs)) {
                expect(match[1], `unlocalized Link href: ${match[1]}`).toContain('localePath(');
            }
            for (const match of source.matchAll(/\bhref="(\/[^\"]*)"/g)) {
                expect(match[1], `unlocalized internal anchor href: ${match[1]}`).toBe('/calendar.ics');
            }
        }
    });

    it('provides canonical locale alternates and an Open Graph image on every owned route', () => {
        const routes = [
            ['schedule', schedulePageSource],
            ['race', raceSource],
            ['tracks index', read('src/app/[lang]/tracks/layout.js')],
            ['circuit detail', circuitPageSource],
        ];
        for (const [name, source] of routes) {
            expect(source.includes('localeAlternates'), `${name} alternates`).toBe(true);
            expect(source.includes('localePath('), `${name} canonical URL`).toBe(true);
            expect(source.includes('canonical = `${SITE_URL}${localePath(lang, path)}`'), `${name} canonical is locale absolute`).toBe(true);
            expect(source.includes('url: canonical'), `${name} Open Graph URL matches canonical`).toBe(true);
            expect(source.includes('images:'), `${name} Open Graph image`).toBe(true);
        }
    });

    it('keeps round and status text at 4.5:1 against their rendered backgrounds', () => {
        const surface = color(globalCss, 'var(--surface-1)');
        const roundColor = color(scheduleCss, rule(scheduleCss, '.round').match(/color:\s*([^;]+)/)?.[1].trim());
        expect(contrast(roundColor, surface)).toBeGreaterThanOrEqual(4.5);

        const baseStatus = rule(scheduleCss, '.status');
        const baseText = color(scheduleCss, baseStatus.match(/color:\s*([^;]+)/)?.[1].trim());
        const baseBackground = composite(color(scheduleCss, baseStatus.match(/background:\s*([^;]+)/)?.[1].trim()), surface);
        expect(contrast(baseText, baseBackground)).toBeGreaterThanOrEqual(4.5);

        const variants = [
            ['.status_live', surface],
            ['.status_weekend', surface],
            ['.status_upcoming', surface],
            ['.status_cancelled', surface],
        ];
        for (const [selector, base] of variants) {
            const declarations = rule(scheduleCss, selector);
            const foreground = color(scheduleCss, declarations.match(/color:\s*([^;]+)/)?.[1].trim() || baseStatus.match(/color:\s*([^;]+)/)?.[1].trim());
            const rawBackground = declarations.match(/background:\s*([^;]+)/)?.[1].trim();
            const background = rawBackground && rawBackground !== 'transparent'
                ? composite(color(scheduleCss, rawBackground), base)
                : base;
            expect(contrast(foreground, background), selector).toBeGreaterThanOrEqual(4.5);
        }
    });

    it('caches the race share image for an hour and 404s unknown keys', () => {
        expect(raceImageSource.includes('export const revalidate = 3600'), 'image revalidate is one hour').toBe(true);
        expect(raceImageSource.includes('notFound()'), 'unknown image keys 404').toBe(true);
    });
});

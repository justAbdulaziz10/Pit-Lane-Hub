import { describe, expect, it } from 'vitest';
import { localeAlternates, localeDir, localePath, splitLocale } from '@/lib/i18n/config';
import { countryName, nationalityName, raceName } from '@/lib/i18n/f1-names';
import ALL_TIME_DRIVERS from '@/lib/f1/data/drivers-all-time.json';

// Every race name in Jolpica's archive (1950–2026) and every circuit country.
const RACE_NAMES = ['70th Anniversary Grand Prix', 'Abu Dhabi Grand Prix', 'Argentine Grand Prix', 'Australian Grand Prix', 'Austrian Grand Prix', 'Azerbaijan Grand Prix', 'Bahrain Grand Prix', 'Bahrain Grand Prix in Malaysia', 'Barcelona Grand Prix', 'Belgian Grand Prix', 'Brazilian Grand Prix', 'British Grand Prix', 'Caesars Palace Grand Prix', 'Canadian Grand Prix', 'Chinese Grand Prix', 'Dallas Grand Prix', 'Detroit Grand Prix', 'Dutch Grand Prix', 'Eifel Grand Prix', 'Emilia Romagna Grand Prix', 'European Grand Prix', 'French Grand Prix', 'German Grand Prix', 'Hungarian Grand Prix', 'Indian Grand Prix', 'Indianapolis 500', 'Italian Grand Prix', 'Japanese Grand Prix', 'Korean Grand Prix', 'Las Vegas Grand Prix', 'Luxembourg Grand Prix', 'Malaysian Grand Prix', 'Mexican Grand Prix', 'Mexico City Grand Prix', 'Miami Grand Prix', 'Monaco Grand Prix', 'Moroccan Grand Prix', 'Pacific Grand Prix', 'Pescara Grand Prix', 'Portuguese Grand Prix', 'Qatar Grand Prix', 'Russian Grand Prix', 'Sakhir Grand Prix', 'San Marino Grand Prix', 'Saudi Arabian Grand Prix', 'Singapore Grand Prix', 'South African Grand Prix', 'Spanish Grand Prix', 'Styrian Grand Prix', 'Swedish Grand Prix', 'Swiss Grand Prix', 'São Paulo Grand Prix', 'Turkish Grand Prix', 'Tuscan Grand Prix', 'United States Grand Prix', 'United States Grand Prix West'];
const COUNTRIES = ['Argentina', 'Australia', 'Austria', 'Azerbaijan', 'Bahrain', 'Belgium', 'Brazil', 'Canada', 'China', 'France', 'Germany', 'Hungary', 'India', 'Italy', 'Japan', 'Korea', 'Malaysia', 'Mexico', 'Monaco', 'Morocco', 'Netherlands', 'Portugal', 'Qatar', 'Russia', 'Saudi Arabia', 'Singapore', 'South Africa', 'Spain', 'Sweden', 'Switzerland', 'Turkey', 'UAE', 'UK', 'USA', 'United Kingdom', 'United States', 'United Arab Emirates'];
const ARABIC = /[؀-ۿ]/;

describe('locale paths', () => {
    it('keeps English URLs unprefixed and puts Arabic under /ar', () => {
        expect(localePath('en', '/driver/1')).toBe('/driver/1');
        expect(localePath('ar', '/driver/1')).toBe('/ar/driver/1');
        expect(localePath('ar', '/')).toBe('/ar');
        expect(localePath('ar', '/history?year=1976#top')).toBe('/ar/history?year=1976#top');
        expect(localePath('xx', 'teams')).toBe('/teams');
    });

    it('splits a public pathname into locale and app path', () => {
        expect(splitLocale('/ar/standings')).toEqual({ locale: 'ar', path: '/standings', prefixed: true });
        expect(splitLocale('/ar')).toEqual({ locale: 'ar', path: '/', prefixed: true });
        expect(splitLocale('/en/teams')).toEqual({ locale: 'en', path: '/teams', prefixed: true });
        expect(splitLocale('/arabic-thing')).toEqual({ locale: 'en', path: '/arabic-thing', prefixed: false });
        expect(splitLocale('/fr/teams')).toMatchObject({ locale: 'en', prefixed: false });
    });

    it('builds hreflang alternates and text direction', () => {
        expect(localeAlternates('ar', '/teams')).toEqual({
            canonical: '/ar/teams',
            languages: { en: '/teams', ar: '/ar/teams', 'x-default': '/teams' },
        });
        expect(localeDir('ar')).toBe('rtl');
        expect(localeDir('en')).toBe('ltr');
    });
});

describe('Arabic F1 names', () => {
    it('translates every Grand Prix in the archive', () => {
        for (const name of RACE_NAMES) expect(raceName(name, 'ar'), name).toMatch(ARABIC);
        expect(raceName('Bahrain Grand Prix', 'ar')).toBe('جائزة البحرين الكبرى');
        expect(raceName('Bahrain Grand Prix', 'en')).toBe('Bahrain Grand Prix');
        expect(raceName('Moon Grand Prix', 'ar')).toBe('Moon Grand Prix');
    });

    it('translates every circuit country and driver nationality', () => {
        for (const country of COUNTRIES) expect(countryName(country, 'ar'), country).toMatch(ARABIC);
        const nationalities = new Set(ALL_TIME_DRIVERS.map((driver) => driver.nationality).filter(Boolean));
        for (const nationality of nationalities) expect(nationalityName(nationality, 'ar'), nationality).toMatch(ARABIC);
        expect(nationalityName('British', 'en')).toBe('British');
    });
});

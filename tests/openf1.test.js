import { afterEach, describe, expect, it, vi } from 'vitest';
import { getDrivers, getWeather, latestPositions } from '@/lib/f1/openf1';

function mockFetchOnce(payload, ok = true) {
    vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok, json: async () => payload })
    );
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('getDrivers', () => {
    it('injects a fallback nationality when missing', async () => {
        mockFetchOnce([
            { driver_number: 1, first_name: 'Max', country_code: null },
            { driver_number: 4, first_name: 'Lando', country_code: 'GBR' },
        ]);
        const drivers = await getDrivers();
        expect(drivers[0].country_code).toBe('NED'); // from DRIVER_NATIONALITIES
        expect(drivers[1].country_code).toBe('GBR'); // preserved
    });

    it('returns an empty array on fetch failure', async () => {
        mockFetchOnce(null, false);
        expect(await getDrivers()).toEqual([]);
    });
});

describe('latestPositions', () => {
    it('keeps the last position per driver from a time-series', () => {
        const series = [
            { driver_number: 1, position: 3, date: 't1' },
            { driver_number: 4, position: 2, date: 't1' },
            { driver_number: 1, position: 1, date: 't2' }, // 1 moved up to P1
        ];
        const latest = latestPositions(series);
        expect(latest.get(1)).toBe(1);
        expect(latest.get(4)).toBe(2);
        expect(latest.size).toBe(2);
    });

    it('ignores rows missing driver_number or position, and handles empty input', () => {
        expect(latestPositions([]).size).toBe(0);
        expect(latestPositions().size).toBe(0);
        const latest = latestPositions([{ position: 1 }, { driver_number: 5 }]);
        expect(latest.size).toBe(0);
    });
});

describe('getWeather', () => {
    it('returns the most recent reading', async () => {
        mockFetchOnce([{ air_temperature: 20 }, { air_temperature: 25 }]);
        const weather = await getWeather();
        expect(weather.air_temperature).toBe(25);
    });

    it('returns null on failure', async () => {
        mockFetchOnce(null, false);
        expect(await getWeather()).toBeNull();
    });
});

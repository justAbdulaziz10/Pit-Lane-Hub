import { afterEach, describe, expect, it, vi } from 'vitest';
import { getDrivers, getWeather } from '@/lib/f1/openf1';

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

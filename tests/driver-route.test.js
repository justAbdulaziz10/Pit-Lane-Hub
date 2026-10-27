import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ unstable_cache: (callback) => callback }));

const resolveDriver = vi.fn();
const getAllTimeDriver = vi.fn();

vi.mock('@/lib/f1/drivers', async (importOriginal) => ({
    nationalityInfo: (await importOriginal()).nationalityInfo,
    resolveDriver: (...args) => resolveDriver(...args),
}));
vi.mock('@/lib/f1/compare', () => ({
    getAllTimeDriver: (...args) => getAllTimeDriver(...args),
    isValidDriverId: (value) => typeof value === 'string' && /^[a-z0-9_]{2,40}$/.test(value),
}));

import { driverPath, finishLabel, resolveDriverRoute } from '@/app/[lang]/driver/[number]/driver-data';
import { favouritesFirst, filterDrivers, groupByTeam } from '@/app/[lang]/drivers/filter';

const verstappen = {
    driverId: 'max_verstappen',
    racingNumber: 3,
    code: 'VER',
    firstName: 'Max',
    lastName: 'Verstappen',
    fullName: 'Max Verstappen',
    team: 'Red Bull Racing',
    teamColour: '#4781D7',
};

describe('resolveDriverRoute', () => {
    beforeEach(() => {
        resolveDriver.mockReset();
        getAllTimeDriver.mockReset();
        resolveDriver.mockImplementation(async (value) => (['3', 'max_verstappen', 'VER', 'ver'].includes(value) ? verstappen : null));
        getAllTimeDriver.mockImplementation(async (id) => (id === 'senna'
            ? { driverId: 'senna', firstName: 'Ayrton', lastName: 'Senna', fullName: 'Ayrton Senna', nationality: 'Brazilian' }
            : null));
    });

    it('sends every form of a current driver to the racing-number URL', async () => {
        for (const segment of ['3', 'max_verstappen', 'VER']) {
            const route = await resolveDriverRoute(segment);
            expect(route.path).toBe('/driver/3');
            expect(route.driver.current).toBe(true);
            expect(route.driver.colour).toMatch(/^#[0-9A-F]{6}$/);
        }
    });

    it('resolves any driver since 1950 by driverId, case-insensitively', async () => {
        const route = await resolveDriverRoute('Senna');
        expect(route.path).toBe('/driver/senna');
        expect(route.driver).toMatchObject({ current: false, fullName: 'Ayrton Senna', racingNumber: null });
        expect(getAllTimeDriver).toHaveBeenCalledWith('senna');
    });

    it('returns null for unknown numbers and ids without looking up invalid ids', async () => {
        expect(await resolveDriverRoute('99')).toBeNull();
        expect(await resolveDriverRoute('nobody')).toBeNull();
        expect(await resolveDriverRoute('a b')).toBeNull();
        expect(await resolveDriverRoute('')).toBeNull();
        expect(getAllTimeDriver).toHaveBeenCalledTimes(1);
        expect(getAllTimeDriver).toHaveBeenCalledWith('nobody');
    });

    it('builds the canonical path', () => {
        expect(driverPath({ current: true, racingNumber: 1, driverId: 'norris' })).toBe('/driver/1');
        expect(driverPath({ current: true, racingNumber: null, driverId: 'lindblad' })).toBe('/driver/lindblad');
        expect(driverPath({ current: false, racingNumber: 44, driverId: 'hamilton' })).toBe('/driver/hamilton');
    });
});

describe('finishLabel', () => {
    it('labels classified and non-classified finishes', () => {
        expect(finishLabel({ positionText: '1' })).toBe('P1');
        expect(finishLabel({ positionText: 'R', status: 'Engine' })).toBe('DNF');
        expect(finishLabel({ positionText: 'D' })).toBe('DSQ');
        expect(finishLabel({ positionText: 'W' })).toBe('WD');
    });
});

describe('drivers list filters', () => {
    const drivers = [
        { number: 16, fullName: 'Charles Leclerc', code: 'LEC', team: 'Ferrari', nationality: 'Monegasque', colour: '#E8002D' },
        { number: 1, fullName: 'Lando Norris', code: 'NOR', team: 'McLaren', nationality: 'British', colour: '#FF8000' },
        { number: 44, fullName: 'Lewis Hamilton', code: 'HAM', team: 'Ferrari', nationality: 'British', colour: '#E8002D' },
        { number: 27, fullName: 'Nico Hülkenberg', code: 'HUL', team: 'Audi', nationality: 'German', colour: '#F50537' },
    ];

    it('searches by name without accents, code, number, team and nationality', () => {
        expect(filterDrivers(drivers, { query: 'hulk' }).map((d) => d.code)).toEqual(['HUL']);
        expect(filterDrivers(drivers, { query: 'nor' }).map((d) => d.code)).toEqual(['NOR']);
        expect(filterDrivers(drivers, { query: '44' }).map((d) => d.code)).toEqual(['HAM']);
        expect(filterDrivers(drivers, { query: 'british' })).toHaveLength(2);
        expect(filterDrivers(drivers, { team: 'Ferrari' }).map((d) => d.code)).toEqual(['LEC', 'HAM']);
        expect(filterDrivers(drivers, { query: 'ham', team: 'McLaren' })).toEqual([]);
    });

    it('groups by team alphabetically with drivers in number order', () => {
        const groups = groupByTeam(drivers);
        expect(groups.map((g) => g.team)).toEqual(['Audi', 'Ferrari', 'McLaren']);
        expect(groups[1].drivers.map((d) => d.number)).toEqual([16, 44]);
    });

    it('moves favourites to the front and keeps the rest in order', () => {
        expect(favouritesFirst(drivers, [44]).map((d) => d.number)).toEqual([44, 16, 1, 27]);
        expect(favouritesFirst(drivers, [])).toBe(drivers);
    });
});

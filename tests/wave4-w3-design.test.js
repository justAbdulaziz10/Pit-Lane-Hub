import { describe, expect, it } from 'vitest';
import { allTimeRecords, viewHref } from '../src/app/[lang]/history/history-utils';
import { gridFinishDelta } from '../src/app/[lang]/driver/[number]/driver-data';

describe('history presentation helpers', () => {
    it('builds every season and view URL through one localized helper', () => {
        expect(viewHref(2021, 'races', 'en')).toBe('/history?year=2021');
        expect(viewHref(2021, 'drivers', 'ar')).toBe('/ar/history?year=2021&view=drivers');
        expect(viewHref(null, 'races', 'ar')).toBe('/ar/history');
    });

    it('ranks all-time driver and constructor title records from champion fixtures', () => {
        const champions = {
            drivers: [
                { driverId: 'a', firstName: 'Ada', lastName: 'One', year: 2020 },
                { driverId: 'b', firstName: 'Bea', lastName: 'Two', year: 2020 },
                { driverId: 'a', firstName: 'Ada', lastName: 'One', year: 2021 },
            ],
            constructors: [
                { constructorId: 'team_a', name: 'Team A', year: 2020 },
                { constructorId: 'team_a', name: 'Team A', year: 2021 },
            ],
        };

        expect(allTimeRecords(champions)).toEqual({
            drivers: [{ id: 'a', name: 'Ada One', titles: 2 }],
            constructors: [{ id: 'team_a', name: 'Team A', titles: 2 }],
        });
    });
});

describe('driver result presentation', () => {
    it('computes gained or lost places from grid to classified finish', () => {
        expect(gridFinishDelta({ grid: 6, position: 2 })).toBe(4);
        expect(gridFinishDelta({ grid: 2, position: 5 })).toBe(-3);
        expect(gridFinishDelta({ grid: 2, position: null })).toBeNull();
    });
});

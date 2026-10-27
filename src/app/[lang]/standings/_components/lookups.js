import { currentSeasonLookups } from '@/lib/f1/standings';
import { getTeams } from '@/lib/f1/teams';

/**
 * Team colours and current team names are a presentation extra: standings and
 * history tables still render without them if the team list cannot be loaded.
 */
export async function loadCurrentSeasonLookups(current) {
    try {
        const teams = await getTeams(current);
        return currentSeasonLookups(teams);
    } catch (error) {
        console.error('Current season team lookups unavailable', error);
        return currentSeasonLookups([]);
    }
}

/** Drop current colours and names from a past season's table. */
export function lookupsForSeason(lookups, year, current) {
    if (year === current) return lookups;
    return { ...lookups, colorById: new Map(), nameById: new Map() };
}

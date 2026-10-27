import { currentSeasonLookups } from '@/lib/f1/standings';
import { getGrid } from '@/lib/f1/drivers';
import { getTeams } from '@/lib/f1/teams';

/**
 * Team colours, current team names and driver links are a presentation extra:
 * standings and history tables still render (unlinked, uncoloured) if the
 * current grid cannot be loaded.
 */
export async function loadCurrentSeasonLookups(current) {
    try {
        const [teams, grid] = await Promise.all([getTeams(current), getGrid(current)]);
        return currentSeasonLookups(teams, grid);
    } catch (error) {
        console.error('Current season team lookups unavailable', error);
        return currentSeasonLookups([]);
    }
}

/** Keep driver links but drop current colours and names for a past season. */
export function lookupsForSeason(lookups, year, current) {
    if (year === current) return lookups;
    return { ...lookups, colorById: new Map(), nameById: new Map() };
}

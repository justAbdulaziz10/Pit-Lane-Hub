import {
    cacheF1Data,
    F1_CACHE_TAGS,
    fetchJolpicaPages,
} from './http';
import { getGrid, getSeasonDriverList } from './drivers';
import { latestList } from './history';
import { canonicalTeamNameForId, ensureTeamColorContrast } from './team-utils';
import { getSeasonYear } from './year';

function rows(mrData) {
    return mrData?.ConstructorTable?.Constructors || [];
}

function standingsRows(mrData) {
    return mrData?.StandingsTable?.StandingsLists || [];
}

async function loadTeams(year) {
    const [constructors, standingLists, grid, seasonDrivers] = await Promise.all([
        fetchJolpicaPages(`${year}/constructors`, {
            select: rows,
            revalidate: 86400,
            tags: [F1_CACHE_TAGS.teams],
        }),
        // One request gives every driver with the constructors they drove for.
        fetchJolpicaPages(`${year}/driverstandings`, {
            select: standingsRows,
            revalidate: 3600,
            tags: [F1_CACHE_TAGS.teams, F1_CACHE_TAGS.standings],
        }),
        getGrid(year),
        getSeasonDriverList(year),
    ]);
    const standings = latestList(standingLists)?.DriverStandings || [];
    const gridById = new Map(grid.filter((driver) => driver.driverId).map((driver) => [driver.driverId, driver]));
    const seasonById = new Map(seasonDrivers.map((driver) => [driver.driverId, driver]));
    const membersByConstructor = new Map();
    for (const standing of standings) {
        for (const constructor of standing.Constructors || []) {
            const members = membersByConstructor.get(constructor.constructorId) || new Set();
            members.add(standing.Driver?.driverId);
            membersByConstructor.set(constructor.constructorId, members);
        }
    }

    return constructors.map((constructor) => {
        const constructorId = constructor.constructorId;
        const canonicalName = canonicalTeamNameForId(constructorId, constructor.name);
        // The latest grid is the current line-up (standings also list replaced
        // drivers); standings cover teams missing from the grid.
        const lineup = grid.filter((driver) => driver.team === canonicalName && driver.driverId);
        const memberIds = lineup.length > 0
            ? new Set(lineup.map((driver) => driver.driverId))
            : (membersByConstructor.get(constructorId) || new Set());
        const drivers = [...memberIds].map((driverId) => {
            const current = gridById.get(driverId);
            if (current && current.team !== canonicalName) return null;
            if (current) return current;
            const seasonDriver = seasonById.get(driverId);
            if (!seasonDriver) return null;
            return {
                ...seasonDriver,
                racingNumber: seasonDriver.number,
                team: canonicalName,
                teamColour: null,
                headshot: null,
            };
        }).filter(Boolean);
        const observedColor = grid.find((driver) => driver.teamColour && driver.team === canonicalName)?.teamColour;

        return {
            constructorId,
            id: constructorId,
            name: canonicalName,
            displayName: canonicalName,
            nationality: constructor.nationality || null,
            color: ensureTeamColorContrast(observedColor || '#FFFFFF'),
            drivers,
        };
    });
}

const cachedTeams = cacheF1Data(loadTeams, ['teams'], 86400, [F1_CACHE_TAGS.teams, F1_CACHE_TAGS.grid]);

export function getTeams(year = getSeasonYear()) {
    return cachedTeams(Number(year));
}


import {
    cacheF1Data,
    F1_CACHE_TAGS,
    fetchJolpicaPages,
} from './http';
import CHAMPIONS_HISTORY from './data/champions-history.json';
import { getCalendar } from './season';
import { canonicalTeamNameForId } from './team-utils';
import { getSeasonYear } from './year';

function standingsLists(mrData) {
    return mrData?.StandingsTable?.StandingsLists || [];
}

/**
 * Jolpica pages standings by entry, so a season with more than 100 entrants
 * (1952 has 103) arrives as several lists for the same round: merge them.
 */
export function latestList(lists) {
    const round = Math.max(...lists.map((list) => Number(list.round)).filter(Number.isFinite));
    const latest = lists.filter((list) => Number(list.round) === round);
    if (latest.length === 0) return null;
    return {
        ...latest[0],
        DriverStandings: latest.flatMap((list) => list.DriverStandings || []),
        ConstructorStandings: latest.flatMap((list) => list.ConstructorStandings || []),
    };
}

function mapDriverStanding(item, season) {
    const finalConstructor = item.Constructors?.at(-1);
    return {
        position: Number(item.position),
        points: Number(item.points),
        wins: Number(item.wins),
        driver: {
            id: item.Driver?.driverId,
            code: item.Driver?.code || null,
            number: item.Driver?.permanentNumber ? Number(item.Driver.permanentNumber) : null,
            firstName: item.Driver?.givenName || '',
            lastName: item.Driver?.familyName || '',
            nationality: item.Driver?.nationality || null,
        },
        team: finalConstructor
            ? {
                id: finalConstructor.constructorId,
                name: canonicalTeamNameForId(finalConstructor.constructorId, finalConstructor.name, season),
            }
            : null,
    };
}

function mapConstructorStanding(item, season) {
    return {
        position: Number(item.position),
        points: Number(item.points),
        wins: Number(item.wins),
        team: {
            id: item.Constructor?.constructorId,
            name: canonicalTeamNameForId(item.Constructor?.constructorId, item.Constructor?.name, season),
            nationality: item.Constructor?.nationality || null,
        },
    };
}

const CURRENT_SEASON_REVALIDATE = 300;
// A finished season's results and standings are final.
const PAST_SEASON_REVALIDATE = 2592000;

const seasonSummaryLoader = (revalidate) => async (year) => {
    const season = Number(year);
    const [calendar, winners, driverLists, constructorLists] = await Promise.all([
        getCalendar(season),
        fetchJolpicaPages(`${season}/results/1`, {
            select: (mrData) => mrData?.RaceTable?.Races || [],
            revalidate,
            tags: [F1_CACHE_TAGS.results],
        }),
        fetchJolpicaPages(`${season}/driverstandings`, {
            select: standingsLists,
            revalidate,
            tags: [F1_CACHE_TAGS.standings],
        }),
        fetchJolpicaPages(`${season}/constructorstandings`, {
            select: standingsLists,
            revalidate,
            tags: [F1_CACHE_TAGS.standings],
        }),
    ]);
    const winnersByRound = new Map(winners.map((race) => [Number(race.round), race.Results?.[0] || null]));
    const driverList = latestList(driverLists);
    const constructorList = latestList(constructorLists);
    return {
        year: season,
        races: calendar.rounds.map((race) => {
            const result = winnersByRound.get(race.round);
            return {
                round: race.round,
                raceName: race.raceName,
                date: race.raceStart || race.raceDate,
                winner: result?.Driver
                    ? {
                        driverId: result.Driver.driverId,
                        code: result.Driver.code || null,
                        firstName: result.Driver.givenName,
                        lastName: result.Driver.familyName,
                        constructorId: result.Constructor?.constructorId || null,
                    }
                    : null,
            };
        }),
        driverStandings: (driverList?.DriverStandings || []).map((item) => mapDriverStanding(item, season)),
        constructorStandings: (constructorList?.ConstructorStandings || []).map((item) => mapConstructorStanding(item, season)),
    };
};

const summaryTags = [F1_CACHE_TAGS.results, F1_CACHE_TAGS.standings, F1_CACHE_TAGS.calendar];
const cachedSeasonSummary = {
    current: cacheF1Data(seasonSummaryLoader(CURRENT_SEASON_REVALIDATE), ['season-summary-current'], CURRENT_SEASON_REVALIDATE, summaryTags),
    past: cacheF1Data(seasonSummaryLoader(PAST_SEASON_REVALIDATE), ['season-summary-past'], PAST_SEASON_REVALIDATE, summaryTags),
};

export function getSeasonSummary(year = getSeasonYear()) {
    const season = Number(year);
    return cachedSeasonSummary[season < getSeasonYear() ? 'past' : 'current'](season);
}

function seasonComplete(calendar, now = Date.now()) {
    const finalEvent = [...calendar.rounds].sort((a, b) => b.round - a.round)[0];
    return Boolean(finalEvent?.raceStart) && now >= Date.parse(finalEvent.raceStart) + 3 * 60 * 60 * 1000;
}

async function seasonChampions(year, finalRound) {
    const revalidate = year === getSeasonYear() ? 300 : 86400;
    const [driverLists, constructorLists] = await Promise.all([
        fetchJolpicaPages(`${year}/driverstandings/1`, { select: standingsLists, revalidate, tags: [F1_CACHE_TAGS.champions] }),
        fetchJolpicaPages(`${year}/constructorstandings/1`, { select: standingsLists, revalidate, tags: [F1_CACHE_TAGS.champions] }),
    ]);
    const driverList = latestList(driverLists);
    const constructorList = latestList(constructorLists);
    if (Number(driverList?.round) !== Number(finalRound) || Number(constructorList?.round) !== Number(finalRound)) return null;
    const driver = driverList?.DriverStandings?.[0]?.Driver;
    const constructor = constructorList?.ConstructorStandings?.[0]?.Constructor;
    if (!driver || !constructor) return null;
    return {
        driver: {
            year,
            driverId: driver.driverId,
            code: driver.code || null,
            firstName: driver.givenName || '',
            lastName: driver.familyName || '',
            nationality: driver.nationality || null,
        },
        constructor: {
            year,
            constructorId: constructor.constructorId,
            name: constructor.name,
            nationality: constructor.nationality || null,
        },
    };
}

/**
 * Past champions are immutable, so seasons up to the snapshot come from a file
 * generated from Jolpica (Jolpica requires a season for standings queries).
 * Every season completed after the snapshot is fetched live, so a new champion
 * appears as soon as the season finale is over.
 */
async function loadChampions() {
    const drivers = [...CHAMPIONS_HISTORY.drivers];
    const constructors = [...CHAMPIONS_HISTORY.constructors];
    const lastKnown = Math.max(...drivers.map((item) => item.year));
    const currentYear = getSeasonYear();
    for (let year = lastKnown + 1; year <= currentYear; year += 1) {
        const calendar = await getCalendar(year);
        if (!seasonComplete(calendar)) break;
        const finalRound = Math.max(...calendar.rounds.map((event) => Number(event.round)).filter(Number.isFinite));
        if (!Number.isFinite(finalRound)) break;
        const champions = await seasonChampions(year, finalRound);
        if (!champions) break;
        drivers.push(champions.driver);
        constructors.push(champions.constructor);
    }
    return { drivers, constructors };
}

// The current season's title can change at the finale, so retry incomplete standings quickly.
const cachedChampions = cacheF1Data(loadChampions, ['champions'], 300, [F1_CACHE_TAGS.champions]);

export function getChampions() {
    return cachedChampions();
}

/** Count titles per driver from the champions list. */
export async function getChampionshipCount(driverId) {
    const { drivers } = await getChampions();
    return drivers.filter((item) => item.driverId === driverId).length;
}

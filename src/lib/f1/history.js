import {
    cacheF1Data,
    F1_CACHE_TAGS,
    fetchJolpicaPages,
} from './http';
import CHAMPIONS_HISTORY from './data/champions-history.json';
import { getCalendar } from './season';
import { getSeasonYear } from './year';

function standingsLists(mrData) {
    return mrData?.StandingsTable?.StandingsLists || [];
}

function latestList(lists) {
    return [...lists].sort((a, b) => Number(b.round) - Number(a.round))[0] || null;
}

function mapDriverStanding(item) {
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
        team: item.Constructors?.[0]
            ? { id: item.Constructors[0].constructorId, name: item.Constructors[0].name }
            : null,
    };
}

function mapConstructorStanding(item) {
    return {
        position: Number(item.position),
        points: Number(item.points),
        wins: Number(item.wins),
        team: {
            id: item.Constructor?.constructorId,
            name: item.Constructor?.name,
            nationality: item.Constructor?.nationality || null,
        },
    };
}

async function loadSeasonSummary(year) {
    const season = Number(year);
    const [calendar, winners, driverLists, constructorLists] = await Promise.all([
        getCalendar(season),
        fetchJolpicaPages(`${season}/results/1`, {
            select: (mrData) => mrData?.RaceTable?.Races || [],
            revalidate: 300,
            tags: [F1_CACHE_TAGS.results],
        }),
        fetchJolpicaPages(`${season}/driverstandings`, {
            select: standingsLists,
            revalidate: 300,
            tags: [F1_CACHE_TAGS.standings],
        }),
        fetchJolpicaPages(`${season}/constructorstandings`, {
            select: standingsLists,
            revalidate: 300,
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
                date: race.raceStart,
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
        driverStandings: (driverList?.DriverStandings || []).map(mapDriverStanding),
        constructorStandings: (constructorList?.ConstructorStandings || []).map(mapConstructorStanding),
    };
}

const cachedSeasonSummary = cacheF1Data(
    loadSeasonSummary,
    ['season-summary'],
    300,
    [F1_CACHE_TAGS.results, F1_CACHE_TAGS.standings, F1_CACHE_TAGS.calendar],
);

export function getSeasonSummary(year = getSeasonYear()) {
    return cachedSeasonSummary(Number(year));
}

function seasonComplete(calendar, now = Date.now()) {
    const finalEvent = [...calendar.rounds].sort((a, b) => b.round - a.round)[0];
    return Boolean(finalEvent?.raceStart) && now >= Date.parse(finalEvent.raceStart) + 3 * 60 * 60 * 1000;
}

async function seasonChampions(year) {
    const [driverLists, constructorLists] = await Promise.all([
        fetchJolpicaPages(`${year}/driverstandings/1`, { select: standingsLists, revalidate: 86400, tags: [F1_CACHE_TAGS.champions] }),
        fetchJolpicaPages(`${year}/constructorstandings/1`, { select: standingsLists, revalidate: 86400, tags: [F1_CACHE_TAGS.champions] }),
    ]);
    const driver = latestList(driverLists)?.DriverStandings?.[0]?.Driver;
    const constructor = latestList(constructorLists)?.ConstructorStandings?.[0]?.Constructor;
    return {
        driver: driver ? {
            year,
            driverId: driver.driverId,
            code: driver.code || null,
            firstName: driver.givenName || '',
            lastName: driver.familyName || '',
            nationality: driver.nationality || null,
        } : null,
        constructor: constructor ? {
            year,
            constructorId: constructor.constructorId,
            name: constructor.name,
            nationality: constructor.nationality || null,
        } : null,
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
        const { driver, constructor } = await seasonChampions(year);
        if (driver) drivers.push(driver);
        if (constructor) constructors.push(constructor);
    }
    return { drivers, constructors };
}

const cachedChampions = cacheF1Data(loadChampions, ['champions'], 86400, [F1_CACHE_TAGS.champions]);

export function getChampions() {
    return cachedChampions();
}

/** Count titles per driver from the champions list. */
export async function getChampionshipCount(driverId) {
    const { drivers } = await getChampions();
    return drivers.filter((item) => item.driverId === driverId).length;
}



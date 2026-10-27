import { getCareerStats } from './career';
import {
    F1_CACHE_TAGS,
    fetchJolpicaPages,
    UpstreamError,
} from './http';
import { getCurrentYear } from './constants';

function standingsLists(mrData) {
    return mrData?.StandingsTable?.StandingsLists || [];
}
function latestStandings(lists) {
    return [...lists].sort((a, b) => Number(b.round) - Number(a.round))[0];
}

function raceRows(mrData) {
    return mrData?.RaceTable?.Races || [];
}

function driverRows(mrData) {
    return mrData?.DriverTable?.Drivers || [];
}

function constructorRows(mrData) {
    return mrData?.ConstructorTable?.Constructors || [];
}

async function getList(path, select, revalidate = 300, tags = []) {
    return fetchJolpicaPages(path, { select, revalidate, tags });
}

function mapDriver(driver) {
    return {
        id: driver.driverId,
        code: driver.code || null,
        number: driver.permanentNumber ? Number(driver.permanentNumber) : null,
        firstName: driver.givenName || '',
        lastName: driver.familyName || '',
        nationality: driver.nationality || null,
    };
}

/** Fetch driver standings from Jolpica. */
export async function getDriverStandings(year = null) {
    const seasonYear = year || 'current';
    const lists = await getList(`${seasonYear}/driverstandings`, standingsLists, 300, [F1_CACHE_TAGS.standings]);
    return (latestStandings(lists)?.DriverStandings || []).map((standing) => ({
        position: Number(standing.position),
        points: Number(standing.points),
        wins: Number(standing.wins),
        driver: mapDriver(standing.Driver),
        team: standing.Constructors?.[0]
            ? {
                id: standing.Constructors[0].constructorId,
                name: standing.Constructors[0].name,
                nationality: standing.Constructors[0].nationality || null,
            }
            : null,
    }));
}

/** Fetch constructor standings from Jolpica. */
export async function getConstructorStandings(year = null) {
    const seasonYear = year || 'current';
    const lists = await getList(`${seasonYear}/constructorstandings`, standingsLists, 300, [F1_CACHE_TAGS.standings]);
    return (latestStandings(lists)?.ConstructorStandings || []).map((standing) => ({
        position: Number(standing.position),
        points: Number(standing.points),
        wins: Number(standing.wins),
        team: {
            id: standing.Constructor.constructorId,
            name: standing.Constructor.name,
            nationality: standing.Constructor.nationality || null,
        },
    }));
}

function mapRaceResult(race) {
    return {
        season: race.season,
        round: Number(race.round),
        raceName: race.raceName,
        circuit: {
            id: race.Circuit?.circuitId,
            name: race.Circuit?.circuitName,
            location: race.Circuit?.Location?.locality || null,
            country: race.Circuit?.Location?.country || null,
        },
        date: race.date,
        results: (race.Results || []).map((result) => ({
            position: Number.parseInt(result.position, 10),
            number: result.Driver?.permanentNumber ? Number(result.Driver.permanentNumber) : null,
            driver: {
                id: result.Driver?.driverId,
                code: result.Driver?.code || null,
                firstName: result.Driver?.givenName || '',
                lastName: result.Driver?.familyName || '',
            },
            team: result.Constructor?.name || null,
            grid: Number.parseInt(result.grid, 10),
            laps: Number.parseInt(result.laps, 10),
            status: result.status || null,
            time: result.Time?.time || null,
            points: Number(result.points) || 0,
            fastestLap: result.FastestLap
                ? {
                    rank: Number.parseInt(result.FastestLap.rank, 10),
                    lap: Number.parseInt(result.FastestLap.lap, 10),
                    time: result.FastestLap.Time?.time || null,
                    avgSpeed: result.FastestLap.AverageSpeed?.speed || null,
                }
                : null,
        })),
    };
}

/** Fetch race results for a round or the last completed round. */
export async function getRaceResults(year = null, round = null) {
    const seasonYear = year || 'current';
    const roundPath = round ? `/${encodeURIComponent(round)}` : '/last';
    const races = await getList(`${seasonYear}${roundPath}/results`, raceRows, 300, [F1_CACHE_TAGS.results]);
    return races[0] ? mapRaceResult(races[0]) : null;
}

/** Fetch the canonical Jolpica calendar for a season in the legacy shape. */
export async function getSchedule(year = null) {
    const seasonYear = year || 'current';
    const races = await getList(`${seasonYear}/races`, raceRows, 3600, [F1_CACHE_TAGS.calendar]);
    return races.map((race) => ({
        season: race.season,
        round: Number(race.round),
        raceName: race.raceName,
        circuit: {
            id: race.Circuit?.circuitId,
            name: race.Circuit?.circuitName,
            location: race.Circuit?.Location?.locality || null,
            country: race.Circuit?.Location?.country || null,
        },
        date: race.date,
        time: race.time || null,
        hasSprint: Boolean(race.Sprint),
        sessions: {
            firstPractice: race.FirstPractice || null,
            secondPractice: race.SecondPractice || null,
            thirdPractice: race.ThirdPractice || null,
            qualifying: race.Qualifying || null,
            sprint: race.Sprint || null,
            sprintQualifying: race.SprintQualifying || null,
        },
    }));
}

/** Fetch qualifying results for one round. */
export async function getQualifyingResults(year, round) {
    const races = await getList(`${year}/${encodeURIComponent(round)}/qualifying`, raceRows, 3600, [F1_CACHE_TAGS.results]);
    const race = races[0];
    if (!race) return null;
    return {
        raceName: race.raceName,
        round: Number(race.round),
        results: (race.QualifyingResults || []).map((result) => ({
            position: Number(result.position),
            number: result.Driver?.permanentNumber ? Number(result.Driver.permanentNumber) : null,
            driver: {
                id: result.Driver?.driverId,
                code: result.Driver?.code || null,
                firstName: result.Driver?.givenName || '',
                lastName: result.Driver?.familyName || '',
            },
            team: result.Constructor?.name || null,
            q1: result.Q1 || null,
            q2: result.Q2 || null,
            q3: result.Q3 || null,
        })),
    };
}

/** Fetch a driver's results in one season. */
export async function getDriverSeasonResults(driverId, year = null) {
    const seasonYear = year || 'current';
    const races = await getList(`${seasonYear}/drivers/${encodeURIComponent(driverId)}/results`, raceRows, 3600, [F1_CACHE_TAGS.results]);
    return races.map((race) => {
        const result = race.Results?.[0] || {};
        return {
            round: Number(race.round),
            raceName: race.raceName,
            country: race.Circuit?.Location?.country || null,
            date: race.date,
            position: result.position ? Number.parseInt(result.position, 10) : null,
            grid: result.grid ? Number.parseInt(result.grid, 10) : null,
            points: Number(result.points) || 0,
            status: result.status || null,
        };
    });
}

/** Fetch the list of drivers for a season. */
export async function getSeasonDrivers(year = null) {
    const seasonYear = year || 'current';
    const drivers = await getList(`${seasonYear}/drivers`, driverRows, 86400, [F1_CACHE_TAGS.drivers]);
    return drivers.map(mapDriver);
}

/** Resolve a permanent racing number from live season data. */
export async function resolveErgastId(driverNumber) {
    const number = Number.parseInt(driverNumber, 10);
    const seasonDrivers = await getSeasonDrivers();
    const match = seasonDrivers.find((driver) => driver.number === number);
    return match?.id || null;
}

/** Fetch basic constructor information. */
export async function getConstructorInfo(constructorId) {
    const constructors = await getList(`constructors/${encodeURIComponent(constructorId)}`, constructorRows, 86400, [F1_CACHE_TAGS.teams]);
    const constructor = constructors[0];
    return constructor
        ? { id: constructor.constructorId, name: constructor.name, nationality: constructor.nationality, url: constructor.url }
        : null;
}

/** Fetch constructors' drivers in a season. */
export async function getConstructorDrivers(constructorId, year = null) {
    const seasonYear = year || 'current';
    const drivers = await getList(`${seasonYear}/constructors/${encodeURIComponent(constructorId)}/drivers`, driverRows, 86400, [F1_CACHE_TAGS.teams]);
    return drivers.map(mapDriver);
}

/** Fetch a constructor's season results, combining both cars per race. */
export async function getConstructorSeasonResults(constructorId, year = null) {
    const seasonYear = year || 'current';
    const races = await getList(`${seasonYear}/constructors/${encodeURIComponent(constructorId)}/results`, raceRows, 3600, [F1_CACHE_TAGS.results]);
    return races.map((race) => {
        const cars = (race.Results || []).map((result) => ({
            code: result.Driver?.code || result.Driver?.familyName || null,
            position: result.position ? Number.parseInt(result.position, 10) : null,
            points: Number(result.points) || 0,
            status: result.status || null,
        }));
        return {
            round: Number(race.round),
            raceName: race.raceName,
            country: race.Circuit?.Location?.country || null,
            date: race.date,
            cars,
            points: cars.reduce((sum, car) => sum + car.points, 0),
        };
    });
}

/** Keep the old shape while sourcing totals and championships from Jolpica data. */
export async function getDriverCareerStats(driverId) {
    const career = await getCareerStats(driverId);
    return {
        totalRaces: career.starts,
        wins: career.wins,
        podiums: career.podiums,
        poles: career.poles,
        fastestLaps: career.fastestLaps,
        championships: career.championships,
        seasons: career.seasons,
    };
}

// Ergast API for historical F1 data (standings, results, career stats).
// Using the Jolpica mirror because the original Ergast is deprecated and blocks Vercel.
import { DRIVER_TITLES } from './constants';

const ERGAST_URL = 'https://api.jolpi.ca/ergast/f1';

/**
 * Fetch driver standings from Ergast.
 * @param {number|null} year - Season year (defaults to current).
 */
export async function getDriverStandings(year = null) {
    try {
        const seasonYear = year || 'current';
        const response = await fetch(`${ERGAST_URL}/${seasonYear}/driverStandings.json`, {
            next: { revalidate: 300 },
        });
        if (!response.ok) throw new Error('Failed to fetch driver standings');
        const data = await response.json();
        const standings = data?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings || [];
        return standings.map((s) => ({
            position: parseInt(s.position),
            points: parseFloat(s.points),
            wins: parseInt(s.wins),
            driver: {
                id: s.Driver.driverId,
                code: s.Driver.code,
                number: s.Driver.permanentNumber,
                firstName: s.Driver.givenName,
                lastName: s.Driver.familyName,
                nationality: s.Driver.nationality,
            },
            team: {
                id: s.Constructors?.[0]?.constructorId,
                name: s.Constructors?.[0]?.name,
                nationality: s.Constructors?.[0]?.nationality,
            },
        }));
    } catch (error) {
        console.error('Error fetching driver standings:', error);
        return [];
    }
}

/**
 * Fetch constructor standings from Ergast.
 * @param {number|null} year - Season year (defaults to current).
 */
export async function getConstructorStandings(year = null) {
    try {
        const seasonYear = year || 'current';
        const response = await fetch(`${ERGAST_URL}/${seasonYear}/constructorStandings.json`, {
            next: { revalidate: 300 },
        });
        if (!response.ok) throw new Error('Failed to fetch constructor standings');
        const data = await response.json();
        const standings = data?.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings || [];
        return standings.map((s) => ({
            position: parseInt(s.position),
            points: parseFloat(s.points),
            wins: parseInt(s.wins),
            team: {
                id: s.Constructor.constructorId,
                name: s.Constructor.name,
                nationality: s.Constructor.nationality,
            },
        }));
    } catch (error) {
        console.error('Error fetching constructor standings:', error);
        return [];
    }
}

/**
 * Fetch race results from Ergast.
 * @param {number|null} year - Season year (defaults to current).
 * @param {number|null} round - Race round number (defaults to last).
 */
export async function getRaceResults(year = null, round = null) {
    try {
        const seasonYear = year || 'current';
        const roundPath = round ? `/${round}` : '/last';
        const response = await fetch(`${ERGAST_URL}/${seasonYear}${roundPath}/results.json`, {
            next: { revalidate: 300 },
        });
        if (!response.ok) throw new Error('Failed to fetch race results');
        const data = await response.json();
        const race = data?.MRData?.RaceTable?.Races?.[0];
        if (!race) return null;

        return {
            season: race.season,
            round: parseInt(race.round),
            raceName: race.raceName,
            circuit: {
                id: race.Circuit.circuitId,
                name: race.Circuit.circuitName,
                location: race.Circuit.Location.locality,
                country: race.Circuit.Location.country,
            },
            date: race.date,
            results: race.Results.map((r) => ({
                position: parseInt(r.position),
                number: r.Driver.permanentNumber,
                driver: {
                    id: r.Driver.driverId,
                    code: r.Driver.code,
                    firstName: r.Driver.givenName,
                    lastName: r.Driver.familyName,
                },
                team: r.Constructor.name,
                grid: parseInt(r.grid),
                laps: parseInt(r.laps),
                status: r.status,
                time: r.Time?.time || null,
                points: parseFloat(r.points),
                fastestLap: r.FastestLap
                    ? {
                          rank: parseInt(r.FastestLap.rank),
                          lap: parseInt(r.FastestLap.lap),
                          time: r.FastestLap.Time?.time,
                          avgSpeed: r.FastestLap.AverageSpeed?.speed,
                      }
                    : null,
            })),
        };
    } catch (error) {
        console.error('Error fetching race results:', error);
        return null;
    }
}

/**
 * Fetch a driver's career stats, computed from their full Ergast results.
 * @param {string} driverId - Ergast driver ID (e.g. 'max_verstappen').
 */
export async function getDriverCareerStats(driverId) {
    try {
        const response = await fetch(`${ERGAST_URL}/drivers/${driverId}/results.json?limit=500`, {
            next: { revalidate: 86400 },
        });
        if (!response.ok) throw new Error('Failed to fetch driver stats');
        const data = await response.json();
        const races = data?.MRData?.RaceTable?.Races || [];

        let wins = 0;
        let podiums = 0;
        let poles = 0;
        let fastestLaps = 0;
        let dnfs = 0;
        let careerPoints = 0;

        races.forEach((race) => {
            const result = race.Results?.[0];
            if (!result) return;
            const pos = parseInt(result.position);
            if (pos === 1) wins++;
            if (pos <= 3) podiums++;
            if (parseInt(result.grid) === 1) poles++;
            if (result.FastestLap?.rank === '1') fastestLaps++;
            if (result.status && !result.status.includes('Lap') && result.status !== 'Finished') {
                dnfs++;
            }
            if (result.points) careerPoints += parseFloat(result.points);
        });

        return {
            totalRaces: races.length,
            wins,
            podiums,
            poles,
            fastestLaps,
            dnfs,
            careerPoints,
            championships: DRIVER_TITLES[driverId] || 0,
        };
    } catch (error) {
        console.error('Error fetching driver career stats:', error);
        return null;
    }
}

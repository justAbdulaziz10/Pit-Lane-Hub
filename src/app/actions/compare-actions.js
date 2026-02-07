'use server';

import { DRIVER_ERGAST_IDS, DRIVER_TITLES } from '@/lib/f1api';

// Use Jolpica Mirror for reliability (Ergast is deprecated/blocking)
const ERGAST_URL = 'https://api.jolpi.ca/ergast/f1';

/**
 * Fetch detailed driver career stats from Ergast API.
 * This runs entirely on the server to avoid CORS and hide API details.
 * 
 * @param {string|number} driverIdentifier - Driver number or Ergast ID
 */
export async function getDriverStatsAction(driverIdentifier) {
    if (!driverIdentifier) return null;

    // 1. Resolve to Ergast ID
    let driverId = driverIdentifier;
    if (!isNaN(driverIdentifier) && DRIVER_ERGAST_IDS[driverIdentifier]) {
        driverId = DRIVER_ERGAST_IDS[driverIdentifier];
    } else if (!isNaN(driverIdentifier)) {
        // If number provided but not in map, we can't fetch career stats easily
        console.warn(`Driver number ${driverIdentifier} not found in ID map.`);
        // Try to continue with basic ID if possible or return null
        return null;
    }

    console.log(`[CompareAction] Fetching stats for: ${driverId}`);

    try {
        // Fetch ALL results to calculate Wins, Podiums, Poles, etc.
        // Jolpica/Ergast enforces a limit (max 100 or 1000 depending on server config).
        // To be safe and get accurate data, we must handle pagination.

        let allRaces = [];
        let offset = 0;
        const limit = 1000; // Try large limit
        let total = 0;

        // Initial fetch
        const initialUrl = `${ERGAST_URL}/drivers/${driverId}/results.json?limit=${limit}&offset=${offset}`;
        const response = await fetch(initialUrl, {
            next: { revalidate: 86400 },
            headers: {
                'User-Agent': 'F1Hub-App/1.0 (education project)',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) throw new Error(`Ergast API Error: ${response.status}`);

        const data = await response.json();
        const mrData = data?.MRData;
        total = parseInt(mrData?.total || '0');
        allRaces = [...(mrData?.RaceTable?.Races || [])];

        // If we didn't get everything (pagination limit enforcement), fetch the rest
        // Jolpica often limits to 30 or 100 even if you ask for 1000.
        // Our debug showed it returns 100 records max per call usually.
        while (allRaces.length < total) {
            offset += allRaces.length; // Start next batch where we left off
            // Safely prevent infinite loops if API is weird
            if (offset >= total) break;

            const nextUrl = `${ERGAST_URL}/drivers/${driverId}/results.json?limit=${limit}&offset=${offset}`;
            console.log(`[CompareAction] Pagination: Fetching offset ${offset} for ${driverId}`);

            const nextRes = await fetch(nextUrl, {
                next: { revalidate: 86400 },
                headers: { 'User-Agent': 'F1Hub-App/1.0', 'Accept': 'application/json' }
            });

            if (!nextRes.ok) break;
            const nextData = await nextRes.json();
            const nextRaces = nextData?.MRData?.RaceTable?.Races || [];
            if (nextRaces.length === 0) break; // End of data

            allRaces = [...allRaces, ...nextRaces];
        }

        console.log(`[CompareAction] Total races fetched for ${driverId}: ${allRaces.length}`);

        // Aggregation
        let wins = 0;
        let podiums = 0;
        let poles = 0;
        let fastestLaps = 0;
        let dnfs = 0;
        let careerPoints = 0;

        allRaces.forEach(race => {
            const result = race.Results?.[0];
            if (result) {
                const pos = parseInt(result.position);
                const grid = parseInt(result.grid);

                if (pos === 1) wins++;
                if (pos <= 3) podiums++;
                if (grid === 1) poles++;
                if (result.FastestLap?.rank === '1') fastestLaps++;

                // Status checks for DNF
                if (result.status && !result.status.match(/Finished|\+\d+\s?Lap/i)) {
                    dnfs++;
                }

                if (result.points) {
                    careerPoints += parseFloat(result.points);
                }
            }
        });

        // Championships: Use our manual map because 'driverStandings' endpoint is unreliable
        const championships = DRIVER_TITLES[driverId] || 0;

        return {
            totalRaces: allRaces.length,
            wins,
            podiums,
            poles,
            fastestLaps,
            dnfs,
            careerPoints,
            championships,
            lastUpdated: new Date().toISOString().split('T')[0],
            source: 'Jolpica (Ergast) API'
        };

    } catch (error) {
        console.error(`[CompareAction] Failed to fetch stats for ${driverId}:`, error);
        return null;
    }
}

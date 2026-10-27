export const DRIVER_ID_PATTERN = /^[a-z0-9_]{2,40}$/;

/** Jolpica qualifying results begin in 1994; the record is broadly complete from 2003. */
export const POLE_DATA_FROM = 1994;
export const FULL_POLE_DATA_FROM = 2003;

/** 'full', 'partial' or 'none' for qualifying pole-position data. */
export function poleCoverage(firstSeason, lastSeason) {
    if (!firstSeason || !lastSeason) return 'full';
    if (lastSeason < POLE_DATA_FROM) return 'none';
    return firstSeason < FULL_POLE_DATA_FROM ? 'partial' : 'full';
}

/**
 * Career totals from a driver's full result list. Rows are counted the way
 * Jolpica's MRData totals count them: one per car entered, so a 1950s race
 * with a shared car can contribute two entries.
 */
export function careerTotals(driverId, rows, championships, qualifyingRows = []) {
    const finished = (position) => rows.filter((row) => row.position === position).length;
    const wins = finished(1);
    const seasons = rows.map((row) => row.season).filter(Number.isFinite);
    const firstSeason = seasons.length ? Math.min(...seasons) : null;
    const lastSeason = seasons.length ? Math.max(...seasons) : null;
    return {
        driverId,
        entries: rows.length,
        wins,
        podiums: wins + finished(2) + finished(3),
        poles: qualifyingRows.filter((row) => row.position === '1').length,
        poleCoverage: poleCoverage(firstSeason, lastSeason),
        fastestLaps: rows.filter((row) => row.fastestLapRank === 1).length,
        championships,
        seasons: new Set(seasons).size,
    };
}

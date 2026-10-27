export const DRIVER_ID_PATTERN = /^[a-z0-9_]{2,40}$/;

/**
 * Career totals from a driver's full result list. Rows are counted the way
 * Jolpica's MRData totals count them: one per car entered, so a 1950s race
 * with a shared car can contribute two starts.
 */
export function careerTotals(driverId, rows, championships) {
    const finished = (position) => rows.filter((row) => row.position === position).length;
    const wins = finished(1);
    return {
        driverId,
        starts: rows.length,
        wins,
        podiums: wins + finished(2) + finished(3),
        poles: rows.filter((row) => row.grid === 1).length,
        fastestLaps: rows.filter((row) => row.fastestLapRank === 1).length,
        championships,
        seasons: new Set(rows.map((row) => row.season)).size,
    };
}

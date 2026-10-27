export const PODIUM_COLOR_TOKENS = Object.freeze({
    1: '--gold',
    2: '--silver',
    3: '--bronze',
});

export function podiumColorToken(position) {
    return PODIUM_COLOR_TOKENS[Number(position)] || '--text-1';
}

export function parseLapTime(value) {
    if (typeof value !== 'string' || value.trim() === '') return null;
    const text = value.trim();
    const minuteMatch = /^(\d+):(\d{1,2}(?:\.\d+)?)$/.exec(text);
    const seconds = minuteMatch
        ? Number(minuteMatch[1]) * 60 + Number(minuteMatch[2])
        : Number(text);
    return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}

export function bestQualifyingLap(row) {
    return ['q1', 'q2', 'q3']
        .map((key) => parseLapTime(row?.[key]))
        .filter(Number.isFinite)
        .reduce((best, time) => (best === null || time < best ? time : best), null);
}

/** Seconds behind pole using each driver's best recorded qualifying segment. */
export function gapToPoleSeconds(row, results) {
    const pole = results.find((entry) => Number(entry.position) === 1);
    const poleTime = bestQualifyingLap(pole);
    const rowTime = bestQualifyingLap(row);
    if (poleTime === null || rowTime === null) return null;
    return Number(Math.max(0, rowTime - poleTime).toFixed(3));
}

/** First eliminated row in Q1 and Q2 for the field size. */
export function qualifyingCutlinePositions(results) {
    const positions = results.map((row) => Number(row.position)).filter(Number.isFinite);
    const fieldSize = Math.max(...positions, 0);
    return {
        q1: fieldSize >= 16 ? Math.floor(fieldSize * 0.75) + 1 : null,
        q2: fieldSize > 10 ? 11 : null,
    };
}

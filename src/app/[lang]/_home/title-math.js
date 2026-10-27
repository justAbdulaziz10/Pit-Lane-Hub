const RACE_WIN_POINTS = 25;
const SPRINT_WIN_POINTS = 8;

function count(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
}

/** Calculate the current leader's championship margin and remaining win points. */
export function calculateTitleMath({ standings = [], remainingRaces = 0, remainingSprints = 0 } = {}) {
    const ordered = [...standings].sort((a, b) => Number(a.position) - Number(b.position));
    const leader = ordered[0] || null;
    const second = ordered[1] || null;
    const third = ordered[2] || null;
    const leaderPoints = Number(leader?.points);
    const points = Number.isFinite(leaderPoints) ? leaderPoints : null;
    const gap = (rival) => {
        const rivalPoints = Number(rival?.points);
        return points === null || !Number.isFinite(rivalPoints) ? null : Math.max(0, points - rivalPoints);
    };
    const racesLeft = count(remainingRaces);
    const sprintsLeft = count(remainingSprints);
    const pointsRemaining = racesLeft * RACE_WIN_POINTS + sprintsLeft * SPRINT_WIN_POINTS;
    const gapToSecond = gap(second);

    return {
        leader,
        second,
        third,
        gapToSecond,
        gapToThird: gap(third),
        remainingRaces: racesLeft,
        remainingSprints: sprintsLeft,
        pointsRemaining,
        mathematicallyDecided: gapToSecond !== null && gapToSecond > pointsRemaining,
    };
}

const SESSION_ORDER = Object.freeze([
    ['firstPractice', 'fp1'],
    ['secondPractice', 'fp2'],
    ['thirdPractice', 'fp3'],
    ['sprintQualifying', 'sprintQualifying'],
    ['sprint', 'sprint'],
    ['qualifying', 'qualifying'],
    ['race', 'race'],
]);

export function getWeekendSessions(event) {
    const starts = event?.sessions || {};
    const known = SESSION_ORDER.flatMap(([key, label]) => {
        const start = starts[key] || (key === 'race' ? event?.raceStart : null);
        return start ? [{ key, label, start }] : [];
    });
    const knownKeys = new Set(SESSION_ORDER.map(([key]) => key));
    const additional = Object.entries(starts)
        .filter(([key, start]) => !knownKeys.has(key) && start)
        .map(([key, start]) => ({ key, label: key, start }));
    return [...known, ...additional].sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
}

export function nextWeekendSession(event, now = Date.now()) {
    return getWeekendSessions(event).find((session) => Date.parse(session.start) > now) || null;
}

function latestStandingsRound(value) {
    const round = Number(value);
    return Number.isFinite(round) ? Math.max(0, round) : 0;
}

export function countRemainingRaces(rounds = [], standings = null) {
    const settledRound = latestStandingsRound(standings);
    return rounds.filter((event) => {
        const round = Number(event.round);
        const hasRaceDate = /^\d{4}-\d{2}-\d{2}$/.test(String(event.raceDate || ''));
        const hasRaceTime = Boolean(event.sessions?.race || event.raceStart);
        return Number.isFinite(round) && round > settledRound && (hasRaceTime || hasRaceDate);
    }).length;
}

export function countRemainingSprints(rounds = [], standings = null) {
    const settledRound = latestStandingsRound(standings);
    return rounds.filter((event) => {
        const round = Number(event.round);
        return Number.isFinite(round) && round > settledRound && Boolean(event.sessions?.sprint);
    }).length;
}

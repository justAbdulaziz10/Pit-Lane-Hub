const SESSION_ORDER = Object.freeze([
    ['firstPractice', 'fp1'],
    ['secondPractice', 'fp2'],
    ['thirdPractice', 'fp3'],
    ['sprintQualifying', 'sprintQualifying'],
    ['sprint', 'sprint'],
    ['qualifying', 'qualifying'],
    ['race', 'race'],
]);

const RACE_GRACE_MS = 60 * 60 * 1000;
const OTHER_SESSION_GRACE_MS = 30 * 60 * 1000;

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

function sessionEnd(event, start, grace, duration) {
    const startTimestamp = Date.parse(start || '');
    const window = (event.sessionWindows || []).find((candidate) => (
        Date.parse(candidate.start || '') === startTimestamp
    ));
    const end = Date.parse(window?.end || '');
    if (Number.isFinite(end)) return end + grace;
    return Number.isFinite(startTimestamp) ? startTimestamp + duration + grace : null;
}

export function countRemainingRaces(rounds = [], now = Date.now()) {
    return rounds.filter((event) => {
        const start = event.sessions?.race || event.raceStart;
        const end = sessionEnd(event, start, RACE_GRACE_MS, 3 * 60 * 60 * 1000);
        return end !== null && now <= end;
    }).length;
}

export function countRemainingSprints(rounds = [], now = Date.now()) {
    return rounds.filter((event) => {
        const start = event.sessions?.sprint;
        if (!start) return false;
        const end = sessionEnd(event, start, OTHER_SESSION_GRACE_MS, 60 * 60 * 1000);
        return end !== null && now <= end;
    }).length;
}

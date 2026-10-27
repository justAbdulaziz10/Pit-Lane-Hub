import { fetchOpenF1Json, logOpenF1Failure, UpstreamError } from './http';

function timestamp(session) {
    const value = Date.parse(session?.date_start || '');
    return Number.isFinite(value) ? value : -Infinity;
}

function isTesting(session) {
    return /\btest(?:ing)?\b/i.test(`${session?.session_name || ''} ${session?.session_type || ''} ${session?.meeting_name || ''}`);
}

function preferredSession(session) {
    const name = String(session?.session_name || '').toLowerCase();
    return name === 'race' || name === 'qualifying';
}

export function selectGridSessions(sessions, now = Date.now()) {
    return (Array.isArray(sessions) ? sessions : [])
        .filter((session) => !isTesting(session) && timestamp(session) <= now && session?.session_key != null)
        .sort((a, b) => timestamp(b) - timestamp(a))
        .sort((a, b) => Number(preferredSession(b)) - Number(preferredSession(a)));
}

export async function getOpenF1GridData(year) {
    const sessions = await fetchOpenF1Json(`sessions?year=${encodeURIComponent(year)}`);
    if (!Array.isArray(sessions)) {
        const error = new UpstreamError('OpenF1 returned an invalid season session list', { source: 'OpenF1' });
        logOpenF1Failure(error);
        throw error;
    }
    const candidates = selectGridSessions(sessions).slice(0, 3);
    for (const session of candidates) {
        const drivers = await fetchOpenF1Json(`drivers?session_key=${encodeURIComponent(session.session_key)}`);
        if (!Array.isArray(drivers)) {
            const error = new UpstreamError('OpenF1 returned an invalid driver list', { source: 'OpenF1' });
            logOpenF1Failure(error);
            throw error;
        }
        if (drivers.length > 0) return { session, drivers };
    }
    return { session: candidates[0] || null, drivers: [] };
}

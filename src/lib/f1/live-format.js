// Pure formatting helpers for live timing; safe to import from client components.

/** 78.5 → "1:18.500"; null → "—". */
export function formatLapTime(seconds) {
    const value = Number(seconds);
    if (seconds == null || !Number.isFinite(value) || value <= 0) return '—';
    const minutes = Math.floor(value / 60);
    const rest = (value - minutes * 60).toFixed(3).padStart(6, '0');
    return minutes > 0 ? `${minutes}:${rest}` : rest;
}

/** OpenF1 gaps are seconds or strings such as "+1 LAP". */
export function formatGap(value, { leader = false } = {}) {
    if (leader) return 'Leader';
    if (value == null || value === '') return '—';
    if (typeof value === 'string' && !/^[+-]?\d+(\.\d+)?$/.test(value.trim())) return value.trim().toUpperCase();
    const number = Number(value);
    if (!Number.isFinite(number)) return '—';
    return `+${number.toFixed(3)}`;
}

/** Return null for permanent upstream states; transient failures back off from 5s to 60s. */
export function pollInterval(snapshot, retryAttempt = 0) {
    if (snapshot?.unavailable && snapshot.unavailable !== 'no-session') return null;
    if (retryAttempt > 0) return Math.min(60000, 5000 * (2 ** (retryAttempt - 1)));
    return snapshot?.isLive ? 5000 : 60000;
}

export function sessionPhase(session, isLive, now = Date.now()) {
    if (!session) return 'none';
    if (isLive) return 'live';
    const start = Date.parse(session.start || '');
    if (Number.isFinite(start) && now < start) return 'upcoming';
    return 'finished';
}

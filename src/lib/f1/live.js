import { fetchOpenF1Json, getOpenF1Token, UpstreamError } from './http';
import { getSeasonYear } from './year';

if (typeof window !== 'undefined') throw new Error('Live timing is available only on the server.');

function timestamp(value) {
    const result = Date.parse(value || '');
    return Number.isFinite(result) ? result : null;
}

function lastByDate(rows, keyFor) {
    const result = new Map();
    for (const row of rows) {
        const key = keyFor(row);
        if (key == null) continue;
        const previous = result.get(key);
        if (!previous || (timestamp(row.date) ?? -Infinity) >= (timestamp(previous.date) ?? -Infinity)) {
            result.set(key, row);
        }
    }
    return result;
}

function latestSession(sessions, now) {
    const candidates = sessions.filter((session) => timestamp(session.date_start) !== null);
    const live = candidates.find((session) => {
        const start = timestamp(session.date_start);
        const end = timestamp(session.date_end);
        return end !== null && now >= start && now <= end;
    });
    if (live) return live;
    const recent = candidates
        .filter((session) => (timestamp(session.date_end) ?? timestamp(session.date_start)) <= now)
        .sort((a, b) => (timestamp(b.date_end) ?? timestamp(b.date_start)) - (timestamp(a.date_end) ?? timestamp(a.date_start)))[0];
    if (recent) return recent;
    return candidates.sort((a, b) => timestamp(a.date_start) - timestamp(b.date_start))[0] || null;
}

async function getSession(year, token) {
    const sessions = await fetchOpenF1Json(`sessions?year=${encodeURIComponent(year)}`, { token });
    if (!Array.isArray(sessions)) {
        throw new UpstreamError('OpenF1 returned an invalid session list', { source: 'OpenF1' });
    }
    const selected = latestSession(sessions, Date.now());
    if (selected) return selected;
    const latest = await fetchOpenF1Json('sessions?session_key=latest', { token });
    if (!Array.isArray(latest)) {
        throw new UpstreamError('OpenF1 returned an invalid latest session response', { source: 'OpenF1' });
    }
    return latestSession(latest, Date.now());
}

async function sessionRows(path, token) {
    const rows = await fetchOpenF1Json(path, { token });
    if (!Array.isArray(rows)) throw new UpstreamError('OpenF1 returned an invalid live data response', { source: 'OpenF1' });
    return rows;
}

export async function getLiveSnapshot() {
    const token = await getOpenF1Token();
    const session = await getSession(getSeasonYear(), token);
    if (!session) return { session: null, isLive: false, positions: [], weather: null, raceControl: [] };

    const sessionKey = encodeURIComponent(session.session_key);
    const now = Date.now();
    const sessionStart = timestamp(session.date_start);
    const sessionEnd = timestamp(session.date_end);
    const isLive = sessionStart !== null && sessionEnd !== null && now >= sessionStart && now <= sessionEnd;
    const [drivers, positionRows, stints, messages] = await Promise.all([
        sessionRows(`drivers?session_key=${sessionKey}`, token),
        sessionRows(`position?session_key=${sessionKey}`, token),
        sessionRows(`stints?session_key=${sessionKey}`, token),
        sessionRows(`race_control?session_key=${sessionKey}`, token),
    ]);
    // Intervals, laps and weather are high-volume feeds: only pull a recent
    // window, around "now" while live or around the last timing message after.
    const lastMessage = Math.max(...messages.map((row) => timestamp(row.date) ?? -Infinity));
    const anchor = isLive ? now : (Number.isFinite(lastMessage) ? lastMessage : (sessionEnd ?? now));
    const since = (minutes) => encodeURIComponent(new Date(anchor - minutes * 60000).toISOString());
    const [intervalRows, laps, weatherRows] = await Promise.all([
        sessionRows(`intervals?session_key=${sessionKey}&date>=${since(isLive ? 1 : 10)}`, token),
        sessionRows(`laps?session_key=${sessionKey}&date_start>=${since(15)}`, token),
        sessionRows(`weather?session_key=${sessionKey}&date>=${since(15)}`, token),
    ]);

    const positionsByDriver = lastByDate(positionRows, (row) => row.driver_number);
    const intervalsByDriver = lastByDate(intervalRows, (row) => row.driver_number);
    const lapsByDriver = new Map();
    for (const lap of laps) {
        const previous = lapsByDriver.get(lap.driver_number);
        if (!previous || Number(lap.lap_number) > Number(previous.lap_number)) lapsByDriver.set(lap.driver_number, lap);
    }
    const stintsByDriver = new Map();
    for (const stint of stints) {
        const previous = stintsByDriver.get(stint.driver_number);
        if (!previous || Number(stint.stint_number) > Number(previous.stint_number)) stintsByDriver.set(stint.driver_number, stint);
    }
    const driversByNumber = new Map(drivers.map((driver) => [Number(driver.driver_number), driver]));
    const positions = [...positionsByDriver.entries()]
        .map(([driverNumber, position]) => {
            const driver = driversByNumber.get(Number(driverNumber));
            const interval = intervalsByDriver.get(driverNumber);
            const lastLap = lapsByDriver.get(driverNumber);
            const stint = stintsByDriver.get(driverNumber);
            return {
                driverNumber,
                driverId: driver?.name_acronym || null,
                name: driver?.full_name || driver?.broadcast_name || null,
                team: driver?.team_name || null,
                position: Number(position.position),
                gapToLeader: interval?.gap_to_leader ?? null,
                interval: interval?.interval ?? null,
                lastLap: lastLap
                    ? { lapNumber: lastLap.lap_number, duration: lastLap.lap_duration, dateStart: lastLap.date_start }
                    : null,
                stint: stint
                    ? {
                        number: stint.stint_number,
                        compound: stint.compound || null,
                        tyreAgeAtStart: stint.tyre_age_at_start ?? null,
                        lapStart: stint.lap_start ?? null,
                        lapEnd: stint.lap_end ?? null,
                    }
                    : null,
            };
        })
        .sort((a, b) => a.position - b.position);
    const weather = [...weatherRows].sort((a, b) => (timestamp(b.date) ?? -Infinity) - (timestamp(a.date) ?? -Infinity))[0] || null;
    const raceControl = [...messages]
        .sort((a, b) => (timestamp(b.date) ?? -Infinity) - (timestamp(a.date) ?? -Infinity))
        .slice(0, 30);
    return {
        session,
        isLive,
        fetchedAt: new Date(now).toISOString(),
        positions,
        weather,
        raceControl,
    };
}


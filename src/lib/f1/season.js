import {
    cacheF1Data,
    F1_CACHE_TAGS,
    fetchJolpicaPages,
    fetchOpenF1Json,
    logOpenF1Failure,
    UpstreamError,
} from './http';
import { getSeasonYear } from './year';

const SESSION_FIELDS = [
    ['firstPractice', ['FirstPractice'], ['practice 1', 'first practice']],
    ['secondPractice', ['SecondPractice'], ['practice 2', 'second practice']],
    ['thirdPractice', ['ThirdPractice'], ['practice 3', 'third practice']],
    ['sprintQualifying', ['SprintQualifying', 'SprintShootout'], ['sprint qualifying', 'sprint shootout']],
    ['sprint', ['Sprint'], ['sprint']],
    ['qualifying', ['Qualifying'], ['qualifying']],
    ['race', ['Race'], ['race']],
];

const SESSION_DURATION_MS = Object.freeze({
    firstPractice: 60 * 60 * 1000,
    secondPractice: 60 * 60 * 1000,
    thirdPractice: 60 * 60 * 1000,
    sprintQualifying: 44 * 60 * 1000,
    qualifying: 60 * 60 * 1000,
    sprint: 60 * 60 * 1000,
    race: 3 * 60 * 60 * 1000,
});

const CIRCUIT_NAME_ALIASES = {
    albert_park: ['albert park', 'melbourne'],
    shanghai: ['shanghai'],
    suzuka: ['suzuka'],
    bahrain: ['bahrain', 'sakhir'],
    jeddah: ['jeddah'],
    miami: ['miami'],
    villeneuve: ['montreal', 'gilles-villeneuve'],
    monaco: ['monaco', 'monte carlo'],
    catalunya: ['barcelona', 'catalunya'],
    red_bull_ring: ['spielberg', 'red bull ring'],
    silverstone: ['silverstone'],
    spa: ['spa-francorchamps', 'spa'],
    hungaroring: ['hungaroring', 'budapest'],
    zandvoort: ['zandvoort'],
    monza: ['monza'],
    madring: ['madring', 'madrid'],
    baku: ['baku'],
    marina_bay: ['singapore', 'marina bay'],
    americas: ['austin', 'cota', 'circuit of the americas'],
    rodriguez: ['mexico city', 'autodromo hermanos rodriguez'],
    interlagos: ['sao paulo', 'interlagos'],
    vegas: ['las vegas'],
    losail: ['lusail', 'losail'],
    yas_marina: ['yas marina', 'abu dhabi'],
    sepang: ['sepang', 'kuala lumpur'],
};

function normalize(value) {
    return String(value || '')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function normalizeCountry(value) {
    const country = normalize(value);
    const aliases = {
        usa: 'united states',
        us: 'united states',
        uk: 'united kingdom',
        uae: 'united arab emirates',
        korea: 'south korea',
        'republic of korea': 'south korea',
    };
    return aliases[country] || country;
}

function toIsoUtc(date, time) {
    if (!date) return null;
    let value = String(date);
    if (time) value = `${value}T${time}`;
    else if (!value.includes('T')) return null;
    if (!/(Z|[+-]\d{2}:?\d{2})$/i.test(value)) value += 'Z';
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function getMRDataRows(mrData) {
    return mrData?.RaceTable?.Races || [];
}

function isCancelled(meeting) {
    return meeting?.is_cancelled === true || meeting?.is_cancelled === 1 || meeting?.is_cancelled === 'true';
}

function isTesting(meeting) {
    return /\btest(?:ing)?\b/i.test(`${meeting?.meeting_name || ''} ${meeting?.meeting_official_name || ''}`);
}

function sessionType(session) {
    const name = normalize(session?.session_name || session?.session_type);
    if (name.includes('sprint qualifying') || name.includes('sprint shootout')) return 'sprintQualifying';
    if (name === 'sprint') return 'sprint';
    if (name === 'race') return 'race';
    if (name.includes('qualifying')) return 'qualifying';
    if (name === 'practice 1' || name === 'free practice 1') return 'firstPractice';
    if (name === 'practice 2' || name === 'free practice 2') return 'secondPractice';
    if (name === 'practice 3' || name === 'free practice 3') return 'thirdPractice';
    return null;
}

function circuitMatches(race, meeting) {
    const circuitId = String(race?.Circuit?.circuitId || '').toLowerCase();
    const candidates = CIRCUIT_NAME_ALIASES[circuitId] || [race?.Circuit?.circuitName];
    const meetingCircuit = normalize(meeting?.circuit_short_name);
    const raceCountry = normalizeCountry(race?.Circuit?.Location?.country);
    const meetingCountry = normalizeCountry(meeting?.country_name);
    return (raceCountry !== '' && raceCountry === meetingCountry)
        || candidates.some((candidate) => normalize(candidate) === meetingCircuit);
}

/** Find the OpenF1 meeting for a Jolpica race: same weekend, never testing or cancelled. */
function findMeeting(race, meetings) {
    const raceStart = raceDateAnchor(race);
    const sameWeekend = meetings.filter((item) => !isCancelled(item) && !isTesting(item)
        && meetingWithinFourDays(raceStart, item));
    return sameWeekend.find((item) => circuitMatches(race, item))
        || (sameWeekend.length === 1 ? sameWeekend[0] : null);
}

function meetingWithinFourDays(raceStart, meeting) {
    const raceTimestamp = Date.parse(raceStart || '');
    const meetingTimestamps = [meeting?.date_start, meeting?.date_end]
        .map((date) => Date.parse(date || ''))
        .filter(Number.isFinite);
    if (!Number.isFinite(raceTimestamp) || meetingTimestamps.length === 0) return false;
    return Math.min(...meetingTimestamps.map((date) => Math.abs(date - raceTimestamp))) <= 4 * 86400000;
}

function raceDateAnchor(race) {
    return toIsoUtc(race?.date, race?.time) || toIsoUtc(`${race?.date || ''}T00:00:00Z`, null);
}

function sessionForRace(weekendSessions, field) {
    const accepted = SESSION_FIELDS.find(([key]) => key === field)?.[2] || [];
    return weekendSessions.find((session) => {
        const type = sessionType(session);
        if (type === field) return true;
        const name = normalize(session?.session_name);
        return accepted.some((alias) => name === normalize(alias));
    });
}

function mapRace(race, year, meetings, sessions) {
    const meeting = findMeeting(race, meetings);
    const eventSessions = meeting
        ? sessions.filter((session) => String(session.meeting_key) === String(meeting.meeting_key))
        : [];
    const starts = {};
    for (const [key, jolpicaFields] of SESSION_FIELDS) {
        // Jolpica puts the Race start on the race object itself, other sessions in sub-objects.
        const source = key === 'race'
            ? (race.Race || race)
            : jolpicaFields.map((field) => race[field]).find(Boolean);
        const jolpicaStart = toIsoUtc(source?.date, source?.time);
        const openF1Session = sessionForRace(eventSessions, key);
        starts[key] = jolpicaStart || toIsoUtc(openF1Session?.date_start, null);
    }

    const sessionWindows = eventSessions
        .map((session) => ({
            session: sessionType(session),
            start: session.date_start || null,
            end: session.date_end || null,
        }))
        .filter((window) => window.start && window.end);
    for (const [key] of SESSION_FIELDS) {
        const hasOpenF1Window = sessionWindows.some((window) => window.session === key);
        if (hasOpenF1Window || !starts[key] || !SESSION_DURATION_MS[key]) continue;
        const start = Date.parse(starts[key]);
        if (!Number.isFinite(start)) continue;
        sessionWindows.push({
            session: key,
            start: starts[key],
            end: new Date(start + SESSION_DURATION_MS[key]).toISOString(),
        });
    }
    const circuit = race.Circuit || {};

    return {
        year: Number(year),
        round: Number(race.round),
        raceName: race.raceName,
        circuit: {
            id: circuit.circuitId,
            name: circuit.circuitName,
            locality: circuit.Location?.locality || null,
            country: circuit.Location?.country || null,
        },
        meetingKey: meeting?.meeting_key ?? null,
        // Year-round keys keep race URLs stable whether or not OpenF1 is reachable.
        routeKey: `${Number(year)}-${Number(race.round)}`,
        raceStart: starts.race,
        // Jolpica has no start time for most races before 2005.
        raceDate: (race.Race || race).date || null,
        sessions: starts,
        sessionWindows,
        is_testing: false,
        is_cancelled: false,
    };
}

function mapMeeting(meeting) {
    return {
        meetingKey: meeting?.meeting_key ?? null,
        name: meeting?.meeting_name || meeting?.meeting_official_name || 'Testing',
        circuitShortName: meeting?.circuit_short_name || null,
        country: meeting?.country_name || null,
        dateStart: meeting?.date_start || null,
        dateEnd: meeting?.date_end || null,
        is_testing: isTesting(meeting),
        is_cancelled: isCancelled(meeting),
    };
}

async function loadOpenF1Meetings(year) {
    const meetings = await fetchOpenF1Json(`meetings?year=${encodeURIComponent(year)}`);
    if (!Array.isArray(meetings)) {
        const error = new UpstreamError('OpenF1 returned an invalid meeting list', { source: 'OpenF1' });
        logOpenF1Failure(error);
        throw error;
    }
    return meetings;
}

async function loadOpenF1Sessions(year) {
    const sessions = await fetchOpenF1Json(`sessions?year=${encodeURIComponent(year)}`);
    if (!Array.isArray(sessions)) {
        const error = new UpstreamError('OpenF1 returned an invalid session list', { source: 'OpenF1' });
        logOpenF1Failure(error);
        throw error;
    }
    return sessions;
}

const cachedOpenF1Meetings = cacheF1Data(
    loadOpenF1Meetings,
    ['openf1-meetings'],
    86400,
    [F1_CACHE_TAGS.calendar],
);
const cachedOpenF1Sessions = cacheF1Data(
    loadOpenF1Sessions,
    ['openf1-calendar-sessions'],
    86400,
    [F1_CACHE_TAGS.calendar],
);

async function loadCalendar(year) {
    const openF1Available = Number(year) >= 2018;
    const [raceResult, meetingsResult, sessionsResult] = await Promise.allSettled([
        fetchJolpicaPages(`${year}/races`, {
            select: getMRDataRows,
            revalidate: 3600,
            tags: [F1_CACHE_TAGS.calendar],
        }),
        openF1Available ? cachedOpenF1Meetings(Number(year)) : Promise.resolve([]),
        openF1Available ? cachedOpenF1Sessions(Number(year)) : Promise.resolve([]),
    ]);
    if (raceResult.status === 'rejected') throw raceResult.reason;
    const races = raceResult.value;
    // Meetings and their session windows must be interpreted together. If
    // either enrichment fails, Jolpica remains the complete calendar source.
    const openF1Succeeded = meetingsResult.status === 'fulfilled' && sessionsResult.status === 'fulfilled';
    const meetings = openF1Succeeded ? meetingsResult.value : [];
    const sessions = openF1Succeeded ? sessionsResult.value : [];

    const canonicalRaces = races.filter((race) => {
        const raceStart = raceDateAnchor(race);
        return !meetings.some((meeting) => isCancelled(meeting)
            && circuitMatches(race, meeting)
            && meetingWithinFourDays(raceStart, meeting));
    });
    const rounds = canonicalRaces
        .map((race) => mapRace(race, year, meetings, sessions))
        .sort((a, b) => a.round - b.round);
    return {
        year: Number(year),
        rounds,
        events: rounds,
        testing: meetings.filter(isTesting).map(mapMeeting),
        cancelled: meetings.filter(isCancelled).map(mapMeeting),
    };
}

const cachedCalendar = cacheF1Data(
    loadCalendar,
    ['calendar'],
    3600,
    [F1_CACHE_TAGS.calendar],
);

const RACE_DURATION_MS = 3 * 60 * 60 * 1000;

/** Status is computed per call so a cached calendar never reports a stale state. */
export function eventStatus(event, now = Date.now()) {
    const windows = [...(event.sessionWindows || [])];
    const representedSessions = new Set(windows.map((window) => window.session).filter(Boolean));
    for (const [session, startValue] of Object.entries(event.sessions || {})) {
        if (representedSessions.has(session) || !SESSION_DURATION_MS[session] || !startValue) continue;
        if (windows.some((window) => Date.parse(window.start || '') === Date.parse(startValue))) continue;
        const start = Date.parse(startValue);
        if (Number.isFinite(start)) {
            windows.push({ start: startValue, end: new Date(start + SESSION_DURATION_MS[session]).toISOString() });
        }
    }
    const isLive = windows.some((window) => {
        const start = Date.parse(window.start);
        const end = Date.parse(window.end);
        return now >= start && now <= end;
    });
    if (isLive) return 'live';
    const raceStart = Date.parse(event.raceStart || '');
    if (Number.isFinite(raceStart) && now >= raceStart + RACE_DURATION_MS) return 'completed';
    const raceDayEnd = Date.parse(event.raceDate ? `${event.raceDate}T23:59:59Z` : '');
    if (!Number.isFinite(raceStart) && Number.isFinite(raceDayEnd) && now > raceDayEnd) return 'completed';
    const firstSession = Math.min(...Object.values(event.sessions || {})
        .map((value) => Date.parse(value || ''))
        .filter(Number.isFinite));
    if (Number.isFinite(firstSession) && now >= firstSession) return 'weekend';
    return 'upcoming';
}

export function withStatus(calendar, now = Date.now()) {
    const rounds = calendar.rounds.map((event) => ({ ...event, status: eventStatus(event, now) }));
    return { ...calendar, rounds, events: rounds };
}

export async function getCalendar(year = getSeasonYear(), now = Date.now()) {
    return withStatus(await cachedCalendar(Number(year)), now);
}

function upcomingRace(rounds, now) {
    return rounds
        .filter((event) => event.raceStart && Date.parse(event.raceStart) + RACE_DURATION_MS > now)
        .sort((a, b) => Date.parse(a.raceStart) - Date.parse(b.raceStart))[0] || null;
}

/** The next race whose Race session hasn't finished; rolls into next season after the finale. */
export async function getNextRace(year = getSeasonYear(), now = Date.now()) {
    const { rounds } = await getCalendar(year, now);
    const next = upcomingRace(rounds, now);
    if (next || Number(year) !== getSeasonYear()) return next;
    try {
        const following = await getCalendar(Number(year) + 1, now);
        return upcomingRace(following.rounds, now);
    } catch {
        return null;
    }
}

/** The most recent completed race of the season, or null before round 1. */
export async function getLastRace(year = getSeasonYear(), now = Date.now()) {
    const { rounds } = await getCalendar(year, now);
    return rounds.filter((event) => event.status === 'completed').at(-1) || null;
}

async function meetingYear(key) {
    const meetings = await fetchOpenF1Json(`meetings?meeting_key=${encodeURIComponent(key)}`);
    if (!Array.isArray(meetings)) {
        const error = new UpstreamError('OpenF1 returned an invalid meeting list', { source: 'OpenF1' });
        logOpenF1Failure(error);
        throw error;
    }
    const year = Number(meetings[0]?.year);
    return Number.isFinite(year) ? year : null;
}

const cachedMeetingYear = cacheF1Data(meetingYear, ['meeting-year'], 86400, [F1_CACHE_TAGS.calendar]);

/**
 * Resolve an OpenF1 meeting key to its event. Returns { kind: 'race', event },
 * { kind: 'testing' | 'cancelled', meeting } or null when the key is unknown.
 */
export async function getEventByMeetingKey(key, year = null) {
    if (key == null) return null;
    const routeKey = /^(\d{4})-(\d+)$/.exec(String(key));
    if (!/^\d+$/.test(String(key)) && !routeKey) return null;
    const resolvedYear = routeKey ? Number(routeKey[1]) : year ?? await cachedMeetingYear(String(key));
    if (!resolvedYear) return null;
    const calendar = await getCalendar(resolvedYear);
    const event = routeKey
        ? calendar.rounds.find((item) => item.round === Number(routeKey[2]))
        : calendar.rounds.find((item) => String(item.meetingKey) === String(key));
    if (event) return { kind: 'race', event };
    const testing = calendar.testing.find((item) => String(item.meetingKey) === String(key));
    if (testing) return { kind: 'testing', meeting: testing };
    const cancelled = calendar.cancelled.find((item) => String(item.meetingKey) === String(key));
    if (cancelled) return { kind: 'cancelled', meeting: cancelled };
    return null;
}

export async function getEventByRound(year, round) {
    const { rounds } = await getCalendar(year);
    return rounds.find((event) => event.round === Number(round)) || null;
}


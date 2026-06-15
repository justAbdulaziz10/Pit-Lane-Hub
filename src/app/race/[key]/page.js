import { getQualifyingResults, getRaceResults, getSchedule } from '@/lib/f1api';
import { SCHEDULE_2026 } from '@/lib/schedule2026';
import { getTrackInfo } from '@/lib/tracks';
import Link from 'next/link';
import RaceMap from './RaceMap';
import styles from './page.module.css';

export const revalidate = 3600;

const safelyFormatDate = (dateString, options) => {
    if (!dateString) return 'TBA';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'TBA';
    return date.toLocaleDateString('en-US', options);
};

const safelyFormatTime = (dateString, options) => {
    if (!dateString) return 'TBA';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'TBA';
    return date.toLocaleTimeString('en-US', options);
};

const getYearFromDate = (dateString) => {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? new Date().getFullYear() : date.getFullYear();
};

const getYouTubeSearchUrl = (raceName, year) => {
    const query = encodeURIComponent(`F1 ${year} ${raceName || 'F1 Race'} Race Highlights`);
    return `https://www.youtube.com/results?search_query=${query}`;
};

async function getMeeting(meetingKey) {
    try {
        const res = await fetch(`https://api.openf1.org/v1/meetings?meeting_key=${meetingKey}`, {
            next: { revalidate: 3600 },
        });
        if (res.ok) {
            const data = await res.json();
            if (data.length > 0) return data[0];
        }
    } catch (e) {
        console.error('Error fetching meeting:', e);
    }
    // Last-resort fallback to the static calendar (future races not yet in OpenF1).
    return (
        SCHEDULE_2026.find(
            (r) =>
                String(r.meeting_key) === String(meetingKey) ||
                String(r.circuit_key) === String(meetingKey)
        ) || null
    );
}

async function getMeetingSessions(meetingKey) {
    try {
        const res = await fetch(`https://api.openf1.org/v1/sessions?meeting_key=${meetingKey}`, {
            next: { revalidate: 3600 },
        });
        if (res.ok) return await res.json();
    } catch (e) {
        console.error('Error fetching sessions:', e);
    }
    return [];
}

// Match an OpenF1 meeting to its Ergast round by country, then nearest date.
function matchScheduleRound(schedule, meeting) {
    if (!schedule.length) return null;
    const country = (meeting.country_name || '').toLowerCase();
    const target = new Date(meeting.date_start).getTime();
    const byCountry = schedule.filter(
        (r) => (r.circuit.country || '').toLowerCase() === country
    );
    const pool = byCountry.length ? byCountry : schedule;
    if (!Number.isFinite(target)) return byCountry[0] || null;
    return pool.reduce((best, r) => {
        const diff = Math.abs(new Date(r.date).getTime() - target);
        if (!best || diff < best.diff) return { race: r, diff };
        return best;
    }, null)?.race || null;
}

// Build a normalized weekend schedule from real Ergast session times.
function sessionsFromSchedule(scheduleRace) {
    if (!scheduleRace) return [];
    const s = scheduleRace.sessions || {};
    const toIso = (obj) => (obj?.date ? `${obj.date}T${obj.time || '00:00:00Z'}` : null);
    return [
        s.firstPractice && { session_name: 'Practice 1', session_type: 'Practice', date_start: toIso(s.firstPractice) },
        s.secondPractice && { session_name: 'Practice 2', session_type: 'Practice', date_start: toIso(s.secondPractice) },
        s.thirdPractice && { session_name: 'Practice 3', session_type: 'Practice', date_start: toIso(s.thirdPractice) },
        s.sprintQualifying && { session_name: 'Sprint Qualifying', session_type: 'Qualifying', date_start: toIso(s.sprintQualifying) },
        s.sprint && { session_name: 'Sprint', session_type: 'Race', date_start: toIso(s.sprint) },
        s.qualifying && { session_name: 'Qualifying', session_type: 'Qualifying', date_start: toIso(s.qualifying) },
        { session_name: 'Race', session_type: 'Race', date_start: toIso({ date: scheduleRace.date, time: scheduleRace.time }) },
    ].filter(Boolean);
}

export async function generateMetadata({ params }) {
    const { key } = await params;
    const race = await getMeeting(key);
    const name = race?.meeting_name || 'Race Weekend';
    return {
        title: `${name} · Pit Lane Hub`,
        description: `Schedule, results and circuit details for the ${name}.`,
    };
}

export default async function RaceDetailPage({ params }) {
    const { key: meetingKey } = await params;

    const [race, openF1Sessions] = await Promise.all([
        getMeeting(meetingKey),
        getMeetingSessions(meetingKey),
    ]);

    if (!race) {
        return (
            <div className={styles.raceDetail}>
                <div className={styles.notFound}>
                    <h1>Race Not Found</h1>
                    <p>Depending on API availability, this race might not be accessible yet.</p>
                    <Link href="/schedule" className={styles.backBtn}>← Back to Calendar</Link>
                </div>
            </div>
        );
    }

    const trackInfo = getTrackInfo(race.meeting_name || race.circuit_short_name, race.circuit_key);
    const year = race.year || getYearFromDate(race.date_start);
    const youtubeUrl = getYouTubeSearchUrl(race.meeting_name, year);

    // Map the meeting to its Ergast round, then pull real results + qualifying.
    const schedule = await getSchedule(year);
    const matched = matchScheduleRound(schedule, race);
    const round = matched?.round || null;

    const [raceResults, qualifying] = round
        ? await Promise.all([getRaceResults(year, round), getQualifyingResults(year, round)])
        : [null, null];

    // Prefer real OpenF1 session times; otherwise fall back to real Ergast schedule
    // times. Never fabricate.
    const sessions = openF1Sessions.length ? openF1Sessions : sessionsFromSchedule(matched);

    return (
        <div className={styles.raceDetail}>
            {/* Hero */}
            <div className={styles.hero}>
                <div className={styles.heroOverlay}></div>
                <div className={styles.heroContent}>
                    <Link href="/schedule" className={styles.backLink}>← Back to Calendar</Link>
                    {round && <span className={styles.round}>ROUND {round}</span>}
                    <h1>{race.meeting_name || matched?.raceName || 'Race Weekend'}</h1>
                    <p className={styles.circuit}>{race.circuit_short_name || matched?.circuit?.name || 'Circuit'}</p>
                    <p className={styles.location}>📍 {race.country_name || matched?.circuit?.country || 'Unknown Location'}</p>
                    <p className={styles.date}>
                        {safelyFormatDate(race.date_start || matched?.date, {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                        })}
                    </p>
                </div>
            </div>

            {/* Track Map (client island for 2D/3D toggle) */}
            <RaceMap trackInfo={trackInfo} />

            {/* Race Results */}
            {raceResults?.results?.length > 0 && (
                <div className={styles.resultsBlock}>
                    <div className="container">
                        <h2>🏆 Race Results</h2>
                        <div className={styles.resultsTable}>
                            <div className={`${styles.resultRow} ${styles.resultHead}`}>
                                <span>Pos</span>
                                <span>Driver</span>
                                <span>Team</span>
                                <span>Grid</span>
                                <span>Pts</span>
                            </div>
                            {raceResults.results.map((r) => (
                                <div key={r.driver.id} className={styles.resultRow}>
                                    <span className={styles.resultPos}>{r.position}</span>
                                    <span className={styles.resultDriver}>
                                        {r.driver.firstName} <strong>{r.driver.lastName}</strong>
                                    </span>
                                    <span className={styles.resultTeam}>{r.team}</span>
                                    <span>{Number.isFinite(r.grid) ? r.grid : '—'}</span>
                                    <span className={styles.resultPts}>{r.points}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Qualifying Results */}
            {qualifying?.results?.length > 0 && (
                <div className={styles.resultsBlock}>
                    <div className="container">
                        <h2>⏱️ Qualifying</h2>
                        <div className={styles.resultsTable}>
                            <div className={`${styles.resultRow} ${styles.qualiRow} ${styles.resultHead}`}>
                                <span>Pos</span>
                                <span>Driver</span>
                                <span>Q1</span>
                                <span>Q2</span>
                                <span>Q3</span>
                            </div>
                            {qualifying.results.map((q) => (
                                <div key={q.driver.id} className={`${styles.resultRow} ${styles.qualiRow}`}>
                                    <span className={styles.resultPos}>{q.position}</span>
                                    <span className={styles.resultDriver}>
                                        {q.driver.firstName} <strong>{q.driver.lastName}</strong>
                                    </span>
                                    <span className={styles.qTime}>{q.q1 || '—'}</span>
                                    <span className={styles.qTime}>{q.q2 || '—'}</span>
                                    <span className={styles.qTime}>{q.q3 || '—'}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Sessions */}
            <div className={styles.sessionsSection}>
                <div className="container">
                    <h2>📅 Race Weekend Schedule</h2>
                    {sessions.length > 0 ? (
                        <div className={styles.sessionsGrid}>
                            {sessions.map((session, index) => (
                                <div key={session.session_key || index} className={styles.sessionCard}>
                                    <span className={styles.sessionType}>{session.session_type || 'Session'}</span>
                                    <h3>{session.session_name || 'Session'}</h3>
                                    <p className={styles.sessionTime}>
                                        {safelyFormatDate(session.date_start, {
                                            weekday: 'short',
                                            month: 'short',
                                            day: 'numeric',
                                        })}
                                        {' • '}
                                        {safelyFormatTime(session.date_start, {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className={styles.noSessions}>Session schedule not yet available</p>
                    )}
                </div>
            </div>

            {/* YouTube Videos */}
            <div className={styles.videoSection}>
                <div className="container">
                    <h2>🎬 Race Highlights</h2>
                    <p className={styles.videoDescription}>
                        Watch official F1 race highlights and analysis on YouTube
                    </p>
                    <div className={styles.videoActions}>
                        <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" className={styles.youtubeBtn}>
                            <svg viewBox="0 0 24 24" className={styles.youtubeIcon}>
                                <path fill="currentColor" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                            </svg>
                            Watch Highlights
                        </a>
                        <a
                            href={`https://www.youtube.com/results?search_query=F1+${year}+${encodeURIComponent(race.meeting_name || 'Race')}+full+race`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.youtubeSecondary}
                        >
                            Full Race Replay ↗
                        </a>
                    </div>
                </div>
            </div>

            {/* Quick Links */}
            <div className={styles.linksSection}>
                <div className="container">
                    <h2>🔗 Quick Links</h2>
                    <div className={styles.linksGrid}>
                        <a href="https://www.formula1.com/en/results" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
                            <span>🏆</span>
                            <h3>Official Results</h3>
                            <p>View race results on F1.com</p>
                        </a>
                        <Link href="/standings" className={styles.linkCard}>
                            <span>📊</span>
                            <h3>Standings</h3>
                            <p>Current championship</p>
                        </Link>
                        <Link href="/drivers" className={styles.linkCard}>
                            <span>👤</span>
                            <h3>Drivers</h3>
                            <p>View all drivers</p>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

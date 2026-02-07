'use client';

import { getTrackInfo } from '@/lib/tracks';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import styles from './page.module.css';

import { SCHEDULE_2026 } from '@/lib/schedule2026';

// F1 Official YouTube channel race highlights (generic search link)
const getYouTubeSearchUrl = (raceName, year) => {
    const query = encodeURIComponent(`F1 ${year} ${raceName} Race Highlights`);
    return `https://www.youtube.com/results?search_query=${query}`;
};

export default function RaceDetailPage() {
    const params = useParams();
    const meetingKey = params.key;

    const [race, setRace] = useState(null);
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [is3DMode, setIs3DMode] = useState(false);

    useEffect(() => {
        async function fetchRaceData() {
            try {
                // Fetch meeting/race info
                const meetingsRes = await fetch(`https://api.openf1.org/v1/meetings?meeting_key=${meetingKey}`);
                const meetingsData = await meetingsRes.json();

                if (meetingsData.length > 0) {
                    setRace(meetingsData[0]);

                    // Fetch sessions for this race
                    const sessionsRes = await fetch(`https://api.openf1.org/v1/sessions?meeting_key=${meetingKey}`);
                    const sessionsData = await sessionsRes.json();
                    setSessions(sessionsData);
                } else {
                    // Fallback to 2026 data
                    const race2026 = SCHEDULE_2026.find(r => r.meeting_key == meetingKey);
                    if (race2026) {
                        setRace({
                            ...race2026,
                            meeting_key: parseInt(race2026.meeting_key) || 999
                        });

                        // Generate mock sessions for 2026
                        const startDate = new Date(race2026.date_start);
                        const sessionsMock = [
                            { session_name: 'Practice 1', session_type: 'Practice', date_start: new Date(startDate.getTime() + 10 * 3600000).toISOString() },
                            { session_name: 'Practice 2', session_type: 'Practice', date_start: new Date(startDate.getTime() + 14 * 3600000).toISOString() },
                            { session_name: 'Practice 3', session_type: 'Practice', date_start: new Date(startDate.getTime() + 24 * 3600000 + 11 * 3600000).toISOString() },
                            { session_name: 'Qualifying', session_type: 'Qualifying', date_start: new Date(startDate.getTime() + 24 * 3600000 + 14 * 3600000).toISOString() },
                            { session_name: 'Race', session_type: 'Race', date_start: new Date(startDate.getTime() + 48 * 3600000 + 13 * 3600000).toISOString() }
                        ];
                        setSessions(sessionsMock);
                    }
                }

            } catch (e) {
                console.error('Error fetching race data:', e);
            }
            setLoading(false);
        }

        if (meetingKey) {
            fetchRaceData();
        }
    }, [meetingKey]);

    // getTrackInfo is imported from lib/tracks now

    if (loading) {
        return (
            <div className={styles.raceDetail}>
                <div className={styles.loading}>
                    <div className={styles.spinner}></div>
                    <p>Loading race details...</p>
                </div>
            </div>
        );
    }

    if (!race) {
        return (
            <div className={styles.raceDetail}>
                <div className={styles.notFound}>
                    <h1>Race Not Found</h1>
                    <Link href="/schedule" className={styles.backBtn}>← Back to Calendar</Link>
                </div>
            </div>
        );
    }

    const trackInfo = getTrackInfo(race.meeting_name || race.circuit_short_name, race.circuit_key);
    const year = new Date(race.date_start).getFullYear();
    const youtubeUrl = getYouTubeSearchUrl(race.meeting_name, year);

    return (
        <div className={styles.raceDetail}>
            {/* Hero */}
            <div className={styles.hero}>
                <div className={styles.heroOverlay}></div>
                <div className={styles.heroContent}>
                    <Link href="/schedule" className={styles.backLink}>← Back to Calendar</Link>
                    <span className={styles.round}>ROUND {(race.meeting_key && !isNaN(race.meeting_key)) ? (race.meeting_key % 24 || 24) : 1}</span>
                    <h1>{race.meeting_name}</h1>
                    <p className={styles.circuit}>{race.circuit_short_name}</p>
                    <p className={styles.location}>📍 {race.country_name}</p>
                    <p className={styles.date} suppressHydrationWarning>
                        {race.date_start ? new Date(race.date_start).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                        }) : 'Date TBD'}
                    </p>
                </div>
            </div>

            {/* Track Map */}
            <div className={styles.mapSection}>
                <div className="container">
                    <div className={styles.mapHeader}>
                        <h2>🗺️ Circuit Location</h2>
                        <div className={styles.mapControls}>
                            <button
                                className={`${styles.mapControlBtn} ${!is3DMode ? styles.active : ''}`}
                                onClick={() => setIs3DMode(false)}
                            >
                                2D Map
                            </button>
                            <button
                                className={`${styles.mapControlBtn} ${is3DMode ? styles.active : ''}`}
                                onClick={() => setIs3DMode(true)}
                            >
                                3D View
                            </button>
                        </div>
                    </div>
                    {trackInfo ? (
                        <div className={`${styles.mapContainer} ${is3DMode ? styles.is3D : ''}`}>
                            <div className={styles.mapWrapper}>
                                <iframe
                                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${trackInfo.lng - 0.02}%2C${trackInfo.lat - 0.015}%2C${trackInfo.lng + 0.02}%2C${trackInfo.lat + 0.015}&layer=mapnik&marker=${trackInfo.lat}%2C${trackInfo.lng}`}
                                    className={styles.map}
                                    loading="lazy"
                                ></iframe>
                            </div>
                            {is3DMode && (
                                <div className={styles.mapOverlay3D}>
                                    <p>Interactive 3D Perspective</p>
                                </div>
                            )}
                            <a
                                href={`https://www.google.com/maps?q=${trackInfo.lat},${trackInfo.lng}&z=15&t=k`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.mapLink}
                            >
                                View Satellite 3D in Google Earth ↗
                            </a>
                        </div>
                    ) : (
                        <div className={styles.mapPlaceholder}>
                            <span>🗺️</span>
                            <p>Track map not available</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Sessions */}
            <div className={styles.sessionsSection}>
                <div className="container">
                    <h2>📅 Race Weekend Schedule</h2>
                    {sessions.length > 0 ? (
                        <div className={styles.sessionsGrid}>
                            {sessions.map((session, index) => (
                                <div key={session.session_key || index} className={styles.sessionCard}>
                                    <span className={styles.sessionType}>{session.session_type || 'Session'}</span>
                                    <h3>{session.session_name}</h3>
                                    <p className={styles.sessionTime} suppressHydrationWarning>
                                        {new Date(session.date_start).toLocaleDateString('en-US', {
                                            weekday: 'short',
                                            month: 'short',
                                            day: 'numeric'
                                        })}
                                        {' • '}
                                        {new Date(session.date_start).toLocaleTimeString('en-US', {
                                            hour: '2-digit',
                                            minute: '2-digit'
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
                        <a
                            href={youtubeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.youtubeBtn}
                        >
                            <svg viewBox="0 0 24 24" className={styles.youtubeIcon}>
                                <path fill="currentColor" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                            </svg>
                            Watch {race.meeting_name} Highlights
                        </a>
                        <a
                            href={`https://www.youtube.com/results?search_query=F1+${year}+${encodeURIComponent(race.meeting_name)}+full+race`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.youtubeSecondary}
                        >
                            Full Race Replay ↗
                        </a>
                        <a
                            href={`https://www.youtube.com/results?search_query=F1+${year}+${encodeURIComponent(race.meeting_name)}+qualifying`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.youtubeSecondary}
                        >
                            Qualifying Highlights ↗
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
                            <p>View all 2026 drivers</p>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

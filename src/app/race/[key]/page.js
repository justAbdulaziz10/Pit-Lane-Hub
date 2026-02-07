'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import styles from './page.module.css';

// Track coordinates for visualization (approximate)
const TRACK_COORDS = {
    'bahrain': { lat: 26.0325, lng: 50.5106, country: 'Bahrain', title: 'Bahrain International Circuit' },
    'jeddah': { lat: 21.6319, lng: 39.1044, country: 'Saudi Arabia', title: 'Jeddah Corniche Circuit' },
    'melbourne': { lat: -37.8497, lng: 144.968, country: 'Australia', title: 'Albert Park Circuit' },
    'suzuka': { lat: 34.8432, lng: 136.5409, country: 'Japan', title: 'Suzuka Circuit' },
    'shanghai': { lat: 31.3389, lng: 121.2197, country: 'China', title: 'Shanghai International Circuit' },
    'miami': { lat: 25.9581, lng: -80.2389, country: 'USA', title: 'Miami International Autodrome' },
    'imola': { lat: 44.3439, lng: 11.7133, country: 'Italy', title: 'Autodromo Enzo e Dino Ferrari' },
    'monaco': { lat: 43.7347, lng: 7.4206, country: 'Monaco', title: 'Circuit de Monaco' },
    'montreal': { lat: 45.5048, lng: -73.5262, country: 'Canada', title: 'Circuit Gilles Villeneuve' },
    'barcelona': { lat: 41.57, lng: 2.2611, country: 'Spain', title: 'Circuit de Barcelona-Catalunya' },
    'spielberg': { lat: 47.2197, lng: 14.7647, country: 'Austria', title: 'Red Bull Ring' },
    'silverstone': { lat: 52.0733, lng: -1.0147, country: 'UK', title: 'Silverstone Circuit' },
    'budapest': { lat: 47.5789, lng: 19.2486, country: 'Hungary', title: 'Hungaroring' },
    'spa': { lat: 50.4372, lng: 5.9714, country: 'Belgium', title: 'Circuit de Spa-Francorchamps' },
    'zandvoort': { lat: 52.3888, lng: 4.5409, country: 'Netherlands', title: 'Circuit Zandvoort' },
    'monza': { lat: 45.6156, lng: 9.2811, country: 'Italy', title: 'Autodromo Nazionale Monza' },
    'baku': { lat: 40.3725, lng: 49.8533, country: 'Azerbaijan', title: 'Baku City Circuit' },
    'singapore': { lat: 1.2914, lng: 103.8644, country: 'Singapore', title: 'Marina Bay Street Circuit' },
    'austin': { lat: 30.1328, lng: -97.6411, country: 'USA', title: 'Circuit of the Americas' },
    'mexico': { lat: 19.4042, lng: -99.0907, country: 'Mexico', title: 'Autódromo Hermanos Rodríguez' },
    'sao paulo': { lat: -23.7036, lng: -46.6997, country: 'Brazil', title: 'Interlagos Circuit' },
    'las vegas': { lat: 36.1147, lng: -115.173, country: 'USA', title: 'Las Vegas Strip Circuit' },
    'lusail': { lat: 25.49, lng: 51.4542, country: 'Qatar', title: 'Lusail International Circuit' },
    'yas marina': { lat: 24.4672, lng: 54.6031, country: 'UAE', title: 'Yas Marina Circuit' },
};

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
                }

                // Fetch sessions for this race
                const sessionsRes = await fetch(`https://api.openf1.org/v1/sessions?meeting_key=${meetingKey}`);
                const sessionsData = await sessionsRes.json();
                setSessions(sessionsData);

            } catch (e) {
                console.error('Error fetching race data:', e);
            }
            setLoading(false);
        }

        if (meetingKey) {
            fetchRaceData();
        }
    }, [meetingKey]);

    // Find track coordinates
    const getTrackInfo = (raceName) => {
        if (!raceName) return null;
        const name = raceName.toLowerCase();
        for (const [key, value] of Object.entries(TRACK_COORDS)) {
            if (name.includes(key)) {
                return value;
            }
        }
        return null;
    };

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

    const trackInfo = getTrackInfo(race.meeting_name || race.circuit_short_name);
    const year = new Date(race.date_start).getFullYear();
    const youtubeUrl = getYouTubeSearchUrl(race.meeting_name, year);

    return (
        <div className={styles.raceDetail}>
            {/* Hero */}
            <div className={styles.hero}>
                <div className={styles.heroOverlay}></div>
                <div className={styles.heroContent}>
                    <Link href="/schedule" className={styles.backLink}>← Back to Calendar</Link>
                    <span className={styles.round}>ROUND {race.meeting_key % 24 || 1}</span>
                    <h1>{race.meeting_name}</h1>
                    <p className={styles.circuit}>{race.circuit_short_name}</p>
                    <p className={styles.location}>📍 {race.country_name}</p>
                    <p className={styles.date}>
                        {new Date(race.date_start).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                        })}
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
                                    <p className={styles.sessionTime}>
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

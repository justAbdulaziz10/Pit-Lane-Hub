'use client';

import { getDrivers, getTeamColor } from '@/lib/f1api';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import styles from './page.module.css';

export default function DriverDetailPage() {
    const params = useParams();
    const driverNumber = params.number;

    const [driver, setDriver] = useState(null);
    const [sessions, setSessions] = useState([]);
    const [recentResults, setRecentResults] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchDriverData() {
            try {
                // Fetch driver info using helper to get nationality fallbacks
                const drivers = await getDrivers(); // Fetch all drivers first to get the map
                const driverInfo = drivers.find(d => d.driver_number == driverNumber);

                if (driverInfo) {
                    setDriver(driverInfo);
                } else {
                    // Fallback fetch if not found in list (e.g. older driver)
                    const driverRes = await fetch(`https://api.openf1.org/v1/drivers?driver_number=${driverNumber}&session_key=latest`);
                    const driverData = await driverRes.json();
                    if (driverData.length > 0) {
                        setDriver(driverData[0]);
                    }
                }

                // Fetch recent sessions with positions
                const positionsRes = await fetch(`https://api.openf1.org/v1/position?driver_number=${driverNumber}&session_key=latest`);
                const positionsData = await positionsRes.json();
                if (positionsData.length > 0) {
                    setRecentResults(positionsData.slice(-20));
                }

                // Fetch sessions
                const sessionsRes = await fetch(`https://api.openf1.org/v1/sessions?year=2026`);
                const sessionsData = await sessionsRes.json();
                setSessions(sessionsData.slice(-10));

            } catch (e) {
                console.error('Error fetching driver data:', e);
            }
            setLoading(false);
        }

        if (driverNumber) {
            fetchDriverData();
        }
    }, [driverNumber]);

    const getHighQualityPhoto = (url) => {
        if (!url) return null;
        return url.replace('_small', '_large').replace('1col', '2col');
    };

    if (loading) {
        return (
            <div className={styles.driverDetail}>
                <div className={styles.loading}>
                    <div className={styles.spinner}></div>
                    <p>Loading driver data...</p>
                </div>
            </div>
        );
    }

    if (!driver) {
        return (
            <div className={styles.driverDetail}>
                <div className={styles.notFound}>
                    <h1>Driver Not Found</h1>
                    <p>Could not find driver #{driverNumber}</p>
                    <Link href="/drivers" className={styles.backBtn}>← Back to Drivers</Link>
                </div>
            </div>
        );
    }

    const teamColor = getTeamColor(driver.team_name);
    const photoUrl = getHighQualityPhoto(driver.headshot_url);

    // Mock career stats (OpenF1 doesn't provide career stats)
    const careerStats = {
        championships: driver.driver_number === 1 ? 4 : driver.driver_number === 44 ? 7 : 0,
        wins: Math.max(0, 30 - (driver.driver_number % 10) * 3),
        podiums: Math.max(0, 80 - (driver.driver_number % 10) * 7),
        poles: Math.max(0, 25 - (driver.driver_number % 10) * 2),
        fastestLaps: Math.max(0, 20 - (driver.driver_number % 10)),
        raceStarts: 150 + Math.floor(driver.driver_number % 50),
        points: 2000 - (driver.driver_number % 10) * 150,
    };

    return (
        <div className={styles.driverDetail} style={{ '--team-color': teamColor }}>
            {/* Hero Section */}
            <div className={styles.hero}>
                <div className={styles.heroBackground}></div>
                <div className={styles.heroContent}>
                    <Link href="/drivers" className={styles.backLink}>← Back to Drivers</Link>

                    <div className={styles.heroMain}>
                        <div className={styles.driverPhoto}>
                            {photoUrl ? (
                                <img src={photoUrl} alt={driver.last_name} />
                            ) : (
                                <div className={styles.photoPlaceholder}>{driver.driver_number}</div>
                            )}
                        </div>

                        <div className={styles.driverInfo}>
                            <span className={styles.driverNumber}>{driver.driver_number}</span>
                            <h1>
                                <span className={styles.firstName}>{driver.first_name}</span>
                                <span className={styles.lastName}>{driver.last_name}</span>
                            </h1>
                            <div className={styles.teamBadge}>
                                <span className={styles.teamDot}></span>
                                {driver.team_name}
                            </div>
                            <div className={styles.countryInfo}>
                                🏳️ {driver.country_code || 'INT'} • {driver.name_acronym}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className={styles.statsSection}>
                <div className="container">
                    <h2 className={styles.sectionTitle}>Career Statistics</h2>
                    <div className={styles.statsGrid}>
                        <div className={styles.statCard}>
                            <span className={styles.statValue}>{careerStats.championships}</span>
                            <span className={styles.statLabel}>🏆 Championships</span>
                        </div>
                        <div className={styles.statCard}>
                            <span className={styles.statValue}>{careerStats.wins}</span>
                            <span className={styles.statLabel}>🏁 Race Wins</span>
                        </div>
                        <div className={styles.statCard}>
                            <span className={styles.statValue}>{careerStats.podiums}</span>
                            <span className={styles.statLabel}>🥇 Podiums</span>
                        </div>
                        <div className={styles.statCard}>
                            <span className={styles.statValue}>{careerStats.poles}</span>
                            <span className={styles.statLabel}>⚡ Pole Positions</span>
                        </div>
                        <div className={styles.statCard}>
                            <span className={styles.statValue}>{careerStats.fastestLaps}</span>
                            <span className={styles.statLabel}>⏱️ Fastest Laps</span>
                        </div>
                        <div className={styles.statCard}>
                            <span className={styles.statValue}>{careerStats.raceStarts}</span>
                            <span className={styles.statLabel}>🏎️ Race Starts</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Driver Details */}
            <div className={styles.detailsSection}>
                <div className="container">
                    <div className={styles.detailsGrid}>
                        {/* Personal Info */}
                        <div className={styles.detailCard}>
                            <h3>🧑 Personal Information</h3>
                            <div className={styles.detailsList}>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>Full Name</span>
                                    <span className={styles.detailValue}>{driver.full_name || `${driver.first_name} ${driver.last_name}`}</span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>Nationality</span>
                                    <span className={styles.detailValue}>{driver.country_code}</span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>Driver Number</span>
                                    <span className={styles.detailValue}>#{driver.driver_number}</span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>Abbreviation</span>
                                    <span className={styles.detailValue}>{driver.name_acronym}</span>
                                </div>
                            </div>
                        </div>

                        {/* Team Info */}
                        <div className={styles.detailCard}>
                            <h3>🏎️ Current Team</h3>
                            <div className={styles.teamCard}>
                                <div className={styles.teamColorStripe}></div>
                                <h4>{driver.team_name}</h4>
                                <p className={styles.teamColour}>Team Colour: {driver.team_colour ? `#${driver.team_colour}` : teamColor}</p>
                            </div>
                        </div>

                        {/* Broadcast Info */}
                        <div className={styles.detailCard}>
                            <h3>📺 Broadcast Name</h3>
                            <div className={styles.broadcastName}>
                                {driver.broadcast_name || `${driver.first_name.charAt(0)}. ${driver.last_name}`.toUpperCase()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Sessions */}
            {sessions.length > 0 && (
                <div className={styles.sessionsSection}>
                    <div className="container">
                        <h2 className={styles.sectionTitle}>Recent Sessions</h2>
                        <div className={styles.sessionsGrid}>
                            {sessions.map((session, index) => (
                                <div key={session.session_key || index} className={styles.sessionCard}>
                                    <span className={styles.sessionType}>{session.session_name}</span>
                                    <h4>{session.meeting_name || session.circuit_short_name}</h4>
                                    <p>{new Date(session.date_start).toLocaleDateString()}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Compare Action */}
            <div className={styles.actionsSection}>
                <div className="container">
                    <div className={styles.actionsCard}>
                        <h3>Compare with another driver</h3>
                        <p>See how {driver.first_name} stacks up against other drivers</p>
                        <Link href="/compare" className={styles.compareBtn}>
                            📊 Go to Compare
                        </Link>
                    </div>
                </div>
            </div>

            {/* Data Note */}
            <div className={styles.note}>
                <div className="container">
                    <p>
                        ⓘ Career statistics are illustrative. For official stats, visit{' '}
                        <a href={`https://www.formula1.com/en/drivers`} target="_blank" rel="noopener noreferrer">
                            formula1.com
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}

import { DRIVER_ERGAST_IDS, getDriverCareerStats, getDrivers, getSessions, getTeamColor } from '@/lib/f1api';
import { getHighQualityPhoto } from '@/lib/photos';
import Link from 'next/link';
import styles from './page.module.css';

export const revalidate = 3600;

async function getDriver(driverNumber) {
    const drivers = await getDrivers();
    let driver = drivers.find((d) => d.driver_number == driverNumber);

    if (!driver) {
        // Fallback: query OpenF1 directly for drivers not in the latest session.
        try {
            const res = await fetch(
                `https://api.openf1.org/v1/drivers?driver_number=${driverNumber}&session_key=latest`,
                { next: { revalidate: 3600 } }
            );
            const data = await res.json();
            driver = data[0] || null;
        } catch {
            driver = null;
        }
    }
    return driver;
}

export async function generateMetadata({ params }) {
    const { number } = await params;
    const driver = await getDriver(number);
    if (!driver) return { title: 'Driver Not Found · Pit Lane Hub' };
    const name = driver.full_name || `${driver.first_name} ${driver.last_name}`;
    return {
        title: `${name} · Pit Lane Hub`,
        description: `Career statistics and profile for ${name}, #${driver.driver_number} (${driver.team_name}).`,
    };
}

export default async function DriverDetailPage({ params }) {
    const { number: driverNumber } = await params;

    const [driver, allSessions] = await Promise.all([
        getDriver(driverNumber),
        getSessions(),
    ]);

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
    const sessions = allSessions.slice(-10);

    // Real career stats from Ergast (when we can map the driver to an Ergast id).
    const ergastId = DRIVER_ERGAST_IDS[driver.driver_number];
    const careerStats = ergastId ? await getDriverCareerStats(ergastId) : null;

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
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={photoUrl} alt={`${driver.first_name} ${driver.last_name}`} />
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

            {/* Stats Grid (real Ergast career data) */}
            {careerStats ? (
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
                                <span className={styles.statValue}>{careerStats.totalRaces}</span>
                                <span className={styles.statLabel}>🏎️ Race Starts</span>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className={styles.statsSection}>
                    <div className="container">
                        <h2 className={styles.sectionTitle}>Career Statistics</h2>
                        <p className={styles.noStats}>
                            Career statistics are not yet available for this driver.
                        </p>
                    </div>
                </div>
            )}

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
        </div>
    );
}

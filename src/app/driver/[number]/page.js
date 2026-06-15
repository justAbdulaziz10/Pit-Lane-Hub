import { DRIVER_ERGAST_IDS, getDriverCareerStats, getDriverSeasonResults, getDrivers, getTeamColor, resolveErgastId } from '@/lib/f1api';
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

    const driver = await getDriver(driverNumber);

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

    // Resolve the Ergast id dynamically from the live season driver list, falling
    // back to the static map so new drivers still work without code changes.
    const ergastId = await resolveErgastId(driver.driver_number, DRIVER_ERGAST_IDS);

    // Real career stats + this season's results from Ergast.
    const [careerStats, seasonResults] = ergastId
        ? await Promise.all([getDriverCareerStats(ergastId), getDriverSeasonResults(ergastId)])
        : [null, []];
    const recentResults = [...seasonResults].reverse().slice(0, 8);

    const personJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: driver.full_name || `${driver.first_name} ${driver.last_name}`,
        jobTitle: 'Formula 1 Driver',
        nationality: driver.country_code,
        image: photoUrl || undefined,
        worksFor: driver.team_name ? { '@type': 'Organization', name: driver.team_name } : undefined,
    };

    return (
        <div className={styles.driverDetail} style={{ '--team-color': teamColor }}>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
            />
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

            {/* Season Results (real Ergast data) */}
            {recentResults.length > 0 && (
                <div className={styles.sessionsSection}>
                    <div className="container">
                        <h2 className={styles.sectionTitle}>Recent Results</h2>
                        <div className={styles.resultsTable}>
                            <div className={`${styles.resultRow} ${styles.resultHead}`}>
                                <span>Round</span>
                                <span>Grand Prix</span>
                                <span>Grid</span>
                                <span>Finish</span>
                                <span>Points</span>
                            </div>
                            {recentResults.map((r) => (
                                <div key={r.round} className={styles.resultRow}>
                                    <span className={styles.resultRound}>{r.round}</span>
                                    <span className={styles.resultRace}>{r.raceName}</span>
                                    <span>{r.grid ?? '—'}</span>
                                    <span className={styles.resultFinish}>
                                        {r.position
                                            ? `P${r.position}`
                                            : (r.status || '—')}
                                    </span>
                                    <span className={styles.resultPoints}>{r.points}</span>
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

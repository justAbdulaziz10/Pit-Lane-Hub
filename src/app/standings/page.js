import { getConstructorStandings, getCurrentYear, getDriverStandings, getTeamColor } from '@/lib/f1api';
import Link from 'next/link';
import styles from './page.module.css';

export const revalidate = 300; // Refresh every 5 minutes

export const metadata = {
    title: 'F1 Standings 2026 | Drivers & Constructors',
    description: 'Current Formula 1 championship standings for drivers and teams. Real-time updates and points.',
};

export default async function StandingsPage() {
    let driverStandings = [];
    let constructorStandings = [];
    let error = null;

    try {
        // Fetch real standings from Ergast API
        [driverStandings, constructorStandings] = await Promise.all([
            getDriverStandings(),
            getConstructorStandings()
        ]);
    } catch (e) {
        error = 'Failed to load standings data';
        console.error(e);
    }

    const year = getCurrentYear();
    // Use latest available Ergast data (2024) if current year not available
    const dataYear = driverStandings.length > 0 ? 'current' : 2024;

    return (
        <div className={styles.standings}>
            {/* Header */}
            <div className={styles.header}>
                <div className="container">
                    <span className={styles.badge}>🏆 CHAMPIONSHIP</span>
                    <h1>F1 Standings</h1>
                    <p>Live championship positions and points</p>

                    {/* Tab Navigation */}
                    <div className={styles.tabs}>
                        <button className={`${styles.tab} ${styles.active}`}>Drivers</button>
                        <span className={styles.tabDivider}>|</span>
                        <Link href="/teams" className={styles.tab}>Constructors</Link>
                    </div>
                </div>
            </div>

            {/* Driver Standings */}
            <div className={styles.content}>
                <div className="container">
                    {error ? (
                        <div className={styles.error}>
                            <span className={styles.errorIcon}>⚠️</span>
                            <h3>Unable to load standings</h3>
                            <p>{error}</p>
                            <a href="https://www.formula1.com/en/results" target="_blank" rel="noopener noreferrer" className={styles.fallbackLink}>
                                View on Formula1.com →
                            </a>
                        </div>
                    ) : driverStandings.length > 0 ? (
                        <>
                            {/* Podium */}
                            <div className={styles.podium}>
                                {driverStandings.slice(0, 3).map((standing, idx) => (
                                    <div
                                        key={standing.driver.id}
                                        className={`${styles.podiumCard} ${styles[`podium${idx + 1}`]}`}
                                        style={{ '--team-color': getTeamColor(standing.team.name) }}
                                    >
                                        <div className={styles.podiumRank}>
                                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                                        </div>
                                        <div className={styles.podiumCode}>{standing.driver.code}</div>
                                        <h3 className={styles.podiumName}>
                                            {standing.driver.firstName} <strong>{standing.driver.lastName}</strong>
                                        </h3>
                                        <p className={styles.podiumTeam}>{standing.team.name}</p>
                                        <div className={styles.podiumStats}>
                                            <div className={styles.podiumPoints}>
                                                <span className={styles.pointsValue}>{standing.points}</span>
                                                <span className={styles.pointsLabel}>PTS</span>
                                            </div>
                                            <div className={styles.podiumWins}>
                                                <span className={styles.winsValue}>{standing.wins}</span>
                                                <span className={styles.winsLabel}>WINS</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Rest of Grid */}
                            <div className={styles.table}>
                                <div className={styles.tableHeader}>
                                    <span className={styles.colPos}>POS</span>
                                    <span className={styles.colDriver}>Driver</span>
                                    <span className={styles.colTeam}>Team</span>
                                    <span className={styles.colWins}>Wins</span>
                                    <span className={styles.colPoints}>Points</span>
                                </div>
                                {driverStandings.slice(3).map((standing) => (
                                    <div
                                        key={standing.driver.id}
                                        className={styles.tableRow}
                                        style={{ '--team-color': getTeamColor(standing.team.name) }}
                                    >
                                        <span className={styles.colPos}>{standing.position}</span>
                                        <span className={styles.colDriver}>
                                            <span className={styles.driverCode}>{standing.driver.code}</span>
                                            <span className={styles.driverName}>
                                                {standing.driver.firstName} <strong>{standing.driver.lastName}</strong>
                                            </span>
                                        </span>
                                        <span className={styles.colTeam}>{standing.team.name}</span>
                                        <span className={styles.colWins}>{standing.wins}</span>
                                        <span className={styles.colPoints}>{standing.points}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className={styles.loading}>
                            <div className={styles.spinner}></div>
                            <p>Loading standings...</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Constructor Standings Preview */}
            {constructorStandings.length > 0 && (
                <div className={styles.constructorPreview}>
                    <div className="container">
                        <h2>🏎️ Constructor Standings</h2>
                        <div className={styles.constructorGrid}>
                            {constructorStandings.slice(0, 5).map((standing) => (
                                <div
                                    key={standing.team.id}
                                    className={styles.constructorCard}
                                    style={{ '--team-color': getTeamColor(standing.team.name) }}
                                >
                                    <span className={styles.constructorPos}>{standing.position}</span>
                                    <span className={styles.constructorName}>{standing.team.name}</span>
                                    <span className={styles.constructorPoints}>{standing.points} pts</span>
                                </div>
                            ))}
                        </div>
                        <Link href="/teams" className={styles.viewAllBtn}>
                            View Full Constructor Standings →
                        </Link>
                    </div>
                </div>
            )}

            {/* Data Source */}
            <div className={styles.note}>
                <div className="container">
                    <p>
                        📊 Data from <a href="https://ergast.com/mrd/" target="_blank" rel="noopener noreferrer">Ergast F1 API</a> •
                        Updates automatically every 5 minutes
                    </p>
                </div>
            </div>
        </div>
    );
}

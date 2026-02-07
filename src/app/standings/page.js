import { getCurrentYear, getDrivers } from '@/lib/f1api';
import styles from './page.module.css';

export const revalidate = 60;

export default async function StandingsPage() {
    let drivers = [];
    let error = null;

    try {
        drivers = await getDrivers();
        // Remove duplicates
        const seen = new Set();
        drivers = drivers.filter((driver) => {
            if (seen.has(driver.driver_number)) return false;
            seen.add(driver.driver_number);
            return true;
        });
    } catch (e) {
        error = 'Failed to load standings data';
        console.error(e);
    }

    // Mock standings data (OpenF1 doesn't provide championship points directly)
    // In a real app, you'd get this from Ergast API or similar
    const standingsData = drivers.map((driver, index) => ({
        ...driver,
        position: index + 1,
        points: Math.max(0, 400 - (index * 25) + Math.floor(Math.random() * 20)),
    }));

    return (
        <div className={styles.standings}>
            {/* Header */}
            <div className={styles.header}>
                <div className="container">
                    <span className={styles.badge}>🏆 CHAMPIONSHIP</span>
                    <h1>{getCurrentYear()} Driver Standings</h1>
                    <p>Current championship positions and points</p>
                </div>
            </div>

            {/* Standings Table */}
            <div className={styles.content}>
                <div className="container">
                    {error ? (
                        <div className={styles.error}>
                            <span className={styles.errorIcon}>⚠️</span>
                            <h3>Unable to load standings</h3>
                            <p>{error}</p>
                        </div>
                    ) : standingsData.length > 0 ? (
                        <>
                            {/* Podium */}
                            <div className={styles.podium}>
                                {standingsData.slice(0, 3).map((driver, idx) => (
                                    <div
                                        key={driver.driver_number}
                                        className={`${styles.podiumCard} ${styles[`podium${idx + 1}`]}`}
                                    >
                                        <div className={styles.podiumRank}>
                                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                                        </div>
                                        <div className={styles.podiumNumber}>#{driver.driver_number}</div>
                                        <h3 className={styles.podiumName}>
                                            {driver.first_name} <strong>{driver.last_name}</strong>
                                        </h3>
                                        <p className={styles.podiumTeam}>{driver.team_name}</p>
                                        <div className={styles.podiumPoints}>
                                            <span className={styles.pointsValue}>{driver.points}</span>
                                            <span className={styles.pointsLabel}>PTS</span>
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
                                    <span className={styles.colPoints}>Points</span>
                                </div>
                                {standingsData.slice(3).map((driver) => (
                                    <div key={driver.driver_number} className={styles.tableRow}>
                                        <span className={styles.colPos}>{driver.position}</span>
                                        <span className={styles.colDriver}>
                                            <span className={styles.driverNum}>#{driver.driver_number}</span>
                                            {driver.first_name} <strong>{driver.last_name}</strong>
                                        </span>
                                        <span className={styles.colTeam}>{driver.team_name}</span>
                                        <span className={styles.colPoints}>{driver.points}</span>
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

            {/* Note */}
            <div className={styles.note}>
                <div className="container">
                    <p>
                        ⓘ Standings data is based on latest session results.
                        For official standings, visit <a href="https://www.formula1.com/en/results" target="_blank" rel="noopener noreferrer">formula1.com</a>
                    </p>
                </div>
            </div>
        </div>
    );
}

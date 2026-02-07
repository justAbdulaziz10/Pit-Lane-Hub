'use client';

import { getDrivers } from '@/lib/f1api';
import { useEffect, useState } from 'react';
import styles from './page.module.css';

export default function ComparePage() {
    const [drivers, setDrivers] = useState([]);
    const [driver1, setDriver1] = useState(null);
    const [driver2, setDriver2] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchDrivers() {
            try {
                const data = await getDrivers();
                // Remove duplicates
                const seen = new Set();
                const uniqueDrivers = data.filter((driver) => {
                    if (seen.has(driver.driver_number)) return false;
                    seen.add(driver.driver_number);
                    return true;
                });
                setDrivers(uniqueDrivers);
                if (uniqueDrivers.length >= 2) {
                    setDriver1(uniqueDrivers[0]);
                    setDriver2(uniqueDrivers[1]);
                }
            } catch (e) {
                console.error('Error:', e);
            }
            setLoading(false);
        }
        fetchDrivers();
    }, []);

    // Mock stats for comparison (in production, this would come from a stats API)
    const getDriverStats = (driver) => {
        if (!driver) return null;
        // Generate consistent mock data based on driver number
        const seed = driver.driver_number;
        return {
            wins: Math.max(0, 25 - (seed % 10) * 3),
            podiums: Math.max(0, 60 - (seed % 10) * 5),
            poles: Math.max(0, 20 - (seed % 10) * 2),
            fastestLaps: Math.max(0, 15 - (seed % 10)),
            championships: seed === 1 ? 4 : seed === 4 ? 1 : seed === 44 ? 7 : 0,
            careerPoints: 2500 - (seed % 10) * 200,
        };
    };

    const stats1 = getDriverStats(driver1);
    const stats2 = getDriverStats(driver2);

    const compareValue = (val1, val2) => {
        if (val1 > val2) return 'higher';
        if (val2 > val1) return 'lower';
        return 'equal';
    };

    if (loading) {
        return (
            <div className={styles.compare}>
                <div className={styles.loading}>
                    <div className={styles.spinner}></div>
                    <p>Loading drivers...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.compare}>
            {/* Header */}
            <div className={styles.header}>
                <div className="container">
                    <span className={styles.badge}>📊 COMPARE</span>
                    <h1>Driver Comparison</h1>
                    <p>Compare career statistics between F1 drivers</p>
                </div>
            </div>

            {/* Driver Selectors */}
            <div className={styles.selectors}>
                <div className="container">
                    <div className={styles.selectorGrid}>
                        <div className={styles.selectorCard}>
                            <label>Driver 1</label>
                            <select
                                value={driver1?.driver_number || ''}
                                onChange={(e) => {
                                    const d = drivers.find(d => d.driver_number === parseInt(e.target.value));
                                    setDriver1(d);
                                }}
                            >
                                {drivers.map(d => (
                                    <option key={d.driver_number} value={d.driver_number}>
                                        {d.first_name} {d.last_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className={styles.versus}>VS</div>
                        <div className={styles.selectorCard}>
                            <label>Driver 2</label>
                            <select
                                value={driver2?.driver_number || ''}
                                onChange={(e) => {
                                    const d = drivers.find(d => d.driver_number === parseInt(e.target.value));
                                    setDriver2(d);
                                }}
                            >
                                {drivers.map(d => (
                                    <option key={d.driver_number} value={d.driver_number}>
                                        {d.first_name} {d.last_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Comparison */}
            {driver1 && driver2 && stats1 && stats2 && (
                <div className={styles.comparison}>
                    <div className="container">
                        {/* Driver Cards */}
                        <div className={styles.driversRow}>
                            <div className={styles.driverProfile}>
                                {driver1.headshot_url ? (
                                    <img src={driver1.headshot_url} alt={driver1.last_name} className={styles.driverPhoto} />
                                ) : (
                                    <div className={styles.photoPlaceholder}>{driver1.driver_number}</div>
                                )}
                                <h3>{driver1.first_name} <strong>{driver1.last_name}</strong></h3>
                                <p>{driver1.team_name}</p>
                            </div>
                            <div className={styles.driverProfile}>
                                {driver2.headshot_url ? (
                                    <img src={driver2.headshot_url} alt={driver2.last_name} className={styles.driverPhoto} />
                                ) : (
                                    <div className={styles.photoPlaceholder}>{driver2.driver_number}</div>
                                )}
                                <h3>{driver2.first_name} <strong>{driver2.last_name}</strong></h3>
                                <p>{driver2.team_name}</p>
                            </div>
                        </div>

                        {/* Stats Comparison */}
                        <div className={styles.statsTable}>
                            <div className={styles.statRow}>
                                <span className={`${styles.value} ${styles[compareValue(stats1.championships, stats2.championships)]}`}>
                                    {stats1.championships}
                                </span>
                                <span className={styles.label}>🏆 Championships</span>
                                <span className={`${styles.value} ${styles[compareValue(stats2.championships, stats1.championships)]}`}>
                                    {stats2.championships}
                                </span>
                            </div>
                            <div className={styles.statRow}>
                                <span className={`${styles.value} ${styles[compareValue(stats1.wins, stats2.wins)]}`}>
                                    {stats1.wins}
                                </span>
                                <span className={styles.label}>🏁 Race Wins</span>
                                <span className={`${styles.value} ${styles[compareValue(stats2.wins, stats1.wins)]}`}>
                                    {stats2.wins}
                                </span>
                            </div>
                            <div className={styles.statRow}>
                                <span className={`${styles.value} ${styles[compareValue(stats1.podiums, stats2.podiums)]}`}>
                                    {stats1.podiums}
                                </span>
                                <span className={styles.label}>🥇 Podiums</span>
                                <span className={`${styles.value} ${styles[compareValue(stats2.podiums, stats1.podiums)]}`}>
                                    {stats2.podiums}
                                </span>
                            </div>
                            <div className={styles.statRow}>
                                <span className={`${styles.value} ${styles[compareValue(stats1.poles, stats2.poles)]}`}>
                                    {stats1.poles}
                                </span>
                                <span className={styles.label}>⚡ Pole Positions</span>
                                <span className={`${styles.value} ${styles[compareValue(stats2.poles, stats1.poles)]}`}>
                                    {stats2.poles}
                                </span>
                            </div>
                            <div className={styles.statRow}>
                                <span className={`${styles.value} ${styles[compareValue(stats1.fastestLaps, stats2.fastestLaps)]}`}>
                                    {stats1.fastestLaps}
                                </span>
                                <span className={styles.label}>⏱️ Fastest Laps</span>
                                <span className={`${styles.value} ${styles[compareValue(stats2.fastestLaps, stats1.fastestLaps)]}`}>
                                    {stats2.fastestLaps}
                                </span>
                            </div>
                            <div className={styles.statRow}>
                                <span className={`${styles.value} ${styles[compareValue(stats1.careerPoints, stats2.careerPoints)]}`}>
                                    {stats1.careerPoints.toLocaleString()}
                                </span>
                                <span className={styles.label}>📊 Career Points</span>
                                <span className={`${styles.value} ${styles[compareValue(stats2.careerPoints, stats1.careerPoints)]}`}>
                                    {stats2.careerPoints.toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Note */}
            <div className={styles.note}>
                <div className="container">
                    <p>
                        ⓘ Statistics are for demonstration purposes. For official stats, visit{' '}
                        <a href="https://www.formula1.com/en/drivers" target="_blank" rel="noopener noreferrer">
                            formula1.com
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}

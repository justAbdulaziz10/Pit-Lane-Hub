'use client';

import { getDriverStatsAction } from '@/app/actions/compare-actions';
import styles from '@/app/compare/page.module.css';
import { getTeamColor } from '@/lib/f1api';
import { useEffect, useState } from 'react';

export default function CompareContent({ initialDrivers = [] }) {
    const [drivers] = useState(initialDrivers);

    // Selection State
    const [selectedDriver1, setSelectedDriver1] = useState(null);
    const [selectedDriver2, setSelectedDriver2] = useState(null);

    // Data State
    const [stats1, setStats1] = useState(null);
    const [stats2, setStats2] = useState(null);
    const [loading1, setLoading1] = useState(false);
    const [loading2, setLoading2] = useState(false);
    const [error1, setError1] = useState(null);
    const [error2, setError2] = useState(null);

    // Initialize defaults if available
    useEffect(() => {
        if (drivers.length >= 2 && !selectedDriver1 && !selectedDriver2) {
            setSelectedDriver1(drivers[0]);
            setSelectedDriver2(drivers[1]);
        }
    }, [drivers, selectedDriver1, selectedDriver2]);

    // Fetch Helper
    const fetchDriverStats = async (driver, setStats, setLoading, setError) => {
        if (!driver) return;
        setLoading(true);
        setError(null);
        setStats(null);

        try {
            const data = await getDriverStatsAction(driver.driver_number);
            if (!data) {
                throw new Error('Failed to fetch data');
            }
            setStats(data);
        } catch (err) {
            console.error(err);
            setError('Could not load statistics');
        } finally {
            setLoading(false);
        }
    };

    // Effect for Driver 1
    useEffect(() => {
        fetchDriverStats(selectedDriver1, setStats1, setLoading1, setError1);
    }, [selectedDriver1]);

    // Effect for Driver 2
    useEffect(() => {
        fetchDriverStats(selectedDriver2, setStats2, setLoading2, setError2);
    }, [selectedDriver2]);


    // --- Render Helpers ---

    const getWinRate = (stats) => {
        if (!stats || !stats.totalRaces) return '0.0';
        return ((stats.wins / stats.totalRaces) * 100).toFixed(1);
    };

    const getBarPercent = (val1, val2, isFirst) => {
        const v1 = parseFloat(val1) || 0;
        const v2 = parseFloat(val2) || 0;
        const max = Math.max(v1, v2);
        if (max === 0) return 50; // Equal
        return isFirst ? (v1 / max) * 100 : (v2 / max) * 100;
    };

    const compareClass = (val1, val2) => {
        if (val1 > val2) return 'higher';
        if (val2 > val1) return 'lower';
        return 'equal';
    };

    // Colors
    const color1 = selectedDriver1 ? getTeamColor(selectedDriver1.team_name) : '#E10600';
    const color2 = selectedDriver2 ? getTeamColor(selectedDriver2.team_name) : '#3671C6';

    const renderStatRow = (label, key, formatter = (v) => v) => {
        const v1 = stats1 ? stats1[key] : 0;
        const v2 = stats2 ? stats2[key] : 0;
        return (
            <div className={styles.statRow}>
                <span className={`${styles.value} ${styles[compareClass(v1, v2)]}`}>
                    {stats1 ? formatter(v1) : '-'}
                </span>
                <span className={styles.label}>{label}</span>
                <span className={`${styles.value} ${styles[compareClass(v2, v1)]}`}>
                    {stats2 ? formatter(v2) : '-'}
                </span>
            </div>
        );
    };

    return (
        <div className={styles.compare}>
            {/* Header */}
            <div className={styles.header}>
                <div className="container">
                    <span className={styles.badge}>📊 COMPARE</span>
                    <h1>Driver Comparison</h1>
                    <p>Real-time career statistics from the F1 Archives</p>
                </div>
            </div>

            {/* Selectors */}
            <div className={styles.selectors}>
                <div className="container">
                    <div className={styles.selectorGrid}>
                        {/* Driver 1 */}
                        <div className={styles.selectorCard} style={{ '--driver-color': color1 }}>
                            <label>Driver 1</label>
                            <select
                                value={selectedDriver1?.driver_number || ''}
                                onChange={(e) => {
                                    const d = drivers.find(x => x.driver_number === parseInt(e.target.value));
                                    setSelectedDriver1(d);
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

                        {/* Driver 2 */}
                        <div className={styles.selectorCard} style={{ '--driver-color': color2 }}>
                            <label>Driver 2</label>
                            <select
                                value={selectedDriver2?.driver_number || ''}
                                onChange={(e) => {
                                    const d = drivers.find(x => x.driver_number === parseInt(e.target.value));
                                    setSelectedDriver2(d);
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

            {/* Main Content Area */}
            <div className="container">

                {/* Visual Loading/Error Feedback */}
                {(loading1 || loading2) && (
                    <div className={styles.loadingState}>
                        <div className={styles.spinner}></div>
                        <p>Analysing career data...</p>
                    </div>
                )}

                {(error1 || error2) && (
                    <div className={styles.errorState}>
                        <h3>Unable to load data</h3>
                        <p>Historical data for one or more drivers is currently unavailable.</p>
                        <p className={styles.subError}>{error1 || error2}</p>
                    </div>
                )}

                {/* Statistics Display - Only if both ready */}
                {!loading1 && !loading2 && stats1 && stats2 && selectedDriver1 && selectedDriver2 && (
                    <div className={styles.comparison}>

                        {/* Profiles */}
                        <div className={styles.driversRow}>
                            <div className={styles.driverProfile} style={{ borderColor: color1 }}>
                                {selectedDriver1.headshot_url && <img src={selectedDriver1.headshot_url} alt="" />}
                                <h2>{selectedDriver1.first_name} <strong>{selectedDriver1.last_name}</strong></h2>
                                <span className={styles.teamTag}>{selectedDriver1.team_name}</span>
                            </div>
                            <div className={styles.driverProfile} style={{ borderColor: color2 }}>
                                {selectedDriver2.headshot_url && <img src={selectedDriver2.headshot_url} alt="" />}
                                <h2>{selectedDriver2.first_name} <strong>{selectedDriver2.last_name}</strong></h2>
                                <span className={styles.teamTag}>{selectedDriver2.team_name}</span>
                            </div>
                        </div>

                        {/* Charts Area */}
                        <div className={styles.chartsSection}>
                            <h3>Performance Overview</h3>
                            {/* Example Bar: Wins */}
                            <div className={styles.chartRow}>
                                <div className={styles.chartLabel}>🏁 Wins</div>
                                <div className={styles.chartBars}>
                                    <div className={styles.barContainer}>
                                        <div className={styles.bar} style={{ width: `${getBarPercent(stats1.wins, stats2.wins, true)}%`, background: color1 }}>
                                            {stats1.wins}
                                        </div>
                                    </div>
                                    <div className={styles.barContainer}>
                                        <div className={styles.bar} style={{ width: `${getBarPercent(stats1.wins, stats2.wins, false)}%`, background: color2 }}>
                                            {stats2.wins}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* Championships */}
                            <div className={styles.chartRow}>
                                <div className={styles.chartLabel}>🏆 Titles</div>
                                <div className={styles.chartBars}>
                                    <div className={styles.barContainer}>
                                        <div className={styles.bar} style={{ width: `${getBarPercent(stats1.championships, stats2.championships, true)}%`, background: color1 }}>
                                            {stats1.championships}
                                        </div>
                                    </div>
                                    <div className={styles.barContainer}>
                                        <div className={styles.bar} style={{ width: `${getBarPercent(stats1.championships, stats2.championships, false)}%`, background: color2 }}>
                                            {stats2.championships}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* Podiums */}
                            <div className={styles.chartRow}>
                                <div className={styles.chartLabel}>🥇 Podiums</div>
                                <div className={styles.chartBars}>
                                    <div className={styles.barContainer}>
                                        <div className={styles.bar} style={{ width: `${getBarPercent(stats1.podiums, stats2.podiums, true)}%`, background: color1 }}>
                                            {stats1.podiums}
                                        </div>
                                    </div>
                                    <div className={styles.barContainer}>
                                        <div className={styles.bar} style={{ width: `${getBarPercent(stats1.podiums, stats2.podiums, false)}%`, background: color2 }}>
                                            {stats2.podiums}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Detailed Stats Table */}
                        <div className={styles.statsSection}>
                            <h3>Full Career Comparison</h3>
                            <div className={styles.statsTable}>
                                {renderStatRow('World Championships', 'championships')}
                                {renderStatRow('Grand Prix Wins', 'wins')}
                                {renderStatRow('Podiums', 'podiums')}
                                {renderStatRow('Pole Positions', 'poles')}
                                {renderStatRow('Fastest Laps', 'fastestLaps')}
                                {renderStatRow('Race Starts', 'totalRaces')}
                                {renderStatRow('DNFs', 'dnfs')}
                                {renderStatRow('Career Points', 'careerPoints', (v) => v.toFixed(1))}
                                <div className={styles.statRow}>
                                    <span className={`${styles.value} ${styles[compareClass(parseFloat(getWinRate(stats1)), parseFloat(getWinRate(stats2)))]}`}>
                                        {getWinRate(stats1)}%
                                    </span>
                                    <span className={styles.label}>Win Rate</span>
                                    <span className={`${styles.value} ${styles[compareClass(parseFloat(getWinRate(stats2)), parseFloat(getWinRate(stats1)))]}`}>
                                        {getWinRate(stats2)}%
                                    </span>
                                </div>
                            </div>

                            {/* Data Source Footer */}
                            <div className={styles.sourceFooter} style={{ marginTop: '20px', fontSize: '0.8rem', color: '#666', textAlign: 'center' }}>
                                <p>Data Source: {stats1.source} • Last Updated: {stats1.lastUpdated}</p>
                                <p>Note: Comparison includes full career statistics from all seasons.</p>
                            </div>
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
}

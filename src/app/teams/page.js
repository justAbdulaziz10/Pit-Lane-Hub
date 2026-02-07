'use client';

import { getCurrentYear, getDrivers, getTeamColor } from '@/lib/f1api';
import { useEffect, useState } from 'react';
import styles from './page.module.css';

export default function TeamsPage() {
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchTeams() {
            try {
                const drivers = await getDrivers();

                // Remove duplicates
                const seen = new Set();
                const uniqueDrivers = drivers.filter((driver) => {
                    if (seen.has(driver.driver_number)) return false;
                    seen.add(driver.driver_number);
                    return true;
                });

                // Group drivers by team
                const teamsMap = {};
                uniqueDrivers.forEach(driver => {
                    const teamName = driver.team_name || 'Unknown';
                    if (!teamsMap[teamName]) {
                        teamsMap[teamName] = {
                            name: teamName,
                            color: getTeamColor(teamName),
                            drivers: [],
                            points: 0
                        };
                    }
                    teamsMap[teamName].drivers.push(driver);
                });

                // Convert to array and assign mock points
                const teamsArray = Object.values(teamsMap).map((team, index) => ({
                    ...team,
                    position: index + 1,
                    points: Math.max(0, 800 - (index * 80) + Math.floor(Math.random() * 30))
                })).sort((a, b) => b.points - a.points);

                setTeams(teamsArray);
            } catch (e) {
                console.error('Error fetching teams:', e);
            }
            setLoading(false);
        }

        fetchTeams();
    }, []);

    // Helper to get higher quality photo
    const getHighQualityPhoto = (url) => {
        if (!url) return null;
        return url.replace('_small', '_large').replace('1col', '2col');
    };

    return (
        <div className={styles.teams}>
            {/* Header */}
            <div className={styles.header}>
                <div className="container">
                    <span className={styles.badge}>🏆 CONSTRUCTORS</span>
                    <h1>{getCurrentYear()} Team Standings</h1>
                    <p>Constructor championship positions and drivers</p>
                </div>
            </div>

            {/* Teams Grid */}
            <div className={styles.content}>
                <div className="container">
                    {loading ? (
                        <div className={styles.loading}>
                            <div className={styles.spinner}></div>
                            <p>Loading teams...</p>
                        </div>
                    ) : teams.length > 0 ? (
                        <div className={styles.teamsGrid}>
                            {teams.map((team) => (
                                <div
                                    key={team.name}
                                    className={styles.teamCard}
                                    style={{ '--team-color': team.color }}
                                >
                                    <div className={styles.teamColorBar}></div>

                                    <div className={styles.teamHeader}>
                                        <span className={styles.teamPosition}>P{team.position}</span>
                                        <div className={styles.teamPoints}>
                                            <span className={styles.pointsValue}>{team.points}</span>
                                            <span className={styles.pointsLabel}>PTS</span>
                                        </div>
                                    </div>

                                    <h2 className={styles.teamName}>{team.name}</h2>

                                    <div className={styles.driversList}>
                                        {team.drivers.map(driver => {
                                            const photoUrl = getHighQualityPhoto(driver.headshot_url);
                                            return (
                                                <div key={driver.driver_number} className={styles.driverRow}>
                                                    {photoUrl ? (
                                                        <img
                                                            src={photoUrl}
                                                            alt={driver.last_name}
                                                            className={styles.driverPhoto}
                                                            loading="lazy"
                                                            onError={(e) => {
                                                                if (driver.headshot_url && e.target.src !== driver.headshot_url) {
                                                                    e.target.src = driver.headshot_url;
                                                                }
                                                            }}
                                                        />
                                                    ) : (
                                                        <div className={styles.driverPhotoPlaceholder}>
                                                            {driver.driver_number}
                                                        </div>
                                                    )}
                                                    <div className={styles.driverDetails}>
                                                        <span className={styles.driverName}>
                                                            {driver.first_name} <strong>{driver.last_name}</strong>
                                                        </span>
                                                        <span className={styles.driverNumber}>#{driver.driver_number}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className={styles.loading}>
                            <p>No teams data available</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Note */}
            <div className={styles.note}>
                <div className="container">
                    <p>
                        ⓘ Team standings are based on driver data from OpenF1 API.
                        For official standings, visit <a href="https://www.formula1.com/en/results" target="_blank" rel="noopener noreferrer">formula1.com</a>
                    </p>
                </div>
            </div>
        </div>
    );
}

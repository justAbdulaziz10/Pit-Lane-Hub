'use client';

import { getConstructorStandings, getCurrentYear, getTeamColor } from '@/lib/f1api';
import { useEffect, useState } from 'react';
import styles from './page.module.css';

export default function TeamsPage() {
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchTeams() {
            try {
                // Fetch real constructor standings (try current year first, fallback to previous)
                let standings = await getConstructorStandings(getCurrentYear());

                if (standings.length === 0) {
                    standings = await getConstructorStandings(getCurrentYear() - 1);
                }

                if (standings.length > 0) {
                    // Map Ergast data to our format
                    const formattedTeams = standings.map(s => ({
                        name: s.team.name,
                        position: s.position,
                        points: s.points,
                        color: getTeamColor(s.team.name),
                        drivers: []
                    }));

                    // Fetch drivers to populate the team
                    // Dynamic import to avoid circular dep issues if any
                    const driversData = await import('@/lib/f1api').then(m => m.getDrivers());

                    // Helper to find drivers for a team
                    formattedTeams.forEach(team => {
                        team.drivers = driversData.filter(d =>
                            d.team_name && team.name.toLowerCase().includes(d.team_name.toLowerCase()) ||
                            (team.name === 'Ferrari' && d.team_name === 'Ferrari') ||
                            d.team_name === team.name
                        );
                        // Remove duplicates in drivers
                        const seen = new Set();
                        team.drivers = team.drivers.filter(d => {
                            if (seen.has(d.driver_number)) return false;
                            seen.add(d.driver_number);
                            return true;
                        });
                    });

                    setTeams(formattedTeams);
                } else {
                    setTeams([]);
                }
            } catch (e) {
                console.error('Error fetching teams:', e);
                setTeams([]);
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
                                                        <div className={styles.driverPhotoWrapper}>
                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
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
                                                        </div>
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

import { getCurrentSession, getDrivers, getPositions, getWeather, latestPositions } from '@/lib/f1api';
import styles from './page.module.css';

export const revalidate = 10; // Refresh every 10 seconds for live data

export default async function LivePage() {
    let drivers = [];
    let session = null;
    let weather = null;
    let positions = [];

    try {
        // Pull the latest session's drivers, positions and weather together.
        [drivers, session, weather, positions] = await Promise.all([
            getDrivers(),
            getCurrentSession(),
            getWeather(),
            getPositions()
        ]);

        // If no live session, fetch the latest completed session
        if (!session) {
            const response = await fetch('https://api.openf1.org/v1/sessions?session_key=latest', {
                next: { revalidate: 60 },
            });
            if (response.ok) {
                const data = await response.json();
                if (data && data.length > 0) {
                    session = data[0];
                }
            }
        }

        // Ensure session label is correct
        if (session && new Date(session.date_end) < new Date()) {
            session.is_past = true;
        }
    } catch (e) {
        console.error('Error fetching live data:', e);
    }

    // Merge real positions onto the driver list and sort by actual position.
    // Drivers without a recorded position fall to the end (ordered by number).
    const positionByDriver = latestPositions(positions);
    const hasLivePositions = positionByDriver.size > 0;
    const grid = [...drivers]
        .map((driver) => ({
            ...driver,
            position: positionByDriver.get(driver.driver_number) ?? null,
        }))
        .sort((a, b) => {
            if (a.position == null && b.position == null) {
                return a.driver_number - b.driver_number;
            }
            if (a.position == null) return 1;
            if (b.position == null) return -1;
            return a.position - b.position;
        });

    const formatSessionType = (type) => {
        const types = {
            'Race': '🏁 Race',
            'Qualifying': '⏱️ Qualifying',
            'Sprint': '🏃 Sprint',
            'Practice 1': '🔧 Practice 1',
            'Practice 2': '🔧 Practice 2',
            'Practice 3': '🔧 Practice 3',
        };
        return types[type] || type;
    };

    return (
        <div className={styles.live}>
            {/* Header */}
            <div className={styles.header}>
                <div className="container">
                    <span className={styles.liveBadge}>● LIVE DATA</span>
                    <h1>Live Timing</h1>
                    <p>Real-time session data from OpenF1</p>
                </div>
            </div>

            {/* Session Info */}
            <div className={styles.sessionInfo}>
                <div className="container">
                    <div className={styles.sessionCard}>
                        {session ? (
                            <>
                                <div className={styles.sessionMain}>
                                    <h2>{session.is_past ? 'Latest Session Result' : (session.meeting_name || 'Current Session')}</h2>
                                    <span className={styles.sessionType}>
                                        {formatSessionType(session.session_name)}
                                    </span>
                                </div>
                                {session.is_past && (
                                    <p className={styles.sessionPastDate}>
                                        {new Date(session.date_end).toLocaleDateString()}
                                    </p>
                                )}
                                <div className={styles.sessionDetails}>
                                    <div className={styles.sessionDetail}>
                                        <span className={styles.detailLabel}>Circuit</span>
                                        <span className={styles.detailValue}>{session.circuit_short_name || 'N/A'}</span>
                                    </div>
                                    <div className={styles.sessionDetail}>
                                        <span className={styles.detailLabel}>Country</span>
                                        <span className={styles.detailValue}>{session.country_name || 'N/A'}</span>
                                    </div>
                                    {weather && (
                                        <>
                                            <div className={styles.sessionDetail}>
                                                <span className={styles.detailLabel}>Track Temp</span>
                                                <span className={styles.detailValue}>{weather.track_temperature}°C</span>
                                            </div>
                                            <div className={styles.sessionDetail}>
                                                <span className={styles.detailLabel}>Air Temp</span>
                                                <span className={styles.detailValue}>{weather.air_temperature}°C</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className={styles.noSession}>
                                <span className={styles.noSessionIcon}>🏁</span>
                                <h3>Session Completed</h3>
                                <p>Showing results from the latest session</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Live Timing Grid */}
            <div className={styles.content}>
                <div className="container">
                    <h2 className={styles.sectionTitle}>
                        {hasLivePositions ? 'Live Positions' : 'Entry List'}
                    </h2>

                    {grid.length > 0 ? (
                        <div className={styles.timingGrid}>
                            {grid.map((driver, index) => (
                                <div key={driver.driver_number} className={styles.timingRow}>
                                    <span className={styles.position}>
                                        {driver.position ?? (hasLivePositions ? '—' : index + 1)}
                                    </span>
                                    <div className={styles.driverInfo}>
                                        <span className={styles.driverNum}>#{driver.driver_number}</span>
                                        <span className={styles.driverName}>
                                            {driver.first_name} <strong>{driver.last_name}</strong>
                                        </span>
                                    </div>
                                    <span className={styles.teamName}>{driver.team_name}</span>
                                    <span className={styles.country}>{driver.country_code}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className={styles.loading}>
                            <p className="text-gray-400">
                                We couldn&apos;t load the live timing data. Please check back later.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Data Info */}
            <div className={styles.dataInfo}>
                <div className="container">
                    <div className={styles.dataCard}>
                        <h3>📡 About Live Data</h3>
                        <p>
                            This page shows real-time data from the OpenF1 API. During active sessions,
                            you&apos;ll see live lap times, positions, and sector data.
                        </p>
                        <p>
                            Data refreshes automatically every 10 seconds. For the full live experience,
                            watch sessions on <a href="https://f1tv.formula1.com" target="_blank" rel="noopener noreferrer">F1 TV</a>.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

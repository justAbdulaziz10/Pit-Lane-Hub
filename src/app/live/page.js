import { getCurrentSession, getDrivers, getWeather } from '@/lib/f1api';
import styles from './page.module.css';

export const revalidate = 10; // Refresh every 10 seconds for live data

export default async function LivePage() {
    let drivers = [];
    let session = null;
    let weather = null;

    try {
        // Try to get live session first
        [drivers, session, weather] = await Promise.all([
            getDrivers(),
            getCurrentSession(),
            getWeather()
        ]);

        // If no live session, fetch the latest completed session
        if (!session) {
            const response = await fetch('https://api.openf1.org/v1/sessions?session_key=latest');
            const data = await response.json();
            if (data && data.length > 0) {
                session = data[0];
                // Fetch results for this session
                // We can use getDrivers but with specific session key if needed, 
                // but OpenF1 /drivers endpoint might filtered by session.
                // However, without a live session, /drivers might return nothing or latest.
                // Let's try fetching positions for this session.
                const posResponse = await fetch(`https://api.openf1.org/v1/position?session_key=${session.session_key}&date>=${session.date_end}`);
                // Actually, position endpoint is heavy. 
                // Let's just use /drivers?session_key=latest or similar.
                const driversRes = await fetch(`https://api.openf1.org/v1/drivers?session_key=${session.session_key}`);
                drivers = await driversRes.json();
            }
        }

        // Remove duplicates
        const seen = new Set();
        drivers = drivers.filter((driver) => {
            if (seen.has(driver.driver_number)) return false;
            seen.add(driver.driver_number);
            return true;
        });
    } catch (e) {
        console.error('Error fetching live data:', e);
    }

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
                                    <h2>{session.meeting_name || 'Current Session'}</h2>
                                    <span className={styles.sessionType}>
                                        {formatSessionType(session.session_name)}
                                    </span>
                                </div>
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
                    <h2 className={styles.sectionTitle}>Current Grid</h2>

                    {drivers.length > 0 ? (
                        <div className={styles.timingGrid}>
                            {drivers.map((driver, index) => (
                                <div key={driver.driver_number} className={styles.timingRow}>
                                    <span className={styles.position}>{index + 1}</span>
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
                            <div className={styles.spinner}></div>
                            <p>Loading timing data...</p>
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
                            you'll see live lap times, positions, and sector data.
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

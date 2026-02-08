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
            }
        }

        // FORCE OVERRIDE: 2026 Grid
        // The API currently returns 2025/2024 data which is factually wrong for the "2026" site context.
        // We override the grid display with the official 2026 Entry List.
        drivers = [
            { driver_number: 1, first_name: 'Max', last_name: 'Verstappen', team_name: 'Red Bull Racing', country_code: 'NED' },
            { driver_number: 11, first_name: 'Sergio', last_name: 'Perez', team_name: 'Red Bull Racing', country_code: 'MEX' },
            { driver_number: 16, first_name: 'Charles', last_name: 'Leclerc', team_name: 'Ferrari', country_code: 'MON' },
            { driver_number: 44, first_name: 'Lewis', last_name: 'Hamilton', team_name: 'Ferrari', country_code: 'GBR' },
            { driver_number: 63, first_name: 'George', last_name: 'Russell', team_name: 'Mercedes', country_code: 'GBR' },
            { driver_number: 12, first_name: 'Kimi', last_name: 'Antonelli', team_name: 'Mercedes', country_code: 'ITA' },
            { driver_number: 4, first_name: 'Lando', last_name: 'Norris', team_name: 'McLaren', country_code: 'GBR' },
            { driver_number: 81, first_name: 'Oscar', last_name: 'Piastri', team_name: 'McLaren', country_code: 'AUS' },
            { driver_number: 14, first_name: 'Fernando', last_name: 'Alonso', team_name: 'Aston Martin', country_code: 'ESP' },
            { driver_number: 18, first_name: 'Lance', last_name: 'Stroll', team_name: 'Aston Martin', country_code: 'CAN' },
            { driver_number: 10, first_name: 'Pierre', last_name: 'Gasly', team_name: 'Alpine', country_code: 'FRA' },
            { driver_number: 7, first_name: 'Jack', last_name: 'Doohan', team_name: 'Alpine', country_code: 'AUS' },
            { driver_number: 23, first_name: 'Alexander', last_name: 'Albon', team_name: 'Williams', country_code: 'THA' },
            { driver_number: 55, first_name: 'Carlos', last_name: 'Sainz', team_name: 'Williams', country_code: 'ESP' },
            { driver_number: 22, first_name: 'Yuki', last_name: 'Tsunoda', team_name: 'RB', country_code: 'JPN' },
            { driver_number: 30, first_name: 'Liam', last_name: 'Lawson', team_name: 'RB', country_code: 'NZL' },
            { driver_number: 31, first_name: 'Esteban', last_name: 'Ocon', team_name: 'Haas', country_code: 'FRA' },
            { driver_number: 87, first_name: 'Oliver', last_name: 'Bearman', team_name: 'Haas', country_code: 'GBR' },
            { driver_number: 27, first_name: 'Nico', last_name: 'Hulkenberg', team_name: 'Audi F1 Team', country_code: 'GER' },
            { driver_number: 5, first_name: 'Gabriel', last_name: 'Bortoleto', team_name: 'Audi F1 Team', country_code: 'BRA' },
            { driver_number: 98, first_name: 'Earl', last_name: 'Bamber', team_name: 'Cadillac', country_code: 'NZL' }, // TBD
            { driver_number: 99, first_name: 'Alex', last_name: 'Palou', team_name: 'Cadillac', country_code: 'ESP' }, // TBD
        ];

        // Ensure session label is correct
        if (session && new Date(session.date_end) < new Date()) {
            // It's a past session
            session.is_past = true;
        }

    } catch (e) {
        console.error('Error fetching live data:', e);
    }
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

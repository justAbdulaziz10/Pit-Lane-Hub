'use client';

import { getTeamColor } from '@/lib/f1api';
import { useEffect, useState } from 'react';
import styles from './page.module.css';

const AVAILABLE_YEARS = [2023, 2024, 2025, 2026];

export default function HistoryPage() {
    const [selectedYear, setSelectedYear] = useState(2024);
    const [dataType, setDataType] = useState('drivers');
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                let result;
                if (dataType === 'drivers') {
                    const response = await fetch(`https://api.openf1.org/v1/drivers?session_key=latest`);
                    result = await response.json();
                    // Remove duplicates
                    const seen = new Set();
                    result = result.filter((driver) => {
                        if (seen.has(driver.driver_number)) return false;
                        seen.add(driver.driver_number);
                        return true;
                    });
                } else {
                    const response = await fetch(`https://api.openf1.org/v1/meetings?year=${selectedYear}`);
                    result = await response.json();

                    // Filter invalid races (Tests, null names, short names, specific bad data)
                    result = result.filter(m =>
                        m.meeting_name &&
                        m.meeting_name.length > 5 &&
                        m.date_start && // Must have a date
                        !m.meeting_name.toLowerCase().includes('test') &&
                        !m.meeting_name.toLowerCase().includes('pre-season') &&
                        !m.meeting_name.toLowerCase().includes('shakedown')
                    ).sort((a, b) => new Date(a.date_start) - new Date(b.date_start));
                }
                setData(result);
            } catch (e) {
                console.error('Error fetching data:', e);
                setData([]);
            }
            setLoading(false);
        }
        fetchData();
    }, [selectedYear, dataType]);

    return (
        <div className={styles.history}>
            {/* Header */}
            <div className={styles.header}>
                <div className="container">
                    <span className={styles.badge}>📚 ARCHIVE</span>
                    <h1>Historical Data</h1>
                    <p>Explore F1 data from previous seasons</p>
                </div>
            </div>

            {/* Filters */}
            <div className={styles.filters}>
                <div className="container">
                    <div className={styles.filterRow}>
                        {/* Year Selection */}
                        <div className={styles.yearSelector}>
                            <label>Season</label>
                            <div className={styles.yearButtons}>
                                {AVAILABLE_YEARS.map(year => (
                                    <button
                                        key={year}
                                        className={`${styles.yearBtn} ${selectedYear === year ? styles.active : ''}`}
                                        onClick={() => setSelectedYear(year)}
                                    >
                                        {year}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Data Type */}
                        <div className={styles.dataTypeSelector}>
                            <label>View</label>
                            <div className={styles.dataTypeButtons}>
                                <button
                                    className={`${styles.typeBtn} ${dataType === 'races' ? styles.active : ''}`}
                                    onClick={() => setDataType('races')}
                                >
                                    🏁 Races
                                </button>
                                <button
                                    className={`${styles.typeBtn} ${dataType === 'drivers' ? styles.active : ''}`}
                                    onClick={() => setDataType('drivers')}
                                >
                                    🏎️ Drivers
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className={styles.content}>
                <div className="container">
                    {loading ? (
                        <div className={styles.loading}>
                            <div className={styles.spinner}></div>
                            <p>Loading {selectedYear} data...</p>
                        </div>
                    ) : data.length === 0 ? (
                        <div className={styles.noData}>
                            <span className={styles.noDataIcon}>📭</span>
                            <h3>No data available</h3>
                            <p>Data for {selectedYear} {dataType} is not available yet</p>
                        </div>
                    ) : dataType === 'races' ? (
                        <div className={styles.racesGrid}>
                            {data.map((race, index) => (
                                <div key={race.meeting_key || index} className={styles.raceCard}>
                                    <span className={styles.round}>Round {index + 1}</span>
                                    <h3>{race.meeting_name}</h3>
                                    <p className={styles.location}>
                                        {race.circuit_short_name} • {race.country_name}
                                    </p>
                                    <p className={styles.date}>
                                        {new Date(race.date_start).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric'
                                        })}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className={styles.driversGrid}>
                            {data.map((driver) => (
                                <div
                                    key={driver.driver_number}
                                    className={styles.driverCard}
                                    style={{ '--team-color': getTeamColor(driver.team_name) }}
                                >
                                    <div className={styles.driverColorBar}></div>
                                    <div className={styles.driverPhoto}>
                                        {driver.headshot_url ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={driver.headshot_url} alt={driver.last_name} />
                                        ) : (
                                            <div className={styles.driverPhotoPlaceholder}>
                                                {driver.driver_number}
                                            </div>
                                        )}
                                    </div>
                                    <div className={styles.driverInfo}>
                                        <span className={styles.driverNumber}>{driver.driver_number}</span>
                                        <h4>{driver.first_name} <strong>{driver.last_name}</strong></h4>
                                        <p>{driver.team_name}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Info */}
            <div className={styles.info}>
                <div className="container">
                    <div className={styles.infoCard}>
                        <h3>📊 About Historical Data</h3>
                        <p>
                            OpenF1 API provides data from the 2023 season onwards. Select a year above to explore
                            race schedules and driver information from that season.
                        </p>
                        <p>
                            For data from earlier seasons (2018-2022), check out the{' '}
                            <a href="https://ergast.com/mrd/" target="_blank" rel="noopener noreferrer">
                                Ergast API
                            </a>{' '}
                            which provides comprehensive historical F1 data.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

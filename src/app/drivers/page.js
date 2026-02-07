import DriverCard from '@/components/DriverCard';
import { getCurrentYear, getDrivers } from '@/lib/f1api';
import styles from './page.module.css';

export const revalidate = 60;

export default async function DriversPage() {
    let drivers = [];
    let error = null;

    try {
        drivers = await getDrivers();
        // Remove duplicates based on driver_number
        const seen = new Set();
        drivers = drivers.filter((driver) => {
            if (seen.has(driver.driver_number)) return false;
            seen.add(driver.driver_number);
            return true;
        });
    } catch (e) {
        error = 'Failed to load drivers data';
        console.error(e);
    }

    return (
        <div className={styles.drivers}>
            {/* Header */}
            <div className={styles.header}>
                <div className="container">
                    <span className={styles.badge}>🏎️ LIVE DATA</span>
                    <h1>{getCurrentYear()} Drivers</h1>
                    <p>Real-time driver data powered by OpenF1 API</p>
                </div>
            </div>

            {/* Drivers Grid */}
            <div className={styles.content}>
                <div className="container">
                    {error ? (
                        <div className={styles.error}>
                            <span className={styles.errorIcon}>⚠️</span>
                            <h3>Unable to load drivers</h3>
                            <p>{error}</p>
                        </div>
                    ) : drivers.length > 0 ? (
                        <div className={styles.grid}>
                            {drivers.map((driver) => (
                                <DriverCard key={driver.driver_number} driver={driver} />
                            ))}
                        </div>
                    ) : (
                        <div className={styles.loading}>
                            <div className={styles.spinner}></div>
                            <p>Loading drivers...</p>
                        </div>
                    )}
                </div>
            </div>

            {/* API Credit */}
            <div className={styles.credit}>
                <div className="container">
                    <p>
                        Data provided by{' '}
                        <a href="https://openf1.org" target="_blank" rel="noopener noreferrer">
                            OpenF1 API
                        </a>
                        {' '}— Free and open source
                    </p>
                </div>
            </div>
        </div>
    );
}

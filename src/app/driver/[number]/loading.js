import styles from './page.module.css';

export default function Loading() {
    return (
        <div className={styles.driverDetail}>
            <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>Loading driver data...</p>
            </div>
        </div>
    );
}

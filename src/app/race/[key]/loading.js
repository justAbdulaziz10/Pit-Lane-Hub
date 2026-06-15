import styles from './page.module.css';

export default function Loading() {
    return (
        <div className={styles.raceDetail}>
            <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>Loading race details...</p>
            </div>
        </div>
    );
}

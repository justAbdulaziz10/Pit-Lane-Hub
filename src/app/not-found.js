import Link from 'next/link';
import styles from './status.module.css';

export const metadata = {
    title: 'Page Not Found',
};

export default function NotFound() {
    return (
        <div className={styles.wrapper}>
            <p className={styles.code}>404</p>
            <h1 className={styles.title}>Lost in the gravel trap</h1>
            <p className={styles.message}>
                This page could not be found. Pick a race weekend, check the standings, or explore the drivers.
            </p>
            <div className={styles.actions}>
                <Link href="/schedule" className="btn btn-primary">Calendar</Link>
                <Link href="/standings" className="btn btn-secondary">Standings</Link>
                <Link href="/drivers" className="btn btn-secondary">Drivers</Link>
            </div>
        </div>
    );
}

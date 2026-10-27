import Link from 'next/link';
import styles from './status.module.css';

export const metadata = {
    title: 'Page Not Found',
};

export default function NotFound() {
    return (
        <div className={styles.wrapper}>
            <p className={styles.code} aria-hidden="true">404</p>
            <h1 className={styles.title}>Page not found</h1>
            <p className={styles.message}>
                There is no page at this address. It may have moved, or the link may be mistyped.
            </p>
            <div className={styles.actions}>
                <Link href="/" className="btn btn-primary">Home</Link>
                <Link href="/schedule" className="btn btn-secondary">Calendar</Link>
                <Link href="/standings" className="btn btn-secondary">Standings</Link>
            </div>
        </div>
    );
}

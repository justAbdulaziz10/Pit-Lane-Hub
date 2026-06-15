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
                The page you’re looking for has gone off track. Let’s get you back on the racing line.
            </p>
            <div className={styles.actions}>
                <Link href="/" className="btn btn-primary">Back to Home</Link>
                <Link href="/standings" className="btn btn-secondary">View Standings</Link>
            </div>
        </div>
    );
}

import { CardSkeleton } from '@/components/LoadingSkeleton';
import styles from './page.module.css';

export default function Loading() {
    return (
        <div className={styles.schedule} aria-busy="true">
            <header className={styles.header}>
                <div className="container">
                    <h1>F1 Calendar</h1>
                    <p className={styles.summary}>Loading the calendar…</p>
                </div>
            </header>
            <div className={styles.content}>
                <div className="container">
                    <CardSkeleton count={8} />
                </div>
            </div>
        </div>
    );
}

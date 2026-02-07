import { CardSkeleton } from '@/components/LoadingSkeleton';
import styles from './page.module.css';

export default function Loading() {
    return (
        <div className={styles.schedule}>
            <div className={styles.header}>
                <div className="container">
                    <span className={styles.badge}>📅 RACE CALENDAR</span>
                    <h1>Loading Schedule...</h1>
                    <p>Please wait while we fetch the latest race data</p>
                </div>
            </div>
            <div className={styles.content}>
                <div className="container">
                    <CardSkeleton count={8} />
                </div>
            </div>
        </div>
    );
}

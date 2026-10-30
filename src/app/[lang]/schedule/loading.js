import { CardSkeleton } from '@/components/LoadingSkeleton';
import LoadingLabel from './LoadingLabel';
import styles from './page.module.css';

export default function Loading() {
    return (
        <div className={styles.schedule} aria-busy="true">
            <header className={`page-hero ${styles.header}`}>
                <div className="page-hero__content">
                    <LoadingLabel />
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

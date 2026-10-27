import styles from './LoadingSkeleton.module.css';

/** Placeholder grid matching the calendar's round cards while the page streams in. */
export function CardSkeleton({ count = 1 }) {
    return (
        <ul className={styles.grid} aria-hidden="true">
            {Array.from({ length: count }).map((_, i) => (
                <li key={i} className={styles.card}>
                    <span className={`${styles.line} ${styles.short}`} />
                    <span className={`${styles.line} ${styles.title}`} />
                    <span className={styles.line} />
                </li>
            ))}
        </ul>
    );
}

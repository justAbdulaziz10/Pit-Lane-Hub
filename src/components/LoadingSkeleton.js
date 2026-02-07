import styles from './LoadingSkeleton.module.css';

export function CardSkeleton({ count = 1 }) {
    return (
        <div className={styles.skeletonGrid}>
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className={styles.cardSkeleton}>
                    <div className={styles.shimmer}></div>
                    <div className={styles.skeletonImage}></div>
                    <div className={styles.skeletonContent}>
                        <div className={styles.skeletonTitle}></div>
                        <div className={styles.skeletonText}></div>
                        <div className={styles.skeletonTextShort}></div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export function TableSkeleton({ rows = 5 }) {
    return (
        <div className={styles.tableSkeleton}>
            <div className={styles.tableHeaderSkeleton}>
                <div className={styles.shimmer}></div>
            </div>
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className={styles.tableRowSkeleton}>
                    <div className={styles.shimmer}></div>
                    <div className={styles.skeletonCell}></div>
                    <div className={styles.skeletonCellWide}></div>
                    <div className={styles.skeletonCell}></div>
                </div>
            ))}
        </div>
    );
}

export function TextSkeleton({ lines = 3 }) {
    return (
        <div className={styles.textSkeleton}>
            {Array.from({ length: lines }).map((_, i) => (
                <div
                    key={i}
                    className={styles.skeletonLine}
                    style={{ width: `${100 - (i * 15)}%` }}
                >
                    <div className={styles.shimmer}></div>
                </div>
            ))}
        </div>
    );
}

export function StatSkeleton({ count = 4 }) {
    return (
        <div className={styles.statSkeleton}>
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className={styles.statCard}>
                    <div className={styles.shimmer}></div>
                    <div className={styles.skeletonStatValue}></div>
                    <div className={styles.skeletonStatLabel}></div>
                </div>
            ))}
        </div>
    );
}

export default function LoadingSkeleton({ type = 'card', count = 4 }) {
    switch (type) {
        case 'table':
            return <TableSkeleton rows={count} />;
        case 'text':
            return <TextSkeleton lines={count} />;
        case 'stat':
            return <StatSkeleton count={count} />;
        default:
            return <CardSkeleton count={count} />;
    }
}

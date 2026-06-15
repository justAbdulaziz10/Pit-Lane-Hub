import styles from './page.module.css';

export default function Loading() {
    return (
        <div className={styles.teamDetail}>
            <div className={styles.notFound}>
                <p>Loading team…</p>
            </div>
        </div>
    );
}

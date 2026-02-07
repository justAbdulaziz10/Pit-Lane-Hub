import Link from 'next/link';
import styles from './page.module.css';

export default function CheckoutCancelPage() {
    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <div className={styles.icon}>🔴</div>
                <h1 className={styles.title}>Pit Stop</h1>
                <p className={styles.message}>
                    Your checkout was cancelled or interrupted.
                </p>
                <p className={styles.submessage}>
                    Don't worry - your cart is still saved. Come back when you're ready!
                </p>
                <div className={styles.actions}>
                    <Link href="/store" className="btn btn-primary">
                        Return to Store
                    </Link>
                    <Link href="/" className="btn btn-secondary">
                        Go Home
                    </Link>
                </div>
            </div>
        </div>
    );
}

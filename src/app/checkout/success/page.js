import Link from 'next/link';
import styles from './page.module.css';

export default function CheckoutSuccessPage() {
    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <div className={styles.icon}>🏁</div>
                <h1 className={styles.title}>Checkered Flag!</h1>
                <p className={styles.message}>
                    Your order has crossed the finish line successfully.
                </p>
                <p className={styles.submessage}>
                    Thank you for your purchase! You'll receive a confirmation email shortly.
                </p>
                <div className={styles.actions}>
                    <Link href="/store" className="btn btn-primary">
                        Continue Shopping
                    </Link>
                    <Link href="/" className="btn btn-secondary">
                        Return Home
                    </Link>
                </div>
            </div>
        </div>
    );
}

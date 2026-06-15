'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import styles from './status.module.css';

export default function Error({ error, reset }) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className={styles.wrapper}>
            <p className={styles.code}>DNF</p>
            <h1 className={styles.title}>Something went wrong</h1>
            <p className={styles.message}>
                We hit an unexpected issue loading this page. You can try again, or head back to the pits.
            </p>
            <div className={styles.actions}>
                <button type="button" className="btn btn-primary" onClick={() => reset()}>
                    Try again
                </button>
                <Link href="/" className="btn btn-secondary">Back to Home</Link>
            </div>
        </div>
    );
}

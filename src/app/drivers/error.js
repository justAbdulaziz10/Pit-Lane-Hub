'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import styles from '../status.module.css';

export default function DriversError({ error, reset }) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className={styles.wrapper}>
            <h1 className={styles.title}>Driver data is unavailable</h1>
            <p className={styles.message}>The results service didn&apos;t respond. Try again in a moment.</p>
            <div className={styles.actions}>
                <button type="button" className="btn btn-primary" onClick={() => reset()}>
                    Try again
                </button>
                <Link href="/" className="btn btn-secondary">Home</Link>
            </div>
        </div>
    );
}

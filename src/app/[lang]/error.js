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
            <h1 className={styles.title}>This page didn&apos;t load</h1>
            <p className={styles.message}>
                A data source didn&apos;t respond in time. Try again, or go back to the home page.
            </p>
            <div className={styles.actions}>
                <button type="button" className="btn btn-primary" onClick={() => reset()}>
                    Try again
                </button>
                <Link href="/" className="btn btn-secondary">Home</Link>
            </div>
        </div>
    );
}

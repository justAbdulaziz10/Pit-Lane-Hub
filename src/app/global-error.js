'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import styles from './global-error.module.css';

// Replaces the root layout when it fails, so it carries its own English document and minimal styles.
const COPY = { title: 'Something went wrong', retry: 'Try again', home: 'Home' };

export default function GlobalError({ error, reset }) {
    const t = COPY;

    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <html lang="en" dir="ltr">
            <body className={styles.body}>
                <main className={styles.card}>
                    <span className={styles.badge} aria-hidden="true">⚠</span>
                    <h1 className={styles.title}>{t.title}</h1>
                    <div className={styles.actions}>
                        <button type="button" onClick={() => reset()} className={styles.primary}>
                            {t.retry}
                        </button>
                        <Link href="/" className={styles.secondary}>
                            {t.home}
                        </Link>
                    </div>
                </main>
            </body>
        </html>
    );
}

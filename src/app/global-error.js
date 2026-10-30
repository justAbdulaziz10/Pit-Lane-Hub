'use client';

import { useEffect } from 'react';
import styles from './global-error.module.css';

// Replaces the root layout when it fails, so it carries its own document and minimal styles.
// The locale comes from the URL because no provider is mounted here.
const COPY = {
    en: { title: 'Something went wrong', retry: 'Try again', home: 'Home' },
    ar: { title: 'حدث خطأ ما', retry: 'إعادة المحاولة', home: 'الرئيسية' },
};

export default function GlobalError({ error, reset }) {
    const isArabic = typeof window !== 'undefined' && /^\/ar(\/|$)/.test(window.location.pathname);
    const lang = isArabic ? 'ar' : 'en';
    const t = COPY[lang];

    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <html lang={lang} dir={isArabic ? 'rtl' : 'ltr'}>
            <body className={styles.body}>
                <main className={styles.card}>
                    <span className={styles.badge} aria-hidden="true">⚠</span>
                    <h1 className={styles.title}>{t.title}</h1>
                    <div className={styles.actions}>
                        <button type="button" onClick={() => reset()} className={styles.primary}>
                            {t.retry}
                        </button>
                        <a href={isArabic ? '/ar' : '/'} className={styles.secondary}>
                            {t.home}
                        </a>
                    </div>
                </main>
            </body>
        </html>
    );
}

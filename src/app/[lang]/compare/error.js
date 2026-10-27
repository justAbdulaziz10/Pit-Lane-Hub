'use client';

import { useEffect } from 'react';
import { Link, useLocale } from '@/lib/i18n/LocaleProvider';
import { pick } from '@/lib/i18n/messages';
import compareMessages from '@/lib/i18n/messages/compare';
import styles from '../status.module.css';

export default function CompareError({ error, reset }) {
    const locale = useLocale();
    const t = pick(compareMessages, locale);

    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className={styles.wrapper}>
            <h1 className={styles.title}>{t.pageErrorTitle}</h1>
            <p className={styles.message}>{t.pageErrorMessage}</p>
            <div className={styles.actions}>
                <button type="button" className="btn btn-primary" onClick={() => reset()}>{t.tryAgain}</button>
                <Link href="/" className="btn btn-secondary">{t.home}</Link>
            </div>
        </div>
    );
}

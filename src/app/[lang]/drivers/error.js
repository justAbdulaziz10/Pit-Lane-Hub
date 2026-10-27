'use client';

import { Link, useLocale } from '@/lib/i18n/LocaleProvider';
import { useEffect } from 'react';
import { pick } from '@/lib/i18n/messages';
import driverMessages from '@/lib/i18n/messages/drivers';
import styles from '../status.module.css';

export default function DriversError({ error, reset }) {
    const locale = useLocale();
    const t = pick(driverMessages, locale);
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className={styles.wrapper}>
            <h1 className={styles.title}>{t.dataUnavailable}</h1>
            <p className={styles.message}>{t.dataUnavailableMessage}</p>
            <div className={styles.actions}>
                <button type="button" className="btn btn-primary" onClick={() => reset()}>
                    {t.tryAgain}
                </button>
                <Link href="/" className="btn btn-secondary">{t.home}</Link>
            </div>
        </div>
    );
}

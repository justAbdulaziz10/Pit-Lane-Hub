'use client';

import { useEffect } from 'react';
import { Link, useLocale } from '@/lib/i18n/LocaleProvider';
import { pick } from '@/lib/i18n/messages';
import commonMessages from '@/lib/i18n/messages/common';
import errorMessages from '@/lib/i18n/messages/errors';
import styles from './status.module.css';

export default function Error({ error, reset }) {
    const locale = useLocale();
    const t = pick(errorMessages, locale);
    const common = pick(commonMessages, locale);

    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className={styles.wrapper}>
            <h1 className={styles.title}>{t.loadTitle}</h1>
            <p className={styles.message}>{t.loadMessage}</p>
            <div className={styles.actions}>
                <button type="button" className="btn btn-primary" onClick={() => reset()}>
                    {t.tryAgain}
                </button>
                <Link href="/" className="btn btn-secondary">{common.home}</Link>
            </div>
        </div>
    );
}

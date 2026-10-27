'use client';

import { Link, useLocale } from '@/lib/i18n/LocaleProvider';
import { pick } from '@/lib/i18n/messages';
import commonMessages from '@/lib/i18n/messages/common';
import errorMessages from '@/lib/i18n/messages/errors';
import styles from './status.module.css';

export default function NotFound() {
    const lang = useLocale();
    const t = pick(errorMessages, lang);
    const common = pick(commonMessages, lang);
    return (
        <div className={styles.wrapper}>
            <p className={styles.code} aria-hidden="true">404</p>
            <h1 className={styles.title}>{t.notFoundTitle}</h1>
            <p className={styles.message}>{t.notFoundMessage}</p>
            <div className={styles.actions}>
                <Link href="/" className="btn btn-primary">{common.home}</Link>
                <Link href="/schedule" className="btn btn-secondary">{common.calendar}</Link>
                <Link href="/standings" className="btn btn-secondary">{common.standings}</Link>
            </div>
        </div>
    );
}

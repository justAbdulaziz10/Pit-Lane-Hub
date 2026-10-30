import Link from 'next/link';
import { localePath } from '@/lib/i18n/config';
import { pick } from '@/lib/i18n/messages';
import common from '@/lib/i18n/messages/common';
import { Wordmark } from './Header';
import styles from './Footer.module.css';

const REPO_URL = 'https://github.com/justAbdulaziz10/Pit-Lane-Hub';

const COLUMNS = [
    {
        title: 'season',
        links: [
            { href: '/schedule', label: 'calendar' },
            { href: '/standings', label: 'standings' },
            { href: '/live', label: 'liveTiming' },
        ],
    },
    {
        title: 'grid',
        links: [
            { href: '/drivers', label: 'drivers' },
            { href: '/teams', label: 'teams' },
            { href: '/compare', label: 'compareDrivers' },
        ],
    },
    {
        title: 'archive',
        links: [
            { href: '/history', label: 'history' },
            { href: '/tracks', label: 'circuits' },
        ],
    },
    {
        title: 'site',
        links: [
            { href: '/support', label: 'support' },
            { href: REPO_URL, label: 'source', external: true },
        ],
    },
];

export default function Footer({ lang = 'en' }) {
    const t = pick(common, lang);
    const [beforeJolpica, afterJolpica] = t.dataFrom.split('{jolpica}');
    const [between, afterOpenF1] = afterJolpica.split('{openf1}');
    return (
        <footer className={styles.footer}>
            <div className={styles.container}>
                <div className={styles.top}>
                    <div className={styles.brandBlock}>
                        <Link href={localePath(lang, '/')} className={styles.brand} aria-label={t.homeLabel}>
                            <Wordmark />
                        </Link>
                        <p className={styles.tagline}>{t.footerTagline}</p>
                    </div>

                    <nav className={styles.columns} aria-label={t.footerNav}>
                        {COLUMNS.map((column) => (
                            <div key={column.title} className={styles.column}>
                                <h2 className={styles.columnTitle}>{t[column.title]}</h2>
                                <ul>
                                    {column.links.map((link) => (
                                        <li key={link.href}>
                                            {link.external ? (
                                                <a href={link.href} rel="noopener noreferrer">{t[link.label]}</a>
                                            ) : (
                                                <Link href={localePath(lang, link.href)}>{t[link.label]}</Link>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </nav>
                </div>

                <div className={styles.legal}>
                    <p>
                        {beforeJolpica}
                        <a href="https://github.com/jolpica/jolpica-f1" rel="noopener noreferrer">Jolpica F1</a>
                        {between}
                        <a href="https://openf1.org" rel="noopener noreferrer">OpenF1</a>
                        {afterOpenF1}
                    </p>
                    <p>{t.disclaimer}</p>
                </div>
            </div>
        </footer>
    );
}

import Link from 'next/link';
import { Wordmark } from './Header';
import styles from './Footer.module.css';

const REPO_URL = 'https://github.com/justAbdulaziz10/Pit-Lane-Hub';

const COLUMNS = [
    {
        title: 'Season',
        links: [
            { href: '/schedule', label: 'Calendar' },
            { href: '/standings', label: 'Standings' },
            { href: '/live', label: 'Live timing' },
        ],
    },
    {
        title: 'Grid',
        links: [
            { href: '/drivers', label: 'Drivers' },
            { href: '/teams', label: 'Teams' },
            { href: '/compare', label: 'Compare drivers' },
        ],
    },
    {
        title: 'Archive',
        links: [
            { href: '/history', label: 'History' },
            { href: '/tracks', label: 'Circuits' },
        ],
    },
    {
        title: 'Site',
        links: [
            { href: '/support', label: 'Support' },
            { href: REPO_URL, label: 'Source on GitHub', external: true },
        ],
    },
];

export default function Footer() {
    return (
        <footer className={styles.footer}>
            <div className={styles.container}>
                <div className={styles.top}>
                    <Link href="/" className={styles.brand} aria-label="Pit Lane Hub home">
                        <Wordmark />
                    </Link>

                    <nav className={styles.columns} aria-label="Footer">
                        {COLUMNS.map((column) => (
                            <div key={column.title} className={styles.column}>
                                <h2 className={styles.columnTitle}>{column.title}</h2>
                                <ul>
                                    {column.links.map((link) => (
                                        <li key={link.href}>
                                            {link.external ? (
                                                <a href={link.href} rel="noopener noreferrer">{link.label}</a>
                                            ) : (
                                                <Link href={link.href}>{link.label}</Link>
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
                        Data from <a href="https://github.com/jolpica/jolpica-f1" rel="noopener noreferrer">Jolpica F1</a>{' '}
                        and <a href="https://openf1.org" rel="noopener noreferrer">OpenF1</a>.
                    </p>
                    <p>
                        Unofficial fan site. Not affiliated with Formula 1, the FIA or any team. F1 and Formula 1 are
                        trademarks of Formula One Licensing B.V.
                    </p>
                </div>
            </div>
        </footer>
    );
}

import Link from 'next/link';
import styles from './Footer.module.css';

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className={styles.footer}>
            <div className={styles.container}>
                {/* Main Content */}
                <div className={styles.content}>
                    {/* Brand */}
                    <div className={styles.brand}>
                        <div className={styles.logo}>
                            <span className={styles.logoIcon}>🏎️</span>
                            <span className={styles.logoText}>
                                <span className={styles.logoPrimary}>PIT LANE</span>
                                <span className={styles.logoSecondary}>HUB</span>
                            </span>
                        </div>
                        <p className={styles.tagline}>
                            Your ultimate destination for live F1, F2 & F3 racing data. Free and open source.
                        </p>
                    </div>

                    {/* Links */}
                    <div className={styles.links}>
                        <div className={styles.linkGroup}>
                            <h4 className={styles.linkTitle}>F1 Data</h4>
                            <Link href="/drivers">Drivers</Link>
                            <Link href="/teams">Teams</Link>
                            <Link href="/standings">Standings</Link>
                            <Link href="/schedule">Calendar</Link>
                        </div>
                        <div className={styles.linkGroup}>
                            <h4 className={styles.linkTitle}>Features</h4>
                            <Link href="/live">Live Timing</Link>
                            <Link href="/compare">Compare</Link>
                            <Link href="/history">History</Link>
                            <Link href="/junior">F2 & F3</Link>
                        </div>
                        <div className={styles.linkGroup}>
                            <h4 className={styles.linkTitle}>Resources</h4>
                            <Link href="/support">Support Us</Link>
                            <a href="https://openf1.org" target="_blank" rel="noopener noreferrer">
                                OpenF1 API ↗
                            </a>
                            <a href="https://www.formula1.com" target="_blank" rel="noopener noreferrer">
                                Formula 1 ↗
                            </a>
                        </div>
                    </div>
                </div>

                <div className={styles.bottom}>
                    <p className={styles.copyright}>
                        © {currentYear} Pit Lane Hub by{' '}
                        <a href="https://github.com/justAbdulaziz10" target="_blank" rel="noopener noreferrer" className={styles.creatorLink}>
                            Abdulaziz
                        </a>. Free & Open Source.
                    </p>
                    <div className={styles.powered}>
                        <span>Powered by</span>
                        <span className={styles.poweredBrands}>OpenF1 API • Vercel</span>
                    </div>
                </div>
            </div>

            {/* Racing Stripe */}
            <div className={styles.stripe}></div>
        </footer>
    );
}

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
                            Your ultimate destination for live F1 racing data, powered by the community.
                        </p>
                    </div>

                    {/* Links */}
                    <div className={styles.links}>
                        <div className={styles.linkGroup}>
                            <h4 className={styles.linkTitle}>Live Data</h4>
                            <Link href="/drivers">Drivers</Link>
                            <Link href="/schedule">Race Calendar</Link>
                            <Link href="/standings">Standings</Link>
                            <Link href="/live">Live Timing</Link>
                        </div>
                        <div className={styles.linkGroup}>
                            <h4 className={styles.linkTitle}>Resources</h4>
                            <a href="https://www.formula1.com/en/store" target="_blank" rel="noopener noreferrer">
                                Official F1 Store ↗
                            </a>
                            <a href="https://openf1.org" target="_blank" rel="noopener noreferrer">
                                OpenF1 API ↗
                            </a>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className={styles.bottom}>
                    <p className={styles.copyright}>
                        © {currentYear} Pit Lane Hub. Free & Open Source.
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

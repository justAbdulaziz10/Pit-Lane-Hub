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
                                <span className={styles.logoSecondary}>STORE</span>
                            </span>
                        </div>
                        <p className={styles.tagline}>
                            Your ultimate destination for F1 merchandise and live racing data.
                        </p>
                        <div className={styles.socials}>
                            <a href="#" aria-label="Twitter" className={styles.socialLink}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                </svg>
                            </a>
                            <a href="#" aria-label="Instagram" className={styles.socialLink}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                </svg>
                            </a>
                            <a href="#" aria-label="YouTube" className={styles.socialLink}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                                </svg>
                            </a>
                        </div>
                    </div>

                    {/* Links */}
                    <div className={styles.links}>
                        <div className={styles.linkGroup}>
                            <h4 className={styles.linkTitle}>Shop</h4>
                            <Link href="/store?category=apparel">Apparel</Link>
                            <Link href="/store?category=accessories">Accessories</Link>
                            <Link href="/store?category=collectibles">Collectibles</Link>
                            <Link href="/store?category=experiences">Experiences</Link>
                        </div>
                        <div className={styles.linkGroup}>
                            <h4 className={styles.linkTitle}>Racing</h4>
                            <Link href="/drivers">Drivers</Link>
                            <Link href="/schedule">Schedule</Link>
                            <Link href="/standings">Standings</Link>
                        </div>
                        <div className={styles.linkGroup}>
                            <h4 className={styles.linkTitle}>Support</h4>
                            <Link href="/contact">Contact Us</Link>
                            <Link href="/faq">FAQ</Link>
                            <Link href="/shipping">Shipping</Link>
                            <Link href="/returns">Returns</Link>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className={styles.bottom}>
                    <p className={styles.copyright}>
                        © {currentYear} Pit Lane Store. All rights reserved.
                    </p>
                    <div className={styles.legal}>
                        <Link href="/privacy">Privacy Policy</Link>
                        <Link href="/terms">Terms of Service</Link>
                    </div>
                    <div className={styles.powered}>
                        <span>Powered by</span>
                        <span className={styles.poweredBrands}>OpenF1 API • Stripe • Vercel</span>
                    </div>
                </div>
            </div>

            {/* Racing Stripe */}
            <div className={styles.stripe}></div>
        </footer>
    );
}

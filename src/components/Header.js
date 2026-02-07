'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from './Header.module.css';

export default function Header() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };

        window.addEventListener('scroll', handleScroll);

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    const navLinks = [
        { href: '/', label: 'Home' },
        { href: '/drivers', label: 'Drivers' },
        { href: '/teams', label: 'Teams' },
        { href: '/standings', label: 'Standings' },
        { href: '/schedule', label: 'Calendar' },
        { href: '/compare', label: 'Compare' },
        { href: '/live', label: 'Live', badge: true },
    ];

    return (
        <header className={`${styles.header} ${isScrolled ? styles.scrolled : ''}`}>
            <div className={styles.container}>
                {/* Logo */}
                <Link href="/" className={styles.logo}>
                    <span className={styles.logoIcon}>🏎️</span>
                    <span className={styles.logoText}>
                        <span className={styles.logoPrimary}>PIT LANE</span>
                        <span className={styles.logoSecondary}>HUB</span>
                    </span>
                </Link>

                {/* Desktop Navigation */}
                <nav className={styles.nav}>
                    {navLinks.map((link) => (
                        <Link key={link.href} href={link.href} className={styles.navLink}>
                            {link.label}
                            {link.badge && <span className={styles.liveBadge}>●</span>}
                        </Link>
                    ))}
                </nav>

                {/* Actions */}
                <div className={styles.actions}>
                    <Link href="/support" className={styles.supportButton}>
                        ❤️ Support
                    </Link>

                    {/* Mobile Menu Toggle */}
                    <button
                        className={styles.mobileToggle}
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        aria-label="Toggle menu"
                    >
                        <span className={`${styles.hamburger} ${isMobileMenuOpen ? styles.open : ''}`}>
                            <span></span>
                            <span></span>
                            <span></span>
                        </span>
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            <div className={`${styles.mobileMenu} ${isMobileMenuOpen ? styles.mobileMenuOpen : ''}`}>
                {navLinks.map((link) => (
                    <Link
                        key={link.href}
                        href={link.href}
                        className={styles.mobileNavLink}
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        {link.label}
                        {link.badge && <span className={styles.liveBadge}>●</span>}
                    </Link>
                ))}
                <Link
                    href="/support"
                    className={styles.mobileNavLink}
                    onClick={() => setIsMobileMenuOpen(false)}
                >
                    ❤️ Support Us
                </Link>
            </div>
        </header>
    );
}

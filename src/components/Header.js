'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from './Header.module.css';

import { useSession } from "next-auth/react";

export default function Header() {
    const { data: session } = useSession()
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
        { href: '/history', label: 'History' },
        { href: '/tracks', label: 'Tracks' },
        { href: '/junior', label: 'F2/F3' },
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
                    {session?.user?.isPro && (
                        <span className={styles.proBadge}>PRO</span>
                    )}
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
                    <Link href="/support" className={styles.coffeeButton} title="Buy us a coffee">
                        <span>☕</span>
                        <span className={styles.coffeeText}>Support</span>
                    </Link>

                    {!session ? (
                        <div className={styles.authLinks}>
                            <Link href="/login" className={styles.navLink}>Log In</Link>
                            <Link href="/signup" className={styles.supportButton}>Sign Up</Link>
                        </div>
                    ) : (
                        <div className={styles.profileWrap}>
                            <Link href="/profile" className={styles.profileLink}>
                                <div className={styles.avatar}>
                                    {session.user.name ? session.user.name[0].toUpperCase() : "U"}
                                </div>
                                <span className={styles.profileName}>
                                    {session.user.name?.split(' ')[0] || "Profile"}
                                </span>
                            </Link>
                        </div>
                    )}

                    {/* Mobile Menu Toggle */}
                    <button
                        className={styles.mobileToggle}
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        aria-label="Toggle menu"
                        aria-expanded={isMobileMenuOpen}
                        aria-controls="mobile-menu"
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
            <div id="mobile-menu" className={`${styles.mobileMenu} ${isMobileMenuOpen ? styles.mobileMenuOpen : ''}`}>
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

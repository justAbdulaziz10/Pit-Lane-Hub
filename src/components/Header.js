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
                        <span className="ml-2 bg-[#E10600] text-white text-[10px] font-bold px-1.5 py-0.5 rounded">PRO</span>
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
                        <div className="flex gap-4">
                            <Link href="/login" className={styles.navLink}>Log In</Link>
                            <Link href="/signup" className={styles.supportButton}>Sign Up</Link>
                        </div>
                    ) : (
                        <div className="flex items-center gap-4">
                            <Link href="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#e10600] to-[#ff4d4d] flex items-center justify-center text-white font-bold text-sm border-2 border-white/20">
                                    {session.user.name ? session.user.name[0].toUpperCase() : "U"}
                                </div>
                                <span className="text-sm font-medium hidden md:block">
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

'use client';

import { getCartCount } from '@/lib/cart';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from './Header.module.css';

export default function Header({ onCartClick }) {
    const [cartCount, setCartCount] = useState(0);
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        // Update cart count
        const updateCartCount = () => {
            setCartCount(getCartCount());
        };

        updateCartCount();
        window.addEventListener('storage', updateCartCount);
        window.addEventListener('cartUpdated', updateCartCount);

        // Scroll effect
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };

        window.addEventListener('scroll', handleScroll);

        return () => {
            window.removeEventListener('storage', updateCartCount);
            window.removeEventListener('cartUpdated', updateCartCount);
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    const navLinks = [
        { href: '/', label: 'Home' },
        { href: '/store', label: 'Store' },
        { href: '/drivers', label: 'Drivers' },
        { href: '/schedule', label: 'Schedule' },
    ];

    return (
        <header className={`${styles.header} ${isScrolled ? styles.scrolled : ''}`}>
            <div className={styles.container}>
                {/* Logo */}
                <Link href="/" className={styles.logo}>
                    <span className={styles.logoIcon}>🏎️</span>
                    <span className={styles.logoText}>
                        <span className={styles.logoPrimary}>PIT LANE</span>
                        <span className={styles.logoSecondary}>STORE</span>
                    </span>
                </Link>

                {/* Desktop Navigation */}
                <nav className={styles.nav}>
                    {navLinks.map((link) => (
                        <Link key={link.href} href={link.href} className={styles.navLink}>
                            {link.label}
                        </Link>
                    ))}
                </nav>

                {/* Actions */}
                <div className={styles.actions}>
                    <button
                        className={styles.cartButton}
                        onClick={onCartClick}
                        aria-label="Open cart"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="9" cy="21" r="1" />
                            <circle cx="20" cy="21" r="1" />
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                        </svg>
                        {cartCount > 0 && (
                            <span className={styles.cartBadge}>{cartCount}</span>
                        )}
                    </button>

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
                    </Link>
                ))}
            </div>
        </header>
    );
}

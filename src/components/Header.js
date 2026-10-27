'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './Header.module.css';

const NAV_LINKS = [
    { href: '/schedule', label: 'Calendar' },
    { href: '/standings', label: 'Standings' },
    { href: '/live', label: 'Live' },
    { href: '/drivers', label: 'Drivers', match: ['/driver/'] },
    { href: '/teams', label: 'Teams', match: ['/team/'] },
    { href: '/compare', label: 'Compare' },
    { href: '/tracks', label: 'Tracks' },
    { href: '/history', label: 'History' },
];

function isCurrent(pathname, link) {
    if (!pathname) return false;
    if (pathname === link.href || pathname.startsWith(`${link.href}/`)) return true;
    return (link.match || []).some((prefix) => pathname.startsWith(prefix));
}

/** Text wordmark with a slanted timing-tower bar; stays legible down to 320px. */
export function Wordmark({ className = '' }) {
    return (
        <span className={`${styles.wordmark} ${className}`}>
            <svg className={styles.mark} viewBox="0 0 10 24" aria-hidden="true" focusable="false">
                <path d="M4 0h6L6 24H0z" />
            </svg>
            <span className={styles.wordmarkText}>
                Pit Lane <span className={styles.wordmarkHub}>Hub</span>
            </span>
        </span>
    );
}

function MenuIcon({ open }) {
    return (
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
            {open ? (
                <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            ) : (
                <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            )}
        </svg>
    );
}

export default function Header() {
    const { data: session } = useSession();
    const pathname = usePathname();
    const [menuOpen, setMenuOpen] = useState(false);
    const [menuPath, setMenuPath] = useState(pathname);
    const buttonRef = useRef(null);
    const menuRef = useRef(null);

    // Close the menu after navigation (adjusting state during render, not in an effect).
    if (menuPath !== pathname) {
        setMenuPath(pathname);
        setMenuOpen(false);
    }

    const closeMenu = useCallback((returnFocus) => {
        setMenuOpen(false);
        if (returnFocus) buttonRef.current?.focus();
    }, []);

    useEffect(() => {
        if (!menuOpen) return undefined;
        menuRef.current?.querySelector('a')?.focus();

        const onKeyDown = (event) => {
            if (event.key === 'Escape') closeMenu(true);
        };
        const onPointerDown = (event) => {
            if (!menuRef.current?.contains(event.target) && !buttonRef.current?.contains(event.target)) {
                closeMenu(false);
            }
        };
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('pointerdown', onPointerDown);
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.removeEventListener('pointerdown', onPointerDown);
        };
    }, [menuOpen, closeMenu]);

    const user = session?.user;
    const initial = (user?.name || user?.email || '?').trim().charAt(0).toUpperCase();

    return (
        <header className={styles.header}>
            <div className={styles.bar}>
                <Link href="/" className={styles.brand} aria-label="Pit Lane Hub home">
                    <Wordmark />
                </Link>

                <nav className={styles.nav} aria-label="Main">
                    <ul className={styles.navList}>
                        {NAV_LINKS.map((link) => (
                            <li key={link.href}>
                                <Link
                                    href={link.href}
                                    className={styles.navLink}
                                    aria-current={isCurrent(pathname, link) ? 'page' : undefined}
                                >
                                    {link.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>

                <div className={styles.end}>
                    {user ? (
                        <Link
                            href="/profile"
                            className={styles.account}
                            aria-current={pathname === '/profile' ? 'page' : undefined}
                        >
                            <span className={styles.avatar} aria-hidden="true">{initial}</span>
                            <span className={styles.accountLabel}>Account</span>
                            {user.isPro ? <span className={styles.pro}>Pro</span> : null}
                        </Link>
                    ) : (
                        <Link
                            href="/login"
                            className={styles.signIn}
                            aria-current={pathname === '/login' ? 'page' : undefined}
                        >
                            Sign in
                        </Link>
                    )}

                    <button
                        ref={buttonRef}
                        type="button"
                        className={styles.menuButton}
                        aria-label="Menu"
                        aria-expanded={menuOpen}
                        aria-controls="site-menu"
                        onClick={() => setMenuOpen((open) => !open)}
                    >
                        <MenuIcon open={menuOpen} />
                        <span>Menu</span>
                    </button>
                </div>
            </div>

            <div id="site-menu" ref={menuRef} className={styles.menu} hidden={!menuOpen}>
                <nav
                    aria-label="Main menu"
                    onClick={(event) => {
                        if (event.target.closest('a')) setMenuOpen(false);
                    }}
                >
                    <ul className={styles.menuList}>
                        <li>
                            <Link href="/" className={styles.menuLink} aria-current={pathname === '/' ? 'page' : undefined}>
                                Home
                            </Link>
                        </li>
                        {NAV_LINKS.map((link) => (
                            <li key={link.href}>
                                <Link
                                    href={link.href}
                                    className={styles.menuLink}
                                    aria-current={isCurrent(pathname, link) ? 'page' : undefined}
                                >
                                    {link.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                    <ul className={styles.menuSecondary}>
                        <li>
                            <Link href={user ? '/profile' : '/login'} className={styles.menuSmall}>
                                {user ? 'Account' : 'Sign in'}
                            </Link>
                        </li>
                        <li>
                            <Link href="/support" className={styles.menuSmall}>Support</Link>
                        </li>
                    </ul>
                </nav>
            </div>
        </header>
    );
}

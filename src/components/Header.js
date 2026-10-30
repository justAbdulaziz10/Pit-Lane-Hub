'use client';

import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { splitLocale } from '@/lib/i18n/config';
import { Link, useLocale } from '@/lib/i18n/LocaleProvider';
import { pick } from '@/lib/i18n/messages';
import common from '@/lib/i18n/messages/common';
import LanguageSwitch from './LanguageSwitch';
import styles from './Header.module.css';

const NAV_LINKS = [
    { href: '/', key: 'home' },
    { href: '/schedule', key: 'calendar' },
    { href: '/standings', key: 'standings' },
    { href: '/live', key: 'live' },
    { href: '/drivers', key: 'drivers', match: ['/driver/'] },
    { href: '/teams', key: 'teams', match: ['/team/'] },
    { href: '/compare', key: 'compare' },
    { href: '/tracks', key: 'tracks' },
    { href: '/history', key: 'history' },
];

function isCurrent(pathname, link) {
    if (!pathname) return false;
    if (pathname === link.href || pathname.startsWith(`${link.href}/`)) return true;
    return (link.match || []).some((prefix) => pathname.startsWith(prefix));
}

/** Car mark and two-line wordmark from the original Pit Lane Hub identity. */
export function Wordmark({ className = '' }) {
    return (
        <span className={`${styles.wordmark} ${className}`}>
            <svg className={styles.mark} viewBox="0 0 72 34" aria-hidden="true" focusable="false">
                <path d="M5 22.5h8.2l7-8.8c1.2-1.5 2.7-2.3 4.6-2.3h17.8c2.8 0 4.9.8 6.8 2.4l5.8 5h8.9c2 0 3.2 1.1 3.2 3v3.1H5z" />
                <path d="M25.4 13.4h14.2l5.1 5.4H21.2z" fill="#0d0d0d" />
                <circle cx="19" cy="25.6" r="4.4" />
                <circle cx="56.7" cy="25.6" r="4.4" />
                <path d="M4 28.5h64" stroke="currentColor" strokeWidth="1.6" />
            </svg>
            <span className={styles.wordmarkText}>
                <span>Pit Lane</span>
                <span className={styles.wordmarkHub}>Hub</span>
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
    const t = pick(common, useLocale());
    // Active-link matching works on the app path, without the /ar prefix.
    const pathname = splitLocale(usePathname() || '/').path;
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
                <Link href="/" className={styles.brand} aria-label={t.homeLabel}>
                    <Wordmark />
                </Link>

                <nav className={styles.nav} aria-label={t.mainNav}>
                    <ul className={styles.navList}>
                        {NAV_LINKS.map((link) => (
                            <li key={link.href}>
                                <Link
                                    href={link.href}
                                    className={styles.navLink}
                                    aria-current={isCurrent(pathname, link) ? 'page' : undefined}
                                >
                                    {link.key === 'live' && <span className={styles.liveDot} aria-hidden="true" />}
                                    {t[link.key]}
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
                            <span className={styles.accountLabel}>{t.account}</span>
                            {user.isPro ? <span className={styles.pro}>Pro</span> : null}
                        </Link>
                    ) : (
                        <Link
                            href="/login"
                            className={styles.signIn}
                            aria-current={pathname === '/login' ? 'page' : undefined}
                        >
                            {t.signIn}
                        </Link>
                    )}

                    <div className={styles.desktopActions}>
                        <Link
                            href="/support"
                            className={`${styles.supportButton} btn btn-support`}
                            aria-current={pathname === '/support' ? 'page' : undefined}
                        >
                            {t.support}
                        </Link>
                        {!user && (
                            <Link
                                href="/signup"
                                className={`${styles.signUpButton} btn btn-primary`}
                                aria-current={pathname === '/signup' ? 'page' : undefined}
                            >
                                {t.signUp}
                            </Link>
                        )}
                    </div>

                    <LanguageSwitch className={styles.signIn} label={t.switchLanguage} title={t.switchLanguageLabel} />

                    <button
                        ref={buttonRef}
                        type="button"
                        className={styles.menuButton}
                        aria-label={t.menu}
                        aria-expanded={menuOpen}
                        aria-controls="site-menu"
                        onClick={() => setMenuOpen((open) => !open)}
                    >
                        <MenuIcon open={menuOpen} />
                        <span>{t.menu}</span>
                    </button>
                </div>
            </div>

            <div id="site-menu" ref={menuRef} className={styles.menu} hidden={!menuOpen}>
                <nav
                    aria-label={t.mainMenu}
                    onClick={(event) => {
                        if (event.target.closest('a')) setMenuOpen(false);
                    }}
                >
                    <ul className={styles.menuList}>
                        {NAV_LINKS.map((link) => (
                            <li key={link.href}>
                                <Link
                                    href={link.href}
                                    className={styles.menuLink}
                                    aria-current={isCurrent(pathname, link) ? 'page' : undefined}
                                >
                                    {link.key === 'live' && <span className={styles.liveDot} aria-hidden="true" />}
                                    {t[link.key]}
                                </Link>
                            </li>
                        ))}
                    </ul>
                    <ul className={styles.menuSecondary}>
                        <li>
                            <Link
                                href={user ? '/profile' : '/login'}
                                className={styles.menuSmall}
                                aria-current={pathname === (user ? '/profile' : '/login') ? 'page' : undefined}
                            >
                                {user ? t.account : t.signIn}
                            </Link>
                        </li>
                        <li>
                            <Link href="/support" className={`${styles.menuAction} btn btn-support`} aria-current={pathname === '/support' ? 'page' : undefined}>
                                {t.support}
                            </Link>
                        </li>
                        {!user && (
                            <li>
                                <Link href="/signup" className={`${styles.menuAction} btn btn-primary`} aria-current={pathname === '/signup' ? 'page' : undefined}>
                                    {t.signUp}
                                </Link>
                            </li>
                        )}
                    </ul>
                </nav>
            </div>
        </header>
    );
}

'use client';

import { signIn } from 'next-auth/react';
import { Link, useLocale } from '@/lib/i18n/LocaleProvider';
import { pick } from '@/lib/i18n/messages';
import authMessages from '@/lib/i18n/messages/auth';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { safeRedirectPath } from '@/lib/validation';
import { resendVerificationEmail } from '@/app/actions/auth';
import styles from './page.module.css';

function normalizeEmail(value) {
    return String(value || '').trim().toLowerCase();
}

function LoginFormContent({ searchParams }) {
    const t = pick(authMessages, useLocale());
    const router = useRouter();
    const [error, setError] = useState('');
    const [actionNotice, setActionNotice] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isResendingVerification, setIsResendingVerification] = useState(false);
    const origin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
    const getParam = (name) => {
        const value = searchParams[name];
        return Array.isArray(value) ? value[0] || '' : value || '';
    };
    const redirectTo = safeRedirectPath(getParam('redirect') || getParam('callbackUrl'), origin);
    const authErrors = {
        TooManyRequests: t.tooManySignInLinks,
        Verification: t.invalidSignInLink,
    };
    const authError = getParam('error');
    const displayedError = error || (authError ? authErrors[authError] || t.signInFailed : '');
    const notice = actionNotice || (
        getParam('verified') === 'true'
            ? t.emailVerifiedNotice
            : getParam('registered') === 'true'
                ? t.registeredNotice
                : getParam('verification') === 'invalid'
                    ? t.invalidVerificationNotice
                    : ''
    );
    const canResendVerification = Boolean(error) ||
        getParam('registered') === 'true' ||
        getParam('verification') === 'invalid';

    const handleResendVerification = async (e) => {
        e.preventDefault();
        setIsResendingVerification(true);
        const result = await resendVerificationEmail(new FormData(e.currentTarget));
        setActionNotice(result.message);
        setIsResendingVerification(false);
    };

    const handleMagicLink = async (formData) => {
        setError('');
        setIsLoading(true);
        try {
            await signIn('resend', { email: normalizeEmail(formData.get('email')), redirectTo });
        } catch {
            setError(t.magicLinkFailed);
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setActionNotice('');
        setIsLoading(true);

        const form = e.currentTarget;
        try {
            const result = await signIn('credentials', {
                email: normalizeEmail(form.email.value),
                password: form.password.value,
                redirect: false,
            });

            if (result?.error) {
                setError(t.wrongCredentials);
                setIsLoading(false);
            } else {
                router.push(redirectTo);
                router.refresh();
            }
        } catch {
            setError(t.signInFailed);
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.panel}>
                <span className={styles.badge}>{t.accountBadge}</span>
                <h1 className={styles.title}>{t.loginTitle}</h1>
                <p className={styles.intro}>{t.loginIntro}</p>

                {displayedError && <p className={styles.error} role="alert">{displayedError}</p>}
                {notice && <p className={styles.notice} role="status">{notice}</p>}

                <form action={handleMagicLink} className={styles.form}>
                    <div className={styles.field}>
                        <label htmlFor="link-email" className={styles.label}>{t.email}</label>
                        <input
                            id="link-email"
                            type="email"
                            name="email"
                            autoComplete="email"
                            dir="ltr"
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <button type="submit" disabled={isLoading} className="btn btn-primary">
                        {isLoading ? t.sending : t.emailSignInLink}
                    </button>
                </form>

                <p className={styles.divider}><span>{t.orPassword}</span></p>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.field}>
                        <label htmlFor="password-email" className={styles.label}>{t.email}</label>
                        <input
                            id="password-email"
                            type="email"
                            name="email"
                            autoComplete="email"
                            dir="ltr"
                            required
                        />
                    </div>

                    <div className={styles.field}>
                        <label htmlFor="password" className={styles.label}>{t.password}</label>
                        <input
                            id="password"
                            type="password"
                            name="password"
                            autoComplete="current-password"
                            dir="ltr"
                            required
                        />
                    </div>

                    <button type="submit" disabled={isLoading} className="btn btn-secondary">
                        {isLoading ? t.signingIn : t.passwordSignIn}
                    </button>
                </form>

                {canResendVerification && (
                    <form onSubmit={handleResendVerification} className={`${styles.form} ${styles.resend}`}>
                        <div className={styles.field}>
                            <label htmlFor="resend-email" className={styles.label}>{t.resendVerification}</label>
                            <input
                                id="resend-email"
                                type="email"
                                name="email"
                                autoComplete="email"
                                dir="ltr"
                                required
                                disabled={isResendingVerification}
                            />
                        </div>
                        <button type="submit" disabled={isResendingVerification} className="btn btn-secondary">
                            {isResendingVerification ? t.sending : t.resendEmail}
                        </button>
                    </form>
                )}

                <p className={styles.switch}>
                    {t.noAccount} <Link href="/signup">{t.createOne}</Link>
                </p>
            </div>
        </div>
    );
}

export default function LoginForm({ searchParams }) {
    return <LoginFormContent searchParams={searchParams} />;
}

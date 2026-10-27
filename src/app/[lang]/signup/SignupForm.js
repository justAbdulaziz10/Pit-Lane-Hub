'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Link, useLocale } from '@/lib/i18n/LocaleProvider';
import { localePath } from '@/lib/i18n/config';
import { pick } from '@/lib/i18n/messages';
import authMessages from '@/lib/i18n/messages/auth';
import { registerUser } from '@/app/actions/auth';
import styles from '../login/page.module.css';

export default function SignupForm() {
    const locale = useLocale();
    const t = pick(authMessages, locale);
    const router = useRouter();
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const formData = new FormData(e.currentTarget);

        try {
            const result = await registerUser(formData);

            if (result.error) {
                setError(result.error);
                setIsLoading(false);
            } else {
                router.push(localePath(locale, '/login?registered=true'));
            }
        } catch {
            setError(t.somethingWentWrong);
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.panel}>
                <h1 className={styles.title}>{t.signupTitle}</h1>
                <p className={styles.intro}>{t.signupIntro}</p>

                {error && <p className={styles.error} role="alert">{error}</p>}

                <form onSubmit={handleSubmit} className={styles.form}>
                    <input type="hidden" name="lang" value={locale} />
                    <div className={styles.field}>
                        <label htmlFor="signup-name" className={styles.label}>{t.name}</label>
                        <input id="signup-name" type="text" name="name" autoComplete="name" required />
                    </div>

                    <div className={styles.field}>
                        <label htmlFor="signup-email" className={styles.label}>{t.email}</label>
                        <input id="signup-email" type="email" name="email" autoComplete="email" dir="ltr" required />
                    </div>

                    <div className={styles.field}>
                        <label htmlFor="signup-password" className={styles.label}>{t.password}</label>
                        <input
                            id="signup-password"
                            type="password"
                            name="password"
                            autoComplete="new-password"
                            minLength={8}
                            aria-describedby="signup-password-hint"
                            dir="ltr"
                            required
                        />
                        <span id="signup-password-hint" className={styles.hint}>{t.passwordHint}</span>
                    </div>

                    <button type="submit" disabled={isLoading} className="btn btn-primary">
                        {isLoading ? t.creatingAccount : t.createAccount}
                    </button>
                </form>

                <p className={styles.switch}>
                    {t.alreadyHaveAccount} <Link href="/login">{t.signIn}</Link>
                </p>
            </div>
        </div>
    );
}

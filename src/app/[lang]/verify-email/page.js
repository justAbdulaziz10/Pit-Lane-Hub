import NextLink from "next/link";
import { localePath } from "@/lib/i18n/config";
import { localizedPageMetadata } from "@/lib/i18n/metadata";
import { pick } from "@/lib/i18n/messages";
import authMessages from "@/lib/i18n/messages/auth";
import styles from "../status-page.module.css";
import formStyles from "../login/page.module.css";

export async function generateMetadata({ params }) {
    const { lang } = await params;
    const t = pick(authMessages, lang);
    return localizedPageMetadata(lang, '/verify-email', {
        title: t.verifyMetadataTitle,
        description: t.verifyDescription,
        robots: { index: false, follow: false },
        // Keep the token in this URL from leaking to other origins through the Referer header.
        referrer: 'same-origin',
    });
}

const TOKEN_PATTERN = /^[a-f0-9]{64}$/i;

/** Confirmation step for emailed verification links: only the button's POST verifies. */
export default async function VerifyEmailPage({ params, searchParams }) {
    const { lang } = await params;
    const { token, verification } = await searchParams;
    const hasToken = typeof token === "string" && TOKEN_PATTERN.test(token);
    const passwordMismatch = verification === "password";
    const t = pick(authMessages, lang);

    return (
        <div className={styles.wrapper}>
            <span className={styles.badge}>{t.accountBadge}</span>
            <h1 className={styles.title}>{t.verifyTitle}</h1>
            {hasToken ? (
                <>
                    {passwordMismatch && (
                        <p id="verify-password-error" className={styles.message} role="alert">
                            {t.verificationPasswordMismatch}{' '}
                            <NextLink href={localePath(lang, '/login')}>{t.verificationUseSignInLink}</NextLink>
                        </p>
                    )}
                    <form method="post" action="/api/auth/verify" className={formStyles.form}>
                        <input type="hidden" name="token" value={token} />
                        <div className={formStyles.field}>
                            <label htmlFor="verify-password" className={formStyles.label}>{t.password}</label>
                            <input
                                id="verify-password"
                                type="password"
                                name="password"
                                autoComplete="current-password"
                                aria-invalid={passwordMismatch}
                                aria-describedby={passwordMismatch ? "verify-password-error" : undefined}
                                dir="ltr"
                                required
                            />
                        </div>
                        <button type="submit" className="btn btn-primary">{t.verifyButton}</button>
                    </form>
                </>
            ) : (
                <>
                    <p className={styles.message}>{t.invalidVerificationLink}</p>
                    <div className={styles.actions}>
                        <NextLink href={localePath(lang, '/login?verification=invalid')} className="btn btn-primary">{t.signIn}</NextLink>
                    </div>
                </>
            )}
        </div>
    );
}

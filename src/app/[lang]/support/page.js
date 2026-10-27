'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Link, useLocale } from '@/lib/i18n/LocaleProvider';
import { localePath } from '@/lib/i18n/config';
import { pick } from '@/lib/i18n/messages';
import supportMessages from '@/lib/i18n/messages/support';
import { getCheckoutOutcome } from '@/lib/checkout-response';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './page.module.css';

/** Confirmation shown when Polar sends the visitor back with ?success=true or ?canceled. */
function CheckoutStatus({ t }) {
    const searchParams = useSearchParams();
    const { update } = useSession();
    const succeeded = searchParams.get('success') === 'true';

    useEffect(() => {
        // Ask the server to reload Pro state from the database (the webhook may land a moment later).
        if (succeeded) void update?.();
    }, [succeeded, update]);

    if (succeeded) {
        return <p className={styles.notice} role="status">{t.checkoutReceived}</p>;
    }
    if (searchParams.has('canceled')) {
        return <p className={styles.notice} role="status">{t.checkoutCanceled}</p>;
    }
    return null;
}

export default function SupportPage() {
    const locale = useLocale();
    const t = pick(supportMessages, locale);
    const { data: session, status } = useSession();
    const router = useRouter();
    const [checkoutError, setCheckoutError] = useState('');
    const [portalUrl, setPortalUrl] = useState('');
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const isPro = session?.user?.isPro === true;
    const signedOut = status === 'unauthenticated';

    const handleSubscribe = async () => {
        setCheckoutError('');
        setPortalUrl('');
        setIsCheckingOut(true);

        try {
            const response = await fetch('/api/polar/checkout', { method: 'POST' });
            if (response.status === 401) {
                router.push(localePath(locale, '/login?redirect=%2Fsupport'));
                return;
            }

            const data = await response.json();
            const outcome = getCheckoutOutcome(response.status, data);
            if (outcome.type === 'manage') {
                setCheckoutError(t.alreadyPro);
                setPortalUrl(outcome.url);
            } else if (outcome.type === 'checkout') {
                window.location.href = outcome.url;
            } else {
                setCheckoutError(t.checkoutFailed);
            }
        } catch {
            setCheckoutError(t.checkoutFailed);
        } finally {
            setIsCheckingOut(false);
        }
    };

    return (
        <div className={styles.support}>
            <div className="container">
                <header className={styles.header}>
                    <h1>{t.title}</h1>
                    <p className={styles.lead}>{t.intro}</p>
                </header>

                <div className={styles.options}>
                    <section className={styles.option} aria-labelledby="tip-heading">
                        <h2 id="tip-heading">{t.oneTimeTip}</h2>
                        <p>{t.tipDescription}</p>
                        <a
                            className="btn btn-secondary"
                            href="https://buymeacoffee.com/justAbdulaziz10"
                            target="_blank"
                            rel="noreferrer"
                        >
                            {t.leaveTip}
                        </a>
                    </section>

                    <section className={styles.option} aria-labelledby="pro-heading">
                        <h2 id="pro-heading">{t.proTitle}</h2>
                        <p className={styles.price}>
                            <bdi className={styles.amount} dir="ltr">$4.99</bdi> {t.perMonth}
                        </p>
                        <ul className={styles.facts}>
                            <li>{t.supporterBadge}</li>
                            <li>{t.cancelAnyTime}</li>
                            <li>{t.billingDetails}</li>
                        </ul>
                        <Suspense fallback={null}>
                            <CheckoutStatus t={t} />
                        </Suspense>
                        {checkoutError && <p className={styles.error} role="alert">{checkoutError}</p>}
                        {portalUrl && (
                            <a href={portalUrl} className="btn btn-secondary">{t.manageSubscription}</a>
                        )}
                        {isPro ? (
                            <div className={styles.proState}>
                                <p>{t.proThanks}</p>
                                <Link href="/profile" className="btn btn-secondary">{t.manageSubscription}</Link>
                            </div>
                        ) : portalUrl ? null : (
                            <div className={styles.proActions}>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={handleSubscribe}
                                    disabled={isCheckingOut}
                                >
                                    {isCheckingOut ? t.openingCheckout : t.getPro}
                                </button>
                                {signedOut ? (
                                    <Link href="/login?redirect=%2Fsupport" className={styles.textLink}>{t.signInFirst}</Link>
                                ) : null}
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}

'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './page.module.css';

/** Confirmation shown when Polar sends the visitor back with ?success=true or ?canceled. */
function CheckoutStatus() {
    const searchParams = useSearchParams();
    const { update } = useSession();
    const succeeded = searchParams.get('success') === 'true';

    useEffect(() => {
        // Ask the server to reload Pro state from the database (the webhook may land a moment later).
        if (succeeded) void update?.();
    }, [succeeded, update]);

    if (succeeded) {
        return (
            <p className={styles.notice} role="status">
                Payment received. Polar is confirming it; your Pro badge appears on your account within a few minutes.
            </p>
        );
    }
    if (searchParams.has('canceled')) {
        return (
            <p className={styles.notice} role="status">
                Checkout canceled. You have not been charged.
            </p>
        );
    }
    return null;
}

export default function SupportPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [checkoutError, setCheckoutError] = useState('');
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const isPro = session?.user?.isPro === true;
    const signedOut = status === 'unauthenticated';

    const handleSubscribe = async () => {
        setCheckoutError('');
        setIsCheckingOut(true);

        try {
            const response = await fetch('/api/polar/checkout', {
                method: 'POST',
            });

            if (response.status === 401) {
                router.push('/login?redirect=%2Fsupport');
                return;
            }

            const data = await response.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                setCheckoutError(data.error || 'Checkout could not start. Try again later.');
            }
        } catch {
            setCheckoutError('Checkout could not start. Try again later.');
        } finally {
            setIsCheckingOut(false);
        }
    };

    return (
        <div className={styles.support}>
            <div className="container">
                <header className={styles.header}>
                    <h1>Support Pit Lane Hub</h1>
                    <p className={styles.lead}>
                        Pit Lane Hub is free to use, with no ads. Support pays for hosting and keeps the data
                        pages running. Nothing on the site is locked behind a payment.
                    </p>
                </header>

                <div className={styles.options}>
                    <section className={styles.option} aria-labelledby="tip-heading">
                        <h2 id="tip-heading">One-time tip</h2>
                        <p>Any amount, through Buy Me a Coffee. No account needed.</p>
                        <a
                            className="btn btn-secondary"
                            href="https://buymeacoffee.com/justAbdulaziz10"
                            target="_blank"
                            rel="noreferrer"
                        >
                            Leave a one-time tip
                        </a>
                    </section>

                    <section className={styles.option} aria-labelledby="pro-heading">
                        <h2 id="pro-heading">Pit Lane Pro</h2>
                        <p className={styles.price}>
                            <span className={styles.amount}>$4.99</span> per month
                        </p>
                        <ul className={styles.facts}>
                            <li>Supporter badge on your profile</li>
                            <li>Cancel any time from your account</li>
                            <li>Needs a free account; billing is handled by Polar</li>
                        </ul>
                        <Suspense fallback={null}>
                            <CheckoutStatus />
                        </Suspense>
                        {checkoutError && <p className={styles.error} role="alert">{checkoutError}</p>}
                        {isPro ? (
                            <div className={styles.proState}>
                                <p>You have Pit Lane Pro. Thank you.</p>
                                <Link href="/profile" className="btn btn-secondary">Manage subscription</Link>
                            </div>
                        ) : (
                            <div className={styles.proActions}>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={handleSubscribe}
                                    disabled={isCheckingOut}
                                >
                                    {isCheckingOut ? 'Opening checkout…' : 'Get Pit Lane Pro'}
                                </button>
                                {signedOut ? (
                                    <Link href="/login?redirect=%2Fsupport" className={styles.textLink}>Sign in first</Link>
                                ) : null}
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}

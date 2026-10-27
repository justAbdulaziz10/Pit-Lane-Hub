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
            <p className={styles.checkoutMessage} role="status">
                Thanks for subscribing! Polar is confirming your payment; your Pro badge appears on your profile within a few minutes.
            </p>
        );
    }
    if (searchParams.has('canceled')) {
        return (
            <p className={styles.checkoutMessage} role="status">
                Checkout was canceled. You have not been charged.
            </p>
        );
    }
    return null;
}

export default function SupportPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const [checkoutError, setCheckoutError] = useState('');
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const isPro = session?.user?.isPro === true;

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
                setCheckoutError(data.error || 'Unable to start checkout. Please try again later.');
            }
        } catch {
            setCheckoutError('Unable to start checkout. Please try again later.');
        } finally {
            setIsCheckingOut(false);
        }
    };

    return (
        <div className={styles.support}>
            {/* Hero */}
            <div className={styles.hero}>
                <div className="container">
                    <span className={styles.badge}>❤️ SUPPORT US</span>
                    <h1>Support Pit Lane Hub</h1>
                    <p>Help us keep F1 data free and accessible for everyone</p>
                </div>
            </div>

            {/* Main Content */}
            <div className={styles.content}>
                <div className="container">
                    <div className={styles.grid}>
                        {/* Donation Section */}
                        <div className={styles.donationCard}>
                            <h2>☕ Buy Me a Coffee</h2>
                            <p className={styles.subtitle}>
                                Leave a one-time tip to support the project.
                            </p>
                            <a
                                className={styles.donateBtn}
                                href="https://buymeacoffee.com/justAbdulaziz10"
                                target="_blank"
                                rel="noreferrer"
                            >
                                Leave a one-time tip
                            </a>

                            <p className={styles.disclaimer}>
                                Buy Me a Coffee handles one-time tips.
                            </p>
                        </div>

                        {/* Why Support */}
                        <div className={styles.whySupport}>
                            <h2>Why Support?</h2>

                            <div className={styles.benefitsList}>
                                <div className={styles.benefit}>
                                    <span className={styles.benefitIcon}>🚀</span>
                                    <div>
                                        <h3>Keep It Free</h3>
                                        <p>Your support helps keep F1 data available to everyone.</p>
                                    </div>
                                </div>
                                <div className={styles.benefit}>
                                    <span className={styles.benefitIcon}>⚡</span>
                                    <div>
                                        <h3>Support Development</h3>
                                        <p>Help fund ongoing work on Pit Lane Hub.</p>
                                    </div>
                                </div>
                                <div className={styles.benefit}>
                                    <span className={styles.benefitIcon}>🏆</span>
                                    <div>
                                        <h3>Supporter Badge</h3>
                                        <p>Pro members are recognized on their profile.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Premium Tier */}
                    <div className={styles.premiumSection}>
                        <div className={styles.premiumCard}>
                            <div className={styles.premiumBadge}>MEMBERSHIP</div>
                            <h2>🏎️ Pit Lane Pro</h2>
                            <div className={styles.premiumPrice}>
                                <span className={styles.price}>$4.99</span>
                                <span className={styles.period}>/month</span>
                            </div>
                            <ul className={styles.premiumFeatures}>
                                <li>✓ Supporter badge on your profile</li>
                                <li>✓ Support development of Pit Lane Hub</li>
                            </ul>
                            <Suspense fallback={null}>
                                <CheckoutStatus />
                            </Suspense>
                            {checkoutError && <p className={styles.checkoutError} role="alert">{checkoutError}</p>}
                            {isPro ? (
                                <div className={styles.proState}>
                                    <p>You&apos;re Pro. Thanks for supporting Pit Lane Hub.</p>
                                    <Link href="/profile" className={styles.premiumBtn}>Manage subscription</Link>
                                </div>
                            ) : (
                                <button
                                    className={styles.premiumBtn}
                                    onClick={handleSubscribe}
                                    disabled={isCheckingOut}
                                >
                                    {isCheckingOut ? 'Opening checkout…' : 'Get Pit Lane Pro'}
                                </button>
                            )}
                            <p className={styles.premiumNote}>
                                Subscription checkout and management are handled by Polar.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Thank You */}
            <div className={styles.thankYou}>
                <div className="container">
                    <p>
                        Built with ❤️ by <strong>Abdulaziz</strong> • Every contribution helps keep this project alive!
                    </p>
                </div>
            </div>
        </div>
    );
}

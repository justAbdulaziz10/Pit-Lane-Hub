'use client';

import { useState } from 'react';
import styles from './page.module.css';

export default function SupportPage() {
    const [selectedAmount, setSelectedAmount] = useState(5);
    const [customAmount, setCustomAmount] = useState('');
    const [email, setEmail] = useState('');

    const donationAmounts = [3, 5, 10, 25, 50];

    const handleDonate = (e) => {
        e.preventDefault();
        const amount = customAmount || selectedAmount;
        // In production, this would redirect to Stripe Payment Link
        alert(`Thank you for your support of $${amount}! Payment integration coming soon.`);
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
                                Your support helps cover server costs and keeps the site ad-free.
                            </p>

                            {/* Amount Selection */}
                            <div className={styles.amountGrid}>
                                {donationAmounts.map(amount => (
                                    <button
                                        key={amount}
                                        className={`${styles.amountBtn} ${selectedAmount === amount ? styles.selected : ''}`}
                                        onClick={() => {
                                            setSelectedAmount(amount);
                                            setCustomAmount('');
                                        }}
                                    >
                                        ${amount}
                                    </button>
                                ))}
                                <input
                                    type="number"
                                    placeholder="Custom"
                                    className={styles.customInput}
                                    value={customAmount}
                                    onChange={(e) => {
                                        setCustomAmount(e.target.value);
                                        setSelectedAmount(0);
                                    }}
                                />
                            </div>

                            {/* Email (optional) */}
                            <input
                                type="email"
                                placeholder="Email (optional, for thank you note)"
                                className={styles.emailInput}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />

                            {/* Donate Button */}
                            <button className={styles.donateBtn} onClick={handleDonate}>
                                Support with ${customAmount || selectedAmount}
                            </button>

                            <p className={styles.disclaimer}>
                                Secure payment powered by Stripe. One-time donation.
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
                                        <p>Your donations help us provide free F1 data without ads</p>
                                    </div>
                                </div>
                                <div className={styles.benefit}>
                                    <span className={styles.benefitIcon}>⚡</span>
                                    <div>
                                        <h3>Faster Updates</h3>
                                        <p>Fund development of new features and faster data refresh</p>
                                    </div>
                                </div>
                                <div className={styles.benefit}>
                                    <span className={styles.benefitIcon}>🏆</span>
                                    <div>
                                        <h3>Supporter Badge</h3>
                                        <p>Get recognized as an official Pit Lane Hub supporter</p>
                                    </div>
                                </div>
                                <div className={styles.benefit}>
                                    <span className={styles.benefitIcon}>💬</span>
                                    <div>
                                        <h3>Priority Features</h3>
                                        <p>Supporters can suggest and vote on new features</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Premium Tier */}
                    <div className={styles.premiumSection}>
                        <div className={styles.premiumCard}>
                            <div className={styles.premiumBadge}>COMING SOON</div>
                            <h2>🏎️ Pit Lane Pro</h2>
                            <div className={styles.premiumPrice}>
                                <span className={styles.price}>$4.99</span>
                                <span className={styles.period}>/month</span>
                            </div>
                            <ul className={styles.premiumFeatures}>
                                <li>✓ Race start push notifications</li>
                                <li>✓ Live lap-by-lap timing</li>
                                <li>✓ Historical data comparisons</li>
                                <li>✓ Custom driver alerts</li>
                                <li>✓ Ad-free experience</li>
                                <li>✓ Early access to new features</li>
                            </ul>
                            <button className={styles.premiumBtn} disabled>
                                Coming Soon
                            </button>
                            <p className={styles.premiumNote}>
                                Join the waitlist for early access
                            </p>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className={styles.stats}>
                        <div className={styles.stat}>
                            <span className={styles.statValue}>10K+</span>
                            <span className={styles.statLabel}>Monthly Users</span>
                        </div>
                        <div className={styles.stat}>
                            <span className={styles.statValue}>100%</span>
                            <span className={styles.statLabel}>Free Data</span>
                        </div>
                        <div className={styles.stat}>
                            <span className={styles.statValue}>24/7</span>
                            <span className={styles.statLabel}>Live Updates</span>
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

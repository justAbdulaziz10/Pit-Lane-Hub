'use client';

import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

export default function ProfilePage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    if (status === "loading") {
        return <div className={styles.container}>Loading...</div>;
    }

    if (status === "unauthenticated") {
        router.push("/login");
        return null;
    }

    const isPro = session?.user?.isPro;
    const initial = session?.user?.name ? session.user.name[0].toUpperCase() : "U";

    const handleManageSubscription = () => {
        // Redirect to Polar customer portal or support page for now
        // In a real integration, this would call a portal API
        window.open('https://polar.sh/settings', '_blank');
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>My Garage</h1>
                <p className={styles.subtitle}>Manage your account and subscription</p>
            </header>

            <div className={styles.card}>
                <div className={styles.profileHeader}>
                    <div className={styles.avatar}>
                        {session?.user?.image ? (
                            <Image
                                src={session.user.image}
                                alt="Profile"
                                width={80}
                                height={80}
                                style={{ borderRadius: '50%' }}
                            />
                        ) : (
                            <span>{initial}</span>
                        )}
                    </div>
                    <div className={styles.userInfo}>
                        <h2>{session?.user?.name || "Racer"}</h2>
                        <p className={styles.email}>{session?.user?.email}</p>
                    </div>
                </div>

                <div className={styles.subscriptionSection}>
                    <h3 className={styles.sectionTitle}>License Status</h3>
                    <div className={isPro ? styles.statusPro : styles.statusFree}>
                        <span className={styles.badgeIcon}>{isPro ? "🏆" : "🏎️"}</span>
                        {isPro ? "Pit Lane Pro Active" : "Standard Driver"}
                    </div>

                    <div className={styles.actions}>
                        {isPro ? (
                            <button onClick={handleManageSubscription} className={`${styles.btn} ${styles.btnSecondary}`}>
                                Manage Subscription
                            </button>
                        ) : (
                            <Link href="/support" className={`${styles.btn} ${styles.btnPrimary}`}>
                                Upgrade to Pro
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            <button onClick={() => signOut({ callbackUrl: '/' })} className={`${styles.btn} ${styles.btnSignOut}`}>
                Sign Out
            </button>
        </div>
    );
}

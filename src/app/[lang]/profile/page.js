'use client';

import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import styles from "./page.module.css";

export default function ProfilePage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === "unauthenticated") {
            router.replace("/login?redirect=%2Fprofile");
        }
    }, [status, router]);

    if (status !== "authenticated") {
        return (
            <div className={styles.page} aria-busy="true">
                <h1>Account</h1>
                <p className={styles.muted}>Loading your account…</p>
            </div>
        );
    }

    const user = session.user;
    const isPro = user?.isPro;
    const initial = (user?.name || user?.email || "?").trim().charAt(0).toUpperCase();

    return (
        <div className={styles.page}>
            <h1>Account</h1>

            <section className={styles.identity} aria-label="Signed in as">
                <div className={styles.avatar}>
                    {user?.image ? (
                        <Image src={user.image} alt="" width={56} height={56} />
                    ) : (
                        <span aria-hidden="true">{initial}</span>
                    )}
                </div>
                <div>
                    {user?.name ? <p className={styles.name}>{user.name}</p> : null}
                    <p className={styles.muted}>{user?.email}</p>
                </div>
            </section>

            <section className={styles.section} aria-labelledby="membership-heading">
                <h2 id="membership-heading">Membership</h2>
                <dl className={styles.facts}>
                    <div>
                        <dt>Plan</dt>
                        <dd>{isPro ? "Pit Lane Pro" : "Free"}</dd>
                    </div>
                </dl>
                <div className={styles.actions}>
                    {isPro ? (
                        <form action="/api/polar/portal" method="get">
                            <button type="submit" className="btn btn-secondary">Manage subscription</button>
                        </form>
                    ) : (
                        <Link href="/support" className="btn btn-secondary">About Pit Lane Pro</Link>
                    )}
                    <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className="btn btn-secondary">
                        Sign out
                    </button>
                </div>
            </section>
        </div>
    );
}

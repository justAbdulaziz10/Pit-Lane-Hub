'use client';

import { signOut, useSession } from 'next-auth/react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Link, useLocale } from '@/lib/i18n/LocaleProvider';
import { localePath } from '@/lib/i18n/config';
import { pick } from '@/lib/i18n/messages';
import accountMessages from '@/lib/i18n/messages/account';
import styles from './page.module.css';

export default function ProfileClient() {
    const locale = useLocale();
    const t = pick(accountMessages, locale);
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.replace(localePath(locale, '/login?redirect=%2Fprofile'));
        }
    }, [locale, status, router]);

    if (status !== 'authenticated') {
        return (
            <div className={styles.page} aria-busy="true">
                <span className={styles.badge}>{t.accountBadge}</span>
                <h1>{t.title}</h1>
                <p className={styles.muted}>{t.loading}</p>
            </div>
        );
    }

    const user = session.user;
    const isPro = user?.isPro;
    const initial = (user?.name || user?.email || '?').trim().charAt(0).toUpperCase();

    return (
        <div className={styles.page}>
            <span className={styles.badge}>{t.accountBadge}</span>
            <h1>{t.title}</h1>

            <section className={styles.identity} aria-label={t.signedInAs}>
                <div className={styles.avatar}>
                    {user?.image ? (
                        <Image src={user.image} alt="" width={56} height={56} />
                    ) : (
                        <span aria-hidden="true">{initial}</span>
                    )}
                </div>
                <div className={styles.userDetails}>
                    {user?.name ? <p className={styles.name}><bdi>{user.name}</bdi></p> : null}
                    <p className={styles.muted}><bdi dir="ltr">{user?.email}</bdi></p>
                </div>
            </section>

            <section className={styles.section} aria-labelledby="membership-heading">
                <h2 id="membership-heading">{t.membership}</h2>
                <dl className={styles.facts}>
                    <div>
                        <dt>{t.plan}</dt>
                        <dd>
                            <span className={isPro ? styles.proBadge : styles.freeBadge}>
                                {isPro ? t.pitLanePro : t.free}
                            </span>
                        </dd>
                    </div>
                </dl>
                <div className={styles.actions}>
                    {isPro ? (
                        <form action="/api/polar/portal" method="get">
                            <button type="submit" className="btn btn-secondary">{t.manageSubscription}</button>
                        </form>
                    ) : (
                        <Link href="/support" className="btn btn-secondary">{t.aboutPro}</Link>
                    )}
                    <button
                        type="button"
                        onClick={() => signOut({ callbackUrl: localePath(locale, '/') })}
                        className="btn btn-secondary"
                    >
                        {t.signOut}
                    </button>
                </div>
            </section>
        </div>
    );
}

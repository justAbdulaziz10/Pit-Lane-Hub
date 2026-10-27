'use client';

import { useState } from 'react';
import { Link, useLocale } from '@/lib/i18n/LocaleProvider';
import { pick } from '@/lib/i18n/messages';
import driverMessages from '@/lib/i18n/messages/drivers';
import { formatNumber } from '@/lib/i18n/format';
import styles from './DriverCard.module.css';
import FavoriteButton from './FavoriteButton';

function PortraitImage({ src, alt, width, height, imgClassName, fallbackClassName, loading, fetchPriority, children }) {
    const [failed, setFailed] = useState(false);
    if (failed) {
        return (
            <div className={fallbackClassName} role={alt ? 'img' : undefined} aria-label={alt || undefined}>
                {children}
            </div>
        );
    }
    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={src}
            alt={alt}
            width={width}
            height={height}
            className={imgClassName}
            loading={loading}
            decoding="async"
            fetchPriority={fetchPriority}
            onError={() => setFailed(true)}
        />
    );
}

/** Driver portrait with the existing F1 image source and an initials fallback. */
export function DriverPortrait({ src, alt, width, height, className, imgClassName, fallbackClassName, loading = 'lazy', fetchPriority, children }) {
    return (
        <div className={className}>
            {src ? (
                <PortraitImage key={src} src={src} alt={alt} width={width} height={height} imgClassName={imgClassName} fallbackClassName={fallbackClassName} loading={loading} fetchPriority={fetchPriority}>
                    {children}
                </PortraitImage>
            ) : (
                <div className={fallbackClassName} role={alt ? 'img' : undefined} aria-label={alt || undefined}>
                    {children}
                </div>
            )}
        </div>
    );
}

/**
 * One grid driver. Everything it shows, including the readable team colour,
 * arrives in the `driver` prop prepared on the server.
 */
export default function DriverCard({ driver, headingLevel = 2 }) {
    const locale = useLocale();
    const t = pick(driverMessages, locale);
    const Heading = headingLevel === 3 ? 'h3' : 'h2';
    const sources = [driver.photo, driver.headshot].filter(Boolean);
    const [sourceIndex, setSourceIndex] = useState(0);
    const photoUrl = sources[sourceIndex] || null;

    return (
        <article className={styles.card} style={{ '--team-color': driver.colour }}>
            <div className={styles.colorBar} aria-hidden="true" />
            {driver.number != null ? (
                <FavoriteButton driverNumber={driver.number} driverName={driver.fullName} />
            ) : null}

            <div className={styles.photoContainer}>
                {photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={photoUrl}
                        alt=""
                        className={styles.photo}
                        loading="lazy"
                        decoding="async"
                        onError={() => setSourceIndex((index) => index + 1)}
                    />
                ) : (
                    <div className={styles.photoPlaceholder} aria-hidden="true">
                        <span className={styles.photoCode}>{driver.code || driver.lastName.slice(0, 3).toUpperCase()}</span>
                    </div>
                )}
            </div>

            <div className={styles.info}>
                {driver.number != null ? <div className={styles.number}><bdi dir="ltr">{formatNumber(locale, driver.number)}</bdi></div> : null}
                <Heading className={styles.name}>
                    <Link href={driver.href} className={styles.cardLink}>
                        <bdi dir="ltr">
                            <span className={styles.firstName}>{driver.firstName}</span>
                            <span className={styles.lastName}>{driver.lastName}</span>
                        </bdi>
                    </Link>
                </Heading>
                <div className={styles.team}><bdi dir="auto">{driver.team}</bdi></div>
                {driver.position != null || driver.points != null ? (
                    <div className={styles.standing}>
                        {driver.position != null ? (
                            <bdi dir="ltr">P{formatNumber(locale, driver.position)}</bdi>
                        ) : null}
                        {driver.points != null ? (
                            <span><bdi dir="ltr">{formatNumber(locale, driver.points)}</bdi> {t.statPoints}</span>
                        ) : null}
                    </div>
                ) : null}
                {driver.nationality ? (
                    <div className={styles.country}>
                        {driver.flag ? <span aria-hidden="true">{driver.flag}</span> : null}
                        <span className={styles.countryCode}>{driver.nationality}</span>
                    </div>
                ) : null}
            </div>
        </article>
    );
}

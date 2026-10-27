'use client';

import { useSyncExternalStore } from 'react';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import timeMessages from '@/lib/i18n/messages/time';
import { pick } from '@/lib/i18n/messages';
import { countdownAnnouncement, countdownParts, countdownUnitLabel, formatInstant, hasTimeFormat } from './localTimeFormat';
import { formatNumber } from '@/lib/i18n/format';

const noopSubscribe = () => () => {};
const onClient = () => true;
const onServer = () => false;

/**
 * A <time> element shown in the visitor's timezone. The server renders UTC
 * with a label; after hydration the client swaps in local time, so the
 * server and first client render always match.
 */
export default function LocalTime({ iso, format = 'datetime', className, fallback }) {
    const locale = useLocale();
    const t = pick(timeMessages, locale);
    const isClient = useSyncExternalStore(noopSubscribe, onClient, onServer);
    if (!iso || !Number.isFinite(Date.parse(iso))) return <span className={className}>{fallback ?? t.tbc}</span>;
    const text = formatInstant(iso, format, { local: isClient, locale });
    const timeContext = hasTimeFormat(format) && isClient ? `, ${t.localTime}` : '';
    return (
        <time dateTime={new Date(iso).toISOString()} className={className} aria-label={`${text}${timeContext}`}>
            <bdi dir="auto">{text}</bdi>
        </time>
    );
}

function subscribeToClock(callback) {
    const timer = setInterval(callback, 1000);
    return () => clearInterval(timer);
}

const currentSecond = () => Math.floor(Date.now() / 1000) * 1000;

/**
 * Ticking countdown to `target`. The server renders it from `serverNow`
 * and hydration reuses that value, so there is no mismatch; it then ticks
 * from the visitor's clock.
 */
export function Countdown({ target, serverNow, className, unitClassName, valueClassName, labelClassName, doneLabel }) {
    const locale = useLocale();
    const t = pick(timeMessages, locale);
    const now = useSyncExternalStore(subscribeToClock, currentSecond, () => serverNow);
    const targetMs = Date.parse(target || '');
    if (!Number.isFinite(targetMs)) return null;
    const parts = countdownParts(targetMs, now);
    if (parts.done) return <p className={className}>{doneLabel ?? t.started}</p>;
    const units = [
        ['day', parts.days],
        ['hour', parts.hours],
        ['minute', parts.minutes],
        ['second', parts.seconds],
    ];
    return (
        <div className={className} role="timer" aria-label={countdownAnnouncement(locale, parts)}>
            {units.map(([label, value]) => (
                <span key={label} className={unitClassName} aria-hidden="true">
                    <span className={valueClassName}><bdi dir="ltr">{formatNumber(locale, value, { minimumIntegerDigits: 2 })}</bdi></span>
                    <span className={labelClassName}>{countdownUnitLabel(locale, label, value)}</span>
                </span>
            ))}
        </div>
    );
}

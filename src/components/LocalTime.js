'use client';

import { useSyncExternalStore } from 'react';
import { countdownParts, formatInstant } from './localTimeFormat';

const noopSubscribe = () => () => {};
const onClient = () => true;
const onServer = () => false;

/**
 * A <time> element shown in the visitor's timezone. The server renders UTC
 * with a label; after hydration the client swaps in local time, so the
 * server and first client render always match.
 */
export default function LocalTime({ iso, format = 'datetime', className, fallback = 'TBC' }) {
    const isClient = useSyncExternalStore(noopSubscribe, onClient, onServer);
    if (!iso || !Number.isFinite(Date.parse(iso))) return <span className={className}>{fallback}</span>;
    return (
        <time dateTime={new Date(iso).toISOString()} className={className}>
            {formatInstant(iso, format, { local: isClient })}
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
export function Countdown({ target, serverNow, className, unitClassName, valueClassName, labelClassName, doneLabel = 'Started' }) {
    const now = useSyncExternalStore(subscribeToClock, currentSecond, () => serverNow);
    const targetMs = Date.parse(target || '');
    if (!Number.isFinite(targetMs)) return null;
    const parts = countdownParts(targetMs, now);
    if (parts.done) return <p className={className}>{doneLabel}</p>;
    const units = [
        ['days', parts.days],
        ['hrs', parts.hours],
        ['min', parts.minutes],
        ['sec', parts.seconds],
    ];
    return (
        <div className={className} role="timer" aria-label={`${parts.days} days ${parts.hours} hours ${parts.minutes} minutes to go`}>
            {units.map(([label, value]) => (
                <span key={label} className={unitClassName} aria-hidden="true">
                    <span className={valueClassName}>{String(value).padStart(2, '0')}</span>
                    <span className={labelClassName}>{label}</span>
                </span>
            ))}
        </div>
    );
}

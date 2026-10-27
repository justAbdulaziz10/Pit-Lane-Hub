'use client';

import dynamic from 'next/dynamic';
import { useId, useState } from 'react';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import tracksMessages from '@/lib/i18n/messages/tracks';
import { fill, pick } from '@/lib/i18n/messages';
import styles from './CircuitPanel.module.css';

function LoadingTrack() {
    const locale = useLocale();
    const t = pick(tracksMessages, locale);
    return <div className={styles.loading}>{t.loading3d}</div>;
}

const Track3D = dynamic(() => import('./Track3D'), {
    ssr: false,
    loading: LoadingTrack,
});

const VIEW_KEYS = ['layout', '3d', 'map'];

export default function CircuitPanel({ circuit, views = ['layout', '3d', 'map'] }) {
    const locale = useLocale();
    const t = pick(tracksMessages, locale);
    const [view, setView] = useState('layout');
    const id = useId();
    const { outline, center, coordinates, name } = circuit;
    const delta = 0.02;
    const bbox = [center.lng - delta, center.lat - delta * 0.75, center.lng + delta, center.lat + delta * 0.75]
        .map((value) => value.toFixed(5))
        .join('%2C');
    const available = VIEW_KEYS.filter((key) => views.includes(key));
    const viewLabels = { layout: t.layout, '3d': t.threeDimensional, map: t.map };

    return (
        <div className={styles.panel}>
            {available.length > 1 && (
                <div role="tablist" aria-label={fill(t.views, { name })} className={styles.tabs}>
                    {available.map((key) => (
                        <button
                            key={key}
                            type="button"
                            role="tab"
                            id={`${id}-${key}-tab`}
                            aria-controls={`${id}-panel`}
                            aria-selected={view === key}
                            className={styles.tab}
                            onClick={() => setView(key)}
                        >
                            {viewLabels[key]}
                        </button>
                    ))}
                </div>
            )}
            <div
                id={`${id}-panel`}
                role="tabpanel"
                aria-labelledby={`${id}-${view}-tab`}
                className={styles.stage}
            >
                {view === 'layout' && (
                    <svg viewBox={outline.viewBox} className={styles.svg} role="img" aria-label={fill(t.layoutAlt, { name })}>
                        <path d={`${outline.d} Z`} className={styles.trackShadow} />
                        <path d={`${outline.d} Z`} className={styles.track} />
                        <circle cx={outline.start[0]} cy={outline.start[1]} r="14" className={styles.start} />
                    </svg>
                )}
                {view === '3d' && <Track3D coordinates={coordinates} label={fill(t.threeDimensionalAlt, { name })} />}
                {view === 'map' && (
                    <iframe
                        title={fill(t.mapAlt, { name })}
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${center.lat.toFixed(5)}%2C${center.lng.toFixed(5)}`}
                        className={styles.map}
                        loading="lazy"
                    />
                )}
            </div>
        </div>
    );
}

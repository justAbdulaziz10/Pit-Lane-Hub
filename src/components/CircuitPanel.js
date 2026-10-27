'use client';

import dynamic from 'next/dynamic';
import { useId, useState } from 'react';
import styles from './CircuitPanel.module.css';

const Track3D = dynamic(() => import('./Track3D'), {
    ssr: false,
    loading: () => <div className={styles.loading}>Loading 3D view</div>,
});

const VIEWS = [
    ['layout', 'Layout'],
    ['3d', '3D'],
    ['map', 'Map'],
];

export default function CircuitPanel({ circuit, views = ['layout', '3d', 'map'] }) {
    const [view, setView] = useState('layout');
    const id = useId();
    const { outline, center, coordinates, name } = circuit;
    const delta = 0.02;
    const bbox = [center.lng - delta, center.lat - delta * 0.75, center.lng + delta, center.lat + delta * 0.75]
        .map((value) => value.toFixed(5))
        .join('%2C');
    const available = VIEWS.filter(([key]) => views.includes(key));

    return (
        <div className={styles.panel}>
            {available.length > 1 && (
                <div role="tablist" aria-label={`${name} views`} className={styles.tabs}>
                    {available.map(([key, label]) => (
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
                            {label}
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
                    <svg viewBox={outline.viewBox} className={styles.svg} role="img" aria-label={`${name} layout`}>
                        <path d={`${outline.d} Z`} className={styles.trackShadow} />
                        <path d={`${outline.d} Z`} className={styles.track} />
                        <circle cx={outline.start[0]} cy={outline.start[1]} r="14" className={styles.start} />
                    </svg>
                )}
                {view === '3d' && <Track3D coordinates={coordinates} label={`${name} 3D layout`} />}
                {view === 'map' && (
                    <iframe
                        title={`${name} map`}
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${center.lat.toFixed(5)}%2C${center.lng.toFixed(5)}`}
                        className={styles.map}
                        loading="lazy"
                    />
                )}
            </div>
        </div>
    );
}

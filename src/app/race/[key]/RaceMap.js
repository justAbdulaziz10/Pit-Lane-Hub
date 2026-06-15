'use client';

import { useState } from 'react';
import styles from './page.module.css';

export default function RaceMap({ trackInfo }) {
    const [is3DMode, setIs3DMode] = useState(false);

    return (
        <div className={styles.mapSection}>
            <div className="container">
                <div className={styles.mapHeader}>
                    <h2>🗺️ Circuit Location</h2>
                    <div className={styles.mapControls}>
                        <button
                            type="button"
                            className={`${styles.mapControlBtn} ${!is3DMode ? styles.active : ''}`}
                            onClick={() => setIs3DMode(false)}
                            aria-pressed={!is3DMode}
                        >
                            2D Map
                        </button>
                        <button
                            type="button"
                            className={`${styles.mapControlBtn} ${is3DMode ? styles.active : ''}`}
                            onClick={() => setIs3DMode(true)}
                            aria-pressed={is3DMode}
                        >
                            3D View
                        </button>
                    </div>
                </div>
                {trackInfo ? (
                    <div className={`${styles.mapContainer} ${is3DMode ? styles.is3D : ''}`}>
                        <div className={styles.mapWrapper}>
                            <iframe
                                title="Circuit location map"
                                src={`https://www.openstreetmap.org/export/embed.html?bbox=${trackInfo.lng - 0.02}%2C${trackInfo.lat - 0.015}%2C${trackInfo.lng + 0.02}%2C${trackInfo.lat + 0.015}&layer=mapnik&marker=${trackInfo.lat}%2C${trackInfo.lng}`}
                                className={styles.map}
                                loading="lazy"
                            ></iframe>
                        </div>
                        {is3DMode && (
                            <div className={styles.mapOverlay3D}>
                                <p>Interactive 3D Perspective</p>
                            </div>
                        )}
                        <a
                            href={`https://www.google.com/maps?q=${trackInfo.lat},${trackInfo.lng}&z=15&t=k`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.mapLink}
                        >
                            View Satellite 3D in Google Earth ↗
                        </a>
                    </div>
                ) : (
                    <div className={styles.mapPlaceholder}>
                        <span>🗺️</span>
                        <p>Track map not available</p>
                    </div>
                )}
            </div>
        </div>
    );
}

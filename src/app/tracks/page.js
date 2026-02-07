'use client';

import { TRACK_COORDS } from '@/lib/tracks';
import { useState } from 'react';
import styles from './page.module.css';

export default function TracksPage() {
    const [selectedTrack, setSelectedTrack] = useState(null);
    const [is3DMode, setIs3DMode] = useState(true); // Default to 3D for "wow" factor

    const openTrack = (track) => {
        setSelectedTrack(track);
        setIs3DMode(true);
    };

    const closeTrack = () => {
        setSelectedTrack(null);
    };

    return (
        <div className={styles.tracksPage}>
            {/* Header */}
            <div className={styles.header}>
                <div className="container">
                    <span className={styles.badge}>🏁 INTERACTIVE MAPS</span>
                    <h1>F1 Circuits 3D</h1>
                    <p>Explore every Formula 1 track in interactive 3D perspective</p>
                </div>
            </div>

            {/* Tracks Grid */}
            <div className="container">
                <div className={styles.grid}>
                    {Object.entries(TRACK_COORDS).map(([key, track]) => (
                        <div key={key} className={styles.trackCard} onClick={() => openTrack(track)}>
                            <div className={styles.cardContent}>
                                <div className={styles.cardHeader}>
                                    <span className={styles.country}>📍 {track.country}</span>
                                </div>
                                <h3 className={styles.trackName}>{track.title}</h3>
                                <div className={styles.viewBtn}>View 3D Map →</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Map Modal */}
            {selectedTrack && (
                <div className={styles.overlay} onClick={closeTrack}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <button className={styles.closeBtn} onClick={closeTrack}>×</button>

                        <div className={`${styles.modalContent} ${is3DMode ? styles.is3D : ''}`}>
                            <div className={styles.mapWrapper}>
                                <iframe
                                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${selectedTrack.lng - 0.02}%2C${selectedTrack.lat - 0.015}%2C${selectedTrack.lng + 0.02}%2C${selectedTrack.lat + 0.015}&layer=mapnik&marker=${selectedTrack.lat}%2C${selectedTrack.lng}`}
                                    className={styles.mapFrame}
                                    loading="lazy"
                                ></iframe>
                            </div>

                            <div className={styles.modalHeader}>
                                <h2>{selectedTrack.title}</h2>
                                <p>{selectedTrack.country}</p>
                            </div>

                            <div className={styles.controls}>
                                <button
                                    className={`${styles.controlBtn} ${!is3DMode ? styles.active : ''}`}
                                    onClick={() => setIs3DMode(false)}
                                >
                                    2D Map
                                </button>
                                <button
                                    className={`${styles.controlBtn} ${is3DMode ? styles.active : ''}`}
                                    onClick={() => setIs3DMode(true)}
                                >
                                    3D View
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

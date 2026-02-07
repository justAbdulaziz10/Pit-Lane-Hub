'use client';

import { TRACK_COORDS } from '@/lib/tracks';
import { useState } from 'react';
import styles from './page.module.css';

export default function TracksPage() {
    const [selectedTrack, setSelectedTrack] = useState(null);
    const [viewMode, setViewMode] = useState('map'); // 'map', '3d', 'cockpit'

    const openTrack = (track) => {
        setSelectedTrack(track);
        setViewMode('cockpit'); // Default to cockpit for "Wow" factor as requested ("inside the ring")
    };

    const closeTrack = () => {
        setSelectedTrack(null);
        setViewMode('map');
    };

    return (
        <div className={styles.tracksPage}>
            {/* Header */}
            <div className={styles.header}>
                <div className="container">
                    <span className={styles.badge}>🏁 INTERACTIVE MAPS</span>
                    <h1>F1 Circuits 3D</h1>
                    <p>Experience every track from the driver's perspective</p>
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
                                <div className={styles.viewBtn}>View Cockpit 3D →</div>
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

                        <div className={`${styles.modalContent} ${viewMode === '3d' ? styles.is3D : ''}`}>
                            {viewMode === 'cockpit' ? (
                                <div className={styles.videoWrapper}>
                                    <iframe
                                        width="100%"
                                        height="100%"
                                        src={`https://www.youtube.com/embed?listType=search&list=F1+${selectedTrack.title.replace(/\s/g, '+')}+Onboard+Pole+Lap+2024`}
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    ></iframe>
                                </div>
                            ) : (
                                <div className={styles.mapWrapper}>
                                    <iframe
                                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${selectedTrack.lng - 0.02}%2C${selectedTrack.lat - 0.015}%2C${selectedTrack.lng + 0.02}%2C${selectedTrack.lat + 0.015}&layer=mapnik&marker=${selectedTrack.lat}%2C${selectedTrack.lng}`}
                                        className={styles.mapFrame}
                                        loading="lazy"
                                    ></iframe>
                                </div>
                            )}

                            <div className={styles.modalHeader}>
                                <h2>{selectedTrack.title}</h2>
                                <p>{selectedTrack.country}</p>
                            </div>

                            <div className={styles.controls}>
                                <button
                                    className={`${styles.controlBtn} ${viewMode === 'cockpit' ? styles.active : ''}`}
                                    onClick={() => setViewMode('cockpit')}
                                >
                                    🏎️ Cockpit
                                </button>
                                <button
                                    className={`${styles.controlBtn} ${viewMode === 'map' ? styles.active : ''}`}
                                    onClick={() => setViewMode('map')}
                                >
                                    🗺️ Map
                                </button>
                                <button
                                    className={`${styles.controlBtn} ${viewMode === '3d' ? styles.active : ''}`}
                                    onClick={() => setViewMode('3d')}
                                >
                                    📐 Tilt
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

'use client';

import { TRACK_COORDS } from '@/lib/tracks';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import styles from './page.module.css';

// Dynamic import for Three.js component to avoid SSR issues
const Track3D = dynamic(() => import('@/components/Track3D'), { ssr: false });

export default function TracksPage() {
    const [selectedTrack, setSelectedTrack] = useState(null);
    const [viewMode, setViewMode] = useState('ring'); // 'ring', 'cockpit', 'map'

    const openTrack = (track) => {
        setSelectedTrack(track);
        setViewMode('ring'); // Default to the new 3D Ring view as requested
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
                    <p>Experience every track with our new CSS/JS 3D Render Engine</p>
                </div>
            </div>

            {/* Tracks Grid */}
            <div className="container">
                <div className={styles.grid}>
                    {Object.entries(TRACK_COORDS).map(([key, track]) => (
                        <div key={key} className={styles.trackCard} onClick={() => openTrack({ ...track, key })}>
                            <div className={styles.cardContent}>
                                <div className={styles.cardHeader}>
                                    <span className={styles.country}>📍 {track.country}</span>
                                </div>
                                <h3 className={styles.trackName}>{track.title}</h3>
                                <div className={styles.viewBtn}>View 3D Ring →</div>
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

                        <div className={`${styles.modalContent} ${viewMode === 'ring' ? styles.is3D : ''}`}>
                            <div className={styles.mapContainer}>
                                {viewMode === 'ring' && (
                                    <div className={styles.webglWrapper}>
                                        <Track3D trackKey={selectedTrack.title} />
                                        <div className={styles.overlayText}>Interactive 3D Render</div>
                                    </div>
                                )}

                                {viewMode === 'map' && (
                                    <div className={styles.mapWrapper}>
                                        <iframe
                                            src={`https://www.openstreetmap.org/export/embed.html?bbox=${selectedTrack.lng - 0.03}%2C${selectedTrack.lat - 0.03}%2C${selectedTrack.lng + 0.03}%2C${selectedTrack.lat + 0.03}&layer=mapnik&marker=${selectedTrack.lat}%2C${selectedTrack.lng}`}
                                            className={styles.mapFrame}
                                            loading="lazy"
                                        ></iframe>
                                    </div>
                                )}
                            </div>

                            <div className={styles.modalFooter}>
                                <div className={styles.trackInfo}>
                                    <h2>{selectedTrack.title}</h2>
                                    <p>{selectedTrack.location}</p>
                                </div>

                                <div className={styles.controls}>
                                    <button
                                        className={`${styles.controlBtn} ${viewMode === 'ring' ? styles.active : ''}`}
                                        onClick={() => setViewMode('ring')}
                                    >
                                        🧊 3D Ring
                                    </button>
                                    <button
                                        className={`${styles.controlBtn} ${viewMode === 'map' ? styles.active : ''}`}
                                        onClick={() => setViewMode('map')}
                                    >
                                        🗺️ Map
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

'use client';

import styles from './page.module.css';

// Static F2/F3 data (OpenF1 API doesn't provide F2/F3 data)
const F2_TEAMS_2026 = [
    { name: 'ART Grand Prix', color: '#1E90FF' },
    { name: 'Campos Racing', color: '#FFD700' },
    { name: 'Carlin', color: '#0000FF' },
    { name: 'DAMS', color: '#00008B' },
    { name: 'Hitech Pulse-Eight', color: '#808080' },
    { name: 'Invicta Racing', color: '#FF4500' },
    { name: 'MP Motorsport', color: '#FF6347' },
    { name: 'Prema Racing', color: '#FF0000' },
    { name: 'Rodin Motorsport', color: '#00CED1' },
    { name: 'Trident', color: '#000080' },
    { name: 'Van Amersfoort Racing', color: '#FFA500' },
];

const F3_TEAMS_2026 = [
    { name: 'ART Grand Prix', color: '#1E90FF' },
    { name: 'Campos Racing', color: '#FFD700' },
    { name: 'Hitech Pulse-Eight', color: '#808080' },
    { name: 'Jenzer Motorsport', color: '#4169E1' },
    { name: 'MP Motorsport', color: '#FF6347' },
    { name: 'Prema Racing', color: '#FF0000' },
    { name: 'Trident', color: '#000080' },
    { name: 'Van Amersfoort Racing', color: '#FFA500' },
];

export default function JuniorPage() {
    return (
        <div className={styles.junior}>
            {/* Header */}
            <div className={styles.header}>
                <div className="container">
                    <span className={styles.badge}>🏁 FEEDER SERIES</span>
                    <h1>F2 & F3 Racing</h1>
                    <p>The future stars of Formula 1</p>
                </div>
            </div>

            {/* Info Banner */}
            <div className={styles.infoBanner}>
                <div className="container">
                    <div className={styles.infoContent}>
                        <span className={styles.infoIcon}>ℹ️</span>
                        <p>
                            <strong>Note:</strong> OpenF1 API only provides F1 data. This page shows general F2/F3 information.
                            For live F2/F3 data, visit the official sources linked below.
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className={styles.content}>
                <div className="container">
                    {/* F2 Section */}
                    <section className={styles.seriesSection}>
                        <div className={styles.seriesHeader}>
                            <div className={styles.seriesTitle}>
                                <h2>Formula 2</h2>
                                <span className={styles.seriesBadge} style={{ background: '#0070C0' }}>F2</span>
                            </div>
                            <p className={styles.seriesDescription}>
                                The final step before Formula 1. F2 drivers race with identical cars to showcase pure driving talent.
                            </p>
                        </div>

                        <div className={styles.teamsGrid}>
                            {F2_TEAMS_2026.map((team) => (
                                <div
                                    key={team.name}
                                    className={styles.teamCard}
                                    style={{ '--team-color': team.color }}
                                >
                                    <div className={styles.teamColorBar}></div>
                                    <h3>{team.name}</h3>
                                </div>
                            ))}
                        </div>

                        <a
                            href="https://www.fiaformula2.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.externalLink}
                            style={{ '--link-color': '#0070C0' }}
                        >
                            Visit Official F2 Website →
                        </a>
                    </section>

                    {/* F3 Section */}
                    <section className={styles.seriesSection}>
                        <div className={styles.seriesHeader}>
                            <div className={styles.seriesTitle}>
                                <h2>Formula 3</h2>
                                <span className={styles.seriesBadge} style={{ background: '#00A651' }}>F3</span>
                            </div>
                            <p className={styles.seriesDescription}>
                                The stepping stone series where young drivers prove themselves on the F1 support race calendar.
                            </p>
                        </div>

                        <div className={styles.teamsGrid}>
                            {F3_TEAMS_2026.map((team) => (
                                <div
                                    key={team.name}
                                    className={styles.teamCard}
                                    style={{ '--team-color': team.color }}
                                >
                                    <div className={styles.teamColorBar}></div>
                                    <h3>{team.name}</h3>
                                </div>
                            ))}
                        </div>

                        <a
                            href="https://www.fiaformula3.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.externalLink}
                            style={{ '--link-color': '#00A651' }}
                        >
                            Visit Official F3 Website →
                        </a>
                    </section>

                    {/* Path to F1 */}
                    <section className={styles.pathSection}>
                        <h2>🏆 The Path to F1</h2>
                        <div className={styles.pathSteps}>
                            <div className={styles.pathStep}>
                                <span className={styles.stepNumber}>1</span>
                                <h3>Karting</h3>
                                <p>Where all F1 drivers start their journey</p>
                            </div>
                            <div className={styles.pathArrow}>→</div>
                            <div className={styles.pathStep}>
                                <span className={styles.stepNumber}>2</span>
                                <h3>Formula 4</h3>
                                <p>First step in single-seaters</p>
                            </div>
                            <div className={styles.pathArrow}>→</div>
                            <div className={styles.pathStep}>
                                <span className={styles.stepNumber}>3</span>
                                <h3>Formula 3</h3>
                                <p>FIA F3 Championship</p>
                            </div>
                            <div className={styles.pathArrow}>→</div>
                            <div className={styles.pathStep}>
                                <span className={styles.stepNumber}>4</span>
                                <h3>Formula 2</h3>
                                <p>Final preparation for F1</p>
                            </div>
                            <div className={styles.pathArrow}>→</div>
                            <div className={styles.pathStep}>
                                <span className={styles.stepNumber}>5</span>
                                <h3>Formula 1</h3>
                                <p>The pinnacle of motorsport</p>
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            {/* Resources */}
            <div className={styles.resources}>
                <div className="container">
                    <h2>📡 Live Data Sources</h2>
                    <div className={styles.resourcesGrid}>
                        <a href="https://www.fiaformula2.com/Results" target="_blank" rel="noopener noreferrer" className={styles.resourceCard}>
                            <span>🏎️</span>
                            <h3>F2 Results</h3>
                            <p>Official race results and standings</p>
                        </a>
                        <a href="https://www.fiaformula3.com/Results" target="_blank" rel="noopener noreferrer" className={styles.resourceCard}>
                            <span>🏎️</span>
                            <h3>F3 Results</h3>
                            <p>Official race results and standings</p>
                        </a>
                        <a href="https://www.formula1.com/en/drivers" target="_blank" rel="noopener noreferrer" className={styles.resourceCard}>
                            <span>⭐</span>
                            <h3>F1 Academy</h3>
                            <p>Graduates who made it to F1</p>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}

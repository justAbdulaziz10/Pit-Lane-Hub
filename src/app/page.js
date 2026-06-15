import { getDrivers, getMeetings } from '@/lib/f1api';
import Link from 'next/link';
import styles from './page.module.css';

export const revalidate = 60;

export default async function Home() {
  let drivers = [];
  let meetings = [];

  try {
    [drivers, meetings] = await Promise.all([
      getDrivers(),
      getMeetings()
    ]);

    // Remove duplicate drivers
    const seen = new Set();
    drivers = drivers.filter((driver) => {
      if (seen.has(driver.driver_number)) return false;
      seen.add(driver.driver_number);
      return true;
    }).slice(0, 6);

  } catch (e) {
    console.error('Error fetching data:', e);
  }

  // Find next upcoming race
  const now = new Date();
  const upcomingRaces = meetings.filter(m => new Date(m.date_start) > now);
  const nextRace = upcomingRaces[0];

  // Calculate countdown
  const getCountdown = () => {
    if (!nextRace) return null;
    const raceDate = new Date(nextRace.date_start);
    const diff = raceDate - now;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return { days, hours };
  };

  const countdown = getCountdown();

  return (
    <div className={styles.home}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroBackground}>
          <div className={styles.heroOverlay}></div>
          <div className={styles.heroGrid}></div>
        </div>
        <div className={styles.heroContent}>
          <span className={styles.heroBadge}>🏎️ LIVE F1 DATA • FREE • OPEN SOURCE</span>
          <h1 className={styles.heroTitle}>
            Your F1<br />
            <span className={styles.heroHighlight}>Command Center</span>
          </h1>
          <p className={styles.heroDescription}>
            Real-time driver data, race schedules, and live timing.
            Powered by OpenF1 API - completely free.
          </p>
          <div className={styles.heroActions}>
            <Link href="/live" className="btn btn-primary">
              Live Timing
            </Link>
            <Link href="/drivers" className="btn btn-secondary">
              View Drivers
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className={styles.heroStats}>
          <div className={styles.stat}>
            <span className={styles.statValue}>22</span>
            <span className={styles.statLabel}>Drivers</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>11</span>
            <span className={styles.statLabel}>Teams</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>24</span>
            <span className={styles.statLabel}>Races</span>
          </div>
        </div>
      </section>

      {/* Next Race Countdown */}
      {nextRace && countdown && (
        <section className={styles.countdown}>
          <div className="container">
            <div className={styles.countdownCard}>
              <span className={styles.countdownBadge}>NEXT RACE</span>
              <h2 className={styles.countdownTitle}>{nextRace.meeting_name}</h2>
              <p className={styles.countdownLocation}>
                {nextRace.location}{nextRace.country_name ? `, ${nextRace.country_name}` : ''}
              </p>
              <div className={styles.countdownTimer}>
                <div className={styles.timerBlock}>
                  <span className={styles.timerValue}>{countdown.days}</span>
                  <span className={styles.timerLabel}>Days</span>
                </div>
                <span className={styles.timerSeparator}>:</span>
                <div className={styles.timerBlock}>
                  <span className={styles.timerValue}>{countdown.hours}</span>
                  <span className={styles.timerLabel}>Hours</span>
                </div>
              </div>
              <Link href="/schedule" className={styles.countdownLink}>View Full Calendar →</Link>
            </div>
          </div>
        </section>
      )}

      {/* Quick Access */}
      <section className={styles.quickAccess}>
        <div className="container">
          <h2 className={styles.sectionTitle}>Explore the Paddock</h2>
          <div className={styles.cardGrid}>
            <Link href="/live" className={styles.accessCard}>
              <span className={styles.accessLive}>LIVE</span>
              <div className={styles.accessIcon}>⏱️</div>
              <h3>Live Timing</h3>
              <p>Real-time positions, gaps and weather during every session.</p>
              <span className={styles.accessArrow}>→</span>
            </Link>
            <Link href="/standings" className={styles.accessCard}>
              <div className={styles.accessIcon}>🏆</div>
              <h3>Standings</h3>
              <p>Live driver and constructor championship tables.</p>
              <span className={styles.accessArrow}>→</span>
            </Link>
            <Link href="/schedule" className={styles.accessCard}>
              <div className={styles.accessIcon}>🗓️</div>
              <h3>Race Calendar</h3>
              <p>Every Grand Prix of the season with dates and locations.</p>
              <span className={styles.accessArrow}>→</span>
            </Link>
            <Link href="/compare" className={styles.accessCard}>
              <div className={styles.accessIcon}>📊</div>
              <h3>Compare Drivers</h3>
              <p>Head-to-head career stats between any two drivers.</p>
              <span className={styles.accessArrow}>→</span>
            </Link>
            <Link href="/tracks" className={styles.accessCard}>
              <div className={styles.accessIcon}>🏁</div>
              <h3>Circuits</h3>
              <p>Interactive 3D track layouts from around the world.</p>
              <span className={styles.accessArrow}>→</span>
            </Link>
            <Link href="/history" className={styles.accessCard}>
              <div className={styles.accessIcon}>📚</div>
              <h3>History</h3>
              <p>Browse past seasons, results and championship records.</p>
              <span className={styles.accessArrow}>→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Drivers */}
      {drivers.length > 0 && (
        <section className={styles.featuredDrivers}>
          <div className="container">
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Featured Drivers</h2>
              <Link href="/drivers" className={styles.viewAll}>View All →</Link>
            </div>
            <div className={styles.driversGrid}>
              {drivers.map((driver) => (
                <Link
                  key={driver.driver_number}
                  href={`/driver/${driver.driver_number}`}
                  className={styles.driverMini}
                >
                  <span className={styles.driverNumber}>{driver.driver_number}</span>
                  <div className={styles.driverInfo}>
                    <span className={styles.driverName}>
                      {driver.first_name} <strong>{driver.last_name}</strong>
                    </span>
                    <span className={styles.driverTeam}>{driver.team_name}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* About / Data Source */}
      <section className={styles.about}>
        <div className="container">
          <div className={styles.aboutContent}>
            <h2>100% Free F1 Data</h2>
            <p>
              Pit Lane Hub is powered by the <a href="https://openf1.org" target="_blank" rel="noopener noreferrer">OpenF1 API</a> -
              a free, open-source, community-driven project providing real-time and historical Formula 1 data.
            </p>
            <p>
              No accounts required. Just pure racing data.
            </p>
            <div className={styles.aboutLinks}>
              <a href="https://openf1.org" target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                Learn More →
              </a>
              <a href="https://www.formula1.com/en/store" target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                Official F1 Store ↗
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

import { requestTime } from '@/app/[lang]/schedule/status';
import LocalTime, { Countdown } from '@/components/LocalTime';
import { getSeasonSummary } from '@/lib/f1/history';
import { getDriverNumbers, getRaceResults } from '@/lib/f1/results';
import { getLastRace, getNextRace } from '@/lib/f1/season';
import { canonicalTeamName } from '@/lib/f1/team-utils';
import { getSeasonYear } from '@/lib/f1/year';
import Link from 'next/link';
import { connection } from 'next/server';
import styles from './page.module.css';

export const metadata = {
  alternates: { canonical: '/' },
};

const STANDINGS_ROWS = 5;

function DriverLink({ driver, numbers }) {
  const number = numbers[driver.id ?? driver.driverId];
  const name = (
    <>
      {driver.firstName} <strong>{driver.lastName}</strong>
    </>
  );
  return number != null ? <Link href={`/driver/${number}`}>{name}</Link> : <span>{name}</span>;
}

function NextRace({ race, serverNow }) {
  if (!race) {
    return (
      <section className={styles.card} aria-labelledby="next-heading">
        <h2 id="next-heading" className={styles.eyebrow}>Next race</h2>
        <p className={styles.cardTitle}>The next calendar has not been published yet.</p>
        <Link href="/schedule" className={styles.cardLink}>Calendar</Link>
      </section>
    );
  }
  const href = race.meetingKey != null ? `/race/${race.meetingKey}` : '/schedule';
  return (
    <section className={`${styles.card} ${styles.nextCard}`} aria-labelledby="next-heading">
      <h2 id="next-heading" className={styles.eyebrow}>
        {race.status === 'live' ? 'Live now' : race.status === 'weekend' ? 'Race weekend' : 'Next race'}
        <span className={styles.round}>Round {race.round}</span>
      </h2>
      <p className={styles.cardTitle}>
        <Link href={href}>{race.raceName}</Link>
      </p>
      <p className={styles.meta}>
        {race.circuit.name}
        {race.circuit.country ? `, ${race.circuit.country}` : ''}
      </p>
      <p className={styles.start}>
        <span className={styles.startLabel}>Race start</span>
        <LocalTime iso={race.raceStart} format="datetime" />
      </p>
      {race.status === 'live' ? (
        <Link href="/live" className="btn btn-primary">Live timing</Link>
      ) : (
        <Countdown
          target={race.raceStart}
          serverNow={serverNow}
          className={styles.countdown}
          unitClassName={styles.unit}
          valueClassName={styles.unitValue}
          labelClassName={styles.unitLabel}
          doneLabel="Race underway"
        />
      )}
    </section>
  );
}

function LastRace({ race, results, numbers }) {
  if (!race) return null;
  const href = race.meetingKey != null ? `/race/${race.meetingKey}` : '/schedule';
  const podium = (results || []).slice(0, 3);
  return (
    <section className={styles.card} aria-labelledby="last-heading">
      <h2 id="last-heading" className={styles.eyebrow}>
        Last race
        <span className={styles.round}>Round {race.round}</span>
      </h2>
      <p className={styles.cardTitle}>
        <Link href={href}>{race.raceName}</Link>
      </p>
      {podium.length > 0 ? (
        <ol className={styles.podium}>
          {podium.map((row) => (
            <li key={row.driver.id}>
              <span className={styles.podiumPos}>P{row.position}</span>
              <span className={styles.podiumName}><DriverLink driver={row.driver} numbers={numbers} /></span>
              <span className={styles.podiumTeam}>{row.team?.name}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className={styles.meta}>Results not published yet.</p>
      )}
      <Link href={href} className={styles.cardLink}>Full result</Link>
    </section>
  );
}

function StandingsTable({ id, title, rows, renderName }) {
  return (
    <section className={styles.card} aria-labelledby={id}>
      <h2 id={id} className={styles.eyebrow}>{title}</h2>
      {rows.length > 0 ? (
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Pos</th>
              <th scope="col">{id === 'drivers-heading' ? 'Driver' : 'Team'}</th>
              <th scope="col" className={styles.num}>Pts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.position}>
                <th scope="row">{row.position}</th>
                <td>{renderName(row)}</td>
                <td className={styles.num}>{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className={styles.meta}>No races completed yet.</p>
      )}
      <Link href="/standings" className={styles.cardLink}>Full standings</Link>
    </section>
  );
}

export default async function Home() {
  await connection();
  const now = requestTime();
  const year = getSeasonYear();
  const [nextRace, lastRace, summary, numbers] = await Promise.all([
    getNextRace(year, now),
    getLastRace(year, now),
    getSeasonSummary(year),
    getDriverNumbers(year),
  ]);
  const lastResults = lastRace
    ? await getRaceResults(lastRace.year, lastRace.round, { raceStart: lastRace.raceStart, now })
    : null;
  const serverNow = Math.floor(now / 1000) * 1000;

  return (
    <div className={styles.home}>
      <h1 className={styles.srOnly}>Formula 1 {year}: next race, results and standings</h1>
      <div className="container">
        <div className={styles.top}>
          <NextRace race={nextRace} serverNow={serverNow} />
          <LastRace race={lastRace} results={lastResults} numbers={numbers} />
        </div>

        <div className={styles.standings}>
          <StandingsTable
            id="drivers-heading"
            title={`${summary.year} drivers`}
            rows={summary.driverStandings.slice(0, STANDINGS_ROWS)}
            renderName={(row) => <DriverLink driver={row.driver} numbers={numbers} />}
          />
          <StandingsTable
            id="teams-heading"
            title={`${summary.year} constructors`}
            rows={summary.constructorStandings.slice(0, STANDINGS_ROWS)}
            renderName={(row) => <Link href={`/team/${row.team.id}`}>{canonicalTeamName(row.team.name, row.team.id)}</Link>}
          />
        </div>

        <nav aria-label="Explore" className={styles.links}>
          <Link href="/schedule">{year} calendar</Link>
          <Link href="/standings">Standings</Link>
          <Link href="/live">Live timing</Link>
          <Link href="/drivers">Drivers</Link>
          <Link href="/teams">Teams</Link>
        </nav>
      </div>
    </div>
  );
}

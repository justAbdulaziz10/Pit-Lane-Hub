import { requestTime } from '@/app/[lang]/schedule/status';
import LocalTime, { Countdown } from '@/components/LocalTime';
import { getSeasonSummary } from '@/lib/f1/history';
import { getDriverNumbers, getRaceResults } from '@/lib/f1/results';
import { getLastRace, getNextRace } from '@/lib/f1/season';
import { canonicalTeamName } from '@/lib/f1/team-utils';
import { getSeasonYear } from '@/lib/f1/year';
import { countryName, raceName } from '@/lib/i18n/f1-names';
import { localeAlternates, localePath } from '@/lib/i18n/config';
import { formatNumber } from '@/lib/i18n/format';
import homeMessages from '@/lib/i18n/messages/home';
import { fill, pick } from '@/lib/i18n/messages';
import Link from 'next/link';
import { connection } from 'next/server';
import styles from './page.module.css';

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const t = pick(homeMessages, lang);
  const description = t.description;
  return {
    title: t.title,
    description,
    alternates: localeAlternates(lang, '/'),
    openGraph: {
      title: t.title,
      description,
      url: localePath(lang, '/'),
      locale: lang === 'ar' ? 'ar_SA' : 'en_US',
    },
  };
}

const STANDINGS_ROWS = 5;

function DriverLink({ driver, numbers, lang }) {
  const number = numbers[driver.id ?? driver.driverId];
  const name = (
    <>
      <bdi dir="ltr">{driver.firstName} <strong>{driver.lastName}</strong></bdi>
    </>
  );
  return number != null ? <Link href={localePath(lang, `/driver/${number}`)}>{name}</Link> : <span>{name}</span>;
}

function NextRace({ race, serverNow, t, lang }) {
  if (!race) {
    return (
      <section className={styles.card} aria-labelledby="next-heading">
        <h2 id="next-heading" className={styles.eyebrow}>{t.nextRace}</h2>
        <p className={styles.cardTitle}>{t.calendarNotPublished}</p>
        <Link href={localePath(lang, '/schedule')} className={styles.cardLink}>{t.calendar}</Link>
      </section>
    );
  }
  const href = localePath(lang, race.meetingKey != null ? `/race/${race.meetingKey}` : '/schedule');
  return (
    <section className={`${styles.card} ${styles.nextCard}`} aria-labelledby="next-heading">
      <h2 id="next-heading" className={styles.eyebrow}>
        {race.status === 'live' ? t.liveNow : race.status === 'weekend' ? t.raceWeekend : t.nextRace}
        <span className={styles.round}><bdi dir="auto">{fill(t.round, { round: formatNumber(lang, race.round) })}</bdi></span>
      </h2>
      <p className={styles.cardTitle}>
        <Link href={href}>{raceName(race.raceName, lang)}</Link>
      </p>
      <p className={styles.meta}>
        <bdi dir="ltr">{race.circuit.name}</bdi>
        {race.circuit.country ? <>{lang === 'ar' ? '، ' : ', '}{countryName(race.circuit.country, lang)}</> : null}
      </p>
      <p className={styles.start}>
        <span className={styles.startLabel}>{t.raceStart}</span>
        <LocalTime iso={race.raceStart} format="datetime" />
      </p>
      {race.status === 'live' ? (
        <Link href={localePath(lang, '/live')} className="btn btn-primary">{t.liveTiming}</Link>
      ) : (
        <Countdown
          target={race.raceStart}
          serverNow={serverNow}
          className={styles.countdown}
          unitClassName={styles.unit}
          valueClassName={styles.unitValue}
          labelClassName={styles.unitLabel}
          doneLabel={t.raceUnderway}
        />
      )}
    </section>
  );
}

function LastRace({ race, results, numbers, t, lang }) {
  if (!race) return null;
  const href = localePath(lang, race.meetingKey != null ? `/race/${race.meetingKey}` : '/schedule');
  const podium = (results || []).slice(0, 3);
  return (
    <section className={styles.card} aria-labelledby="last-heading">
      <h2 id="last-heading" className={styles.eyebrow}>
        {t.lastRace}
        <span className={styles.round}><bdi dir="auto">{fill(t.round, { round: formatNumber(lang, race.round) })}</bdi></span>
      </h2>
      <p className={styles.cardTitle}>
        <Link href={href}>{raceName(race.raceName, lang)}</Link>
      </p>
      {podium.length > 0 ? (
        <ol className={styles.podium}>
          {podium.map((row) => (
            <li key={row.driver.id}>
              <span className={styles.podiumPos}><bdi dir="ltr">P{row.position}</bdi></span>
              <span className={styles.podiumName}><DriverLink driver={row.driver} numbers={numbers} lang={lang} /></span>
              <span className={styles.podiumTeam}><bdi dir="ltr">{row.team?.name}</bdi></span>
            </li>
          ))}
        </ol>
      ) : (
        <p className={styles.meta}>{t.resultsNotPublished}</p>
      )}
      <Link href={href} className={styles.cardLink}>{t.fullResult}</Link>
    </section>
  );
}

function StandingsTable({ id, title, rows, renderName, t, lang }) {
  return (
    <section className={styles.card} aria-labelledby={id}>
      <h2 id={id} className={styles.eyebrow}>{title}</h2>
      {rows.length > 0 ? (
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col" className={styles.num}>{t.position}</th>
              <th scope="col">{id === 'drivers-heading' ? t.driver : t.team}</th>
              <th scope="col" className={styles.num}>{t.points}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.position}>
                <th scope="row" className={styles.num}><bdi dir="ltr">{formatNumber(lang, Number(row.position))}</bdi></th>
                <td>{renderName(row)}</td>
                <td className={styles.num}><bdi dir="ltr">{formatNumber(lang, Number(row.points))}</bdi></td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className={styles.meta}>{t.noRacesCompleted}</p>
      )}
      <Link href={localePath(lang, '/standings')} className={styles.cardLink}>{t.fullStandings}</Link>
    </section>
  );
}

export default async function Home({ params }) {
  const { lang } = await params;
  const t = pick(homeMessages, lang);
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
      <h1 className={styles.srOnly}>{t.title}</h1>
      <div className="container">
        <div className={styles.top}>
          <NextRace race={nextRace} serverNow={serverNow} t={t} lang={lang} />
          <LastRace race={lastRace} results={lastResults} numbers={numbers} t={t} lang={lang} />
        </div>

        <div className={styles.standings}>
          <StandingsTable
            id="drivers-heading"
            title={fill(t.drivers, { year: String(summary.year) })}
            rows={summary.driverStandings.slice(0, STANDINGS_ROWS)}
            renderName={(row) => <DriverLink driver={row.driver} numbers={numbers} lang={lang} />}
            t={t}
            lang={lang}
          />
          <StandingsTable
            id="teams-heading"
            title={fill(t.constructors, { year: String(summary.year) })}
            rows={summary.constructorStandings.slice(0, STANDINGS_ROWS)}
            renderName={(row) => <Link href={localePath(lang, `/team/${row.team.id}`)}><bdi dir="ltr">{canonicalTeamName(row.team.name, row.team.id)}</bdi></Link>}
            t={t}
            lang={lang}
          />
        </div>

        <nav aria-label={t.explore} className={styles.links}>
          <Link href={localePath(lang, '/schedule')}>{fill(t.yearCalendar, { year: String(year) })}</Link>
          <Link href={localePath(lang, '/standings')}>{t.standings}</Link>
          <Link href={localePath(lang, '/live')}>{t.live}</Link>
          <Link href={localePath(lang, '/drivers')}>{t.driversLink}</Link>
          <Link href={localePath(lang, '/teams')}>{t.teamsLink}</Link>
        </nav>
      </div>
    </div>
  );
}

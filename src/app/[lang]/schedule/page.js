import { localeAlternates, localePath } from '@/lib/i18n/config';
import { formatNumber } from '@/lib/i18n/format';
import scheduleMessages from '@/lib/i18n/messages/schedule';
import { fill, pick } from '@/lib/i18n/messages';
import { getCalendar } from '@/lib/f1/season';
import { getGrid } from '@/lib/f1/drivers';
import { getSeasonWinners } from '@/lib/f1/race-extras';
import { getSeasonYear } from '@/lib/f1/year';
import { SITE_URL } from '@/lib/site';
import CalendarRounds from './CalendarRounds';
import styles from './page.module.css';
import { webcalUrl } from './status';

export const revalidate = 3600;

export async function generateMetadata({ params }) {
    const { lang } = await params;
    const t = pick(scheduleMessages, lang);
    const yearText = String(getSeasonYear());
    const title = fill(t.title, { year: yearText });
    const description = fill(t.description, { year: yearText });
    const path = '/schedule';
    const canonical = `${SITE_URL}${localePath(lang, path)}`;
    const image = `${SITE_URL}${localePath(lang, '/opengraph-image')}`;
    return {
        title,
        description,
        alternates: localeAlternates(lang, path),
        openGraph: {
            title: fill(t.openGraphTitle, { year: yearText }),
            description: fill(t.openGraphDescription, { year: yearText }),
            url: canonical,
            images: [{ url: image, width: 1200, height: 630 }],
            locale: lang === 'ar' ? 'ar_SA' : 'en_US',
        },
        twitter: { card: 'summary_large_image', images: [image] },
    };
}

export default async function SchedulePage({ params }) {
    const { lang } = await params;
    const t = pick(scheduleMessages, lang);
    const year = getSeasonYear();
    const [calendar, seasonWinners, grid] = await Promise.all([
        getCalendar(year),
        getSeasonWinners(year).catch((error) => {
            console.error('Calendar winners unavailable', error);
            return [];
        }),
        getGrid(year).catch((error) => {
            console.error('Calendar team colours unavailable', error);
            return [];
        }),
    ]);
    const rounds = calendar.rounds;
    const winners = Object.fromEntries(seasonWinners.map((winner) => {
        const driver = grid.find((entry) => entry.driverId === winner.driverId);
        return [winner.round, { ...winner, color: driver?.teamColour || null }];
    }));
    const completedCount = rounds.filter((event) => event.status === 'completed').length;
    const testing = calendar.testing.filter((meeting) => !meeting.is_cancelled)
        .sort((a, b) => Date.parse(a.dateStart || '') - Date.parse(b.dateStart || ''));

    return (
        <div className={styles.schedule}>
            <header className={styles.header}>
                <div className="container">
                    <h1>{fill(t.title, { year: String(calendar.year) })}</h1>
                    {rounds.length > 0 && (
                        <p className={styles.summary}>
                            <bdi dir="auto">{fill(t.summary, {
                                rounds: formatNumber(lang, rounds.length),
                                completed: formatNumber(lang, completedCount),
                            })}</bdi>
                        </p>
                    )}
                    <div className={styles.actions}>
                        <a href={webcalUrl(SITE_URL)} className="btn btn-primary">{t.subscribe}</a>
                        <a href="/calendar.ics" download={`f1-${calendar.year}.ics`} className="btn btn-secondary">{t.downloadIcs}</a>
                    </div>
                </div>
            </header>

            <div className={styles.content}>
                <div className="container">
                    {rounds.length > 0 ? (
                        <CalendarRounds
                            rounds={rounds}
                            testing={testing}
                            cancelled={calendar.cancelled}
                            winners={winners}
                            lang={lang}
                        />
                    ) : (
                        <p className={styles.empty}>{fill(t.calendarNotPublished, { year: String(calendar.year) })}</p>
                    )}
                </div>
            </div>
        </div>
    );
}

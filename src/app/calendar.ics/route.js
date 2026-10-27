import { connection } from 'next/server';
import { getCalendar } from '@/lib/f1/season';
import { getSeasonYear } from '@/lib/f1/year';
import { buildCalendar, sessionEvents } from '@/lib/ics';
import { SITE_NAME, SITE_URL } from '@/lib/site';

export async function GET() {
    await connection();
    const year = getSeasonYear();
    let calendar;
    let next = null;
    try {
        // Next season is published months ahead; include it as soon as it has rounds so
        // subscribers see it in December instead of after New Year. Its failure never blocks
        // the current season.
        [calendar, next] = await Promise.all([
            getCalendar(year),
            getCalendar(year + 1).catch(() => null),
        ]);
    } catch (error) {
        console.error('Calendar feed failed', error);
        return new Response('The race calendar is temporarily unavailable. Try again shortly.', {
            status: 503,
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-store',
                'Retry-After': '300',
            },
        });
    }

    const rounds = [...(calendar.rounds || []), ...(next?.rounds || [])];
    const seasons = next?.rounds?.length ? `${calendar.year}–${next.year}` : `${calendar.year}`;
    const body = buildCalendar({
        name: `F1 ${seasons} (${SITE_NAME})`,
        description: `${seasons} Formula 1 session times`,
        events: sessionEvents(rounds, { siteUrl: SITE_URL, domain: new URL(SITE_URL).host }),
    });

    return new Response(body, {
        headers: {
            'Content-Type': 'text/calendar; charset=utf-8',
            'Content-Disposition': `inline; filename="f1-calendar.ics"`,
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
    });
}

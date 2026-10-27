import { connection } from 'next/server';
import { getCalendar } from '@/lib/f1/season';
import { getSeasonYear } from '@/lib/f1/year';
import { buildCalendar, sessionEvents } from '@/lib/ics';
import { SITE_NAME, SITE_URL } from '@/lib/site';

export async function GET() {
    await connection();
    let calendar;
    try {
        calendar = await getCalendar(getSeasonYear());
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

    const body = buildCalendar({
        name: `F1 ${calendar.year} (${SITE_NAME})`,
        description: `${calendar.year} Formula 1 session times`,
        events: sessionEvents(calendar.rounds, { siteUrl: SITE_URL, domain: new URL(SITE_URL).host }),
    });

    return new Response(body, {
        headers: {
            'Content-Type': 'text/calendar; charset=utf-8',
            'Content-Disposition': `inline; filename="f1-${calendar.year}.ics"`,
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
    });
}

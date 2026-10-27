import { connection } from 'next/server';
import { getCachedLiveSnapshot } from '@/lib/f1/live';
import { requestTime } from '@/app/[lang]/schedule/status';
import { getLastRace, getNextRace } from '@/lib/f1/season';
import { getSeasonYear } from '@/lib/f1/year';
import { raceName } from '@/lib/i18n/f1-names';
import { localeAlternates, localePath } from '@/lib/i18n/config';
import liveMessages from '@/lib/i18n/messages/live';
import { pick } from '@/lib/i18n/messages';
import { nextWeekendSession } from '../_home/weekend';
import LiveTiming from './LiveTiming';

export default async function LivePage({ params }) {
    const { lang } = await params;
    const labels = pick(liveMessages, lang);
    await connection();
    const now = requestTime();
    const year = getSeasonYear();
    const [snapshot, nextRace, lastRace] = await Promise.all([
        getCachedLiveSnapshot(),
        getNextRace(year, now).catch(() => null),
        getLastRace(year, now).catch(() => null),
    ]);
    const event = [nextRace, lastRace].find((candidate) => (
        candidate && snapshot.session?.meetingKey != null
            ? String(candidate.meetingKey) === String(snapshot.session.meetingKey)
            : false
    )) || [nextRace, lastRace].find((candidate) => (
        candidate && snapshot.session
            && (candidate.circuit.locality === snapshot.session.location || candidate.circuit.name === snapshot.session.circuit)
    ));
    const nextSession = nextWeekendSession(nextRace, now);
    return (
        <LiveTiming
            initial={snapshot}
            lang={lang}
            labels={labels}
            nextSession={nextSession}
            grandPrixName={event ? raceName(event.raceName, lang) : null}
            serverNow={Math.floor(now / 1000) * 1000}
        />
    );
}

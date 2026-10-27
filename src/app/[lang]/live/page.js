import { connection } from 'next/server';
import { getCachedLiveSnapshot } from '@/lib/f1/live';
import { localeAlternates, localePath } from '@/lib/i18n/config';
import liveMessages from '@/lib/i18n/messages/live';
import { pick } from '@/lib/i18n/messages';
import LiveTiming from './LiveTiming';

export default async function LivePage({ params }) {
    const { lang } = await params;
    const labels = pick(liveMessages, lang);
    await connection();
    const snapshot = await getCachedLiveSnapshot();
    return <LiveTiming initial={snapshot} lang={lang} labels={labels} />;
}

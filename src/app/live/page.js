import { connection } from 'next/server';
import { getCachedLiveSnapshot } from '@/lib/f1/live';
import LiveTiming from './LiveTiming';

export default async function LivePage() {
    await connection();
    const snapshot = await getCachedLiveSnapshot();
    return <LiveTiming initial={snapshot} />;
}

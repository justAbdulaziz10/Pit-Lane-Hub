import { getCachedLiveSnapshot } from '@/lib/f1/live';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const snapshot = await getCachedLiveSnapshot();
        // Short CDN life while a session runs; otherwise nothing changes for minutes.
        const cacheControl = snapshot.isLive
            ? 'public, s-maxage=5, stale-while-revalidate=10'
            : 'public, s-maxage=60, stale-while-revalidate=300';
        return Response.json(snapshot, { headers: { 'Cache-Control': cacheControl } });
    } catch (error) {
        console.error('Live snapshot failed:', error);
        return Response.json(
            { error: 'Live timing is temporarily unavailable.' },
            { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '10' } },
        );
    }
}

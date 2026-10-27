import { getCachedLiveSnapshot } from '@/lib/f1/live';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const snapshot = await getCachedLiveSnapshot();
        if (snapshot.unavailable) {
            return Response.json(snapshot, { headers: { 'Cache-Control': 'no-store' } });
        }
        // Short CDN life while a session runs; otherwise nothing changes for minutes.
        const cacheControl = snapshot.isLive
            ? 'public, s-maxage=5, stale-while-revalidate=10'
            : 'public, s-maxage=60, stale-while-revalidate=300';
        return Response.json(snapshot, { headers: { 'Cache-Control': cacheControl } });
    } catch (error) {
        if (error?.status === 401 || error?.status === 403) {
            return Response.json({ unavailable: 'auth' }, { headers: { 'Cache-Control': 'no-store' } });
        }
        if (error?.status === 429) {
            return Response.json({ unavailable: 'rate-limited' }, { headers: { 'Cache-Control': 'no-store' } });
        }
        if (error?.status >= 400 && error?.status < 500) {
            return Response.json({ unavailable: 'upstream' }, { headers: { 'Cache-Control': 'no-store' } });
        }
        console.error('Live snapshot failed:', error);
        return Response.json(
            { error: 'Live timing is temporarily unavailable.' },
            { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '5' } },
        );
    }
}

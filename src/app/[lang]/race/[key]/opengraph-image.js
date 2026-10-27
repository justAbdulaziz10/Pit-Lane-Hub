import { getRaceResults } from '@/lib/f1/results';
import { getEventByMeetingKey } from '@/lib/f1/season';
import { ImageResponse } from 'next/og';
import { notFound } from 'next/navigation';

export const alt = 'Formula 1 race weekend on Pit Lane Hub';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const revalidate = 3600;

function formatDate(iso) {
    const date = new Date(iso || '');
    if (!Number.isFinite(date.getTime())) return null;
    return new Intl.DateTimeFormat('en-GB', {
        weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
    }).format(date);
}

async function cardData(key) {
    const value = String(key || '');
    if (!/^\d{4}-\d{1,2}$/.test(value) && !/^\d{1,7}$/.test(value)) return null;
    const resolved = await getEventByMeetingKey(value);
    if (!resolved) return null;
    if (resolved.kind !== 'race') {
        const { meeting } = resolved;
        return {
            eyebrow: resolved.kind === 'cancelled' ? 'CANCELLED' : 'TESTING',
            title: meeting.name,
            detail: [meeting.circuitShortName, meeting.country].filter(Boolean).join(', '),
            date: formatDate(meeting.dateStart),
            winner: null,
        };
    }
    const { event } = resolved;
    let winner = null;
    if (event.status === 'completed') {
        const results = await getRaceResults(event.year, event.round, { raceStart: event.raceStart });
        const first = results[0];
        if (first) winner = `${first.driver.firstName} ${first.driver.lastName}${first.team ? ` · ${first.team.name}` : ''}`;
    }
    return {
        eyebrow: `ROUND ${event.round} · ${event.year}`,
        title: event.raceName,
        detail: [event.circuit.name, event.circuit.country].filter(Boolean).join(', '),
        date: formatDate(event.raceStart),
        winner,
    };
}

function Brand() {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div
                style={{
                    width: 58,
                    height: 58,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 12,
                    backgroundColor: '#E10600',
                    fontSize: 27,
                    fontWeight: 900,
                    letterSpacing: -2,
                }}
            >
                PL
            </div>
            <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: 1 }}>PIT LANE HUB</div>
        </div>
    );
}

const frame = {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '64px 76px',
    backgroundColor: '#0D0D0D',
    color: '#FFFFFF',
    fontFamily: 'Arial, sans-serif',
};

export default async function RaceOpenGraphImage({ params }) {
    let data = null;
    try {
        const { key } = await params;
        data = await cardData(key);
    } catch (error) {
        console.error('Race share image data failed', error);
        data = { eyebrow: '', title: 'Formula 1 race weekend', detail: null, date: null, winner: null };
    }
    if (!data) notFound();

    return new ImageResponse(
        (
            <div style={frame}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 10, backgroundColor: '#E10600' }} />
                <Brand />
                {data.title !== 'Formula 1 race weekend' ? (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: 24, letterSpacing: 4, color: '#E10600', fontWeight: 700 }}>{data.eyebrow}</div>
                        <div style={{ marginTop: 14, fontSize: 68, lineHeight: 1.05, fontWeight: 800, letterSpacing: -2 }}>{data.title}</div>
                        {data.detail ? <div style={{ marginTop: 18, fontSize: 30, color: '#C0C0C0' }}>{data.detail}</div> : null}
                    </div>
                ) : (
                    <div style={{ display: 'flex', fontSize: 68, lineHeight: 1.05, fontWeight: 800, letterSpacing: -2 }}>
                        Formula 1 race weekend
                    </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: 28 }}>
                    <div style={{ display: 'flex', color: '#C0C0C0' }}>{data?.date || ''}</div>
                    {data?.winner ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div style={{ display: 'flex', fontSize: 20, letterSpacing: 3, color: '#FFD700', fontWeight: 700 }}>WINNER</div>
                            <div style={{ display: 'flex', fontWeight: 700 }}>{data.winner}</div>
                        </div>
                    ) : null}
                </div>
            </div>
        ),
        size,
    );
}

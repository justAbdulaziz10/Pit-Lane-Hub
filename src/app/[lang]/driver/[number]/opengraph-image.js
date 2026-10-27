import { ImageResponse } from 'next/og';
import { getCareerStats } from '@/lib/f1/compare';
import { FULL_POLE_DATA_FROM, POLE_DATA_FROM } from '@/lib/f1/career';
import { notFound } from 'next/navigation';
import { resolveDriverRoute } from './driver-data';

export const alt = 'Formula 1 driver profile on Pit Lane Hub';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const revalidate = 3600;

function Brand() {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
                style={{
                    width: 52,
                    height: 52,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 10,
                    backgroundColor: '#E10600',
                    fontSize: 24,
                    fontWeight: 900,
                }}
            >
                PL
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: 1 }}>PIT LANE HUB</div>
        </div>
    );
}

function Frame({ colour, children }) {
    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '60px 72px',
                backgroundColor: '#0D0D0D',
                color: '#FFFFFF',
                fontFamily: 'Arial, sans-serif',
            }}
        >
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 12, backgroundColor: colour }} />
            {children}
        </div>
    );
}

export default async function DriverOpenGraphImage({ params }) {
    const { number } = await params;
    const route = await resolveDriverRoute(number);
    if (!route) notFound();
    const { driver } = route;
    let career = null;
    try {
        career = driver.driverId ? await getCareerStats(driver.driverId) : null;
    } catch (error) {
        console.error('[driver opengraph-image]', error);
    }
    const poleLabel = career?.poleCoverage === 'none'
        ? `Poles before ${POLE_DATA_FROM}`
        : career?.poleCoverage === 'partial' ? `Poles complete since ${FULL_POLE_DATA_FROM}` : 'Poles';
    const stats = career ? [
        ['Titles', career.championships],
        ['Wins', career.wins],
        ['Podiums', career.podiums],
        [poleLabel, career.poleCoverage === 'none' ? '—' : career.poles],
        ['Entries', career.entries],
    ] : [];
    return new ImageResponse(
        (
            <Frame colour={driver.colour}>
                <Brand />
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 36 }}>
                    {driver.racingNumber ? (
                        <div style={{ display: 'flex', fontSize: 150, fontWeight: 900, lineHeight: 1, color: driver.colour }}>
                            {String(driver.racingNumber)}
                        </div>
                    ) : null}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', fontSize: 34, color: '#C0C0C0' }}>{driver.firstName}</div>
                        <div style={{ display: 'flex', fontSize: 84, fontWeight: 900, lineHeight: 1, textTransform: 'uppercase' }}>
                            {driver.lastName}
                        </div>
                        <div style={{ display: 'flex', marginTop: 12, fontSize: 28, color: '#C0C0C0' }}>
                            {[driver.team, driver.nationality].filter(Boolean).join(' · ')}
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 56 }}>
                    {stats.map(([label, value]) => (
                        <div key={label} style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', fontSize: 56, fontWeight: 900, color: driver.colour }}>{String(value)}</div>
                            <div style={{ display: 'flex', fontSize: 20, letterSpacing: 2, color: '#C0C0C0', textTransform: 'uppercase' }}>{label}</div>
                        </div>
                    ))}
                </div>
            </Frame>
        ),
        size,
    );
}

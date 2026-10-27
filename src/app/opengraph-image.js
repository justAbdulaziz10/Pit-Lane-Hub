import { ImageResponse } from 'next/og';

export const alt = 'Pit Lane Hub — Formula 1, followed by fans';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 76px',
          backgroundColor: '#0D0D0D',
          color: '#FFFFFF',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 10, backgroundColor: '#E10600' }} />
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
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 44 }}>
          <div style={{ fontSize: 70, lineHeight: 1.08, fontWeight: 800, letterSpacing: -2 }}>
            Formula 1, followed by fans.
          </div>
          <div style={{ marginTop: 24, fontSize: 29, lineHeight: 1.35, color: '#C0C0C0' }}>
            Race calendar, live timing, standings and championship history.
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, color: '#C0C0C0', fontSize: 18, letterSpacing: 3 }}>
          <div style={{ width: 42, height: 4, backgroundColor: '#E10600' }} />
          EVERY SESSION. EVERY BATTLE.
        </div>
      </div>
    ),
    size,
  );
}

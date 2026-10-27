import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 40,
          backgroundColor: '#E10600',
          color: '#FFFFFF',
          fontFamily: 'Arial, sans-serif',
          fontSize: 96,
          fontWeight: 900,
          letterSpacing: -8,
        }}
      >
        PL
      </div>
    ),
    size,
  );
}

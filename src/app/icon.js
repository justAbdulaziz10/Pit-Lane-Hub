import { ImageResponse } from 'next/og';

export const size = { width: 64, height: 64 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 13,
          backgroundColor: '#E10600',
          color: '#FFFFFF',
          fontFamily: 'Arial, sans-serif',
          fontSize: 34,
          fontWeight: 900,
          letterSpacing: -3,
        }}
      >
        PL
      </div>
    ),
    size,
  );
}

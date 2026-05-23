import { ImageResponse } from 'next/og';

export const size = { width: 192, height: 192 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 192,
          height: 192,
          borderRadius: 44,
          background: 'linear-gradient(145deg, #0f2248 0%, #1e3a8a 50%, #2563eb 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Magnifying glass */}
        <svg width={112} height={112} viewBox="0 0 32 32" fill="none">
          <circle cx="13" cy="13" r="8.5" stroke="white" strokeWidth="2.5" />
          <line x1="19.5" y1="19.5" x2="27" y2="27" stroke="white" strokeWidth="3" strokeLinecap="round" />
          <circle cx="13" cy="13" r="3.5" fill="white" fillOpacity="0.45" />
          {/* Globe lines inside the lens */}
          <path d="M8 13h10" stroke="white" strokeWidth="1.2" strokeOpacity="0.5" />
          <path d="M13 8v10" stroke="white" strokeWidth="1.2" strokeOpacity="0.5" />
        </svg>
      </div>
    ),
    { ...size },
  );
}

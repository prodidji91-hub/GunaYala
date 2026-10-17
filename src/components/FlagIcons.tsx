import React from 'react';

interface FlagProps {
  className?: string;
}

const getStarPoints = (cx: number, cy: number, outer: number, inner: number) => {
  const points: string[] = [];
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    const r = i % 2 === 0 ? outer : inner;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return points.join(' ');
};

/**
 * Authentic US Flag SVG Icon
 */
export const FlagUS: React.FC<FlagProps> = ({ className = 'w-4 h-3' }) => {
  return (
    <svg
      viewBox="0 0 640 480"
      className={`inline-block rounded-[3px] shadow-xs overflow-hidden shrink-0 align-middle ${className}`}
      aria-hidden="true"
    >
      {/* Red background */}
      <path fill="#b22234" d="M0 0h640v480H0z" />
      {/* 6 White stripes */}
      <path
        stroke="#ffffff"
        strokeWidth="36.92"
        d="M0 55.38h640M0 129.23h640M0 203.08h640M0 276.92h640M0 350.77h640M0 424.62h640"
      />
      {/* Blue canton */}
      <path fill="#3c3b6e" d="M0 0h260v258.46H0z" />
      {/* White stars grid */}
      <g fill="#ffffff">
        {[26, 78, 130, 182, 234].map((x) =>
          [26, 77, 129, 180, 232].map((y) => (
            <polygon key={`s1-${x}-${y}`} points={getStarPoints(x, y, 7.5, 3.2)} />
          ))
        )}
        {[52, 104, 156, 208].map((x) =>
          [51, 103, 155, 206].map((y) => (
            <polygon key={`s2-${x}-${y}`} points={getStarPoints(x, y, 7.5, 3.2)} />
          ))
        )}
      </g>
    </svg>
  );
};

/**
 * Authentic Panama Flag SVG Icon (Bandera de la República de Panamá)
 * 4 quarters: Top-left white with blue star, top-right red, bottom-left blue, bottom-right white with red star
 */
export const FlagPanama: React.FC<FlagProps> = ({ className = 'w-4 h-3' }) => {
  const blueStarPoints = getStarPoints(160, 120, 52, 22);
  const redStarPoints = getStarPoints(480, 360, 52, 22);

  return (
    <svg
      viewBox="0 0 640 480"
      className={`inline-block rounded-[3px] shadow-xs overflow-hidden shrink-0 align-middle ${className}`}
      aria-hidden="true"
    >
      {/* White base */}
      <rect width="640" height="480" fill="#ffffff" />
      {/* Top right red quarter */}
      <rect x="320" y="0" width="320" height="240" fill="#da121a" />
      {/* Bottom left blue quarter */}
      <rect x="0" y="240" width="320" height="240" fill="#072357" />
      {/* Blue star top-left */}
      <polygon points={blueStarPoints} fill="#072357" />
      {/* Red star bottom-right */}
      <polygon points={redStarPoints} fill="#da121a" />
    </svg>
  );
};

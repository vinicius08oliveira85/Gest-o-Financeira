import { useId } from 'react';

type BrandMarkProps = {
  className?: string;
  /** Rótulo acessível; sem ele a marca é decorativa. */
  title?: string;
};

/**
 * Marca do app: placa azul-marinho com o cifrão e a seta ascendente em verde.
 * Mesma geometria de `public/icon.svg` (os PNGs do PWA saem de
 * `scripts/generate-icons.mjs`, que usa as mesmas coordenadas).
 */
export function BrandMark({ className, title }: BrandMarkProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const tileId = `gf-tile-${uid}`;
  const markId = `gf-mark-${uid}`;

  return (
    <svg
      viewBox="0 0 512 512"
      fill="none"
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <linearGradient id={tileId} x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#22304e" />
          <stop offset="1" stopColor="#0a1120" />
        </linearGradient>
        <linearGradient id={markId} x1="0" y1="100" x2="0" y2="404" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3ee0a6" />
          <stop offset="1" stopColor="#0a9c6a" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="118" fill={`url(#${tileId})`} />
      <g fill="#10b981" opacity="0.45">
        <rect x="96" y="364" width="30" height="40" rx="10" />
        <rect x="132" y="342" width="30" height="62" rx="10" />
        <rect x="168" y="320" width="30" height="84" rx="10" />
      </g>
      <path
        d="M196 420C272 424 330 372 366 260"
        stroke={`url(#${markId})`}
        strokeWidth="40"
        strokeLinecap="round"
      />
      <path d="M385 201 412 268 324 240Z" fill={`url(#${markId})`} />
      <g stroke={`url(#${markId})`} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M188 100V378" strokeWidth="26" />
        <path d="M226 150A54 54 0 1 0 150 226L226 262A54 54 0 1 1 150 338" strokeWidth="34" />
      </g>
    </svg>
  );
}

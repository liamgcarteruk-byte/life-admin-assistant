/**
 * CartegraphyLoader — fullscreen loading overlay for the Cartegraphy iOS web app.
 *
 * Usage:
 *   import CartegraphyLoader from './CartegraphyLoader';
 *   {loading && <CartegraphyLoader />}
 *
 * Remove the component from the DOM to dismiss.
 * Honors `prefers-reduced-motion: reduce` with a static frame.
 * Respects iOS safe-area insets (notch + home indicator).
 */

import React, { useId } from 'react';

const NAVY = '#0A1628';
const RED = '#C8102E';
const IVORY = '#F0F4FF';

function CompassRose({ size = 72 }) {
  const ring = IVORY;
  const ringOp = 0.55;
  return (
    <svg
      width={size}
      height={size}
      viewBox="-60 -72 120 140"
      aria-hidden="true"
      style={{ overflow: 'visible', display: 'block' }}
    >
      <circle r="42" fill="none" stroke={ring} strokeOpacity={ringOp} strokeWidth="1" />
      <circle r="31" fill="none" stroke={ring} strokeOpacity={ringOp * 0.7} strokeWidth="1" strokeDasharray="2 4" />
      <circle r="20" fill="none" stroke={ring} strokeOpacity={ringOp} strokeWidth="1" />

      {[0, 90, 180, 270].map((a) => (
        <line key={a} x1="0" y1="-42" x2="0" y2="-34" stroke={ring} strokeOpacity={ringOp} strokeWidth="1" transform={`rotate(${a})`} />
      ))}
      {[45, 135, 225, 315].map((a) => (
        <line key={a} x1="0" y1="-42" x2="0" y2="-36" stroke={ring} strokeOpacity={ringOp * 0.7} strokeWidth="1" transform={`rotate(${a})`} />
      ))}

      <polygon fill="#FFFFFF" points="0,-31 6,0 0,6 -6,0" />
      <polygon fill={RED} points="0,31 6,0 0,-6 -6,0" />
      <polygon fill={RED} points="31,0 0,6 -6,0 0,-6" />
      <polygon fill="#FFFFFF" points="-31,0 0,-6 6,0 0,6" />

      <polygon fill={RED} points="0,-20 4,-13 0,-6 -4,-13" />
      <polygon fill="#FFFFFF" points="20,0 13,4 6,0 13,-4" />
      <polygon fill={RED} points="0,20 4,13 0,6 -4,13" />
      <polygon fill="#FFFFFF" points="-20,0 -13,-4 -6,0 -13,4" />

      <circle r="3.5" fill={ring} />

      <text x="0" y="-50" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontSize="13" fill={ring}>
        N
      </text>
    </svg>
  );
}

function MapGrid() {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 402 874"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
      {[0.1, 0.22, 0.34, 0.46, 0.58, 0.7, 0.82, 0.94].map((y, i) => (
        <line key={'h' + i} x1="0" y1={y * 874} x2="402" y2={y * 874} stroke={IVORY} strokeOpacity="0.08" strokeWidth="0.5" />
      ))}
      {[0.15, 0.33, 0.5, 0.67, 0.85].map((x, i) => (
        <line key={'v' + i} x1={x * 402} y1="0" x2={x * 402} y2="874" stroke={IVORY} strokeOpacity="0.08" strokeWidth="0.5" />
      ))}
      <path d="M 70 0 Q 100 437 70 874" fill="none" stroke={IVORY} strokeOpacity="0.09" strokeWidth="0.5" />
      <path d="M 330 0 Q 365 437 330 874" fill="none" stroke={IVORY} strokeOpacity="0.09" strokeWidth="0.5" />
    </svg>
  );
}

export default function CartegraphyLoader({
  tagline = 'PLOTTING ROUTE',
  cycleSeconds = 2.6,
  zIndex = 9999,
  className,
  style,
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const k = (name) => `cg-${name}-${uid}`;
  const pathId = k('path-def');
  const routeD = 'M 60 240 Q 130 80 200 160 T 340 60';

  const css = `
    @keyframes ${k('trail')} {
      0%   { stroke-dasharray: 0 1000; }
      100% { stroke-dasharray: 1000 0; }
    }
    .${k('trail-line')} {
      animation: ${k('trail')} ${cycleSeconds}s cubic-bezier(.55,.1,.45,.9) infinite;
    }
    @media (prefers-reduced-motion: reduce) {
      .${k('trail-line')} { animation: none; stroke-dasharray: 1000 0; }
    }
  `;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading Cartegraphy"
      className={className}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex,
        background: NAVY,
        overflow: 'hidden',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
        boxSizing: 'border-box',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
        WebkitFontSmoothing: 'antialiased',
        ...style,
      }}
    >
      <style>{css}</style>

      <div style={{ position: 'absolute', inset: 0 }}>
        <MapGrid />
      </div>

      {/* Route animation — upper portion */}
      <div
        style={{
          position: 'absolute',
          top: '22%',
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <svg
          width="min(92vw, 420px)"
          viewBox="0 0 402 320"
          aria-hidden="true"
          style={{ display: 'block', overflow: 'visible' }}
        >
          <defs>
            <path id={pathId} d={routeD} />
          </defs>

          {/* Static dotted route preview */}
          <path
            d={routeD}
            fill="none"
            stroke={IVORY}
            strokeOpacity="0.35"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray="2 6"
          />

          {/* Solid trail that grows from origin to destination */}
          <path
            className={k('trail-line')}
            d={routeD}
            pathLength="1000"
            fill="none"
            stroke={RED}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="0 1000"
          />

          {/* Destination pin — visible from t=0 */}
          <g transform="translate(340, 60)">
            <path
              d="M 0 -18 C -8 -18 -12 -12 -12 -6 C -12 2 0 14 0 14 C 0 14 12 2 12 -6 C 12 -12 8 -18 0 -18 Z"
              fill={RED}
            />
            <circle cy="-6" r="3.5" fill={IVORY} />
          </g>

          {/* Travelling origin pin — rides the path */}
          <circle r="10" fill={RED} fillOpacity="0.25">
            <animateMotion dur={`${cycleSeconds}s`} repeatCount="indefinite"
              calcMode="spline" keyTimes="0;1" keySplines="0.55 0.1 0.45 0.9">
              <mpath href={`#${pathId}`} />
            </animateMotion>
          </circle>
          <circle r="7" fill={IVORY} stroke={NAVY} strokeWidth="1.5">
            <animateMotion dur={`${cycleSeconds}s`} repeatCount="indefinite"
              calcMode="spline" keyTimes="0;1" keySplines="0.55 0.1 0.45 0.9">
              <mpath href={`#${pathId}`} />
            </animateMotion>
          </circle>
          <circle r="2.5" fill={RED}>
            <animateMotion dur={`${cycleSeconds}s`} repeatCount="indefinite"
              calcMode="spline" keyTimes="0;1" keySplines="0.55 0.1 0.45 0.9">
              <mpath href={`#${pathId}`} />
            </animateMotion>
          </circle>
        </svg>
      </div>

      {/* Wordmark block — lower third */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 'max(12vh, calc(env(safe-area-inset-bottom) + 80px))',
          textAlign: 'center',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <CompassRose size={72} />
        </div>
        <div
          style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: 'clamp(28px, 8vw, 40px)',
            color: IVORY,
            marginTop: 14,
            letterSpacing: 0.5,
            lineHeight: 1.1,
          }}
        >
          Cartegraphy
        </div>
        {tagline && (
          <div
            style={{
              fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
              fontSize: 10,
              color: IVORY,
              opacity: 0.5,
              letterSpacing: 2,
              marginTop: 14,
            }}
          >
            {tagline}
          </div>
        )}
      </div>
    </div>
  );
}

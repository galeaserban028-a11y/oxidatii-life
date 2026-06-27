import type { CSSProperties, ReactElement } from "react";

/**
 * Dedicated SVG artwork per frame.
 * Each SVG is drawn in a 200x200 viewBox so it scales perfectly onto any avatar size.
 * Rendered as an absolutely-positioned overlay sitting on top of the ring.
 */

type Props = {
  frameId: string;
  spin?: number; // seconds for slow rotation; 0 = static
  style?: CSSProperties;
};

const VB = "0 0 200 200";

export function FrameArtwork({ frameId, spin = 30, style }: Props) {
  const svg = ART[frameId];
  if (!svg) return null;
  return (
    <div
      className="pointer-events-none absolute inset-0 rounded-full"
      style={{
        zIndex: 5,
        animation: spin > 0 ? `oxi-frame-spin ${spin}s linear infinite` : undefined,
        ...style,
      }}
      aria-hidden
    >
      {svg}
    </div>
  );
}

/* -------------------- artwork primitives -------------------- */

const Defs = () => (
  <defs>
    {/* Gold */}
    <radialGradient id="g-gold" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stopColor="#fff7ad" />
      <stop offset="60%" stopColor="#facc15" />
      <stop offset="100%" stopColor="#a16207" />
    </radialGradient>
    <linearGradient id="g-gold-lin" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#fde047" />
      <stop offset="100%" stopColor="#a16207" />
    </linearGradient>
    {/* Diamond / ice */}
    <linearGradient id="g-diamond" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#ffffff" />
      <stop offset="50%" stopColor="#bae6fd" />
      <stop offset="100%" stopColor="#0e7490" />
    </linearGradient>
    <linearGradient id="g-ice" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#ecfeff" />
      <stop offset="100%" stopColor="#0891b2" />
    </linearGradient>
    {/* Fire */}
    <radialGradient id="g-fire" cx="50%" cy="100%" r="80%">
      <stop offset="0%" stopColor="#fde047" />
      <stop offset="55%" stopColor="#f97316" />
      <stop offset="100%" stopColor="#7f1d1d" />
    </radialGradient>
    {/* Neon */}
    <linearGradient id="g-neon" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#f0abfc" />
      <stop offset="100%" stopColor="#7e22ce" />
    </linearGradient>
    {/* Holo */}
    <linearGradient id="g-holo" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#a78bfa" />
      <stop offset="50%" stopColor="#22d3ee" />
      <stop offset="100%" stopColor="#f0abfc" />
    </linearGradient>
    {/* Crystal pink */}
    <linearGradient id="g-rose" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#ffffff" />
      <stop offset="100%" stopColor="#e11d48" />
    </linearGradient>
    {/* Mythic */}
    <linearGradient id="g-mythic" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#f43f5e" />
      <stop offset="50%" stopColor="#fde047" />
      <stop offset="100%" stopColor="#a855f7" />
    </linearGradient>
  </defs>
);

/** Place a node at angle (deg) on a circle of radius r around center (100,100). */
function around(count: number, r: number, render: (i: number, angle: number) => ReactElement) {
  const arr: ReactElement[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (360 / count) * i;
    arr.push(
      <g key={i} transform={`rotate(${angle} 100 100) translate(0 ${-r})`}>
        {render(i, angle)}
      </g>
    );
  }
  return arr;
}

/* -------------------- ART per frame -------------------- */

const ART: Record<string, ReactElement> = {
  // GOLD — laurel + sun crown spikes
  gold: (
    <svg viewBox={VB} style={{ width: "100%", height: "100%", overflow: "visible" }}>
      <Defs />
      {/* Sun spikes */}
      {around(24, 100, (i) => (
        <polygon
          points="-2,0 2,0 0,-14"
          fill="url(#g-gold)"
          opacity={i % 2 === 0 ? 1 : 0.6}
          style={{ filter: "drop-shadow(0 0 3px #facc15)" }}
        />
      ))}
      {/* Inner gem dots */}
      {around(12, 92, () => (
        <circle r="2.4" fill="#fff7ad" style={{ filter: "drop-shadow(0 0 3px #facc15)" }} />
      ))}
    </svg>
  ),

  // VIP_AURUM — laurel wreath leaves
  vip_aurum: (
    <svg viewBox={VB} style={{ width: "100%", height: "100%", overflow: "visible" }}>
      <Defs />
      {around(16, 100, () => (
        <path
          d="M0 -10 C -5 -6, -5 6, 0 10 C 5 6, 5 -6, 0 -10 Z"
          fill="url(#g-gold-lin)"
          style={{ filter: "drop-shadow(0 0 2px #facc15)" }}
        />
      ))}
      {around(8, 92, () => (
        <circle r="2" fill="#fef3c7" />
      ))}
    </svg>
  ),

  // ELITE_DIAMOND — faceted brilliants
  elite_diamond: (
    <svg viewBox={VB} style={{ width: "100%", height: "100%", overflow: "visible" }}>
      <Defs />
      {around(12, 100, () => (
        <g>
          <polygon
            points="0,-8 6,-2 4,7 -4,7 -6,-2"
            fill="url(#g-diamond)"
            stroke="#ffffff"
            strokeWidth="0.6"
            style={{ filter: "drop-shadow(0 0 4px #67e8f9)" }}
          />
          <polygon points="0,-8 6,-2 0,0 -6,-2" fill="#ffffff" opacity="0.55" />
        </g>
      ))}
    </svg>
  ),

  // PRO_HOLO — circuit board ring with chips
  pro_holo: (
    <svg viewBox={VB} style={{ width: "100%", height: "100%", overflow: "visible" }}>
      <Defs />
      <circle cx="100" cy="100" r="98" fill="none" stroke="url(#g-holo)" strokeWidth="0.8" strokeDasharray="3 2" opacity="0.7" />
      {around(8, 100, (i) => (
        <g>
          <rect x="-6" y="-4" width="12" height="8" rx="1.5" fill="#0b1020" stroke="url(#g-holo)" strokeWidth="0.8" />
          <rect x="-4" y="-2" width="8" height="1" fill="#22d3ee" opacity="0.9" />
          <rect x="-4" y="0" width="6" height="1" fill="#a78bfa" opacity="0.9" />
          {i % 2 === 0 && (
            <line x1="0" y1="-4" x2="0" y2="-10" stroke="#22d3ee" strokeWidth="0.8" />
          )}
        </g>
      ))}
      {around(16, 88, () => (
        <circle r="1.2" fill="#f0abfc" style={{ filter: "drop-shadow(0 0 2px #f0abfc)" }} />
      ))}
    </svg>
  ),

  // VIPPLUS_CRYSTAL — rose-quartz petals
  vipplus_crystal: (
    <svg viewBox={VB} style={{ width: "100%", height: "100%", overflow: "visible" }}>
      <Defs />
      {around(10, 98, () => (
        <path
          d="M0 -14 C -7 -8, -7 4, 0 8 C 7 4, 7 -8, 0 -14 Z"
          fill="url(#g-rose)"
          stroke="#ffffff"
          strokeWidth="0.5"
          opacity="0.9"
          style={{ filter: "drop-shadow(0 0 4px #fb7185)" }}
        />
      ))}
      {around(10, 88, () => (
        <circle r="1.4" fill="#ffffff" />
      ))}
    </svg>
  ),

  // NEON — lightning bolts ring
  neon: (
    <svg viewBox={VB} style={{ width: "100%", height: "100%", overflow: "visible" }}>
      <Defs />
      {around(8, 100, () => (
        <polygon
          points="-3,-12 3,-12 -1,0 4,0 -3,12 0,2 -4,2"
          fill="url(#g-neon)"
          style={{ filter: "drop-shadow(0 0 4px #d946ef)" }}
        />
      ))}
      <circle cx="100" cy="100" r="98" fill="none" stroke="#d946ef" strokeWidth="0.6" strokeDasharray="1 3" opacity="0.6" />
    </svg>
  ),

  // ICE — shattered ice shards
  ice: (
    <svg viewBox={VB} style={{ width: "100%", height: "100%", overflow: "visible" }}>
      <Defs />
      {around(12, 100, (i) => (
        <polygon
          points={i % 2 === 0 ? "0,-14 4,-2 -3,6 -5,-4" : "0,-12 3,0 -4,4 -3,-6"}
          fill="url(#g-ice)"
          stroke="#ffffff"
          strokeWidth="0.5"
          opacity="0.95"
          style={{ filter: "drop-shadow(0 0 4px #22d3ee)" }}
        />
      ))}
      {/* snowflake center accents */}
      {around(6, 88, () => (
        <g stroke="#ecfeff" strokeWidth="0.6" opacity="0.8">
          <line x1="-3" y1="0" x2="3" y2="0" />
          <line x1="0" y1="-3" x2="0" y2="3" />
        </g>
      ))}
    </svg>
  ),

  // FIRE — real tongue-of-flame ring
  fire: (
    <svg viewBox={VB} style={{ width: "100%", height: "100%", overflow: "visible" }}>
      <Defs />
      {around(10, 96, (i) => (
        <path
          d="M0 6 C -7 0, -6 -8, 0 -16 C 6 -8, 7 0, 0 6 Z"
          fill="url(#g-fire)"
          style={{
            filter: "drop-shadow(0 0 5px #f97316)",
            transformOrigin: "0px 6px",
            animation: `oxi-flame-flicker 1.${(i % 9) + 1}s ease-in-out infinite`,
          }}
        />
      ))}
      {around(10, 86, () => (
        <circle r="1.3" fill="#fef3c7" opacity="0.85" />
      ))}
    </svg>
  ),

  // LEGEND — mythic runes + ornate Gothic spikes
  legend: (
    <svg viewBox={VB} style={{ width: "100%", height: "100%", overflow: "visible" }}>
      <Defs />
      {/* Gothic spikes */}
      {around(16, 100, (i) => (
        <polygon
          points={i % 2 === 0 ? "-2,4 2,4 0,-14" : "-1.5,2 1.5,2 0,-8"}
          fill="url(#g-mythic)"
          style={{ filter: "drop-shadow(0 0 3px #f43f5e)" }}
        />
      ))}
      {/* Runic hexagons */}
      {around(6, 90, () => (
        <g>
          <polygon
            points="0,-6 5,-3 5,3 0,6 -5,3 -5,-3"
            fill="#0b0014"
            stroke="url(#g-mythic)"
            strokeWidth="1"
            style={{ filter: "drop-shadow(0 0 4px #ec4899)" }}
          />
          <line x1="-2" y1="0" x2="2" y2="0" stroke="#fde047" strokeWidth="0.7" />
          <line x1="0" y1="-3" x2="0" y2="3" stroke="#fde047" strokeWidth="0.7" />
        </g>
      ))}
    </svg>
  ),
};

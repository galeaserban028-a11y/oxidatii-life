import type { CSSProperties, ReactNode } from "react";

type AvatarFrameProps = {
  frameId?: string | null;
  size?: number;
  preview?: boolean;
  showBadge?: boolean;
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  style?: CSSProperties;
};

type Tier = "starter" | "rare" | "epic" | "legendary" | "mythic";

type FrameStyle = {
  aura: string;
  ringGlow: string;
  border: string; // outer ring CSS background
  tier: Tier;
};

export const FRAME_STYLES: Record<string, FrameStyle> = {
  neon: {
    aura: "rgba(217,70,239,0.28)",
    ringGlow: "rgba(217,70,239,0.55)",
    border: "linear-gradient(135deg,#22d3ee,#d946ef)",
    tier: "starter",
  },
  ice: {
    aura: "rgba(125,211,252,0.28)",
    ringGlow: "rgba(56,189,248,0.55)",
    border: "linear-gradient(135deg,#e0f2fe,#38bdf8 60%,#0ea5e9)",
    tier: "rare",
  },
  vipplus_crystal: {
    aura: "rgba(251,113,133,0.28)",
    ringGlow: "rgba(251,113,133,0.55)",
    border: "linear-gradient(135deg,#fecdd3,#fb7185 60%,#e11d48)",
    tier: "rare",
  },
  fire: {
    aura: "rgba(249,115,22,0.35)",
    ringGlow: "rgba(239,68,68,0.6)",
    border: "linear-gradient(135deg,#facc15,#f97316 55%,#ef4444)",
    tier: "epic",
  },
  gold: {
    aura: "rgba(250,204,21,0.35)",
    ringGlow: "rgba(250,204,21,0.6)",
    border: "linear-gradient(135deg,#fff7ad,#facc15 50%,#a16207)",
    tier: "epic",
  },
  vip_aurum: {
    aura: "rgba(251,191,36,0.32)",
    ringGlow: "rgba(251,191,36,0.55)",
    border: "linear-gradient(135deg,#fde68a,#f59e0b 60%,#854d0e)",
    tier: "epic",
  },
  pro_holo: {
    aura: "rgba(139,92,246,0.35)",
    ringGlow: "rgba(168,85,247,0.55)",
    border: "conic-gradient(from 0deg,#22d3ee,#a855f7,#f472b6,#fde047,#22d3ee)",
    tier: "legendary",
  },
  elite_diamond: {
    aura: "rgba(186,230,253,0.35)",
    ringGlow: "rgba(125,211,252,0.6)",
    border: "linear-gradient(135deg,#ffffff,#bae6fd 50%,#94a3b8)",
    tier: "legendary",
  },
  legend: {
    aura: "rgba(168,85,247,0.4)",
    ringGlow: "rgba(168,85,247,0.7)",
    border: "conic-gradient(from 0deg,#f59e0b,#ef4444,#a855f7,#22d3ee,#10b981,#f59e0b)",
    tier: "mythic",
  },
};

export const TIER_LABEL: Record<Tier, string> = {
  starter: "Starter",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
  mythic: "Mythic",
};

/* ---------------- Per-frame ornament renderers ---------------- */
/* Each renderer draws OUTSIDE the avatar circle (decorative). */

function Ornament({ frameId, preview }: { frameId: string; preview: boolean }) {
  if (preview) return null;
  switch (frameId) {
    case "neon":
      return <NeonOrnament />;
    case "ice":
      return <IceOrnament />;
    case "vipplus_crystal":
      return <CrystalPrismOrnament />;
    case "fire":
      return <FireOrnament />;
    case "gold":
      return <GoldCoinOrnament />;
    case "vip_aurum":
      return <LaurelOrnament />;
    case "pro_holo":
      return <HoloOrnament />;
    case "elite_diamond":
      return <DiamondChainOrnament />;
    case "legend":
      return <LegendOrnament />;
    default:
      return null;
  }
}

/* --- NEON (free): minimal, dual-color neon ring pulse, no shards --- */
function NeonOrnament() {
  return (
    <div
      className="pointer-events-none absolute rounded-full"
      style={{
        inset: -6,
        border: "1.5px dashed rgba(217,70,239,0.7)",
        animation: "oxi-frame-spin 16s linear infinite",
        zIndex: 1,
      }}
      aria-hidden
    />
  );
}

/* --- ICE: 6 hexagonal snowflakes spinning slowly --- */
function IceOrnament() {
  const flakes = [0, 60, 120, 180, 240, 300];
  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{ animation: "oxi-frame-spin 20s linear infinite", zIndex: 1 }}
      aria-hidden
    >
      {flakes.map((deg) => (
        <div
          key={deg}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 10,
            height: 10,
            marginTop: -5,
            marginLeft: -5,
            transform: `rotate(${deg}deg) translateY(calc(-50% - 18px)) rotate(30deg)`,
            background: "linear-gradient(135deg,#fff,#bae6fd)",
            clipPath:
              "polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)",
            boxShadow: "0 0 6px #67e8f9,0 0 12px #38bdf8",
          }}
        />
      ))}
    </div>
  );
}

/* --- CRYSTAL PRISM (rose): 3 thin angular bands rotating --- */
function CrystalPrismOrnament() {
  return (
    <div
      className="pointer-events-none absolute"
      style={{ inset: -10, animation: "oxi-frame-spin 9s linear infinite", zIndex: 1 }}
      aria-hidden
    >
      {[0, 60, 120].map((deg) => (
        <div
          key={deg}
          style={{
            position: "absolute",
            inset: 0,
            border: "1.5px solid transparent",
            borderRadius: "9999px",
            background:
              `conic-gradient(from ${deg}deg, transparent 0 70%, rgba(251,113,133,0.9) 78%, rgba(255,255,255,0.95) 82%, rgba(251,113,133,0.9) 86%, transparent 94%)`,
            WebkitMask:
              "radial-gradient(farthest-side, transparent calc(100% - 4px), #000 100%)",
            mask:
              "radial-gradient(farthest-side, transparent calc(100% - 4px), #000 100%)",
            filter: "drop-shadow(0 0 6px rgba(251,113,133,0.55))",
          }}
        />
      ))}
    </div>
  );
}

/* --- FIRE: flame petals on top + ember dots --- */
function FireOrnament() {
  return (
    <>
      <div
        className="pointer-events-none absolute"
        style={{
          top: -16,
          left: "50%",
          marginLeft: -22,
          width: 44,
          height: 28,
          zIndex: 1,
        }}
        aria-hidden
      >
        {[-14, 0, 14].map((dx, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 22 + dx - 5,
              top: i === 1 ? -4 : 0,
              width: 10,
              height: 22,
              background:
                "radial-gradient(circle at 50% 80%, #fde047 0%, #f97316 45%, #ef4444 80%, transparent 100%)",
              clipPath: "polygon(50% 0, 100% 100%, 0 100%)",
              filter: "blur(0.3px) drop-shadow(0 0 6px #f97316)",
              animation: `oxi-flame-flicker 0.${6 + i}s ease-in-out infinite`,
              transformOrigin: "50% 100%",
            }}
          />
        ))}
      </div>
      {/* embers */}
      {[
        { top: "-6%", left: "85%", d: 0 },
        { top: "20%", left: "-8%", d: 0.6 },
        { top: "75%", left: "100%", d: 1.1 },
      ].map((e, i) => (
        <div
          key={i}
          className="pointer-events-none absolute"
          style={{
            top: e.top,
            left: e.left,
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: "#fde047",
            boxShadow: "0 0 8px #f97316, 0 0 14px #ef4444",
            animation: `oxi-frame-sparkle 1.${4 + i}s ease-in-out ${e.d}s infinite`,
            zIndex: 1,
          }}
          aria-hidden
        />
      ))}
    </>
  );
}

/* --- GOLD: royal coin — 8 small jewels orbiting at fixed positions --- */
function GoldCoinOrnament() {
  const jewels = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{ animation: "oxi-frame-spin 24s linear infinite", zIndex: 6 }}
      aria-hidden
    >
      {jewels.map((deg, i) => (
        <div
          key={deg}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 7,
            height: 7,
            marginTop: -3.5,
            marginLeft: -3.5,
            transform: `rotate(${deg}deg) translateY(calc(-50% - 4px))`,
            borderRadius: "50%",
            background:
              i % 2 === 0
                ? "radial-gradient(circle at 35% 30%, #fff7ad, #facc15 60%, #a16207)"
                : "radial-gradient(circle at 35% 30%, #fff, #fde68a 60%, #92400e)",
            boxShadow: "0 0 6px #facc15, 0 0 10px #f59e0b",
            border: "1px solid rgba(255,255,255,0.7)",
          }}
        />
      ))}
    </div>
  );
}

/* --- VIP_AURUM: laurel wreath leaves on left & right --- */
function LaurelOrnament() {
  return (
    <svg
      viewBox="0 0 100 100"
      className="pointer-events-none absolute"
      style={{
        inset: -8,
        width: "calc(100% + 16px)",
        height: "calc(100% + 16px)",
        zIndex: 1,
        filter: "drop-shadow(0 0 4px rgba(251,191,36,0.7))",
      }}
      aria-hidden
    >
      <defs>
        <linearGradient id="laurelG" x1="0" x2="1">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="0.5" stopColor="#f59e0b" />
          <stop offset="1" stopColor="#854d0e" />
        </linearGradient>
      </defs>
      {/* left leaves */}
      {[20, 35, 50, 65, 80].map((y) => (
        <ellipse
          key={`l${y}`}
          cx="6"
          cy={y}
          rx="5"
          ry="2.4"
          fill="url(#laurelG)"
          transform={`rotate(${y < 50 ? -30 : 30} 6 ${y})`}
        />
      ))}
      {/* right leaves */}
      {[20, 35, 50, 65, 80].map((y) => (
        <ellipse
          key={`r${y}`}
          cx="94"
          cy={y}
          rx="5"
          ry="2.4"
          fill="url(#laurelG)"
          transform={`rotate(${y < 50 ? 30 : -30} 94 ${y})`}
        />
      ))}
      {/* top tie */}
      <circle cx="50" cy="6" r="2.5" fill="#fde68a" />
    </svg>
  );
}

/* --- PRO HOLO: spectrum scanline ring + 3 satellite orbs --- */
function HoloOrnament() {
  return (
    <>
      <div
        className="pointer-events-none absolute rounded-full"
        style={{
          inset: -4,
          background:
            "conic-gradient(from 0deg,#22d3ee,#a855f7,#f472b6,#fde047,#22d3ee)",
          WebkitMask:
            "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 100%)",
          mask:
            "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 100%)",
          animation: "oxi-frame-spin 4s linear infinite",
          filter: "blur(0.5px) saturate(1.4)",
          zIndex: 1,
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ animation: "oxi-frame-spin 6s linear infinite", zIndex: 6 }}
        aria-hidden
      >
        {[0, 120, 240].map((deg, i) => (
          <div
            key={deg}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 9,
              height: 9,
              marginTop: -4.5,
              marginLeft: -4.5,
              transform: `rotate(${deg}deg) translateY(calc(-50% - 8px))`,
              borderRadius: "50%",
              background: ["#22d3ee", "#f472b6", "#fde047"][i],
              boxShadow: `0 0 8px ${["#22d3ee", "#f472b6", "#fde047"][i]}, 0 0 14px ${["#22d3ee", "#f472b6", "#fde047"][i]}`,
              border: "1px solid rgba(255,255,255,0.7)",
            }}
          />
        ))}
      </div>
    </>
  );
}

/* --- ELITE DIAMOND: 4 big diamonds at N/E/S/W on platinum chain --- */
function DiamondChainOrnament() {
  return (
    <>
      {/* platinum chain ring */}
      <div
        className="pointer-events-none absolute rounded-full"
        style={{
          inset: -3,
          border: "1.5px solid rgba(186,230,253,0.6)",
          boxShadow: "0 0 10px rgba(125,211,252,0.55)",
          zIndex: 1,
        }}
        aria-hidden
      />
      {[
        { t: -8, l: "50%", ml: -7 },
        { t: "50%", l: "calc(100% - 6px)", mt: -7 },
        { t: "calc(100% - 6px)", l: "50%", ml: -7 },
        { t: "50%", l: -8, mt: -7 },
      ].map((p, i) => (
        <div
          key={i}
          className="pointer-events-none absolute"
          style={{
            top: p.t as any,
            left: p.l as any,
            marginLeft: p.ml,
            marginTop: p.mt,
            width: 14,
            height: 14,
            background:
              "linear-gradient(135deg, #ffffff 0%, #bae6fd 45%, #94a3b8 100%)",
            clipPath: "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)",
            boxShadow:
              "0 0 8px #ffffff, 0 0 14px #67e8f9, inset 0 0 4px rgba(255,255,255,0.9)",
            animation: `oxi-frame-sparkle 2.${2 + i}s ease-in-out infinite`,
            zIndex: 6,
          }}
          aria-hidden
        />
      ))}
    </>
  );
}

/* --- LEGEND (mythic): aurora swirl + crown on top + orbiting comet --- */
function LegendOrnament() {
  return (
    <>
      {/* aurora swirl */}
      <div
        className="pointer-events-none absolute rounded-full"
        style={{
          inset: -10,
          background:
            "conic-gradient(from 0deg, rgba(245,158,11,0.6), rgba(239,68,68,0.5), rgba(168,85,247,0.6), rgba(34,211,238,0.5), rgba(16,185,129,0.5), rgba(245,158,11,0.6))",
          WebkitMask:
            "radial-gradient(farthest-side, transparent 60%, #000 78%, #000 92%, transparent 100%)",
          mask:
            "radial-gradient(farthest-side, transparent 60%, #000 78%, #000 92%, transparent 100%)",
          animation: "oxi-frame-spin 8s linear infinite",
          filter: "blur(2px)",
          zIndex: 1,
        }}
        aria-hidden
      />
      {/* crown on top */}
      <svg
        viewBox="0 0 40 22"
        className="pointer-events-none absolute"
        style={{
          top: -16,
          left: "50%",
          marginLeft: -20,
          width: 40,
          height: 22,
          zIndex: 7,
          filter: "drop-shadow(0 0 4px #facc15)",
        }}
        aria-hidden
      >
        <defs>
          <linearGradient id="crownG" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#fff7ad" />
            <stop offset="1" stopColor="#a16207" />
          </linearGradient>
        </defs>
        <path
          d="M2 20 L6 6 L14 14 L20 2 L26 14 L34 6 L38 20 Z"
          fill="url(#crownG)"
          stroke="#fbbf24"
          strokeWidth="0.8"
        />
        <circle cx="20" cy="6" r="2" fill="#f43f5e" />
        <circle cx="6" cy="8" r="1.5" fill="#22d3ee" />
        <circle cx="34" cy="8" r="1.5" fill="#a855f7" />
      </svg>
      {/* orbiting comet */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ animation: "oxi-frame-spin 5s linear infinite", zIndex: 6 }}
        aria-hidden
      >
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 22,
            height: 4,
            marginTop: -2,
            marginLeft: -2,
            transform: "translateY(calc(-50% - 4px))",
            background:
              "linear-gradient(90deg, transparent, #fde047, #fff)",
            borderRadius: 9999,
            boxShadow: "0 0 10px #fde047, 0 0 18px #f97316",
          }}
        />
      </div>
    </>
  );
}

/* ---------------- Main component ---------------- */

export function AvatarFrame({
  frameId,
  size,
  preview = false,
  showBadge: showBadgeProp = false,
  children,
  className = "",
  innerClassName = "",
  style,
}: AvatarFrameProps) {
  const frame = frameId ? FRAME_STYLES[frameId] : null;
  const dimension = size ? { width: size, height: size } : undefined;

  if (!frame || !frameId) {
    return (
      <div className={className} style={{ ...dimension, ...style }}>
        {children}
      </div>
    );
  }

  return (
    <div
      className={`relative shrink-0 rounded-full ${className}`}
      style={{ ...dimension, ...style, isolation: "isolate" }}
    >
      {/* Soft aura behind */}
      {!preview && (
        <div
          className="pointer-events-none absolute rounded-full"
          style={{
            inset: "-30%",
            background: `radial-gradient(circle, ${frame.aura} 0%, transparent 70%)`,
            filter: "blur(6px)",
            zIndex: 0,
            animation: "oxi-hs-aura-pulse 3.4s ease-in-out infinite",
          }}
          aria-hidden
        />
      )}

      {/* Per-frame unique ornament */}
      <Ornament frameId={frameId} preview={preview} />

      {/* Outer painted ring (gradient border) */}
      <div
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          background: frame.border,
          WebkitMask:
            `radial-gradient(farthest-side, transparent calc(100% - ${preview ? 2 : 3}px), #000 100%)`,
          mask:
            `radial-gradient(farthest-side, transparent calc(100% - ${preview ? 2 : 3}px), #000 100%)`,
          boxShadow: preview ? undefined : `0 0 18px ${frame.ringGlow}`,
          zIndex: 2,
        }}
        aria-hidden
      />

      {/* Avatar inner — clipped circle */}
      <div
        className={`relative h-full w-full overflow-hidden rounded-full ${innerClassName}`}
        style={{
          padding: preview ? 3 : 5,
          zIndex: 4,
        }}
      >
        <div
          className="relative h-full w-full overflow-hidden rounded-full isolate"
          style={{
            clipPath: "circle(50% at 50% 50%)",
            boxShadow: !preview
              ? "inset 0 0 0 2px rgba(255,255,255,0.12), inset 0 0 10px rgba(0,0,0,0.35)"
              : undefined,
          }}
        >
          {children}
        </div>
      </div>

      {/* Tier badge */}
      {showBadgeProp && !preview && frame.tier !== "starter" && (
        <div
          className="pointer-events-none absolute left-1/2 -translate-x-1/2"
          style={{ bottom: -10, zIndex: 8 }}
          aria-hidden
        >
          <div
            className="rounded-full border border-white/40 px-3 py-0.5 shadow-xl"
            style={{
              background: "linear-gradient(90deg,#4f46e5,#9333ea,#ec4899)",
            }}
          >
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white drop-shadow">
              {TIER_LABEL[frame.tier]}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

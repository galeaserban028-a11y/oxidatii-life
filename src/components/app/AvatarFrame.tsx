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

type FrameStyle = {
  /** Aura color behind the frame (rgba) */
  aura: string;
  /** 4 shard colors: top, right, bottom, left */
  shards: [string, string, string, string];
  /** Fast inner orbit conic gradient */
  orbit: string;
  /** Outer ring glow (box-shadow color) */
  ringGlow: string;
  /** 2 floating gem colors [top-right, bottom-left] */
  gems: [string, string];
  /** Tier label for shop badge */
  tier: "starter" | "rare" | "epic" | "legendary" | "mythic";
};

export const FRAME_STYLES: Record<string, FrameStyle> = {
  vip_aurum: {
    aura: "rgba(251,191,36,0.32)",
    shards: ["#fde047", "#fbbf24", "#f59e0b", "#fcd34d"],
    orbit: "conic-gradient(from 0deg, #fde047, #f59e0b, #fff7ad, #fde047)",
    ringGlow: "rgba(251,191,36,0.55)",
    gems: ["#fde047", "#f59e0b"],
    tier: "epic",
  },
  elite_diamond: {
    aura: "rgba(103,232,249,0.35)",
    shards: ["#ffffff", "#67e8f9", "#bae6fd", "#a5f3fc"],
    orbit: "conic-gradient(from 0deg, #ffffff, #67e8f9, #bae6fd, #ffffff)",
    ringGlow: "rgba(103,232,249,0.6)",
    gems: ["#ffffff", "#67e8f9"],
    tier: "legendary",
  },
  pro_holo: {
    aura: "rgba(139,92,246,0.35)",
    shards: ["#22d3ee", "#a78bfa", "#f0abfc", "#fde047"],
    orbit: "conic-gradient(from 0deg, #2dd4bf, #a855f7, #f472b6, #2dd4bf)",
    ringGlow: "rgba(168,85,247,0.55)",
    gems: ["#22d3ee", "#d946ef"],
    tier: "legendary",
  },
  vipplus_crystal: {
    aura: "rgba(251,113,133,0.3)",
    shards: ["#ffffff", "#fb7185", "#fecdd3", "#fda4af"],
    orbit: "conic-gradient(from 0deg, #ffffff, #fb7185, #fecdd3, #ffffff)",
    ringGlow: "rgba(251,113,133,0.55)",
    gems: ["#ffffff", "#fb7185"],
    tier: "epic",
  },
  neon: {
    aura: "rgba(217,70,239,0.32)",
    shards: ["#f0abfc", "#d946ef", "#a855f7", "#ec4899"],
    orbit: "conic-gradient(from 0deg, #d946ef, #a855f7, #ec4899, #d946ef)",
    ringGlow: "rgba(217,70,239,0.55)",
    gems: ["#f0abfc", "#a855f7"],
    tier: "rare",
  },
  ice: {
    aura: "rgba(34,211,238,0.3)",
    shards: ["#cffafe", "#22d3ee", "#06b6d4", "#67e8f9"],
    orbit: "conic-gradient(from 0deg, #cffafe, #22d3ee, #06b6d4, #cffafe)",
    ringGlow: "rgba(34,211,238,0.55)",
    gems: ["#cffafe", "#06b6d4"],
    tier: "rare",
  },
  fire: {
    aura: "rgba(249,115,22,0.35)",
    shards: ["#facc15", "#f97316", "#ef4444", "#fb923c"],
    orbit: "conic-gradient(from 0deg, #facc15, #f97316, #ef4444, #facc15)",
    ringGlow: "rgba(249,115,22,0.6)",
    gems: ["#facc15", "#ef4444"],
    tier: "epic",
  },
  gold: {
    aura: "rgba(250,204,21,0.35)",
    shards: ["#fff7ad", "#facc15", "#f59e0b", "#fef08a"],
    orbit: "conic-gradient(from 0deg, #fff7ad, #facc15, #f59e0b, #fff7ad)",
    ringGlow: "rgba(250,204,21,0.6)",
    gems: ["#fff7ad", "#f59e0b"],
    tier: "epic",
  },
  legend: {
    aura: "rgba(168,85,247,0.4)",
    shards: ["#22d3ee", "#d946ef", "#fde047", "#f43f5e"],
    orbit: "conic-gradient(from 0deg, #2dd4bf, #a855f7, #f472b6, #fde047, #2dd4bf)",
    ringGlow: "rgba(168,85,247,0.7)",
    gems: ["#22d3ee", "#d946ef"],
    tier: "mythic",
  },
};

export const TIER_LABEL: Record<FrameStyle["tier"], string> = {
  starter: "Starter",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
  mythic: "Mythic",
};

/** Triangular shard pointing outward from a side. */
function Shard({
  side,
  color,
}: {
  side: "top" | "right" | "bottom" | "left";
  color: string;
}) {
  // Positioned absolute, pointing OUTWARD from the avatar
  const common: CSSProperties = {
    position: "absolute",
    filter: `drop-shadow(0 0 6px ${color}) drop-shadow(0 0 12px ${color})`,
  };
  const size = 22; // shard length outward
  const width = 12; // shard base width
  if (side === "top")
    return (
      <div
        style={{
          ...common,
          top: -size + 4,
          left: "50%",
          marginLeft: -width / 2,
          width,
          height: size,
          background: `linear-gradient(180deg, transparent, ${color})`,
          clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)",
        }}
      />
    );
  if (side === "bottom")
    return (
      <div
        style={{
          ...common,
          bottom: -size + 4,
          left: "50%",
          marginLeft: -width / 2,
          width,
          height: size,
          background: `linear-gradient(0deg, transparent, ${color})`,
          clipPath: "polygon(50% 100%, 100% 0%, 0% 0%)",
        }}
      />
    );
  if (side === "left")
    return (
      <div
        style={{
          ...common,
          left: -size + 4,
          top: "50%",
          marginTop: -width / 2,
          height: width,
          width: size,
          background: `linear-gradient(90deg, transparent, ${color})`,
          clipPath: "polygon(0% 50%, 100% 100%, 100% 0%)",
        }}
      />
    );
  return (
    <div
      style={{
        ...common,
        right: -size + 4,
        top: "50%",
        marginTop: -width / 2,
        height: width,
        width: size,
        background: `linear-gradient(270deg, transparent, ${color})`,
        clipPath: "polygon(100% 50%, 0% 100%, 0% 0%)",
      }}
    />
  );
}

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

  if (!frame) {
    return (
      <div className={className} style={{ ...dimension, ...style }}>
        {children}
      </div>
    );
  }

  return (
    <div
      className={`oxi-hypershard relative shrink-0 rounded-full ${className}`}
      style={{ ...dimension, ...style }}
    >
      {/* Background pulse aura — far behind, breathing */}
      {!preview && (
        <div
          className="pointer-events-none absolute rounded-full oxi-hypershard-aura"
          style={{
            inset: "-40%",
            background: `radial-gradient(circle, ${frame.aura} 0%, transparent 70%)`,
            zIndex: 0,
          }}
          aria-hidden
        />
      )}

      {/* Rotating prismatic shards (4 cardinal points) */}
      {!preview && (
        <div
          className="pointer-events-none absolute inset-0 oxi-hypershard-shards"
          aria-hidden
        >
          <Shard side="top" color={frame.shards[0]} />
          <Shard side="right" color={frame.shards[1]} />
          <Shard side="bottom" color={frame.shards[2]} />
          <Shard side="left" color={frame.shards[3]} />
        </div>
      )}

      {/* The Glass Ring — outer border */}
      <div
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          border: preview ? "2px solid rgba(255,255,255,0.35)" : "3px solid rgba(255,255,255,0.22)",
          boxShadow: `0 0 24px ${frame.ringGlow}, inset 0 0 0 1px rgba(255,255,255,0.45)`,
          zIndex: 2,
        }}
        aria-hidden
      />

      {/* Inner glowing orbit — fast-spinning conic gradient masked to thin ring */}
      <div
        className="pointer-events-none absolute oxi-hypershard-orbit"
        style={{
          inset: preview ? 2 : 4,
          background: frame.orbit,
          zIndex: 3,
        }}
        aria-hidden
      />

      {/* Avatar inner — clipped circle */}
      <div
        className={`relative h-full w-full overflow-hidden rounded-full ${innerClassName}`}
        style={{
          padding: preview ? 4 : 7,
          zIndex: 4,
        }}
      >
        <div className="relative h-full w-full overflow-hidden rounded-full" style={{
          boxShadow: !preview ? "inset 0 0 0 2px rgba(255,255,255,0.12), inset 0 0 12px rgba(0,0,0,0.4)" : undefined,
        }}>
          {children}
          {/* Internal light sweep */}
          {!preview && (
            <div className="oxi-hypershard-sweep" aria-hidden />
          )}
        </div>
      </div>

      {/* Floating gems */}
      {!preview && (
        <>
          <div
            className="pointer-events-none absolute oxi-hypershard-gem-a"
            style={{
              top: "-4px",
              right: "-4px",
              width: 12,
              height: 12,
              background: frame.gems[0],
              border: "1.5px solid rgba(255,255,255,0.6)",
              transform: "rotate(45deg)",
              boxShadow: `0 0 10px ${frame.gems[0]}, 0 0 18px ${frame.gems[0]}`,
              zIndex: 6,
            }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute oxi-hypershard-gem-b"
            style={{
              bottom: "-3px",
              left: "-3px",
              width: 9,
              height: 9,
              background: frame.gems[1],
              border: "1.5px solid rgba(255,255,255,0.55)",
              transform: "rotate(12deg)",
              boxShadow: `0 0 10px ${frame.gems[1]}, 0 0 16px ${frame.gems[1]}`,
              zIndex: 6,
            }}
            aria-hidden
          />
        </>
      )}

      {/* Tier badge (opt-in, e.g. shop) */}
      {showBadgeProp && !preview && frame.tier !== "starter" && (
        <div
          className="pointer-events-none absolute left-1/2 -translate-x-1/2"
          style={{ bottom: -10, zIndex: 7 }}
          aria-hidden
        >
          <div
            className="rounded-full border border-white/40 px-3 py-0.5 shadow-xl"
            style={{
              background:
                "linear-gradient(90deg, #4f46e5, #9333ea, #ec4899)",
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

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
  /** Main gradient ring (always visible) */
  ring: string;
  /** Outer glow box-shadow */
  glow: string;
  /** Soft blurred accent color behind the avatar */
  accent: string;
  /** Spinning halo gradient (conic, masked into a thin ring). Premium feel. */
  halo?: string;
  /** Pulse the ring */
  animated?: boolean;
  /** Add bright sparkle layer */
  sparkle?: boolean;
  /** Tier label shown in shop */
  tier: "starter" | "rare" | "epic" | "legendary" | "mythic";
};

export const FRAME_STYLES: Record<string, FrameStyle> = {
  vip_aurum: {
    ring: "linear-gradient(135deg, #fbbf24, #fef3c7, #f59e0b, #fde68a)",
    glow: "0 0 22px rgba(251, 191, 36, 0.75), 0 0 50px rgba(251, 191, 36, 0.25)",
    accent: "rgba(251, 191, 36, 0.25)",
    halo: "conic-gradient(from 0deg, transparent, #fde68a, transparent 40%, #fbbf24, transparent 80%)",
    sparkle: true,
    tier: "epic",
  },
  elite_diamond: {
    ring: "linear-gradient(135deg, #e0f2fe, #67e8f9, #ffffff, #bae6fd)",
    glow: "0 0 32px rgba(165, 243, 252, 0.95), 0 0 60px rgba(103, 232, 249, 0.4)",
    accent: "rgba(165, 243, 252, 0.28)",
    halo: "conic-gradient(from 0deg, transparent, #ffffff, transparent 35%, #67e8f9, transparent 75%)",
    animated: true,
    sparkle: true,
    tier: "legendary",
  },
  pro_holo: {
    ring: "conic-gradient(from 0deg, #a78bfa, #22d3ee, #f0abfc, #fde047, #a78bfa)",
    glow: "0 0 26px rgba(167, 139, 250, 0.9), 0 0 55px rgba(34, 211, 238, 0.35)",
    accent: "rgba(167, 139, 250, 0.28)",
    halo: "conic-gradient(from 0deg, #a78bfa, #22d3ee, #f0abfc, #fde047, #a78bfa)",
    animated: true,
    sparkle: true,
    tier: "legendary",
  },
  vipplus_crystal: {
    ring: "linear-gradient(135deg, #fecdd3, #fb7185, #ffffff, #fda4af)",
    glow: "0 0 24px rgba(253, 164, 175, 0.9), 0 0 55px rgba(251, 113, 133, 0.3)",
    accent: "rgba(253, 164, 175, 0.26)",
    halo: "conic-gradient(from 0deg, transparent, #ffffff, transparent 40%, #fb7185, transparent 85%)",
    animated: true,
    sparkle: true,
    tier: "epic",
  },
  neon: {
    ring: "linear-gradient(135deg, #d946ef, #f0abfc, #a855f7, #ec4899)",
    glow: "0 0 24px rgba(217, 70, 239, 0.85), 0 0 50px rgba(168, 85, 247, 0.35)",
    accent: "rgba(217, 70, 239, 0.26)",
    halo: "conic-gradient(from 0deg, transparent, #f0abfc, transparent 50%, #a855f7, transparent 95%)",
    animated: true,
    tier: "rare",
  },
  ice: {
    ring: "linear-gradient(135deg, #22d3ee, #cffafe, #06b6d4, #67e8f9)",
    glow: "0 0 24px rgba(34, 211, 238, 0.85), 0 0 50px rgba(6, 182, 212, 0.3)",
    accent: "rgba(34, 211, 238, 0.26)",
    halo: "conic-gradient(from 0deg, transparent, #cffafe, transparent 45%, #22d3ee, transparent 90%)",
    sparkle: true,
    tier: "rare",
  },
  fire: {
    ring: "linear-gradient(135deg, #f97316, #facc15, #ef4444, #fb923c)",
    glow: "0 0 26px rgba(249, 115, 22, 0.9), 0 0 55px rgba(239, 68, 68, 0.35)",
    accent: "rgba(249, 115, 22, 0.28)",
    halo: "conic-gradient(from 0deg, #f97316, #facc15, #ef4444, #fb923c, #f97316)",
    animated: true,
    sparkle: true,
    tier: "epic",
  },
  gold: {
    ring: "linear-gradient(135deg, #facc15, #fff7ad, #f59e0b, #fef08a)",
    glow: "0 0 28px rgba(250, 204, 21, 0.95), 0 0 60px rgba(245, 158, 11, 0.4)",
    accent: "rgba(250, 204, 21, 0.3)",
    halo: "conic-gradient(from 0deg, transparent, #fff7ad, transparent 35%, #facc15, transparent 70%, #f59e0b, transparent 100%)",
    animated: true,
    sparkle: true,
    tier: "epic",
  },
  legend: {
    ring: "conic-gradient(from 0deg, #f43f5e, #f97316, #fde047, #ec4899, #f43f5e)",
    glow: "0 0 32px rgba(244, 63, 94, 0.95), 0 0 65px rgba(236, 72, 153, 0.4)",
    accent: "rgba(244, 63, 94, 0.3)",
    halo: "conic-gradient(from 0deg, #f43f5e, #f97316, #fde047, #ec4899, #a855f7, #f43f5e)",
    animated: true,
    sparkle: true,
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
  const thickness = preview ? 4 : 9;


  const dimension = size ? { width: size, height: size } : undefined;

  if (!frame) {
    return (
      <div className={className} style={{ ...dimension, ...style }}>
        {children}
      </div>
    );
  }

  const showBadge = showBadgeProp && !preview && frame.tier !== "starter";
  const badgeIcon =
    frame.tier === "mythic" ? "👑" :
    frame.tier === "legendary" ? "💎" :
    frame.tier === "epic" ? "✦" :
    frame.tier === "rare" ? "✧" : "";

  return (
    <div
      className={`oxi-avatar-frame relative shrink-0 rounded-full ${frame.animated ? "oxi-avatar-frame--animated" : ""} ${className}`}
      style={{
        ...dimension,
        padding: thickness,
        background: frame.ring,
        boxShadow: `${frame.glow}, inset 0 0 0 1px rgba(255,255,255,0.55), inset 0 1px 1px rgba(255,255,255,0.85), inset 0 -1px 2px rgba(0,0,0,0.45)`,
        ...style,
      }}
    >
      {/* Soft blurred accent halo behind everything */}
      <div
        className="pointer-events-none absolute rounded-full"
        style={{
          inset: -thickness,
          background: frame.accent,
          filter: "blur(20px)",
          opacity: 1,
          zIndex: 0,
        }}
      />
      {/* Metallic conic reflections overlay (brushed-metal feel on the ring band) */}
      {!preview && (
        <div
          className="pointer-events-none absolute rounded-full oxi-frame-metallic"
          style={{
            inset: 0,
            background:
              "conic-gradient(from 220deg, rgba(255,255,255,0) 0deg, rgba(255,255,255,0.85) 35deg, rgba(255,255,255,0.05) 70deg, rgba(0,0,0,0.45) 110deg, rgba(255,255,255,0.7) 165deg, rgba(255,255,255,0) 210deg, rgba(0,0,0,0.4) 260deg, rgba(255,255,255,0.65) 310deg, rgba(255,255,255,0) 360deg)",
            mixBlendMode: "overlay",
            zIndex: 3,
            WebkitMask: `radial-gradient(circle, transparent calc(50% - ${thickness}px), #000 calc(50% - ${thickness}px + 1px), #000 calc(50% - 1px), transparent 50%)`,
            mask: `radial-gradient(circle, transparent calc(50% - ${thickness}px), #000 calc(50% - ${thickness}px + 1px), #000 calc(50% - 1px), transparent 50%)`,
          }}
          aria-hidden
        />
      )}
      {/* Outer slow halo (premium depth) */}
      {!preview && frame.halo && (
        <div
          className="oxi-frame-halo oxi-frame-halo--outer"
          style={{ background: frame.halo }}
          aria-hidden
        />
      )}
      {/* Spinning conic halo masked to a thin ring */}
      {frame.halo && (
        <div
          className="oxi-frame-halo"
          style={{ background: frame.halo }}
          aria-hidden
        />
      )}
      {/* Top glossy highlight (jewelry sheen) */}
      {!preview && (
        <div
          className="pointer-events-none absolute rounded-full"
          style={{
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.18) 18%, transparent 38%, transparent 70%, rgba(255,255,255,0.25) 96%, rgba(255,255,255,0) 100%)",
            mixBlendMode: "screen",
            zIndex: 4,
            opacity: 0.95,
            WebkitMask: `radial-gradient(circle, transparent calc(50% - ${thickness}px), #000 calc(50% - ${thickness}px + 1px), #000 calc(50% - 1px), transparent 50%)`,
            mask: `radial-gradient(circle, transparent calc(50% - ${thickness}px), #000 calc(50% - ${thickness}px + 1px), #000 calc(50% - 1px), transparent 50%)`,
          }}
          aria-hidden
        />
      )}
      {/* Sparkle layer */}
      {frame.sparkle && <div className="oxi-frame-sparkle" aria-hidden />}
      {/* Shimmer sweep across ring */}
      {!preview && (frame.tier === "legendary" || frame.tier === "mythic" || frame.tier === "epic") && (
        <div className="oxi-frame-shimmer" aria-hidden />
      )}

      {/* Avatar — directly inside the ring, no inner bezel */}
      <div
        className={`relative h-full w-full overflow-hidden rounded-full ${innerClassName}`}
        style={{
          zIndex: 2,
          boxShadow: !preview ? "inset 0 0 0 1px rgba(0,0,0,0.55), inset 0 2px 4px rgba(0,0,0,0.35)" : undefined,
        }}
      >
        {children}
      </div>



      {showBadge && (
        <span className={`oxi-frame-badge oxi-frame-badge--${frame.tier}`} aria-hidden>
          <span style={{ fontSize: 11, lineHeight: 1 }}>{badgeIcon}</span>
          <span>{TIER_LABEL[frame.tier]}</span>
        </span>
      )}
    </div>
  );
}


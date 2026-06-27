import type { CSSProperties, ReactNode } from "react";

type AvatarFrameProps = {
  frameId?: string | null;
  size?: number;
  preview?: boolean;
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  style?: CSSProperties;
};

type FrameStyle = {
  ring: string;
  glow: string;
  accent: string;
  animated?: boolean;
};

const FRAME_STYLES: Record<string, FrameStyle> = {
  vip_aurum: {
    ring: "linear-gradient(135deg, #fbbf24, #fef3c7, #f59e0b, #fde68a)",
    glow: "0 0 18px rgba(251, 191, 36, 0.7)",
    accent: "rgba(251, 191, 36, 0.22)",
  },
  elite_diamond: {
    ring: "linear-gradient(135deg, #e0f2fe, #67e8f9, #ffffff, #bae6fd)",
    glow: "0 0 30px rgba(165, 243, 252, 0.95)",
    accent: "rgba(165, 243, 252, 0.24)",
    animated: true,
  },
  pro_holo: {
    ring: "conic-gradient(from 0deg, #a78bfa, #22d3ee, #f0abfc, #fde047, #a78bfa)",
    glow: "0 0 24px rgba(167, 139, 250, 0.9)",
    accent: "rgba(167, 139, 250, 0.24)",
    animated: true,
  },
  vipplus_crystal: {
    ring: "linear-gradient(135deg, #fecdd3, #fb7185, #ffffff, #fda4af)",
    glow: "0 0 22px rgba(253, 164, 175, 0.85)",
    accent: "rgba(253, 164, 175, 0.22)",
    animated: true,
  },
  neon: {
    ring: "linear-gradient(135deg, #d946ef, #f0abfc, #a855f7, #ec4899)",
    glow: "0 0 20px rgba(217, 70, 239, 0.8)",
    accent: "rgba(217, 70, 239, 0.22)",
    animated: true,
  },
  ice: {
    ring: "linear-gradient(135deg, #22d3ee, #cffafe, #06b6d4, #67e8f9)",
    glow: "0 0 22px rgba(34, 211, 238, 0.8)",
    accent: "rgba(34, 211, 238, 0.22)",
  },
  fire: {
    ring: "linear-gradient(135deg, #f97316, #facc15, #ef4444, #fb923c)",
    glow: "0 0 22px rgba(249, 115, 22, 0.85)",
    accent: "rgba(249, 115, 22, 0.22)",
    animated: true,
  },
  gold: {
    ring: "linear-gradient(135deg, #facc15, #fff7ad, #f59e0b, #fef08a)",
    glow: "0 0 24px rgba(250, 204, 21, 0.9), 0 0 42px rgba(250, 204, 21, 0.35)",
    accent: "rgba(250, 204, 21, 0.24)",
  },
  legend: {
    ring: "conic-gradient(from 0deg, #f43f5e, #f97316, #fde047, #ec4899, #f43f5e)",
    glow: "0 0 28px rgba(244, 63, 94, 0.9)",
    accent: "rgba(244, 63, 94, 0.24)",
    animated: true,
  },
};

export function AvatarFrame({
  frameId,
  size,
  preview = false,
  children,
  className = "",
  innerClassName = "",
  style,
}: AvatarFrameProps) {
  const frame = frameId ? FRAME_STYLES[frameId] : null;
  const thickness = preview ? 4 : 5;
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
      className={`oxi-avatar-frame relative shrink-0 rounded-full ${frame.animated ? "oxi-avatar-frame--animated" : ""} ${className}`}
      style={{
        ...dimension,
        padding: thickness,
        background: frame.ring,
        boxShadow: frame.glow,
        ...style,
      }}
    >
      <div
        className="pointer-events-none absolute rounded-full"
        style={{
          inset: -thickness,
          background: frame.accent,
          filter: "blur(14px)",
          opacity: 0.9,
        }}
      />
      <div className={`relative h-full w-full overflow-hidden rounded-full ${innerClassName}`}>
        {children}
      </div>
    </div>
  );
}

import type { ProfileTheme } from "@/lib/premium-themes";
import { type ReactNode } from "react";

/**
 * AvatarAura — rotating conic ring around an avatar, themed.
 * Wrap any avatar element. Falls back gracefully if no theme.
 */
export function AvatarAura({
  theme,
  size = 92,
  children,
  className = "",
  rotateMs = 6000,
}: {
  theme: ProfileTheme | null;
  size?: number;
  children: ReactNode;
  className?: string;
  rotateMs?: number;
}) {
  if (!theme) {
    return <div className={className} style={{ width: size, height: size }}>{children}</div>;
  }
  const ring = `conic-gradient(from 0deg, ${theme.accent}, ${theme.cardBorder}, ${theme.accent}cc, ${theme.cardBorder}, ${theme.accent})`;
  return (
    <div
      className={`relative shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: ring,
          animation: `auraSpin ${rotateMs}ms linear infinite`,
          filter: "blur(0.5px)",
        }}
      />
      <div
        className="absolute -inset-2 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${theme.accent}66 0%, transparent 65%)`,
          filter: "blur(14px)",
          opacity: 0.85,
        }}
      />
      <div
        className="absolute inset-[3px] rounded-full overflow-hidden bg-[#050505]"
      >
        {children}
      </div>
      <style>{`@keyframes auraSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

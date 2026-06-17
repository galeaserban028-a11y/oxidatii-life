import { useEffect, useState } from "react";
import type { ProfileTheme } from "@/lib/premium-themes";

type Intensity = { gradient?: number; aurora?: number; sheen?: number; grain?: number; vignette?: number };

export function ThemeAtmosphere({
  theme,
  intensity,
  parallax = true,
}: {
  theme: ProfileTheme;
  intensity?: Intensity | null;
  parallax?: boolean;
}) {
  const ti = intensity ?? {};
  const iGradient = Math.max(0, Math.min(1.5, ti.gradient ?? 1));
  const iAurora = Math.max(0, Math.min(1.5, ti.aurora ?? 1));
  const iSheen = Math.max(0, Math.min(1.5, ti.sheen ?? 1));
  const iGrain = Math.max(0, Math.min(1.5, ti.grain ?? 1));
  const iVignette = Math.max(0, Math.min(1.5, ti.vignette ?? 1));

  // Parallax: scroll + device tilt
  const [px, setPx] = useState(0);
  const [py, setPy] = useState(0);
  useEffect(() => {
    if (!parallax) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setPy(window.scrollY * 0.15));
    };
    const onTilt = (e: DeviceOrientationEvent) => {
      const gx = (e.gamma ?? 0) / 45; // -1..1
      const gy = (e.beta ?? 0) / 90;
      setPx(Math.max(-1, Math.min(1, gx)) * 30);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("deviceorientation", onTilt);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("deviceorientation", onTilt);
      cancelAnimationFrame(raf);
    };
  }, [parallax]);

  return (
    <>
      {iGradient > 0 && (
        <div className="fixed inset-0 pointer-events-none z-0" style={{ background: theme.base, opacity: iGradient }} />
      )}

      {iAurora > 0 && (
        <div
          className="fixed pointer-events-none z-0"
          style={{
            top: "-40%",
            left: "-30%",
            width: "160vmax",
            height: "160vmax",
            background: `conic-gradient(from 0deg, transparent 0deg, ${theme.accent}22 30deg, transparent 60deg, ${theme.accent}33 180deg, transparent 210deg, ${theme.cardBorder}22 330deg, transparent 360deg)`,
            filter: "blur(60px)",
            opacity: 0.55 * iAurora,
            animation: "themeBeams 45s linear infinite",
            mixBlendMode: "screen",
          }}
        />
      )}

      {iAurora > 0 && theme.aurora.map((a, i) => {
        const [ax, ay] = a.pos.split(" ");
        return (
          <div
            key={i}
            className="fixed rounded-full pointer-events-none z-0"
            style={{
              left: ax,
              top: ay,
              height: a.size,
              width: a.size,
              filter: `blur(${a.blur}px)`,
              opacity: a.opacity * iAurora,
              background: `radial-gradient(circle, ${a.color} 0%, transparent 70%)`,
              transform: `translate3d(${px * (i + 1) * 0.3}px, ${-py * (i % 2 ? 0.6 : 0.3)}px, 0)`,
              animation: `themeDrift${i % 3} ${a.duration * 2}s ease-in-out infinite, themeBreathe ${a.duration}s ease-in-out infinite`,
              animationDelay: a.delay ? `${a.delay}s, ${a.delay}s` : undefined,
              mixBlendMode: "screen",
              willChange: "transform",
            }}
          />
        );
      })}

      {iAurora > 0 && [0, 1, 2, 3, 4].map((i) => (
        <div
          key={`orb-${i}`}
          className="fixed rounded-full pointer-events-none z-0"
          style={{
            left: `${10 + i * 18}%`,
            top: `${15 + ((i * 37) % 70)}%`,
            width: 6 + (i % 3) * 4,
            height: 6 + (i % 3) * 4,
            background: i % 2 === 0 ? theme.accent : theme.cardBorder,
            boxShadow: `0 0 ${20 + i * 6}px ${theme.accent}`,
            opacity: 0.35 * iAurora,
            transform: `translate3d(${px * 0.5}px, ${-py * 0.25}px, 0)`,
            animation: `themeFloat ${8 + i * 2}s ease-in-out ${i * 0.7}s infinite`,
            filter: "blur(0.5px)",
            willChange: "transform",
          }}
        />
      ))}

      {theme.sheen && iSheen > 0 && (
        <div
          className="fixed inset-0 pointer-events-none z-0 mix-blend-overlay"
          style={{
            opacity: theme.sheen.opacity * iSheen,
            background: `linear-gradient(120deg, transparent 30%, ${theme.sheen.color} 50%, transparent 70%)`,
            backgroundSize: "200% 200%",
            animation: `themeSheen ${theme.sheen.duration}s linear infinite`,
          }}
        />
      )}

      {iSheen > 0 && (
        <div
          className="fixed inset-0 pointer-events-none z-0"
          style={{
            background: `linear-gradient(180deg, transparent 0%, ${theme.accent}22 50%, transparent 100%)`,
            backgroundSize: "100% 30%",
            backgroundRepeat: "no-repeat",
            opacity: 0.45 * iSheen,
            animation: "themeScan 9s linear infinite",
            mixBlendMode: "screen",
          }}
        />
      )}

      {theme.grain > 0 && iGrain > 0 && (
        <div
          className="fixed inset-0 pointer-events-none z-0 mix-blend-overlay"
          style={{
            opacity: theme.grain * iGrain,
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
          }}
        />
      )}

      {iVignette > 0 && (
        <div className="fixed inset-0 pointer-events-none z-0" style={{ background: theme.vignette, opacity: iVignette }} />
      )}

      <style>{`
        @keyframes themeSheen { 0% { background-position: 0% 0%; } 100% { background-position: 200% 200%; } }
        @keyframes themeBeams { to { transform: rotate(360deg); } }
        @keyframes themeBreathe { 0%, 100% { opacity: var(--o, 0.5); } 50% { opacity: calc(var(--o, 0.5) * 0.55); } }
        @keyframes themeDrift0 { 0%, 100% { transform: translate(0,0) scale(1); } 50% { transform: translate(6vw, 4vh) scale(1.08); } }
        @keyframes themeDrift1 { 0%, 100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-7vw, 5vh) scale(1.12); } }
        @keyframes themeDrift2 { 0%, 100% { transform: translate(0,0) scale(1); } 50% { transform: translate(4vw, -6vh) scale(0.95); } }
        @keyframes themeFloat { 0%, 100% { transform: translate(0,0); } 50% { transform: translate(0, -40px); } }
        @keyframes themeScan { 0% { background-position: 0% -30%; } 100% { background-position: 0% 130%; } }
      `}</style>
    </>
  );
}

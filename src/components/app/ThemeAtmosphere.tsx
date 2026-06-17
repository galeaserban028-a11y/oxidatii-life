import { useEffect, useRef, useState } from "react";
import type { ProfileTheme } from "@/lib/premium-themes";

type Intensity = { gradient?: number; aurora?: number; sheen?: number; grain?: number; vignette?: number };

/**
 * ThemeAtmosphere — full-page premium atmosphere.
 * Performance:
 *  - parallax via CSS vars on a single container (avoids re-rendering every layer)
 *  - rAF-throttled scroll + deviceorientation
 *  - respects prefers-reduced-motion (disables motion, keeps static glow)
 *  - GPU-promoted layers, pointer-events: none, no layout reads
 */
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

  const rootRef = useRef<HTMLDivElement>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(m.matches);
    const onChange = () => setReduced(m.matches);
    m.addEventListener?.("change", onChange);
    return () => m.removeEventListener?.("change", onChange);
  }, []);

  useEffect(() => {
    if (!parallax || reduced) return;
    const el = rootRef.current;
    if (!el) return;

    let scrollY = 0;
    let tiltX = 0;
    let scheduled = false;
    const apply = () => {
      scheduled = false;
      el.style.setProperty("--px", `${tiltX}px`);
      el.style.setProperty("--py", `${-scrollY * 0.15}px`);
    };
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(apply);
    };
    const onScroll = () => {
      scrollY = window.scrollY;
      schedule();
    };
    const onTilt = (e: DeviceOrientationEvent) => {
      const gx = Math.max(-1, Math.min(1, (e.gamma ?? 0) / 45));
      tiltX = gx * 24;
      schedule();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("deviceorientation", onTilt);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("deviceorientation", onTilt);
    };
  }, [parallax, reduced]);

  // When reduced motion is on, freeze animations but keep static glow.
  const animSheen = reduced ? "none" : undefined;
  const animBeams = reduced ? "none" : "themeBeams 45s linear infinite";
  const animScan = reduced ? "none" : "themeScan 9s linear infinite";

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ ["--px" as any]: "0px", ["--py" as any]: "0px", contain: "strict" as any }}
      aria-hidden="true"
    >
      {iGradient > 0 && (
        <div className="absolute inset-0" style={{ background: theme.base, opacity: iGradient }} />
      )}

      {iAurora > 0 && (
        <div
          className="absolute"
          style={{
            top: "-40%",
            left: "-30%",
            width: "160vmax",
            height: "160vmax",
            background: `conic-gradient(from 0deg, transparent 0deg, ${theme.accent}22 30deg, transparent 60deg, ${theme.accent}33 180deg, transparent 210deg, ${theme.cardBorder}22 330deg, transparent 360deg)`,
            filter: "blur(60px)",
            opacity: 0.5 * iAurora,
            animation: animBeams,
            mixBlendMode: "screen",
            willChange: reduced ? undefined : "transform",
            transform: "translateZ(0)",
          }}
        />
      )}

      {iAurora > 0 && theme.aurora.map((a, i) => {
        const [ax, ay] = a.pos.split(" ");
        const driftAnim = reduced ? "none" : `themeDrift${i % 3} ${a.duration * 2}s ease-in-out infinite`;
        return (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: ax,
              top: ay,
              height: a.size,
              width: a.size,
              filter: `blur(${a.blur}px)`,
              opacity: a.opacity * iAurora,
              background: `radial-gradient(circle, ${a.color} 0%, transparent 70%)`,
              // Parallax via shared CSS vars — compositor only
              ["--mx" as any]: `calc(var(--px) * ${(i + 1) * 0.35})`,
              ["--my" as any]: `calc(var(--py) * ${i % 2 ? 0.6 : 0.3})`,
              transform: "translate3d(var(--mx,0), var(--my,0), 0)",
              animation: driftAnim,
              animationDelay: a.delay ? `${a.delay}s` : undefined,
              mixBlendMode: "screen",
              willChange: reduced ? undefined : "transform",
            }}
          />
        );
      })}

      {/* Floating orbs — fewer + only if not reduced motion */}
      {iAurora > 0 && !reduced && [0, 1, 2, 3].map((i) => (
        <div
          key={`orb-${i}`}
          className="absolute rounded-full"
          style={{
            left: `${12 + i * 22}%`,
            top: `${18 + ((i * 37) % 64)}%`,
            width: 6 + (i % 3) * 4,
            height: 6 + (i % 3) * 4,
            background: i % 2 === 0 ? theme.accent : theme.cardBorder,
            boxShadow: `0 0 ${18 + i * 6}px ${theme.accent}`,
            opacity: 0.32 * iAurora,
            ["--mx" as any]: `calc(var(--px) * 0.5)`,
            ["--my" as any]: `calc(var(--py) * 0.25)`,
            transform: "translate3d(var(--mx,0), var(--my,0), 0)",
            animation: `themeFloat ${9 + i * 2}s ease-in-out ${i * 0.8}s infinite`,
            willChange: "transform",
          }}
        />
      ))}

      {theme.sheen && iSheen > 0 && (
        <div
          className="absolute inset-0 mix-blend-overlay"
          style={{
            opacity: theme.sheen.opacity * iSheen,
            background: `linear-gradient(120deg, transparent 30%, ${theme.sheen.color} 50%, transparent 70%)`,
            backgroundSize: "200% 200%",
            animation: reduced ? animSheen : `themeSheen ${theme.sheen.duration}s linear infinite`,
            willChange: reduced ? undefined : "background-position",
          }}
        />
      )}

      {iSheen > 0 && !reduced && (
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, transparent 0%, ${theme.accent}22 50%, transparent 100%)`,
            backgroundSize: "100% 30%",
            backgroundRepeat: "no-repeat",
            opacity: 0.4 * iSheen,
            animation: animScan,
            mixBlendMode: "screen",
            willChange: "background-position",
          }}
        />
      )}

      {theme.grain > 0 && iGrain > 0 && (
        <div
          className="absolute inset-0 mix-blend-overlay"
          style={{
            opacity: theme.grain * iGrain,
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
          }}
        />
      )}

      {iVignette > 0 && (
        <div className="absolute inset-0" style={{ background: theme.vignette, opacity: iVignette }} />
      )}

      <style>{`
        @keyframes themeSheen { 0% { background-position: 0% 0%; } 100% { background-position: 200% 200%; } }
        @keyframes themeBeams { to { transform: translateZ(0) rotate(360deg); } }
        @keyframes themeDrift0 { 0%, 100% { translate: 0 0; } 50% { translate: 6vw 4vh; } }
        @keyframes themeDrift1 { 0%, 100% { translate: 0 0; } 50% { translate: -7vw 5vh; } }
        @keyframes themeDrift2 { 0%, 100% { translate: 0 0; } 50% { translate: 4vw -6vh; } }
        @keyframes themeFloat { 0%, 100% { translate: 0 0; } 50% { translate: 0 -36px; } }
        @keyframes themeScan { 0% { background-position: 0% -30%; } 100% { background-position: 0% 130%; } }
        @media (prefers-reduced-motion: reduce) {
          [data-theme-atmosphere] * { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

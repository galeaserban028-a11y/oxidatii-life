import { useEffect, useState } from "react";
import type { ProfileTheme } from "@/lib/premium-themes";

/**
 * SignatureReveal — 1.4s cinematic intro for a themed profile.
 * Sweeps a light beam in the theme accent color, stamps the handle,
 * then fades away. Plays once per session per handle.
 */
export function SignatureReveal({
  theme,
  handle,
  storageKey,
}: {
  theme: ProfileTheme;
  handle: string;
  storageKey: string;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const k = `sig-reveal:${storageKey}`;
      if (sessionStorage.getItem(k)) return;
      sessionStorage.setItem(k, "1");
    } catch { /* noop */ }
    setShow(true);
    const t = setTimeout(() => setShow(false), 1700);
    return () => clearTimeout(t);
  }, [storageKey]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[60] pointer-events-none overflow-hidden">
      {/* Black curtain that fades */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 50%, transparent 0%, #000 70%)`,
          animation: "sigFade 1.7s ease-out forwards",
        }}
      />
      {/* Diagonal light sweep */}
      <div
        className="absolute inset-y-0 -left-1/3 w-2/3"
        style={{
          background: `linear-gradient(110deg, transparent 0%, ${theme.accent}cc 45%, ${theme.cardBorder}aa 55%, transparent 100%)`,
          filter: "blur(40px)",
          mixBlendMode: "screen",
          animation: "sigSweep 1.6s cubic-bezier(.22,1,.36,1) forwards",
        }}
      />
      {/* Accent rings burst */}
      <div
        className="absolute left-1/2 top-1/2 rounded-full"
        style={{
          width: 20,
          height: 20,
          transform: "translate(-50%,-50%)",
          boxShadow: `0 0 0 2px ${theme.accent}`,
          animation: "sigRing 1.4s ease-out forwards",
        }}
      />
      {/* Handle stamp */}
      <div
        className="absolute left-0 right-0 top-1/2 -translate-y-1/2 text-center"
        style={{
          fontFamily: '"Instrument Serif", serif',
          color: theme.accent,
          textShadow: `0 0 40px ${theme.accent}`,
          fontSize: "clamp(40px, 9vw, 80px)",
          letterSpacing: "-0.02em",
          animation: "sigStamp 1.6s ease-out forwards",
        }}
      >
        @{handle}
      </div>

      <style>{`
        @keyframes sigFade { 0%{opacity:1} 60%{opacity:0.85} 100%{opacity:0} }
        @keyframes sigSweep { 0%{transform:translateX(-30%);opacity:0} 30%{opacity:1} 100%{transform:translateX(220%);opacity:0} }
        @keyframes sigRing { 0%{transform:translate(-50%,-50%) scale(0.3);opacity:0.9} 100%{transform:translate(-50%,-50%) scale(40);opacity:0} }
        @keyframes sigStamp { 0%{opacity:0;transform:translateY(calc(-50% + 20px)) scale(0.96);letter-spacing:0.1em;filter:blur(8px)} 25%{opacity:1;filter:blur(0)} 75%{opacity:1} 100%{opacity:0;transform:translateY(calc(-50% - 10px)) scale(1.02);filter:blur(4px)} }
      `}</style>
    </div>
  );
}

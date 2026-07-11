import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { usePerfLevel } from "@/hooks/usePerfLevel";

type AvatarFrameProps = {
  frameId?: string | null;
  size?: number;
  preview?: boolean;
  showBadge?: boolean;
  /** Adds hover lift + activation pulse. Defaults to true. */
  interactive?: boolean;
  /** Increment / toggle to trigger the "just activated" burst. */
  activationKey?: string | number | null;
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  style?: CSSProperties;
};

type Tier = "starter" | "rare" | "epic" | "legendary" | "mythic";

type FrameStyle = {
  aura: string;
  ringGlow: string;
  /** Outer bezel: rich multi-stop gradient for jewelry look */
  bezel: string;
  /** Inner highlight ring (the polished glint) */
  highlight: string;
  tier: Tier;
};

export const FRAME_STYLES: Record<string, FrameStyle> = {
  neon: {
    aura: "rgba(217,70,239,0.28)",
    ringGlow: "rgba(217,70,239,0.45)",
    bezel: "linear-gradient(135deg,#22d3ee 0%,#a855f7 50%,#ec4899 100%)",
    highlight: "linear-gradient(180deg, rgba(255,255,255,0.55), rgba(255,255,255,0) 55%)",
    tier: "starter",
  },
  ice: {
    aura: "rgba(125,211,252,0.32)",
    ringGlow: "rgba(56,189,248,0.6)",
    bezel: "linear-gradient(140deg,#ffffff 0%,#e0f2fe 25%,#67e8f9 55%,#0284c7 100%)",
    highlight: "linear-gradient(180deg, rgba(255,255,255,0.8), rgba(255,255,255,0) 45%)",
    tier: "rare",
  },
  vipplus_crystal: {
    aura: "rgba(251,113,133,0.32)",
    ringGlow: "rgba(251,113,133,0.6)",
    bezel: "linear-gradient(140deg,#fff1f2 0%,#fecdd3 30%,#fb7185 60%,#9f1239 100%)",
    highlight: "linear-gradient(180deg, rgba(255,255,255,0.7), rgba(255,255,255,0) 50%)",
    tier: "rare",
  },
  fire: {
    aura: "rgba(249,115,22,0.4)",
    ringGlow: "rgba(239,68,68,0.7)",
    bezel: "linear-gradient(140deg,#fef3c7 0%,#facc15 25%,#f97316 55%,#dc2626 100%)",
    highlight: "linear-gradient(180deg, rgba(255,255,255,0.55), rgba(255,255,255,0) 50%)",
    tier: "epic",
  },
  gold: {
    aura: "rgba(250,204,21,0.4)",
    ringGlow: "rgba(250,204,21,0.7)",
    bezel: "linear-gradient(140deg,#fff7c2 0%,#fde68a 25%,#facc15 55%,#a16207 100%)",
    highlight: "linear-gradient(180deg, rgba(255,255,255,0.85), rgba(255,255,255,0) 55%)",
    tier: "epic",
  },
  vip_aurum: {
    aura: "rgba(251,191,36,0.4)",
    ringGlow: "rgba(251,191,36,0.7)",
    bezel: "conic-gradient(from 30deg,#fff7c2,#f59e0b,#fde68a,#854d0e,#fde68a,#f59e0b,#fff7c2)",
    highlight: "linear-gradient(180deg, rgba(255,255,255,0.8), rgba(255,255,255,0) 50%)",
    tier: "epic",
  },
  pro_holo: {
    aura: "rgba(139,92,246,0.4)",
    ringGlow: "rgba(168,85,247,0.7)",
    bezel: "conic-gradient(from 0deg,#22d3ee,#3b82f6,#a855f7,#ec4899,#f59e0b,#22d3ee)",
    highlight: "linear-gradient(180deg, rgba(255,255,255,0.75), rgba(255,255,255,0) 50%)",
    tier: "legendary",
  },
  elite_diamond: {
    aura: "rgba(186,230,253,0.45)",
    ringGlow: "rgba(125,211,252,0.75)",
    bezel: "linear-gradient(140deg,#ffffff 0%,#e0f2fe 20%,#bae6fd 45%,#94a3b8 75%,#475569 100%)",
    highlight: "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,255,255,0) 55%)",
    tier: "legendary",
  },
  legend: {
    aura: "rgba(168,85,247,0.5)",
    ringGlow: "rgba(168,85,247,0.85)",
    bezel:
      "conic-gradient(from 0deg,#fde047,#f97316,#ef4444,#ec4899,#a855f7,#22d3ee,#10b981,#fde047)",
    highlight: "linear-gradient(180deg, rgba(255,255,255,0.85), rgba(255,255,255,0) 55%)",
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

/* ============================================================
   ORNAMENT LAYERS  (rendered OUTSIDE the avatar circle)
   Quality scales with tier — more layers as price rises.
   ============================================================ */

function Ornament({ frameId, preview }: { frameId: string; preview: boolean }) {
  if (preview) return null;
  switch (frameId) {
    case "neon":
      return <NeonOrn />;
    case "ice":
      return <IceOrn />;
    case "vipplus_crystal":
      return <CrystalOrn />;
    case "fire":
      return <FireOrn />;
    case "gold":
      return <GoldOrn />;
    case "vip_aurum":
      return <AurumOrn />;
    case "pro_holo":
      return <HoloOrn />;
    case "elite_diamond":
      return <DiamondOrn />;
    case "legend":
      return <LegendOrn />;
    default:
      return null;
  }
}

/* --- NEON (free) — minimal: single soft dashed halo --- */
function NeonOrn() {
  return (
    <div
      className="pointer-events-none absolute rounded-full"
      style={{
        inset: -5,
        border: "1px dashed rgba(217,70,239,0.55)",
        animation: "oxi-pf-rotate 22s linear infinite",
        zIndex: 1,
      }}
      aria-hidden
    />
  );
}

/* --- ICE (100) — 6 polished snowflakes, slow rotation --- */
function IceOrn() {
  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{ animation: "oxi-pf-rotate 30s linear infinite", zIndex: 1 }}
      aria-hidden
    >
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <svg
          key={deg}
          viewBox="0 0 20 20"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 12,
            height: 12,
            marginTop: -6,
            marginLeft: -6,
            transform: `rotate(${deg}deg) translateY(calc(-50% - 14px))`,
            filter: "drop-shadow(0 0 4px #67e8f9) drop-shadow(0 0 8px #38bdf8)",
          }}
        >
          <defs>
            <linearGradient id={`ice${deg}`} x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="0.6" stopColor="#bae6fd" />
              <stop offset="1" stopColor="#38bdf8" />
            </linearGradient>
          </defs>
          <path
            d="M10 1 L11.5 8 L18 8.5 L13 12 L15 18.5 L10 14.5 L5 18.5 L7 12 L2 8.5 L8.5 8 Z"
            fill={`url(#ice${deg})`}
            stroke="#ffffff"
            strokeWidth="0.4"
          />
        </svg>
      ))}
    </div>
  );
}

/* --- CRYSTAL (200) — rose double sweep + 4 tiny gems --- */
function CrystalOrn() {
  return (
    <>
      <div
        className="pointer-events-none absolute rounded-full"
        style={{
          inset: -7,
          background:
            "conic-gradient(from 0deg, transparent 0 60%, rgba(255,255,255,0.95) 70%, rgba(251,113,133,0.95) 76%, transparent 84%)",
          WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 100%)",
          mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 100%)",
          animation: "oxi-pf-rotate 7s linear infinite",
          filter: "drop-shadow(0 0 8px rgba(251,113,133,0.7))",
          zIndex: 1,
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ animation: "oxi-pf-rotate-rev 14s linear infinite", zIndex: 1 }}
        aria-hidden
      >
        {[45, 135, 225, 315].map((deg) => (
          <div
            key={deg}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 6,
              height: 6,
              marginTop: -3,
              marginLeft: -3,
              transform: `rotate(${deg}deg) translateY(calc(-50% - 4px)) rotate(45deg)`,
              background: "linear-gradient(135deg,#fff,#fb7185)",
              boxShadow: "0 0 6px #fb7185, 0 0 12px #f43f5e",
              border: "0.5px solid #fff",
            }}
          />
        ))}
      </div>
    </>
  );
}

/* --- FIRE (300) — crown of flames + animated ember spread --- */
function FireOrn() {
  return (
    <>
      {/* heat ring */}
      <div
        className="pointer-events-none absolute rounded-full"
        style={{
          inset: -4,
          background:
            "conic-gradient(from 0deg, rgba(239,68,68,0.6), rgba(249,115,22,0.7), rgba(253,224,71,0.8), rgba(249,115,22,0.7), rgba(239,68,68,0.6))",
          WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 100%)",
          mask: "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 100%)",
          animation: "oxi-pf-rotate 6s linear infinite",
          filter: "blur(0.5px) drop-shadow(0 0 6px #f97316)",
          zIndex: 1,
        }}
        aria-hidden
      />
      {/* crown of 5 flames on top */}
      <div
        className="pointer-events-none absolute"
        style={{ top: -20, left: "50%", marginLeft: -28, width: 56, height: 26, zIndex: 7 }}
        aria-hidden
      >
        {[-22, -11, 0, 11, 22].map((dx, i) => {
          const h = i === 2 ? 26 : i === 1 || i === 3 ? 22 : 16;
          return (
            <svg
              key={i}
              viewBox="0 0 10 24"
              style={{
                position: "absolute",
                left: 28 + dx - 5,
                bottom: 0,
                width: 10,
                height: h,
                filter: "drop-shadow(0 -2px 6px #f97316) drop-shadow(0 0 4px #ef4444)",
                animation: `oxi-pf-flame ${0.6 + i * 0.13}s ease-in-out infinite`,
                transformOrigin: "50% 100%",
              }}
            >
              <defs>
                <linearGradient id={`fl${i}`} x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0" stopColor="#dc2626" />
                  <stop offset="0.4" stopColor="#f97316" />
                  <stop offset="0.8" stopColor="#fde047" />
                  <stop offset="1" stopColor="#fffbeb" />
                </linearGradient>
              </defs>
              <path
                d="M5 0 C 7 8, 9 10, 8 16 C 8 22, 2 22, 2 16 C 1 10, 3 8, 5 0 Z"
                fill={`url(#fl${i})`}
              />
            </svg>
          );
        })}
      </div>
      {/* embers */}
      {[
        { t: "10%", l: "-8%", d: 0 },
        { t: "60%", l: "104%", d: 0.5 },
        { t: "92%", l: "20%", d: 1.0 },
      ].map((e, i) => (
        <div
          key={i}
          className="pointer-events-none absolute"
          style={{
            top: e.t,
            left: e.l,
            width: 4,
            height: 4,
            borderRadius: "50%",
            background: "#fde047",
            boxShadow: "0 0 6px #f97316, 0 0 12px #ef4444",
            animation: `oxi-pf-twinkle 1.4s ease-in-out ${e.d}s infinite`,
            zIndex: 1,
          }}
          aria-hidden
        />
      ))}
    </>
  );
}

/* --- GOLD (400) — coin with 8 polished jewels + slow shimmer --- */
function GoldOrn() {
  const jewels = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0"
        style={{ animation: "oxi-pf-rotate 28s linear infinite", zIndex: 6 }}
        aria-hidden
      >
        {jewels.map((deg, i) => (
          <div
            key={deg}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 8,
              height: 8,
              marginTop: -4,
              marginLeft: -4,
              transform: `rotate(${deg}deg) translateY(calc(-50% - 3px))`,
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 30% 25%, #ffffff 0%, #fff7ad 30%, #facc15 60%, #92400e 100%)",
              boxShadow:
                "0 0 4px #fde68a, 0 0 8px rgba(250,204,21,0.8), inset 0 0 2px rgba(255,255,255,0.9)",
              border: "0.5px solid rgba(255,255,255,0.5)",
              animation: `oxi-pf-twinkle ${2 + (i % 3) * 0.4}s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
    </>
  );
}

/* --- VIP_AURUM (550) — laurel wreath + animated metallic conic + sparkle --- */
function AurumOrn() {
  return (
    <>
      {/* breathing gold halo */}
      <div
        className="pointer-events-none absolute rounded-full"
        style={{
          inset: -10,
          background: "radial-gradient(circle, rgba(251,191,36,0.55) 0%, transparent 65%)",
          animation: "oxi-pf-breathe 3.6s ease-in-out infinite",
          zIndex: 0,
        }}
        aria-hidden
      />
      {/* laurel wreath */}
      <svg
        viewBox="0 0 100 100"
        className="pointer-events-none absolute"
        style={{
          inset: -10,
          width: "calc(100% + 20px)",
          height: "calc(100% + 20px)",
          zIndex: 1,
          filter: "drop-shadow(0 0 4px rgba(251,191,36,0.7))",
        }}
        aria-hidden
      >
        <defs>
          <linearGradient id="laurelG" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#fff7c2" />
            <stop offset="0.45" stopColor="#facc15" />
            <stop offset="1" stopColor="#854d0e" />
          </linearGradient>
        </defs>
        {[18, 32, 46, 60, 74].map((y, i) => (
          <ellipse
            key={`l${y}`}
            cx={i % 2 === 0 ? 5 : 7}
            cy={y}
            rx="5.5"
            ry="2.6"
            fill="url(#laurelG)"
            stroke="#a16207"
            strokeWidth="0.3"
            transform={`rotate(${y < 46 ? -32 : 32} 6 ${y})`}
          />
        ))}
        {[18, 32, 46, 60, 74].map((y, i) => (
          <ellipse
            key={`r${y}`}
            cx={i % 2 === 0 ? 95 : 93}
            cy={y}
            rx="5.5"
            ry="2.6"
            fill="url(#laurelG)"
            stroke="#a16207"
            strokeWidth="0.3"
            transform={`rotate(${y < 46 ? 32 : -32} 94 ${y})`}
          />
        ))}
        {/* top jewel tie */}
        <circle cx="50" cy="3" r="3" fill="url(#laurelG)" stroke="#fff" strokeWidth="0.5" />
      </svg>
      {/* slow sparkle dots */}
      {[
        { t: "-2%", l: "50%" },
        { t: "50%", l: "-4%" },
        { t: "50%", l: "100%" },
      ].map((s, i) => (
        <div
          key={i}
          className="pointer-events-none absolute"
          style={{
            top: s.t,
            left: s.l,
            width: 5,
            height: 5,
            marginTop: -2.5,
            marginLeft: -2.5,
            background: "#fff7ad",
            boxShadow: "0 0 6px #fde68a, 0 0 12px #facc15",
            clipPath:
              "polygon(50% 0, 60% 40%, 100% 50%, 60% 60%, 50% 100%, 40% 60%, 0 50%, 40% 40%)",
            animation: `oxi-pf-twinkle ${1.8 + i * 0.3}s ease-in-out infinite`,
            zIndex: 7,
          }}
          aria-hidden
        />
      ))}
    </>
  );
}

/* --- PRO_HOLO (700) — multi-layer holo + 3 orbiting plasma orbs --- */
function HoloOrn() {
  return (
    <>
      {/* breathing iridescent halo */}
      <div
        className="pointer-events-none absolute rounded-full"
        style={{
          inset: -14,
          background:
            "radial-gradient(circle, rgba(168,85,247,0.5) 0%, rgba(34,211,238,0.3) 40%, transparent 75%)",
          animation: "oxi-pf-breathe 3s ease-in-out infinite",
          zIndex: 0,
        }}
        aria-hidden
      />
      {/* fast outer holo ring */}
      <div
        className="pointer-events-none absolute rounded-full"
        style={{
          inset: -5,
          background: "conic-gradient(from 0deg,#22d3ee,#3b82f6,#a855f7,#ec4899,#f59e0b,#22d3ee)",
          WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 100%)",
          mask: "radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 100%)",
          animation: "oxi-pf-rotate 3.5s linear infinite",
          filter: "blur(0.4px) saturate(1.5) drop-shadow(0 0 8px #a855f7)",
          zIndex: 1,
        }}
        aria-hidden
      />
      {/* counter-spinning thinner ring */}
      <div
        className="pointer-events-none absolute rounded-full"
        style={{
          inset: -2,
          background:
            "conic-gradient(from 90deg, transparent 0 70%, #fff 78%, rgba(168,85,247,0.9) 82%, transparent 90%)",
          WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 1.5px), #000 100%)",
          mask: "radial-gradient(farthest-side, transparent calc(100% - 1.5px), #000 100%)",
          animation: "oxi-pf-rotate-rev 5s linear infinite",
          zIndex: 1,
        }}
        aria-hidden
      />
      {/* 3 orbiting plasma orbs */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ animation: "oxi-pf-rotate 7s linear infinite", zIndex: 6 }}
        aria-hidden
      >
        {[0, 120, 240].map((deg, i) => {
          const c = ["#22d3ee", "#ec4899", "#fde047"][i];
          return (
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
                transform: `rotate(${deg}deg) translateY(calc(-50% - 10px))`,
                borderRadius: "50%",
                background: `radial-gradient(circle at 30% 30%, #fff 0%, ${c} 60%, transparent 100%)`,
                boxShadow: `0 0 10px ${c}, 0 0 18px ${c}`,
                border: "1px solid rgba(255,255,255,0.7)",
              }}
            />
          );
        })}
      </div>
    </>
  );
}

/* --- ELITE_DIAMOND (850) — platinum chain + 4 cut diamonds + sparkles --- */
function DiamondOrn() {
  return (
    <>
      {/* platinum chain outer */}
      <div
        className="pointer-events-none absolute rounded-full"
        style={{
          inset: -6,
          background:
            "conic-gradient(from 0deg,#fff,#cbd5e1,#fff,#cbd5e1,#fff,#cbd5e1,#fff,#cbd5e1,#fff)",
          WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 100%)",
          mask: "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 100%)",
          animation: "oxi-pf-rotate 18s linear infinite",
          filter: "drop-shadow(0 0 6px rgba(186,230,253,0.7))",
          zIndex: 1,
        }}
        aria-hidden
      />
      {/* breathing diamond aura */}
      <div
        className="pointer-events-none absolute rounded-full"
        style={{
          inset: -14,
          background: "radial-gradient(circle, rgba(186,230,253,0.55) 0%, transparent 65%)",
          animation: "oxi-pf-breathe 3.2s ease-in-out infinite",
          zIndex: 0,
        }}
        aria-hidden
      />
      {/* 4 large cut diamonds at cardinals */}
      {[
        { top: -10, left: "50%", ml: -8 },
        { top: "50%", left: "calc(100% - 6px)", mt: -8 },
        { top: "calc(100% - 6px)", left: "50%", ml: -8 },
        { top: "50%", left: -10, mt: -8 },
      ].map((p, i) => (
        <svg
          key={i}
          viewBox="0 0 16 16"
          className="pointer-events-none absolute"
          style={{
            top: p.top as number | string,
            left: p.left as number | string,
            marginLeft: p.ml,
            marginTop: p.mt,
            width: 16,
            height: 16,
            filter: "drop-shadow(0 0 4px #fff) drop-shadow(0 0 10px #67e8f9)",
            animation: `oxi-pf-twinkle ${2.2 + i * 0.3}s ease-in-out ${i * 0.2}s infinite`,
            zIndex: 7,
          }}
          aria-hidden
        >
          <defs>
            <linearGradient id={`dia${i}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="0.4" stopColor="#e0f2fe" />
              <stop offset="0.8" stopColor="#67e8f9" />
              <stop offset="1" stopColor="#475569" />
            </linearGradient>
          </defs>
          {/* diamond shape with facets */}
          <polygon
            points="8,0 16,6 8,16 0,6"
            fill={`url(#dia${i})`}
            stroke="#fff"
            strokeWidth="0.5"
          />
          <polygon points="8,0 16,6 8,7 0,6" fill="rgba(255,255,255,0.45)" />
          <polygon points="8,0 11,4 8,5 5,4" fill="rgba(255,255,255,0.8)" />
        </svg>
      ))}
      {/* corner sparkles */}
      {[
        { top: "8%", left: "8%" },
        { top: "8%", left: "92%" },
        { top: "92%", left: "8%" },
        { top: "92%", left: "92%" },
      ].map((s, i) => (
        <div
          key={`sp${i}`}
          className="pointer-events-none absolute"
          style={{
            top: s.top,
            left: s.left,
            width: 6,
            height: 6,
            marginTop: -3,
            marginLeft: -3,
            background: "#fff",
            clipPath:
              "polygon(50% 0, 58% 42%, 100% 50%, 58% 58%, 50% 100%, 42% 58%, 0 50%, 42% 42%)",
            boxShadow: "0 0 6px #fff, 0 0 12px #67e8f9",
            animation: `oxi-pf-twinkle ${1.5 + i * 0.25}s ease-in-out ${i * 0.3}s infinite`,
            zIndex: 7,
          }}
          aria-hidden
        />
      ))}
    </>
  );
}

/* --- LEGEND (mythic, 1000) — full orchestra:
       aurora, crown, comet, sparkle dust, dual rings, pulsing aura --- */
function LegendOrn() {
  return (
    <>
      {/* huge breathing rainbow aura */}
      <div
        className="pointer-events-none absolute rounded-full"
        style={{
          inset: -22,
          background:
            "radial-gradient(circle, rgba(168,85,247,0.55) 0%, rgba(34,211,238,0.35) 40%, transparent 75%)",
          animation: "oxi-pf-breathe 2.8s ease-in-out infinite",
          zIndex: 0,
        }}
        aria-hidden
      />
      {/* aurora swirl outer ring */}
      <div
        className="pointer-events-none absolute rounded-full"
        style={{
          inset: -12,
          background:
            "conic-gradient(from 0deg, rgba(245,158,11,0.7), rgba(239,68,68,0.6), rgba(168,85,247,0.7), rgba(34,211,238,0.6), rgba(16,185,129,0.6), rgba(245,158,11,0.7))",
          WebkitMask:
            "radial-gradient(farthest-side, transparent 56%, #000 76%, #000 92%, transparent 100%)",
          mask: "radial-gradient(farthest-side, transparent 56%, #000 76%, #000 92%, transparent 100%)",
          animation: "oxi-pf-rotate 7s linear infinite, oxi-pf-aurora-hue 12s linear infinite",
          filter: "blur(3px) saturate(1.4)",
          zIndex: 1,
        }}
        aria-hidden
      />
      {/* fast inner shimmer */}
      <div
        className="pointer-events-none absolute rounded-full"
        style={{
          inset: -4,
          background: "conic-gradient(from 0deg,#fde047,#f97316,#ef4444,#a855f7,#22d3ee,#fde047)",
          WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 100%)",
          mask: "radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 100%)",
          animation: "oxi-pf-rotate 3s linear infinite",
          filter: "drop-shadow(0 0 10px #f59e0b) drop-shadow(0 0 16px #a855f7)",
          zIndex: 1,
        }}
        aria-hidden
      />
      {/* crown on top */}
      <svg
        viewBox="0 0 44 26"
        className="pointer-events-none absolute"
        style={{
          top: -22,
          left: "50%",
          marginLeft: -22,
          width: 44,
          height: 26,
          zIndex: 8,
          filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4)) drop-shadow(0 0 6px #facc15)",
        }}
        aria-hidden
      >
        <defs>
          <linearGradient id="legCrownG" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#fff7c2" />
            <stop offset="0.5" stopColor="#facc15" />
            <stop offset="1" stopColor="#854d0e" />
          </linearGradient>
        </defs>
        <path
          d="M2 24 L6 8 L14 16 L22 2 L30 16 L38 8 L42 24 Z"
          fill="url(#legCrownG)"
          stroke="#fde68a"
          strokeWidth="0.8"
        />
        <rect
          x="2"
          y="22"
          width="40"
          height="3"
          rx="1"
          fill="#a16207"
          stroke="#fde68a"
          strokeWidth="0.4"
        />
        <circle cx="22" cy="6" r="2.4" fill="#f43f5e" stroke="#fff" strokeWidth="0.4" />
        <circle cx="6" cy="10" r="1.6" fill="#22d3ee" stroke="#fff" strokeWidth="0.3" />
        <circle cx="38" cy="10" r="1.6" fill="#a855f7" stroke="#fff" strokeWidth="0.3" />
        <circle cx="14" cy="16" r="1.3" fill="#10b981" stroke="#fff" strokeWidth="0.3" />
        <circle cx="30" cy="16" r="1.3" fill="#fde047" stroke="#fff" strokeWidth="0.3" />
      </svg>
      {/* orbiting comet */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ animation: "oxi-pf-rotate 4s linear infinite", zIndex: 7 }}
        aria-hidden
      >
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 26,
            height: 5,
            marginTop: -2.5,
            marginLeft: -2.5,
            transform: "translateY(calc(-50% - 8px))",
            background: "linear-gradient(90deg, transparent, #fde047 50%, #fff 100%)",
            borderRadius: 9999,
            boxShadow: "0 0 10px #fde047, 0 0 20px #f97316, 0 0 30px #ef4444",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 9,
            height: 9,
            marginTop: -4.5,
            marginLeft: -4.5,
            transform: "translateY(calc(-50% - 8px)) translateX(13px)",
            borderRadius: "50%",
            background: "radial-gradient(circle at 30% 30%, #fff, #fde047 60%, #f97316)",
            boxShadow: "0 0 14px #fde047, 0 0 24px #f97316",
          }}
        />
      </div>
      {/* sparkle dust around */}
      {[
        { t: "-6%", l: "20%", d: 0 },
        { t: "10%", l: "98%", d: 0.4 },
        { t: "60%", l: "-6%", d: 0.8 },
        { t: "95%", l: "70%", d: 1.2 },
        { t: "40%", l: "104%", d: 1.6 },
      ].map((s, i) => (
        <div
          key={i}
          className="pointer-events-none absolute"
          style={{
            top: s.t,
            left: s.l,
            width: 5,
            height: 5,
            marginTop: -2.5,
            marginLeft: -2.5,
            background: "#fff",
            clipPath:
              "polygon(50% 0, 58% 42%, 100% 50%, 58% 58%, 50% 100%, 42% 58%, 0 50%, 42% 42%)",
            boxShadow: "0 0 6px #fff, 0 0 14px #fde047",
            animation: `oxi-pf-twinkle 1.6s ease-in-out ${s.d}s infinite`,
            zIndex: 7,
          }}
          aria-hidden
        />
      ))}
    </>
  );
}

/* ============================================================
   MAIN COMPONENT
   ============================================================ */

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

  // Thicker bezel for higher tiers (more "jewelry")
  const tierThickness: Record<Tier, number> = {
    starter: 2.5,
    rare: 3,
    epic: 3.5,
    legendary: 4,
    mythic: 4.5,
  };
  const thickness = preview ? 2 : tierThickness[frame.tier];

  return (
    <div
      className={`relative shrink-0 rounded-full ${className}`}
      style={{ ...dimension, ...style, isolation: "isolate" }}
    >
      {/* Soft pulsing aura behind */}
      {!preview && (
        <div
          className="pointer-events-none absolute rounded-full"
          style={{
            inset: "-25%",
            background: `radial-gradient(circle, ${frame.aura} 0%, transparent 70%)`,
            animation: "oxi-pf-breathe 3.4s ease-in-out infinite",
            zIndex: 0,
          }}
          aria-hidden
        />
      )}

      {/* Per-tier ornament layer */}
      <Ornament frameId={frameId} preview={preview} />

      {/* Polished bezel (the ring itself, gradient-painted) */}
      <div
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          background: frame.bezel,
          WebkitMask: `radial-gradient(farthest-side, transparent calc(100% - ${thickness}px), #000 100%)`,
          mask: `radial-gradient(farthest-side, transparent calc(100% - ${thickness}px), #000 100%)`,
          boxShadow: preview
            ? `0 0 6px ${frame.ringGlow}`
            : `0 0 18px ${frame.ringGlow}, 0 0 36px ${frame.ringGlow}`,
          zIndex: 3,
        }}
        aria-hidden
      />

      {/* Bezel top highlight (gives it the "polished" look) */}
      {!preview && (
        <div
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            background: frame.highlight,
            WebkitMask: `radial-gradient(farthest-side, transparent calc(100% - ${thickness}px), #000 calc(100% - 0.5px))`,
            mask: `radial-gradient(farthest-side, transparent calc(100% - ${thickness}px), #000 calc(100% - 0.5px))`,
            mixBlendMode: "overlay",
            zIndex: 4,
            opacity: 0.9,
          }}
          aria-hidden
        />
      )}

      {/* Rotating shimmer sweep across the bezel */}
      {!preview && (
        <div
          className="pointer-events-none absolute inset-0 rounded-full overflow-hidden"
          style={{ zIndex: 5 }}
          aria-hidden
        >
          <div
            style={{
              position: "absolute",
              top: "-20%",
              bottom: "-20%",
              left: "-50%",
              width: "35%",
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.55) 50%, transparent)",
              filter: "blur(2px)",
              animation: "oxi-pf-shimmer-sweep 4.5s ease-in-out infinite",
              animationDelay: "1.2s",
            }}
          />
        </div>
      )}

      {/* Avatar inner — clipped circle */}
      <div
        className={`relative h-full w-full overflow-hidden rounded-full ${innerClassName}`}
        style={{
          padding: thickness + (preview ? 1 : 2),
          zIndex: 4,
        }}
      >
        <div
          className="relative h-full w-full overflow-hidden rounded-full"
          style={{
            clipPath: "circle(50% at 50% 50%)",
            boxShadow: !preview
              ? "inset 0 0 0 1.5px rgba(255,255,255,0.15), inset 0 0 12px rgba(0,0,0,0.45)"
              : undefined,
          }}
        >
          {children}
        </div>
      </div>

      {/* Tier badge (opt-in, used in shop) */}
      {showBadgeProp && !preview && frame.tier !== "starter" && (
        <div
          className="pointer-events-none absolute left-1/2 -translate-x-1/2"
          style={{ bottom: -10, zIndex: 9 }}
          aria-hidden
        >
          <div
            className="rounded-full border border-white/40 px-3 py-0.5 shadow-xl"
            style={{
              background:
                frame.tier === "mythic"
                  ? "linear-gradient(90deg,#f59e0b,#ec4899,#a855f7,#22d3ee)"
                  : frame.tier === "legendary"
                    ? "linear-gradient(90deg,#22d3ee,#a855f7,#ec4899)"
                    : frame.tier === "epic"
                      ? "linear-gradient(90deg,#f59e0b,#facc15)"
                      : "linear-gradient(90deg,#0ea5e9,#67e8f9)",
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

import { useNavigate } from "@tanstack/react-router";

type City = {
  id: string;
  slug: string;
  name: string;
  lat: number;
  lng: number;
  chaos_level: number;
  live_count?: number;
};

export type FriendPin = {
  user_id: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
  lat: number;
  lng: number;
  venue_name?: string | null;
};

const W_LNG = 20.26, E_LNG = 29.71;
const N_LAT = 48.27, S_LAT = 43.62;

function project(lat: number, lng: number) {
  const x = ((lng - W_LNG) / (E_LNG - W_LNG)) * 100;
  const y = ((N_LAT - lat) / (N_LAT - S_LAT)) * 100;
  return { x, y };
}

const RO_PATH = "M2,38 L6,28 L10,20 L18,14 L26,11 L34,9 L42,8 L50,9 L58,11 L66,13 L74,16 L82,19 L88,24 L92,30 L94,38 L93,46 L91,54 L88,62 L84,70 L78,78 L70,84 L62,88 L52,90 L42,91 L32,89 L24,85 L18,79 L13,72 L9,64 L6,56 L4,48 Z";

export function RomaniaMap({
  cities,
  friends = [],
  onCityTap,
}: {
  cities: City[];
  friends?: FriendPin[];
  onCityTap?: (c: City) => void;
}) {
  const nav = useNavigate();
  return (
    <div className="relative w-full aspect-[5/4] rounded-2xl overflow-hidden bg-black/60 border border-foreground/10">
      <div className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: "linear-gradient(oklch(0.65 0.30 305 / 15%) 1px, transparent 1px), linear-gradient(90deg, oklch(0.65 0.30 305 / 15%) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }} />

      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="ro-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(0.65 0.30 305 / 25%)" />
            <stop offset="100%" stopColor="oklch(0.7 0.25 200 / 15%)" />
          </linearGradient>
        </defs>
        <path d={RO_PATH} fill="url(#ro-grad)" stroke="oklch(0.7 0.28 305 / 70%)" strokeWidth="0.4" />
        <path d="M4,62 Q22,72 42,70 T82,72 L92,68" stroke="var(--neon-blue)" strokeWidth="0.4" fill="none" opacity="0.55" />
        <path d="M18,32 Q40,44 56,50 T82,42" stroke="var(--neon-purple)" strokeWidth="0.3" fill="none" opacity="0.45" strokeDasharray="1.2 0.8" />
      </svg>

      {cities.map(c => {
        const { x, y } = project(c.lat, c.lng);
        const size = 30 + c.chaos_level * 7;
        return (
          <div key={c.id + "h"} className="absolute pointer-events-none rounded-full"
            style={{
              left: `${x}%`, top: `${y}%`,
              width: size, height: size,
              transform: "translate(-50%, -50%)",
              background: `radial-gradient(circle, var(--neon-crimson) 0%, transparent 65%)`,
              opacity: 0.35, filter: "blur(6px)",
            }} />
        );
      })}

      {cities.map((c, i) => {
        const { x, y } = project(c.lat, c.lng);
        const big = c.chaos_level >= 8;
        return (
          <button key={c.id}
            onClick={() => onCityTap ? onCityTap(c) : nav({ to: "/app/city/$slug", params: { slug: c.slug } })}
            className="absolute group active:scale-95 transition"
            style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)" }}>
            {big && (
              <span className="absolute inset-0 rounded-full pulse-ring"
                style={{ background: "var(--neon-crimson)", animationDelay: `${i * 0.18}s` }} />
            )}
            <span className="relative block rounded-full"
              style={{
                width: big ? 12 : 7, height: big ? 12 : 7,
                background: big ? "var(--neon-crimson)" : "var(--neon-purple)",
                boxShadow: `0 0 10px ${big ? "var(--neon-crimson)" : "var(--neon-purple)"}, 0 0 20px ${big ? "var(--neon-crimson)" : "var(--neon-purple)"}`,
              }} />
            <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 whitespace-nowrap text-[9px] font-display font-bold tracking-wider"
              style={{ color: big ? "var(--neon-crimson)" : "var(--foreground)", textShadow: `0 0 6px ${big ? "var(--neon-crimson)" : "transparent"}` }}>
              {c.name}
            </span>
          </button>
        );
      })}

      {/* Friend pins (avatars) */}
      {friends.map((f) => {
        const { x, y } = project(f.lat, f.lng);
        const initial = (f.handle ?? f.display_name ?? "?")[0]?.toUpperCase();
        return (
          <div key={"f-" + f.user_id} className="absolute z-20 group"
            style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -100%)" }}>
            <div className="relative">
              <div className="h-8 w-8 rounded-full border-2 border-neon-green overflow-hidden bg-background"
                   style={{ boxShadow: "0 0 12px var(--neon-green)" }}>
                {f.avatar_url ? (
                  <img src={f.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center font-display text-xs">{initial}</div>
                )}
              </div>
              <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 rotate-45 bg-neon-green" />
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 whitespace-nowrap font-mono text-[9px] uppercase tracking-widest text-neon-green">
              @{f.handle ?? f.display_name ?? "?"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

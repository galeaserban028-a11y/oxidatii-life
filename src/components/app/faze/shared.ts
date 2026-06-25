// Shared constants, types, and helpers for the FAZE feed components.
// Extracted from src/routes/app.faze.tsx to keep that route file small.

import { useEffect, useState } from "react";

// Bottom-safe inset for sheets above the global tab bar
export const SHEET_BOTTOM = "calc(env(safe-area-inset-bottom) + 5.5rem)";

// Font helpers — unified DM Sans across the app
export const archivo = { letterSpacing: "-0.01em" } as const;
export const hind = {} as const;
export const instrument = { letterSpacing: "-0.02em" } as const;

export type Moment = {
  id: string;
  photo_url: string;
  caption: string | null;
  created_at: string;
  user_id: string;
  venue_id: string;
  media_type?: string | null;
};

export function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - +new Date(iso)) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}z`;
}

export function formatCount(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

export function nextMondayMorning() {
  const now = new Date();
  const d = new Date(now);
  const day = d.getDay();
  const daysUntilMon = (8 - day) % 7 || 7;
  d.setDate(d.getDate() + daysUntilMon);
  d.setHours(9, 0, 0, 0);
  return d;
}

export function useCountdown(target: Date) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  const ms = Math.max(0, +target - now);
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return { d, h, m, s };
}

export function lastWeekendRange() {
  const now = new Date();
  const d = new Date(now);
  const dow = d.getDay();
  const daysSinceSun = dow;
  const lastSun = new Date(d);
  lastSun.setDate(d.getDate() - daysSinceSun);
  lastSun.setHours(23, 59, 59, 999);
  if (dow === 5 || dow === 6 || dow === 0) {
    lastSun.setDate(lastSun.getDate() - 7);
  }
  const lastFri = new Date(lastSun);
  lastFri.setDate(lastSun.getDate() - 2);
  lastFri.setHours(18, 0, 0, 0);
  return { from: lastFri.toISOString(), to: lastSun.toISOString() };
}

// Helpers for venue opening_hours (jsonb).
// Accepted shape: { mon: {open:"18:00", close:"03:00"} | "18:00-03:00" | null, ... }
// Keys: mon,tue,wed,thu,fri,sat,sun. close < open => overnight (rolls to next day).

export const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export const DAY_LABELS: Record<(typeof DAY_KEYS)[number], string> = {
  mon: "Luni", tue: "Marți", wed: "Miercuri", thu: "Joi",
  fri: "Vineri", sat: "Sâmbătă", sun: "Duminică",
};

export type DaySlot = { open: string; close: string } | null;

function parseSlot(v: unknown): DaySlot {
  if (!v) return null;
  if (typeof v === "string") {
    const m = v.match(/^(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})$/);
    return m ? { open: m[1], close: m[2] } : null;
  }
  if (typeof v === "object") {
    const o = v as any;
    if (o.closed) return null;
    if (typeof o.open === "string" && typeof o.close === "string") {
      return { open: o.open, close: o.close };
    }
  }
  return null;
}

export function normalizeHours(raw: any): Record<string, DaySlot> {
  const out: Record<string, DaySlot> = {};
  for (const k of DAY_KEYS) out[k] = parseSlot(raw?.[k]);
  return out;
}

function toMin(hm: string) {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
}

/** Returns { isOpen, closesAt, opensAt, todayKey } evaluated in Europe/Bucharest. */
export function evalOpenNow(raw: any, now = new Date()) {
  const hours = normalizeHours(raw);
  // Day-of-week in Bucharest tz, Mon=0..Sun=6
  const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Bucharest", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false });
  const parts = fmt.formatToParts(now);
  const wd = parts.find(p => p.type === "weekday")?.value ?? "Mon";
  const hh = parts.find(p => p.type === "hour")?.value ?? "00";
  const mm = parts.find(p => p.type === "minute")?.value ?? "00";
  const order = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const todayIdx = order.indexOf(wd);
  const nowMin = toMin(`${hh}:${mm}`);

  const todayKey = DAY_KEYS[todayIdx];
  const yKey = DAY_KEYS[(todayIdx + 6) % 7];
  const today = hours[todayKey];
  const yesterday = hours[yKey];

  // Overnight from yesterday still running?
  if (yesterday) {
    const o = toMin(yesterday.open), c = toMin(yesterday.close);
    if (c <= o && nowMin < c) {
      return { isOpen: true, closesAt: yesterday.close, opensAt: null, todayKey };
    }
  }
  if (today) {
    const o = toMin(today.open), c = toMin(today.close);
    const closeAdj = c <= o ? c + 24 * 60 : c;
    const nowAdj = nowMin;
    if (nowAdj >= o && nowAdj < closeAdj) {
      return { isOpen: true, closesAt: today.close, opensAt: null, todayKey };
    }
    if (nowMin < o) {
      return { isOpen: false, closesAt: null, opensAt: today.open, todayKey };
    }
  }
  // Find next open day
  for (let i = 1; i <= 7; i++) {
    const k = DAY_KEYS[(todayIdx + i) % 7];
    const s = hours[k];
    if (s) return { isOpen: false, closesAt: null, opensAt: `${DAY_LABELS[k]} ${s.open}`, todayKey };
  }
  return { isOpen: false, closesAt: null, opensAt: null, todayKey };
}

export function formatSlot(s: DaySlot) {
  return s ? `${s.open} – ${s.close}` : "Închis";
}

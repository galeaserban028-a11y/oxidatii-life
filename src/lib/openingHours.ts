// Opening hours utilities. Format:
// { mon: { open: "18:00", close: "04:00" } | null, tue: ..., ... }
// close < open => closes after midnight (next day).

export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export const DAYS: { key: DayKey; label: string }[] = [
  { key: "mon", label: "Lu" },
  { key: "tue", label: "Ma" },
  { key: "wed", label: "Mi" },
  { key: "thu", label: "Jo" },
  { key: "fri", label: "Vi" },
  { key: "sat", label: "Sâ" },
  { key: "sun", label: "Du" },
];

export const DAY_KEYS: readonly DayKey[] = ["mon","tue","wed","thu","fri","sat","sun"] as const;
export const DAY_LABELS: Record<DayKey, string> = {
  mon: "Luni", tue: "Marți", wed: "Miercuri", thu: "Joi",
  fri: "Vineri", sat: "Sâmbătă", sun: "Duminică",
};

export type DaySchedule = { open: string; close: string } | null;
export type DaySlot = DaySchedule;
export type OpeningHours = Partial<Record<DayKey, DaySchedule>>;

const JS_TO_KEY: DayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function toMin(t: unknown): number | null {
  if (typeof t !== "string" || !t.includes(":")) return null;
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h)) return null;
  return h * 60 + (Number.isNaN(m) ? 0 : m);
}

function parseSlot(v: unknown): DaySchedule {
  if (!v) return null;
  if (typeof v === "string") {
    const m = v.match(/^(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})$/);
    return m ? { open: m[1], close: m[2] } : null;
  }
  if (typeof v === "object") {
    const o = v as any;
    if (o.closed) return null;
    if (typeof o.open === "string" && typeof o.close === "string") return { open: o.open, close: o.close };
  }
  return null;
}

export function normalizeHours(raw: any): Record<DayKey, DaySchedule> {
  const out = {} as Record<DayKey, DaySchedule>;
  for (const k of DAY_KEYS) out[k] = parseSlot(raw?.[k]);
  return out;
}

export function isOpenNow(oh: OpeningHours | null | undefined, now = new Date()): boolean | null {
  if (!oh) return null;
  const norm = normalizeHours(oh);
  const today = JS_TO_KEY[now.getDay()];
  const yesterday = JS_TO_KEY[(now.getDay() + 6) % 7];
  const mins = now.getHours() * 60 + now.getMinutes();

  const t = norm[today];
  if (t) {
    const o = toMin(t.open), c = toMin(t.close);
    if (o != null && c != null) {
      if (c > o ? mins >= o && mins < c : mins >= o || mins < c) return true;
    }
  }
  const y = norm[yesterday];
  if (y) {
    const o = toMin(y.open), c = toMin(y.close);
    if (o != null && c != null && c <= o && mins < c) return true;
  }
  return false;
}

export function nextOpenLabel(oh: OpeningHours | null | undefined, now = new Date()): string | null {
  if (!oh) return null;
  const norm = normalizeHours(oh);
  for (let i = 0; i < 7; i++) {
    const idx = (now.getDay() + i) % 7;
    const key = JS_TO_KEY[idx];
    const t = norm[key];
    if (!t) continue;
    const openMin = toMin(t.open);
    if (openMin == null) continue;
    const dayLabel = DAYS.find(d => d.key === key)?.label ?? "";
    if (i === 0 && now.getHours() * 60 + now.getMinutes() < openMin) return `azi ${t.open}`;
    if (i > 0) return `${dayLabel} ${t.open}`;
  }
  return null;
}


/** Richer evaluation in Europe/Bucharest tz. */
export function evalOpenNow(raw: any, now = new Date()) {
  const hours = normalizeHours(raw);
  const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Bucharest", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false });
  const parts = fmt.formatToParts(now);
  const wd = parts.find(p => p.type === "weekday")?.value ?? "Mon";
  const hh = parts.find(p => p.type === "hour")?.value ?? "00";
  const mm = parts.find(p => p.type === "minute")?.value ?? "00";
  const order = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const todayIdx = Math.max(0, order.indexOf(wd));
  const nowMin = toMin(`${hh}:${mm}`) ?? 0;
  const todayKey = DAY_KEYS[todayIdx];
  const yKey = DAY_KEYS[(todayIdx + 6) % 7];
  const today = hours[todayKey];
  const yesterday = hours[yKey];

  if (yesterday) {
    const o = toMin(yesterday.open), c = toMin(yesterday.close);
    if (o != null && c != null && c <= o && nowMin < c) return { isOpen: true, closesAt: yesterday.close, opensAt: null as string | null, todayKey };
  }
  if (today) {
    const o = toMin(today.open), c = toMin(today.close);
    if (o != null && c != null) {
      const closeAdj = c <= o ? c + 24 * 60 : c;
      if (nowMin >= o && nowMin < closeAdj) return { isOpen: true, closesAt: today.close, opensAt: null, todayKey };
      if (nowMin < o) return { isOpen: false, closesAt: null, opensAt: today.open, todayKey };
    }
  }
  for (let i = 1; i <= 7; i++) {
    const k = DAY_KEYS[(todayIdx + i) % 7];
    const s = hours[k];
    if (s) return { isOpen: false, closesAt: null, opensAt: `${DAY_LABELS[k]} ${s.open}`, todayKey };
  }
  return { isOpen: false, closesAt: null, opensAt: null, todayKey };
}

export function formatSlot(s: DaySchedule) {
  return s ? `${s.open} – ${s.close}` : "Închis";
}

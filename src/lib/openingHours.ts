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

export type DaySchedule = { open: string; close: string } | null;
export type OpeningHours = Partial<Record<DayKey, DaySchedule>>;

const JS_TO_KEY: DayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function toMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function isOpenNow(oh: OpeningHours | null | undefined, now = new Date()): boolean | null {
  if (!oh) return null;
  const today = JS_TO_KEY[now.getDay()];
  const yesterday = JS_TO_KEY[(now.getDay() + 6) % 7];
  const mins = now.getHours() * 60 + now.getMinutes();

  const t = oh[today];
  if (t) {
    const o = toMin(t.open), c = toMin(t.close);
    if (c > o ? mins >= o && mins < c : mins >= o || mins < c) return true;
  }
  // Check if yesterday's schedule spills past midnight into today
  const y = oh[yesterday];
  if (y) {
    const o = toMin(y.open), c = toMin(y.close);
    if (c <= o && mins < c) return true;
  }
  return false;
}

export function nextOpenLabel(oh: OpeningHours | null | undefined, now = new Date()): string | null {
  if (!oh) return null;
  for (let i = 0; i < 7; i++) {
    const idx = (now.getDay() + i) % 7;
    const key = JS_TO_KEY[idx];
    const t = oh[key];
    if (!t) continue;
    const dayLabel = DAYS.find(d => d.key === key)?.label ?? "";
    if (i === 0 && now.getHours() * 60 + now.getMinutes() < toMin(t.open)) return `azi ${t.open}`;
    if (i > 0) return `${dayLabel} ${t.open}`;
  }
  return null;
}

import { Flame } from "lucide-react";
import { useMemo } from "react";

type Props = {
  current: number;
  longest: number;
  /** YYYY-MM-DD of last week start (Monday) the user scored a streak point. */
  lastStreakWeek?: string | null;
};

function isoWeekMondayUTC(d: Date): Date {
  const dt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = dt.getUTCDay() || 7;
  if (day !== 1) dt.setUTCDate(dt.getUTCDate() - (day - 1));
  return dt;
}

function status(
  current: number,
  lastStreakWeek?: string | null,
): {
  label: string;
  tone: "live" | "risk" | "cold";
  hint: string;
} {
  if (!current) {
    return {
      label: "Start streak",
      tone: "cold",
      hint: "Fă check-in la o locație ca să pornești 🔥",
    };
  }
  const thisMon = isoWeekMondayUTC(new Date()).toISOString().slice(0, 10);
  if (lastStreakWeek === thisMon) {
    return { label: "Live", tone: "live", hint: "Săptămâna asta ești safe. Ține-l aprins!" };
  }
  return {
    label: "La risc",
    tone: "risk",
    hint: "Nu pierde streak-ul — un check-in săptămâna asta și e salvat.",
  };
}

export function StreakHero({ current, longest, lastStreakWeek }: Props) {
  const s = useMemo(() => status(current, lastStreakWeek), [current, lastStreakWeek]);

  // Render last 7 weeks as dots — naive: this week + 6 prior, mark active if current>=index+1
  const dots = Array.from({ length: 7 }, (_, i) => i < Math.min(current, 7));

  const ring =
    s.tone === "live"
      ? "from-[#ff6a00] via-[#ff3d8b] to-[#c724ff]"
      : s.tone === "risk"
        ? "from-[#ffb347] via-[#ff5e62] to-[#c724ff]"
        : "from-white/20 via-white/10 to-white/5";

  const badge =
    s.tone === "live"
      ? "bg-[#ff3d8b]/20 text-[#ffd2e6] border-[#ff3d8b]/40"
      : s.tone === "risk"
        ? "bg-[#ffb347]/15 text-[#ffd9a8] border-[#ffb347]/40"
        : "bg-white/10 text-white/60 border-white/15";

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-5">
      {/* glow */}
      <div
        aria-hidden
        className={`pointer-events-none absolute -top-20 -right-20 size-56 rounded-full blur-3xl opacity-40 bg-gradient-to-br ${ring}`}
      />
      <div className="relative flex items-center gap-4">
        <div
          className={`relative size-20 rounded-full bg-gradient-to-br ${ring} flex items-center justify-center shadow-[0_10px_40px_-10px_rgba(255,61,139,0.6)]`}
        >
          <div className="absolute inset-[3px] rounded-full bg-[#0a0a0a] flex items-center justify-center">
            <Flame
              size={36}
              className={
                s.tone === "live"
                  ? "text-[#ff7a3d] drop-shadow-[0_0_12px_#ff3d8b]"
                  : s.tone === "risk"
                    ? "text-[#ffb347]"
                    : "text-white/40"
              }
              fill={s.tone === "cold" ? "none" : "currentColor"}
            />
          </div>
          {s.tone === "live" && (
            <span className="absolute -bottom-1 -right-1 size-5 rounded-full bg-[#22c55e] ring-2 ring-[#0a0a0a] animate-pulse" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-4xl font-extrabold tracking-tight text-white tabular-nums leading-none">
              {current}
            </div>
            <span className="text-[11px] uppercase tracking-widest text-white/50 mt-2">săpt</span>
            <span
              className={`ml-auto text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-full border ${badge}`}
            >
              {s.label}
            </span>
          </div>
          <div className="text-[12px] text-white/60 mt-1">
            Record: <span className="text-white/90 font-semibold tabular-nums">{longest}</span> săpt
          </div>
        </div>
      </div>

      {/* 7-week tracker */}
      <div className="relative mt-4 flex items-center gap-1.5">
        {dots.map((on, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition ${
              on ? "bg-gradient-to-r from-[#ff6a00] to-[#ff3d8b]" : "bg-white/10"
            }`}
          />
        ))}
      </div>

      <p className="relative mt-3 text-[12px] text-white/70 leading-snug">{s.hint}</p>
    </div>
  );
}

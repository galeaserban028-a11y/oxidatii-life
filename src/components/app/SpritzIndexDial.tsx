import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight } from "lucide-react";

type Signals = {
  checkins_2h: number;
  photos_2h: number;
  proofs_2h: number;
  ratings_2h: number;
  parties_active: number;
};

type IndexPayload = {
  score: number;
  vibe: string;
  emoji: string;
  signals: Signals;
  multiplier: number;
  computed_at: string;
};

type Props = {
  cityId?: string | null;
  cityName?: string;
  /** If true, render the compact homepage variant */
  compact?: boolean;
};

export function SpritzIndexDial({ cityId = null, cityName, compact = false }: Props) {
  const [data, setData] = useState<IndexPayload | null>(null);
  const [displayed, setDisplayed] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch + refresh every 60s
  useEffect(() => {
    let cancelled = false;
    const fetchIndex = async () => {
      const { data: res, error } = await supabase.rpc("get_spritz_index", {
        _city_id: cityId ?? undefined,
      });
      if (!cancelled && !error && res) {
        setData(res as unknown as IndexPayload);
        setLoading(false);
      } else if (!cancelled && error) {
        setLoading(false);
      }
    };
    fetchIndex();
    const id = setInterval(fetchIndex, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [cityId]);

  // Animate score counter
  useEffect(() => {
    if (!data) return;
    const target = data.score;
    const start = displayed;
    const duration = 1200;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplayed(Math.round(start + (target - start) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.score]);

  const score = displayed;
  const hue = 20 + (score / 100) * 40; // 20 (deep orange) → 60 (yellow)
  const ringGradient = `conic-gradient(from -90deg, hsl(${hue} 95% 55%) 0deg, hsl(${
    hue + 20
  } 95% 60%) ${score * 3.6}deg, rgba(255,255,255,0.06) ${score * 3.6}deg, rgba(255,255,255,0.06) 360deg)`;

  const label = cityName ?? "ROMÂNIA";

  if (compact) {
    return (
      <Link
        to="/app/spritz-index"
        className="block relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-orange-500/[0.08] via-pink-500/[0.04] to-transparent backdrop-blur-sm p-5 active:scale-[0.98] transition"
      >
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl pointer-events-none"
          style={{ background: `hsl(${hue} 95% 55% / 0.35)` }} />
        <div className="relative flex items-center gap-5">
          <Dial score={score} ringGradient={ringGradient} hue={hue} size={92} loading={loading} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
              <span className="font-mono text-[9px] font-black uppercase tracking-[0.22em] text-orange-400">
                Spritz Index • Live
              </span>
            </div>
            <h3 className="font-display font-extrabold uppercase tracking-tight text-lg leading-tight truncate">
              {label}
            </h3>
            <p className="text-xs text-white/70 mt-0.5">
              <span className="text-xl mr-1">{data?.emoji ?? "🍹"}</span>
              <span className="font-bold text-white">{data?.vibe ?? "se încarcă"}</span>
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-white/30" />
        </div>
      </Link>
    );
  }

  // Full variant
  return (
    <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-orange-500/[0.10] via-pink-500/[0.05] to-transparent p-7">
      <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full blur-3xl pointer-events-none"
        style={{ background: `hsl(${hue} 95% 55% / 0.35)` }} />
      <div className="relative flex flex-col items-center text-center">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
          <span className="font-mono text-[10px] font-black uppercase tracking-[0.22em] text-orange-400">
            Spritz Index • {label}
          </span>
        </div>
        <Dial score={score} ringGradient={ringGradient} hue={hue} size={180} loading={loading} />
        <p className="mt-5 text-2xl">
          {data?.emoji ?? "🍹"} <span className="font-display font-extrabold uppercase">{data?.vibe ?? "..."}</span>
        </p>
        {data && (
          <div className="grid grid-cols-3 gap-3 mt-6 w-full font-mono text-[10px] text-white/60">
            <Stat label="Check-in" value={data.signals.checkins_2h} />
            <Stat label="Poze" value={data.signals.photos_2h} />
            <Stat label="Petreceri" value={data.signals.parties_active} />
          </div>
        )}
      </div>
    </div>
  );
}

function Dial({
  score,
  ringGradient,
  hue,
  size,
  loading,
}: {
  score: number;
  ringGradient: string;
  hue: number;
  size: number;
  loading: boolean;
}) {
  return (
    <div
      className="relative rounded-full flex items-center justify-center shrink-0"
      style={{
        width: size,
        height: size,
        background: ringGradient,
        boxShadow: `0 0 ${size / 3}px hsl(${hue} 95% 55% / 0.35)`,
      }}
    >
      <div
        className="absolute rounded-full bg-[#070712] flex flex-col items-center justify-center"
        style={{ inset: size * 0.08 }}
      >
        <span
          className="font-display font-black leading-none tracking-tight"
          style={{ fontSize: size * 0.38, color: `hsl(${hue} 95% 65%)` }}
        >
          {loading ? "—" : score}
        </span>
        <span className="font-mono text-[8px] text-white/40 uppercase tracking-[0.2em] mt-1">
          / 100
        </span>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] py-2">
      <div className="text-base font-extrabold text-white">{value}</div>
      <div className="uppercase tracking-widest text-[9px]">{label}</div>
    </div>
  );
}

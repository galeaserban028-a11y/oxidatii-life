import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

type IndexPayload = {
  score: number;
  vibe: string;
  emoji: string;
};

/**
 * Compact, always-visible Spritz Index pill for the global AppHeader.
 * Auto-refreshes every 90s. Tap → /app/spritz-index.
 */
export function HeaderSpritzPill() {
  const [data, setData] = useState<IndexPayload | null>(null);
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const fetchIndex = async () => {
      try {
        const { data: res, error } = await supabase.rpc("get_spritz_index", {
          _city_id: undefined,
        });
        if (!cancelled && !error && res) {
          setData(res as unknown as IndexPayload);
        }
      } catch {
        /* silent */
      }
    };
    fetchIndex();
    const id = setInterval(fetchIndex, 90_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (!data) return;
    const target = data.score;
    const start = displayed;
    const duration = 800;
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

  const score = data ? displayed : null;
  const hue = score !== null ? 20 + (score / 100) * 40 : 30;

  return (
    <Link
      to="/app/spritz-index"
      aria-label="Spritz Index"
      className="group relative flex items-center gap-1.5 h-9 pl-1 pr-2.5 rounded-full border border-white/10 bg-white/[0.04] hover:bg-white/[0.07] active:scale-95 transition-all overflow-hidden"
    >
      {/* glow */}
      <span
        className="absolute inset-0 rounded-full opacity-60 blur-md pointer-events-none"
        style={{ background: `radial-gradient(circle at 20% 50%, hsl(${hue} 95% 55% / 0.35), transparent 70%)` }}
      />
      {/* mini dial */}
      <span
        className="relative flex items-center justify-center w-7 h-7 rounded-full shrink-0"
        style={{
          background: score !== null
            ? `conic-gradient(from -90deg, hsl(${hue} 95% 55%) 0deg, hsl(${hue + 20} 95% 60%) ${score * 3.6}deg, rgba(255,255,255,0.08) ${score * 3.6}deg, rgba(255,255,255,0.08) 360deg)`
            : "rgba(255,255,255,0.08)",
        }}
      >
        <span className="absolute inset-[3px] rounded-full bg-background flex items-center justify-center">
          <span
            className="font-mono font-black text-[10px] leading-none"
            style={{ color: score !== null ? `hsl(${hue} 95% 65%)` : "rgba(255,255,255,0.4)" }}
          >
            {score ?? "—"}
          </span>
        </span>
      </span>
      <span className="relative font-mono text-[9px] font-black uppercase tracking-[0.18em] text-white/80 leading-none">
        <span className="block">SPRITZ</span>
        <span className="block text-white/50 mt-0.5">{data?.vibe ?? "live"}</span>
      </span>
    </Link>
  );
}

import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { TierBadge } from "@/components/biz/TierBadge";
import { LiveEnergyMeter } from "@/components/biz/LiveEnergyMeter";
import { tierConfig } from "@/lib/biz/tiers";
import { Flame, Clock } from "lucide-react";
import { useEffect, useState } from "react";

interface FeaturedRow {
  business_id: string;
  brand_name: string;
  tier: string;
  cover_url: string | null;
  logo_url: string | null;
  venue_id: string | null;
  live_energy: number;
  score: number;
  next_event_at: string | null;
}

function Countdown({ at }: { at: string }) {
  const [, set] = useState(0);
  useEffect(() => {
    const i = setInterval(() => set((n) => n + 1), 30_000);
    return () => clearInterval(i);
  }, []);
  const ms = new Date(at).getTime() - Date.now();
  if (ms <= 0) return <span className="text-xs font-semibold text-foreground">Live acum</span>;
  const h = Math.floor(ms / 3600_000);
  const m = Math.floor((ms % 3600_000) / 60_000);
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-foreground">
      <Clock className="size-3" /> începe în {h > 0 ? `${h}h ` : ""}{m}m
    </span>
  );
}

export function FeaturedTonightStrip({ cityId }: { cityId?: string | null }) {
  const { data } = useQuery({
    queryKey: ["featured-tonight", cityId ?? "global"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_featured_tonight", {
        _city_id: cityId ?? null,
        _limit: 8,
      });
      if (error) throw error;
      return (data ?? []) as FeaturedRow[];
    },
  });

  if (!data?.length) return null;

  return (
    <section className="px-3 pt-2 pb-3">
      <header className="mb-2 flex items-center justify-between px-1">
        <h2 className="flex items-center gap-2 text-base font-black tracking-tight">
          <Flame className="size-4 text-[var(--tier-elite)]" />
          Featured Tonight
        </h2>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Sponsored</span>
      </header>
      <div className="-mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-2">
        {data.map((row) => {
          const t = tierConfig(row.tier);
          return (
            <Link
              key={row.business_id}
              to={row.venue_id ? "/app/venue/$id" : "/app/biz"}
              params={row.venue_id ? { id: row.venue_id } : undefined}
              className={`group relative w-[68%] shrink-0 snap-start overflow-hidden rounded-2xl border bg-card ${t.glowClass}`}
              style={{ borderColor: `color-mix(in oklab, ${t.color} 40%, transparent)` }}
            >
              <div className="relative aspect-[4/5] w-full overflow-hidden">
                {row.cover_url ? (
                  <img
                    src={row.cover_url}
                    alt={row.brand_name}
                    className="absolute inset-0 size-full object-cover transition group-active:scale-[1.02]"
                  />
                ) : (
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `radial-gradient(120% 80% at 50% 0%, color-mix(in oklab, ${t.color} 45%, transparent), transparent), oklch(0.12 0.02 30)`,
                    }}
                  />
                )}
                <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2.5">
                  <TierBadge tier={row.tier} size="xs" />
                  <LiveEnergyMeter value={row.live_energy ?? 0} />
                </div>
                <div className="absolute inset-x-0 bottom-0 space-y-1 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3">
                  <h3 className="line-clamp-1 text-base font-black text-white">{row.brand_name}</h3>
                  {row.next_event_at ? (
                    <Countdown at={row.next_event_at} />
                  ) : (
                    <span className="text-xs font-semibold text-white/80">Deschis acum</span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

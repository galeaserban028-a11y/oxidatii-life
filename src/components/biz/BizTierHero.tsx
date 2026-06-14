import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TierBadge } from "@/components/biz/TierBadge";
import { LiveEnergyMeter } from "@/components/biz/LiveEnergyMeter";
import { tierConfig } from "@/lib/biz/tiers";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Eye, MousePointerClick, Ticket, Users, TrendingUp } from "lucide-react";

interface BusinessLike {
  id: string;
  brand_name: string;
  tier: string | null;
  live_energy: number | null;
  reputation_score: number | null;
  total_reviews: number | null;
  is_exclusive_slot: boolean | null;
}

interface MetricRow {
  metric_date: string;
  profile_views: number;
  map_clicks: number;
  story_views: number;
  event_joins: number;
  offer_claims: number;
  unique_visitors: number;
}

function kpiTotal(rows: MetricRow[] | undefined, key: keyof MetricRow): number {
  if (!rows) return 0;
  return rows.reduce((acc, r) => acc + (Number(r[key]) || 0), 0);
}

export function BizTierHero({ business }: { business: BusinessLike }) {
  const t = tierConfig(business.tier);
  const since = new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10);

  const { data: metrics } = useQuery({
    queryKey: ["biz-metrics-7d", business.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("business_metrics_daily")
        .select("*")
        .eq("business_id", business.id)
        .gte("metric_date", since)
        .order("metric_date", { ascending: false });
      return (data ?? []) as MetricRow[];
    },
  });

  const views = kpiTotal(metrics, "profile_views");
  const clicks = kpiTotal(metrics, "map_clicks");
  const joins = kpiTotal(metrics, "event_joins");
  const claims = kpiTotal(metrics, "offer_claims");
  const visitors = kpiTotal(metrics, "unique_visitors");
  const ctr = views > 0 ? Math.round((clicks / views) * 1000) / 10 : 0;

  const isStarter = (business.tier ?? "starter") === "starter";

  return (
    <section
      className={`relative overflow-hidden rounded-3xl border bg-card/60 p-5 ${t.glowClass}`}
      style={{ borderColor: `color-mix(in oklab, ${t.color} 50%, transparent)` }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full opacity-30 blur-3xl"
        style={{ background: t.color }}
      />
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <TierBadge tier={business.tier} size="md" />
            {business.is_exclusive_slot && (
              <span className="rounded-full bg-[var(--tier-exclusive)]/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[var(--tier-exclusive)]">
                Slot Exclusive
              </span>
            )}
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight">{business.brand_name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t.tagline}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <LiveEnergyMeter value={business.live_energy ?? 0} />
            <span className="rounded-full bg-background/60 px-2 py-0.5 text-xs font-semibold">
              ⭐ {Number(business.reputation_score ?? 0).toFixed(1)} · {business.total_reviews ?? 0} review-uri
            </span>
          </div>
        </div>
        <Link
          to="/app/biz/plans"
          className="inline-flex items-center gap-1 rounded-2xl px-4 py-2 text-sm font-bold uppercase tracking-wider transition"
          style={{
            background: isStarter ? t.color : "transparent",
            color: isStarter ? "oklch(0.15 0.02 30)" : t.color,
            border: isStarter ? "none" : `1px solid ${t.color}`,
          }}
        >
          {isStarter ? "Upgrade" : "Schimbă plan"} <ArrowUpRight className="size-4" />
        </Link>
      </div>

      <div className="relative mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi icon={<Eye className="size-4" />} label="Views" value={views} />
        <Kpi icon={<MousePointerClick className="size-4" />} label="Map clicks" value={clicks} />
        <Kpi icon={<TrendingUp className="size-4" />} label="CTR" value={`${ctr}%`} />
        <Kpi icon={<Users className="size-4" />} label="Vizitatori unici" value={visitors} />
        <Kpi icon={<Ticket className="size-4" />} label="Event joins" value={joins} />
        <Kpi icon={<Ticket className="size-4" />} label="Offers claim" value={claims} />
      </div>
      <p className="relative mt-2 text-[10px] uppercase tracking-widest text-muted-foreground">
        Ultimele 7 zile
      </p>
    </section>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-border/40 bg-background/40 p-3">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-xl font-black tabular-nums">{typeof value === "number" ? value.toLocaleString("ro-RO") : value}</div>
    </div>
  );
}

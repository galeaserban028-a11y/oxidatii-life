import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PremiumCheckoutDialog } from "@/components/PremiumCheckoutDialog";
import { BarChart3, Users, Eye, Sparkles, Megaphone, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/app/biz/dashboard")({
  head: () => ({ meta: [{ title: "Business Dashboard · OXIDAȚII" }] }),
  component: DashboardPage,
});

type Stats = {
  total: number;
  unique: number;
  hourly: { h: number; c: number }[];
  daily: { d: string; c: number }[];
  venue_id: string | null;
};

async function loadActiveSub(userId: string) {
  const { data } = await supabase
    .from("subscriptions")
    .select("status, current_period_end, price_id")
    .eq("user_id", userId)
    .eq("price_id", "biz_dashboard_monthly")
    .in("status", ["active", "trialing"])
    .order("current_period_end", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const end = data.current_period_end ? new Date(data.current_period_end).getTime() : 0;
  if (end && end < Date.now()) return null;
  return data;
}

async function loadBusinesses(userId: string) {
  const { data } = await supabase
    .from("business_accounts")
    .select("id, brand_name, venue_id")
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

async function loadStats(bizId: string): Promise<Stats | null> {
  const { data, error } = await supabase.rpc("get_biz_stats", { _business_id: bizId, _days: 30 });
  if (error) return null;
  return data as Stats;
}

function DashboardPage() {
  const { user } = useAuth();
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const { data: sub, isLoading: subLoading } = useQuery({
    queryKey: ["biz-dashboard-sub", user?.id],
    enabled: !!user,
    queryFn: () => loadActiveSub(user!.id),
  });

  const { data: businesses = [] } = useQuery({
    queryKey: ["biz-dashboard-list", user?.id],
    enabled: !!user && !!sub,
    queryFn: () => loadBusinesses(user!.id),
  });

  const [selectedBiz, setSelectedBiz] = useState<string | null>(null);
  const activeBiz = selectedBiz || businesses[0]?.id || null;

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["biz-stats", activeBiz],
    enabled: !!activeBiz,
    queryFn: () => loadStats(activeBiz!),
  });

  if (!user) {
    return (
      <div className="px-4 pt-10 text-center text-sm text-zinc-400">
        Conectează-te ca să vezi dashboard-ul.
      </div>
    );
  }

  if (subLoading) {
    return <div className="h-32 mx-4 mt-6 rounded-2xl bg-zinc-900/40 animate-pulse" />;
  }

  if (!sub) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-6 pb-24 space-y-6">
        <div
          className="relative rounded-3xl p-6 overflow-hidden border border-white/10"
          style={{
            background:
              "linear-gradient(135deg,#1a0930 0%,#0d0b1e 50%,#1a0930 100%)",
          }}
        >
          <div className="absolute -top-24 -right-24 size-64 rounded-full blur-3xl opacity-40" style={{ background: "#ff3d8b" }} />
          <div className="absolute -bottom-24 -left-24 size-64 rounded-full blur-3xl opacity-30" style={{ background: "#c724ff" }} />
          <div className="relative space-y-4">
            <h1 className="font-display uppercase text-3xl leading-none text-white">
              Vezi cine îți umple localul
            </h1>
            <ul className="space-y-2 text-sm text-white/85">
              <li className="flex gap-2"><Users size={16} className="mt-0.5 shrink-0 text-[#ff3d8b]" /> Vizitatori unici pe 30 zile</li>
              <li className="flex gap-2"><BarChart3 size={16} className="mt-0.5 shrink-0 text-[#00e5ff]" /> Heatmap oră cu oră</li>
              <li className="flex gap-2"><TrendingUp size={16} className="mt-0.5 shrink-0 text-[#ffea00]" /> Trend zilnic + zile de vârf</li>
              <li className="flex gap-2"><Megaphone size={16} className="mt-0.5 shrink-0 text-[#c724ff]" /> Deblochezi Sponsored Reels + campanii boost</li>
            </ul>
            <div className="flex items-baseline gap-1.5 pt-2">
              <div className="font-display text-4xl text-white">99</div>
              <div className="text-white/70 text-sm">RON / lună</div>
            </div>
            <button
              onClick={() => setCheckoutOpen(true)}
              className="w-full py-4 rounded-2xl font-display uppercase text-sm tracking-widest text-black"
              style={{ background: "linear-gradient(90deg,#ffea00,#ff3d8b)" }}
            >
              Activează Dashboard
            </button>
            <p className="text-[11px] text-white/50 text-center">
              Poți anula oricând din setări. Fără termene.
            </p>
          </div>
        </div>
        <PremiumCheckoutDialog
          priceId={checkoutOpen ? "biz_dashboard_monthly" : null}
          title="Business Dashboard"
          open={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          returnUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/app/biz/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`}
        />
      </div>
    );
  }

  if (businesses.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 pt-10 pb-24 text-center space-y-4">
        <div className="text-5xl">🏢</div>
        <h2 className="font-display uppercase text-xl text-white">Fără business încă</h2>
        <p className="text-sm text-zinc-400">Creează un business în pagina Promovare ca să vezi stats.</p>
        <Link
          to="/app/biz"
          className="inline-block mt-2 px-5 py-3 rounded-2xl font-display uppercase text-[11px] tracking-widest text-white"
          style={{ background: "var(--gradient-chaos)" }}
        >
          Mergi la Promovare
        </Link>
      </div>
    );
  }

  const maxHour = Math.max(1, ...(stats?.hourly ?? []).map((h) => h.c));
  const hourMap = new Map((stats?.hourly ?? []).map((h) => [h.h, h.c]));

  return (
    <div className="max-w-3xl mx-auto px-4 pt-6 pb-24 space-y-5">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display uppercase text-xl text-white">Dashboard</h1>
          <p className="text-[11px] font-mono uppercase tracking-widest text-emerald-400">
            ● Abonament activ
          </p>
        </div>
        <select
          value={activeBiz ?? ""}
          onChange={(e) => setSelectedBiz(e.target.value)}
          className="bg-zinc-900/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
        >
          {businesses.map((b: any) => (
            <option key={b.id} value={b.id}>
              {b.brand_name}
            </option>
          ))}
        </select>
      </header>

      {statsLoading ? (
        <div className="h-40 rounded-2xl bg-zinc-900/40 animate-pulse" />
      ) : !stats?.venue_id ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-zinc-900/30 p-6 text-center space-y-2">
          <p className="text-sm text-zinc-300">Acest business nu are venue asociat.</p>
          <p className="text-[11px] text-zinc-500">
            Leagă-l de un venue ca să vezi vizitatori și heatmap.
          </p>
        </div>
      ) : (
        <>
          {/* KPI Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-zinc-900/50 border border-white/10 p-4">
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                <Eye size={11} /> vizite · 30 zile
              </div>
              <div className="font-display text-3xl text-white mt-1">{stats.total}</div>
            </div>
            <div className="rounded-2xl bg-zinc-900/50 border border-white/10 p-4">
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                <Users size={11} /> clienți unici
              </div>
              <div className="font-display text-3xl text-white mt-1">{stats.unique}</div>
            </div>
          </div>

          {/* Hourly heatmap */}
          <div className="rounded-2xl bg-zinc-900/50 border border-white/10 p-4">
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-3">
              <BarChart3 size={11} /> heatmap orar (Europa/București)
            </div>
            <div className="grid grid-cols-12 gap-1.5">
              {Array.from({ length: 24 }, (_, h) => {
                const c = hourMap.get(h) ?? 0;
                const pct = c / maxHour;
                return (
                  <div key={h} className="flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-md"
                      style={{
                        height: `${8 + pct * 56}px`,
                        background: `linear-gradient(180deg,#ff3d8b ${pct * 100}%,#2a1830 ${pct * 100}%)`,
                        opacity: 0.3 + pct * 0.7,
                      }}
                      title={`${h}:00 — ${c} vizite`}
                    />
                    <div className="text-[9px] font-mono text-zinc-600">{h}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Daily trend */}
          <div className="rounded-2xl bg-zinc-900/50 border border-white/10 p-4">
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-3">
              <TrendingUp size={11} /> ultimele zile
            </div>
            {(stats.daily ?? []).length === 0 ? (
              <p className="text-xs text-zinc-500">Fără date în ultimele 30 zile.</p>
            ) : (
              <div className="space-y-1.5">
                {[...(stats.daily ?? [])].slice(-7).reverse().map((d) => {
                  const max = Math.max(1, ...(stats.daily ?? []).map((x) => x.c));
                  const pct = (d.c / max) * 100;
                  return (
                    <div key={d.d} className="flex items-center gap-2 text-xs">
                      <div className="w-16 font-mono text-zinc-500">{d.d.slice(5)}</div>
                      <div className="flex-1 h-5 rounded bg-white/5 overflow-hidden">
                        <div
                          className="h-full"
                          style={{ width: `${pct}%`, background: "linear-gradient(90deg,#00e5ff,#c724ff)" }}
                        />
                      </div>
                      <div className="w-8 text-right text-zinc-300">{d.c}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/app/biz"
              className="rounded-2xl p-4 text-center border border-white/10 bg-gradient-to-br from-[#ff3d8b]/20 to-[#c724ff]/10 text-white"
            >
              <Megaphone size={20} className="mx-auto mb-1 text-[#ff3d8b]" />
              <div className="font-display uppercase text-xs tracking-widest">Promovare</div>
              <div className="text-[10px] text-white/60">boost feed & reels</div>
            </Link>
            <Link
              to="/app/biz/exclusive"
              className="rounded-2xl p-4 text-center border border-white/10 bg-gradient-to-br from-[#ffea00]/20 to-[#ff3d8b]/10 text-white"
            >
              <Sparkles size={20} className="mx-auto mb-1 text-[#ffea00]" />
              <div className="font-display uppercase text-xs tracking-widest">Exclusiv</div>
              <div className="text-[10px] text-white/60">slot premium/oraș</div>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PremiumCheckoutDialog } from "@/components/PremiumCheckoutDialog";
import {
  BarChart3,
  Users,
  Eye,
  Sparkles,
  Megaphone,
  TrendingUp,
  ArrowLeft,
} from "lucide-react";

export const Route = createFileRoute("/app/biz/dashboard")({
  head: () => ({ meta: [{ title: "Business Dashboard · OXIDAȚII" }] }),
  component: DashboardPage,
});

const ARCHIVO = { fontFamily: "'Archivo Black', sans-serif" } as const;

function BackBtn() {
  return (
    <Link
      to="/app/biz"
      className="inline-flex items-center gap-1.5 rounded-full border border-[#c9a84c]/30 bg-[#052419]/60 px-3 py-1.5 font-[Hind] text-[10px] uppercase tracking-[0.24em] text-[#c9a84c] hover:bg-[#c9a84c]/10 transition"
    >
      <ArrowLeft size={12} /> Înapoi
    </Link>
  );
}

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
      <div className="min-h-screen bg-[#03130d] text-white px-4 pt-10 text-center font-[Hind] text-sm text-[#c9a84c]/70">
        Conectează-te ca să vezi dashboard-ul.
      </div>
    );
  }

  if (subLoading) {
    return (
      <div className="min-h-screen bg-[#03130d] px-4 pt-6">
        <div className="h-32 mx-auto max-w-lg rounded-2xl border border-[#c9a84c]/10 bg-[#052419]/40 animate-pulse" />
      </div>
    );
  }

  if (!sub) {
    return (
      <div className="min-h-screen bg-[#03130d] text-white">
        <div className="max-w-lg mx-auto px-4 pt-6 pb-24 space-y-5">
          <BackBtn />
          <div className="relative overflow-hidden rounded-3xl border border-[#c9a84c]/25 bg-gradient-to-b from-[#052419]/80 to-[#03130d]/60 p-7">
            <div className="absolute -top-24 -right-24 size-64 rounded-full blur-3xl opacity-30 bg-[#c9a84c]" />
            <div className="absolute -bottom-24 -left-24 size-64 rounded-full blur-3xl opacity-20 bg-[#0d7a5f]" />
            <div className="relative space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#c9a84c]/40 bg-[#c9a84c]/5 px-3 py-1.5">
                <span className="size-1.5 rounded-full bg-[#c9a84c] animate-pulse" />
                <span className="font-[Hind] text-[10px] uppercase tracking-[0.28em] text-[#c9a84c]">
                  Analytics · Lunar
                </span>
              </div>
              <h1
                className="text-3xl leading-[0.95] text-white"
                style={{ ...ARCHIVO, letterSpacing: "-0.02em" }}
              >
                Vezi cine îți umple <span className="text-[#c9a84c]">localul.</span>
              </h1>
              <ul className="space-y-2.5 font-[Hind] text-sm text-white/85">
                <li className="flex gap-2.5"><Users size={16} className="mt-0.5 shrink-0 text-[#c9a84c]" /> Vizitatori unici pe 30 zile</li>
                <li className="flex gap-2.5"><BarChart3 size={16} className="mt-0.5 shrink-0 text-[#c9a84c]" /> Heatmap oră cu oră</li>
                <li className="flex gap-2.5"><TrendingUp size={16} className="mt-0.5 shrink-0 text-[#c9a84c]" /> Trend zilnic + zile de vârf</li>
                <li className="flex gap-2.5"><Megaphone size={16} className="mt-0.5 shrink-0 text-[#c9a84c]" /> Deblochezi Sponsored Reels + boost</li>
              </ul>
              <div className="flex items-baseline gap-2 pt-1">
                <div className="text-4xl text-[#c9a84c]" style={ARCHIVO}>99</div>
                <div className="font-[Hind] text-sm text-white/60 uppercase tracking-widest">RON / lună</div>
              </div>
              <button
                onClick={() => setCheckoutOpen(true)}
                className="w-full rounded-2xl bg-[#c9a84c] py-4 font-[Hind] font-bold uppercase tracking-[0.16em] text-sm text-[#03130d] shadow-[0_16px_40px_-12px_rgba(201,168,76,0.6)] hover:scale-[1.01] transition"
              >
                Activează Dashboard
              </button>
              <p className="font-[Hind] text-[11px] text-white/50 text-center">
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
      </div>
    );
  }

  if (businesses.length === 0) {
    return (
      <div className="min-h-screen bg-[#03130d] text-white">
        <div className="max-w-md mx-auto px-4 pt-6 pb-24 space-y-5">
          <BackBtn />
          <div className="rounded-3xl border border-[#c9a84c]/20 bg-[#052419]/40 p-8 text-center space-y-4">
            <div className="text-5xl">🏢</div>
            <h2 className="text-xl text-white" style={ARCHIVO}>Fără business încă</h2>
            <p className="font-[Hind] text-sm text-white/60">
              Creează un business în pagina Promovare ca să vezi stats.
            </p>
            <Link
              to="/app/biz"
              className="inline-block mt-2 rounded-2xl bg-[#c9a84c] px-6 py-3.5 font-[Hind] font-bold uppercase tracking-[0.14em] text-xs text-[#03130d] shadow-[0_12px_30px_-10px_rgba(201,168,76,0.6)]"
            >
              Mergi la Promovare
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const maxHour = Math.max(1, ...(stats?.hourly ?? []).map((h) => h.c));
  const hourMap = new Map((stats?.hourly ?? []).map((h) => [h.h, h.c]));

  return (
    <div className="min-h-screen bg-[#03130d] text-white">
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-24 space-y-5">
        <BackBtn />

        <header className="flex items-center justify-between gap-3 border-b border-[#c9a84c]/15 pb-4">
          <div>
            <div className="font-[Hind] text-[10px] uppercase tracking-[0.28em] text-[#c9a84c]/80 mb-1">
              Business Dashboard
            </div>
            <h1 className="text-2xl text-white leading-none" style={{ ...ARCHIVO, letterSpacing: "-0.02em" }}>
              Panou <span className="text-[#c9a84c]">Analytics</span>
            </h1>
            <p className="mt-1.5 flex items-center gap-1.5 font-[Hind] text-[10px] uppercase tracking-[0.24em] text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" /> Abonament activ
            </p>
          </div>
          <select
            value={activeBiz ?? ""}
            onChange={(e) => setSelectedBiz(e.target.value)}
            className="bg-[#052419]/60 border border-[#c9a84c]/30 rounded-xl px-3 py-2 font-[Hind] text-sm text-white focus:outline-none focus:border-[#c9a84c]"
          >
            {businesses.map((b: any) => (
              <option key={b.id} value={b.id} className="bg-[#03130d]">
                {b.brand_name}
              </option>
            ))}
          </select>
        </header>

        {statsLoading ? (
          <div className="h-40 rounded-2xl border border-[#c9a84c]/10 bg-[#052419]/40 animate-pulse" />
        ) : !stats?.venue_id ? (
          <div className="rounded-2xl border border-dashed border-[#c9a84c]/25 bg-[#052419]/30 p-6 text-center space-y-2">
            <p className="font-[Hind] text-sm text-white/85">Acest business nu are venue asociat.</p>
            <p className="font-[Hind] text-[11px] text-white/50">
              Leagă-l de un venue ca să vezi vizitatori și heatmap.
            </p>
          </div>
        ) : (
          <>
            {/* KPI Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-[#c9a84c]/15 bg-[#052419]/50 p-4">
                <div className="flex items-center gap-2 font-[Hind] text-[10px] uppercase tracking-[0.24em] text-[#c9a84c]/80">
                  <Eye size={11} /> vizite · 30z
                </div>
                <div className="text-3xl text-white mt-1.5" style={ARCHIVO}>{stats.total}</div>
              </div>
              <div className="rounded-2xl border border-[#c9a84c]/15 bg-[#052419]/50 p-4">
                <div className="flex items-center gap-2 font-[Hind] text-[10px] uppercase tracking-[0.24em] text-[#c9a84c]/80">
                  <Users size={11} /> unici
                </div>
                <div className="text-3xl text-white mt-1.5" style={ARCHIVO}>{stats.unique}</div>
              </div>
            </div>

            {/* Hourly heatmap */}
            <div className="rounded-2xl border border-[#c9a84c]/15 bg-[#052419]/50 p-4">
              <div className="flex items-center gap-2 font-[Hind] text-[10px] uppercase tracking-[0.24em] text-[#c9a84c]/80 mb-3">
                <BarChart3 size={11} /> heatmap orar · Europa/București
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
                          background: `linear-gradient(180deg,#c9a84c ${pct * 100}%,#052419 ${pct * 100}%)`,
                          opacity: 0.3 + pct * 0.7,
                        }}
                        title={`${h}:00 — ${c} vizite`}
                      />
                      <div className="font-[Hind] text-[9px] text-white/40">{h}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Daily trend */}
            <div className="rounded-2xl border border-[#c9a84c]/15 bg-[#052419]/50 p-4">
              <div className="flex items-center gap-2 font-[Hind] text-[10px] uppercase tracking-[0.24em] text-[#c9a84c]/80 mb-3">
                <TrendingUp size={11} /> ultimele zile
              </div>
              {(stats.daily ?? []).length === 0 ? (
                <p className="font-[Hind] text-xs text-white/50">Fără date în ultimele 30 zile.</p>
              ) : (
                <div className="space-y-1.5">
                  {[...(stats.daily ?? [])].slice(-7).reverse().map((d) => {
                    const max = Math.max(1, ...(stats.daily ?? []).map((x) => x.c));
                    const pct = (d.c / max) * 100;
                    return (
                      <div key={d.d} className="flex items-center gap-2 font-[Hind] text-xs">
                        <div className="w-16 text-white/50">{d.d.slice(5)}</div>
                        <div className="flex-1 h-5 rounded bg-white/5 overflow-hidden">
                          <div
                            className="h-full"
                            style={{ width: `${pct}%`, background: "linear-gradient(90deg,#0d7a5f,#c9a84c)" }}
                          />
                        </div>
                        <div className="w-8 text-right text-white/85">{d.c}</div>
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
                className="rounded-2xl border border-[#c9a84c]/25 bg-gradient-to-br from-[#0d7a5f]/25 to-transparent p-4 text-center transition hover:border-[#c9a84c]/50"
              >
                <Megaphone size={20} className="mx-auto mb-1.5 text-[#c9a84c]" />
                <div className="font-[Hind] uppercase text-xs tracking-[0.18em] text-white" style={ARCHIVO}>Promovare</div>
                <div className="font-[Hind] text-[10px] text-white/55 mt-0.5">boost feed & reels</div>
              </Link>
              <Link
                to="/app/biz/exclusive"
                className="rounded-2xl border border-[#c9a84c]/25 bg-gradient-to-br from-[#c9a84c]/20 to-transparent p-4 text-center transition hover:border-[#c9a84c]/50"
              >
                <Sparkles size={20} className="mx-auto mb-1.5 text-[#c9a84c]" />
                <div className="font-[Hind] uppercase text-xs tracking-[0.18em] text-white" style={ARCHIVO}>Exclusiv</div>
                <div className="font-[Hind] text-[10px] text-white/55 mt-0.5">slot premium/oraș</div>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

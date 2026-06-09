import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Eye, Users, Star, MessageSquare, Calendar, Activity, BarChart3, Sparkles,
  Megaphone, Wallet, Plus, Pencil, Trash2, Pause, Play, Copy, TrendingUp,
  Clock, ShieldCheck, Info,
} from "lucide-react";

type Business = any;
type Campaign = any;
type Party = any;

type Props = {
  business: Business;
  campaigns: Campaign[];
  parties: Party[];
  onTopup: () => void;
  onNewCampaign: () => void;
  onEditCampaign: (c: Campaign) => void;
  onToggleCampaign: (c: Campaign) => void;
  onDeleteCampaign: (c: Campaign) => void;
  onDuplicateCampaign: (c: Campaign) => void;
};

const ron = (c: number) => (c / 100).toFixed(2);
const fmt = (n: number) => n.toLocaleString("ro-RO");

/* ------------------------------------------------------------------ */
/*  Real data loader                                                  */
/* ------------------------------------------------------------------ */
async function loadCommandData(businessId: string, ownerId: string) {
  const since7 = new Date(Date.now() - 7 * 86400_000).toISOString();
  const since14 = new Date(Date.now() - 14 * 86400_000).toISOString();

  const [
    { data: reviews },
    { data: recentReviews },
    { count: followers },
    { count: followersPrev },
    { data: campaignsAll },
    { data: events7 },
    { data: events14 },
    { data: offers },
  ] = await Promise.all([
    supabase.from("business_reviews").select("rating, created_at, comment")
      .eq("business_id", businessId).order("created_at", { ascending: false }).limit(20),
    supabase.from("business_reviews").select("rating, comment, created_at, reviewer_id")
      .eq("business_id", businessId).gte("created_at", since7)
      .order("created_at", { ascending: false }).limit(5),
    supabase.from("follows").select("*", { count: "exact", head: true })
      .eq("following_id", ownerId),
    supabase.from("follows").select("*", { count: "exact", head: true })
      .eq("following_id", ownerId).lt("created_at", since7),
    supabase.from("campaigns").select("id").eq("business_id", businessId),
    supabase.from("campaign_events").select("event_type, cost_cents, created_at, campaign_id")
      .gte("created_at", since7).in(
        "campaign_id",
        (await supabase.from("campaigns").select("id").eq("business_id", businessId))
          .data?.map((c) => c.id) ?? ["00000000-0000-0000-0000-000000000000"],
      ).order("created_at", { ascending: false }).limit(200),
    supabase.from("campaign_events").select("event_type, created_at, campaign_id")
      .gte("created_at", since14).lt("created_at", since7).in(
        "campaign_id",
        (await supabase.from("campaigns").select("id").eq("business_id", businessId))
          .data?.map((c) => c.id) ?? ["00000000-0000-0000-0000-000000000000"],
      ).limit(500),
    supabase.from("business_offers").select("id, title, redemptions, created_at")
      .eq("business_id", businessId).order("created_at", { ascending: false }).limit(10),
  ]);

  return {
    reviews: reviews ?? [],
    recentReviews: recentReviews ?? [],
    followers: followers ?? 0,
    followersPrev: followersPrev ?? 0,
    campaignIds: campaignsAll?.map((c) => c.id) ?? [],
    events7: events7 ?? [],
    events14: events14 ?? [],
    offers: offers ?? [],
  };
}

/* ------------------------------------------------------------------ */
/*  Section primitives                                                */
/* ------------------------------------------------------------------ */
function SectionHeader({ icon: Icon, label, hint }: { icon: any; label: string; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 mb-3">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br from-sunset-orange/20 to-sunset-magenta/20 border border-white/5">
          <Icon size={13} className="text-sunset-amber" />
        </div>
        <div className="font-display uppercase text-[13px] tracking-wide">{label}</div>
      </div>
      {hint && (
        <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-zinc-500">{hint}</span>
      )}
    </div>
  );
}

function GlassCard({ children, className = "" }: { children: any; className?: string }) {
  return (
    <div
      className={`relative rounded-2xl border border-white/[0.06] bg-zinc-950/60 backdrop-blur-xl overflow-hidden ${className}`}
      style={{ boxShadow: "0 1px 0 0 rgba(255,255,255,0.04) inset" }}
    >
      {children}
    </div>
  );
}

function StatTile({
  label, value, sub, accent = "amber",
}: { label: string; value: string | number; sub?: string; accent?: "amber" | "orange" | "magenta" | "muted" }) {
  const color =
    accent === "orange"  ? "text-sunset-orange"  :
    accent === "magenta" ? "text-sunset-magenta" :
    accent === "muted"   ? "text-zinc-300"        :
                           "text-sunset-amber";
  return (
    <div className="rounded-xl bg-zinc-900/40 border border-white/5 p-3">
      <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-zinc-500">{label}</div>
      <div className={`mt-1 font-display text-2xl leading-none tabular-nums ${color}`}>{value}</div>
      {sub && <div className="mt-1 text-[10px] text-zinc-500">{sub}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Command Center                                               */
/* ------------------------------------------------------------------ */
export function BizCommandCenter({
  business, campaigns, parties,
  onTopup, onNewCampaign, onEditCampaign, onToggleCampaign, onDeleteCampaign, onDuplicateCampaign,
}: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["biz-command", business.id, business.owner_user_id],
    queryFn: () => loadCommandData(business.id, business.owner_user_id),
    staleTime: 30_000,
  });

  // Aggregates from real data --------------------------------------
  const profileViews   = business.total_visits ?? 0;
  const reviewCount    = business.total_reviews ?? 0;
  const rating         = Number(business.reputation_score ?? 0);
  const followers      = data?.followers ?? 0;
  const followersGain  = followers - (data?.followersPrev ?? 0);

  const upcomingEvents = useMemo(
    () => parties.filter((p) => new Date(p.starts_at).getTime() > Date.now() - 86400_000)
                  .sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at)),
    [parties],
  );

  // Visibility breakdown (real campaign_events 7d) -----------------
  const visibility = useMemo(() => {
    const map = { discover: 0, map: 0, search: 0, direct: 0, other: 0 };
    for (const e of data?.events7 ?? []) {
      const t = (e.event_type || "").toLowerCase();
      if (t.includes("discover") || t === "feed_view" || t === "feed_impression") map.discover++;
      else if (t.includes("map")) map.map++;
      else if (t.includes("search")) map.search++;
      else if (t.includes("profile") || t.includes("direct")) map.direct++;
      else map.other++;
    }
    return map;
  }, [data?.events7]);

  const liveActivity = useMemo(() => {
    return (data?.events7 ?? []).slice(0, 8).map((e: any) => ({
      type: e.event_type,
      when: e.created_at,
    }));
  }, [data?.events7]);

  // Reputation: response rate currently not tracked. Show profile completeness instead.
  const completeness = useMemo(() => {
    const fields = [
      business.brand_name, business.description, business.logo_url, business.cover_url,
      business.address, business.contact_email, business.contact_phone, business.website,
      business.city_id, business.instagram_handle,
    ];
    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  }, [business]);

  // AI-style insights from real data only --------------------------
  const insights = useMemo(() => {
    const out: string[] = [];
    if (followersGain > 0) out.push(`+${followersGain} urmăritori noi în ultimele 7 zile.`);
    const ev7 = data?.events7?.length ?? 0;
    const ev14 = data?.events14?.length ?? 0;
    if (ev14 > 0) {
      const delta = Math.round(((ev7 - ev14) / Math.max(ev14, 1)) * 100);
      if (delta !== 0) out.push(`Interacțiunile pe campanii ${delta > 0 ? "au crescut" : "au scăzut"} cu ${Math.abs(delta)}% față de săptămâna trecută.`);
    }
    if (completeness < 70) out.push(`Profilul este completat în proporție de ${completeness}%. Completează datele lipsă pentru vizibilitate mai bună.`);
    if (upcomingEvents.length === 0) out.push("Nu ai niciun eveniment viitor publicat.");
    if (rating > 0 && reviewCount >= 3) out.push(`Reputație curentă: ${rating.toFixed(2)} din 5, pe baza ${reviewCount} recenzii.`);
    if (out.length === 0) out.push("Încă nu avem suficiente date ca să generăm recomandări utile.");
    return out;
  }, [followersGain, data, completeness, upcomingEvents.length, rating, reviewCount]);

  const totalSpent       = campaigns.reduce((s, c) => s + (c.spent_cents || 0), 0);
  const totalBudget      = campaigns.reduce((s, c) => s + (c.budget_cents || 0), 0);
  const totalImpressions = campaigns.reduce((s, c) => s + (c.impressions || 0), 0);
  const totalClicks      = campaigns.reduce((s, c) => s + (c.clicks || 0), 0);
  const activeCount      = campaigns.filter((c) => c.status === "active").length;

  return (
    <div className="space-y-5">
      {/* ============== 1. OVERVIEW ============== */}
      <GlassCard className="p-4">
        <SectionHeader icon={BarChart3} label="Privire de ansamblu" hint="Ultimele 7 zile" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <StatTile label="Vizualizări profil" value={fmt(profileViews)} accent="amber" />
          <StatTile label="Urmăritori"        value={fmt(followers)}    sub={followersGain >= 0 ? `+${followersGain} săpt.` : `${followersGain} săpt.`} accent="orange" />
          <StatTile label="Recenzii"          value={fmt(reviewCount)}  sub={rating ? `${rating.toFixed(2)}★` : "—"} accent="magenta" />
          <StatTile label="Evenimente active" value={upcomingEvents.length} accent="amber" />
          <StatTile label="Campanii active"   value={activeCount}        accent="orange" />
          <StatTile label="Ofertă activă"     value={(data?.offers?.length ?? 0)} accent="magenta" />
        </div>
        <p className="mt-3 text-[10px] text-zinc-500 flex items-start gap-1.5">
          <Info size={10} className="mt-[2px] flex-shrink-0" />
          Cifre exacte din baza de date. Nimic estimat, nimic promis.
        </p>
      </GlassCard>

      {/* ============== 2. LIVE ACTIVITY ============== */}
      <GlassCard className="p-4">
        <SectionHeader icon={Activity} label="Activitate live" hint="7 zile" />
        {isLoading ? (
          <div className="h-20 rounded-lg bg-white/[0.02] animate-pulse" />
        ) : liveActivity.length === 0 ? (
          <div className="text-[11px] text-zinc-500 py-4 text-center">Nicio interacțiune înregistrată pe campanii încă.</div>
        ) : (
          <ul className="divide-y divide-white/5">
            {liveActivity.map((a, i) => (
              <li key={i} className="py-2 flex items-center justify-between gap-3 text-[11px]">
                <span className="text-zinc-300 truncate">{prettyEvent(a.type)}</span>
                <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-500 whitespace-nowrap">
                  {timeAgo(a.when)}
                </span>
              </li>
            ))}
          </ul>
        )}
        {data?.recentReviews && data.recentReviews.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
            <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-zinc-500">Recenzii noi</div>
            {data.recentReviews.map((r: any, i: number) => (
              <div key={i} className="flex items-start gap-2 text-[11px]">
                <Star size={11} className="text-sunset-amber mt-[2px] fill-current" />
                <div className="flex-1 min-w-0">
                  <div className="text-zinc-300">{r.rating}★ {r.comment ? <span className="text-zinc-400">— "{r.comment.slice(0, 80)}"</span> : null}</div>
                  <div className="text-[9px] text-zinc-500">{timeAgo(r.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* ============== 3. EVENTS MANAGER ============== */}
      <GlassCard className="p-4">
        <SectionHeader icon={Calendar} label="Manager evenimente" hint={`${upcomingEvents.length} viitoare`} />
        {upcomingEvents.length === 0 ? (
          <div className="text-[11px] text-zinc-500 py-4 text-center">
            Niciun eveniment viitor. Publică unul din pagina <span className="text-sunset-amber">Faze</span>.
          </div>
        ) : (
          <ul className="space-y-2">
            {upcomingEvents.slice(0, 6).map((p: any) => {
              const linked = campaigns.find((c) => c.party_id === p.id);
              return (
                <li key={p.id} className="rounded-xl bg-zinc-900/40 border border-white/5 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] truncate">{p.title}</div>
                      <div className="font-mono text-[9px] uppercase tracking-widest text-zinc-500 truncate">
                        {new Date(p.starts_at).toLocaleString("ro-RO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        {p.location_text ? ` · ${p.location_text}` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {linked ? (
                        <button onClick={() => onEditCampaign(linked)}
                          className="text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-md border border-sunset-amber/40 text-sunset-amber">
                          Promovat
                        </button>
                      ) : (
                        <button onClick={onNewCampaign}
                          className="text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-md border border-white/10 text-zinc-300 hover:border-sunset-amber hover:text-sunset-amber">
                          Promovează
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </GlassCard>

      {/* ============== 4. VISIBILITY ANALYTICS ============== */}
      <GlassCard className="p-4">
        <SectionHeader icon={Eye} label="Vizibilitate" hint="Surse de trafic · 7 zile" />
        <VisibilityBars data={visibility} />
        <p className="mt-3 text-[10px] text-zinc-500">
          Doar evenimente reale înregistrate pe campaniile tale. Sursele apar pe măsură ce campaniile rulează.
        </p>
      </GlassCard>

      {/* ============== 5. REPUTATION CENTER ============== */}
      <GlassCard className="p-4">
        <SectionHeader icon={ShieldCheck} label="Reputație" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <StatTile label="Rating mediu" value={rating ? rating.toFixed(2) : "—"} sub={rating ? "din 5" : "fără date"} accent="amber" />
          <StatTile label="Recenzii"     value={fmt(reviewCount)} accent="orange" />
          <StatTile label="Completitudine profil" value={`${completeness}%`} accent="magenta" />
          <StatTile label="Verificat"    value={business.verified ? "DA" : "NU"} accent={business.verified ? "amber" : "muted"} />
        </div>
        {!business.verified && (
          <div className="mt-3 text-[10px] text-zinc-500">
            Contul nu este verificat. Verificarea crește încrederea utilizatorilor.
          </div>
        )}
      </GlassCard>

      {/* ============== 6. AI INSIGHTS ============== */}
      <GlassCard className="p-4">
        <SectionHeader icon={Sparkles} label="Recomandări inteligente" hint="bazat doar pe date reale" />
        <ul className="space-y-2">
          {insights.map((s, i) => (
            <li key={i} className="flex items-start gap-2 text-[12px] text-zinc-300">
              <TrendingUp size={12} className="text-sunset-amber mt-[3px] flex-shrink-0" />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </GlassCard>

      {/* ============== 7. PROMOTION CENTER (secondary) ============== */}
      <GlassCard className="p-4">
        <SectionHeader icon={Megaphone} label="Promovare" hint="opțional" />
        <p className="text-[11px] text-zinc-400 leading-relaxed">
          Promovarea crește vizibilitatea în aplicație. Rezultatele depind de comportamentul utilizatorilor. Nu garantăm vânzări sau clienți.
        </p>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <StatTile label="Buget alocat" value={`${ron(totalBudget)} RON`} accent="orange" />
          <StatTile label="Cheltuit"     value={`${ron(totalSpent)} RON`}  accent="amber" />
          <StatTile label="Afișări"      value={fmt(totalImpressions)}     accent="magenta" />
          <StatTile label="Click-uri"    value={fmt(totalClicks)}          sub={totalImpressions ? `${((totalClicks/totalImpressions)*100).toFixed(1)}% CTR` : undefined} accent="amber" />
        </div>

        <div className="mt-4 flex items-center justify-between rounded-xl bg-zinc-900/40 border border-white/5 p-3">
          <div className="flex items-center gap-2">
            <Wallet size={14} className="text-sunset-amber" />
            <div>
              <div className="text-[11px] text-zinc-300">Sold portofel</div>
              <div className="font-display text-lg leading-none tabular-nums">{ron(business.wallet_balance_cents ?? 0)} <span className="text-[10px] text-zinc-500">RON</span></div>
            </div>
          </div>
          <button onClick={onTopup}
            className="text-[10px] font-mono uppercase tracking-widest px-3 py-2 rounded-md border border-sunset-amber/40 text-sunset-amber hover:bg-sunset-amber/10">
            Încarcă
          </button>
        </div>

        <button onClick={onNewCampaign}
          className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-white font-display uppercase text-[11px] tracking-widest"
          style={{ background: "var(--gradient-sunset)" }}>
          <Plus size={13} /> Campanie nouă
        </button>

        {campaigns.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-zinc-500">
              Campanii ({campaigns.length} · {activeCount} active)
            </div>
            {campaigns.map((c) => {
              const pct = c.budget_cents ? Math.min(100, (c.spent_cents / c.budget_cents) * 100) : 0;
              return (
                <div key={c.id} className="rounded-xl bg-zinc-900/40 border border-white/5 overflow-hidden">
                  <div className="flex items-center justify-between gap-2 p-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] truncate">{c.title}</div>
                      <div className="font-mono text-[9px] uppercase tracking-widest text-zinc-500 truncate">
                        {c.kind} · {fmt(c.impressions)} afișări · {ron(c.spent_cents)}/{ron(c.budget_cents)} RON
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => onEditCampaign(c)} className="p-1.5 rounded-md border border-white/10 text-zinc-400 hover:text-zinc-100" aria-label="Editează">
                        <Pencil size={11} />
                      </button>
                      <button onClick={() => onDuplicateCampaign(c)} className="p-1.5 rounded-md border border-white/10 text-zinc-400 hover:text-zinc-100" aria-label="Duplică">
                        <Copy size={11} />
                      </button>
                      <button onClick={() => onToggleCampaign(c)}
                        className={`p-1.5 rounded-md border ${c.status === "active" ? "border-sunset-orange/40 text-sunset-orange" : "border-sunset-amber/40 text-sunset-amber"}`}
                        aria-label={c.status === "active" ? "Pauză" : "Pornește"}>
                        {c.status === "active" ? <Pause size={11} /> : <Play size={11} />}
                      </button>
                      <button onClick={() => onDeleteCampaign(c)} className="p-1.5 rounded-md border border-white/10 text-zinc-400 hover:text-sunset-orange hover:border-sunset-orange" aria-label="Șterge">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                  <div className="h-[3px] bg-white/5">
                    <div className="h-full" style={{ width: `${pct}%`, background: "var(--gradient-warm)" }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */
function VisibilityBars({ data }: { data: Record<string, number> }) {
  const items = [
    { k: "discover", l: "Discover / Feed" },
    { k: "map",      l: "Hartă" },
    { k: "search",   l: "Căutare" },
    { k: "direct",   l: "Profil direct" },
    { k: "other",    l: "Altele" },
  ];
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  if (total === 0) {
    return <div className="text-[11px] text-zinc-500 py-3 text-center">Niciun trafic înregistrat încă.</div>;
  }
  return (
    <div className="space-y-2">
      {items.map((it) => {
        const v = data[it.k] || 0;
        const pct = total ? (v / total) * 100 : 0;
        return (
          <div key={it.k}>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-300">{it.l}</span>
              <span className="font-mono text-[10px] text-zinc-400 tabular-nums">{fmt(v)} <span className="text-zinc-600">· {pct.toFixed(0)}%</span></span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--gradient-sunset)" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function prettyEvent(t: string) {
  const map: Record<string, string> = {
    impression: "Afișare campanie",
    feed_impression: "Afișare în feed",
    click: "Click pe campanie",
    profile_view: "Vizualizare profil",
    map_view: "Apariție pe hartă",
    search_view: "Apariție în căutare",
    discover_view: "Apariție în Discover",
  };
  return map[t] || t.replace(/_/g, " ");
}

function timeAgo(iso: string) {
  const s = Math.max(0, Math.round((Date.now() - +new Date(iso)) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.round(s/60)}m`;
  if (s < 86400) return `${Math.round(s/3600)}h`;
  return `${Math.round(s/86400)}z`;
}

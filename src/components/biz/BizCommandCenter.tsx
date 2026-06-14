import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Eye, MapPin, TrendingUp, Users, Calendar, Ticket, Sparkles,
  Megaphone, Wallet, Plus, Pencil, Trash2, Pause, Play, Copy,
  ShieldCheck, Share2, Rocket, Star, Crown, BadgeCheck, ArrowUpRight,
  Activity, Flame, X,
} from "lucide-react";
import { toast } from "sonner";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from "recharts";
import { Link } from "@tanstack/react-router";
import { tierConfig, priceLabel } from "@/lib/biz/tiers";

type Business = any;
type Campaign = any;
type Party = any;

type Props = {
  business: Business;
  campaigns: Campaign[];
  parties: Party[];
  coverSlot?: React.ReactNode;
  headerSlot?: React.ReactNode;
  onTopup: () => void;
  onNewCampaign: () => void;
  onEditCampaign: (c: Campaign) => void;
  onToggleCampaign: (c: Campaign) => void;
  onDeleteCampaign: (c: Campaign) => void;
  onDuplicateCampaign: (c: Campaign) => void;
};

const ron = (c: number) => (c / 100).toLocaleString("ro-RO", { maximumFractionDigits: 2 });
const fmt = (n: number) => n.toLocaleString("ro-RO");
const daysBetween = (a: Date, b: Date) => Math.max(0, Math.ceil((+b - +a) / 86400_000));

/* ------------------------------------------------------------------ */
/*  Data loader — everything below comes from real tables             */
/* ------------------------------------------------------------------ */
async function loadDashboard(business: Business) {
  const businessId = business.id;
  const ownerId   = business.owner_user_id;
  const venueId   = business.venue_id as string | null;
  const now       = Date.now();
  const since7    = new Date(now - 7  * 86400_000).toISOString();
  const since14   = new Date(now - 14 * 86400_000).toISOString();

  // campaign ids once
  const { data: camps } = await supabase.from("campaigns").select("id").eq("business_id", businessId);
  const campIds = camps?.map((c) => c.id) ?? [];
  const safeIds = campIds.length ? campIds : ["00000000-0000-0000-0000-000000000000"];

  // venue parties
  const { data: venueParties } = venueId
    ? await supabase.from("parties").select("id, title, starts_at").eq("venue_id", venueId).gte("starts_at", since14)
    : { data: [] as any[] };
  const partyIds = (venueParties ?? []).map((p) => p.id);
  const safePartyIds = partyIds.length ? partyIds : ["00000000-0000-0000-0000-000000000000"];

  // offers
  const { data: offerRows } = await supabase
    .from("business_offers").select("id, title, active, redeemed_count, created_at, expires_at")
    .eq("business_id", businessId);
  const offerIds = (offerRows ?? []).map((o) => o.id);
  const safeOfferIds = offerIds.length ? offerIds : ["00000000-0000-0000-0000-000000000000"];

  const [
    { data: events7 },
    { data: events14 },
    { data: reviews },
    { count: followers },
    { count: followersPrev },
    { data: partyJoins7 },
    { data: partyJoins14 },
    { data: redemptions7 },
    { data: redemptions14 },
    { data: venueCheckins7 },
  ] = await Promise.all([
    supabase.from("campaign_events").select("event_type, user_id, created_at, campaign_id")
      .in("campaign_id", safeIds).gte("created_at", since7).order("created_at", { ascending: false }).limit(1000),
    supabase.from("campaign_events").select("event_type, user_id, created_at")
      .in("campaign_id", safeIds).gte("created_at", since14).lt("created_at", since7).limit(1000),
    supabase.from("business_reviews").select("rating, comment, created_at, reviewer_id")
      .eq("business_id", businessId).order("created_at", { ascending: false }).limit(20),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", ownerId),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", ownerId).lt("created_at", since7),
    supabase.from("party_joins").select("user_id, created_at, party_id").in("party_id", safePartyIds).gte("created_at", since7),
    supabase.from("party_joins").select("user_id, created_at").in("party_id", safePartyIds).gte("created_at", since14).lt("created_at", since7),
    supabase.from("offer_redemptions").select("user_id, redeemed_at, offer_id").in("offer_id", safeOfferIds).gte("redeemed_at", since7),
    supabase.from("offer_redemptions").select("user_id, redeemed_at").in("offer_id", safeOfferIds).gte("redeemed_at", since14).lt("redeemed_at", since7),
    venueId
      ? supabase.from("check_ins").select("user_id, created_at").eq("venue_id", venueId).gte("created_at", since7).order("created_at", { ascending: false }).limit(20)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  // Resolve profile names/avatars for live activity (in one batch)
  const userIds = new Set<string>();
  (events7 ?? []).forEach((e: any) => e.user_id && userIds.add(e.user_id));
  (partyJoins7 ?? []).slice(0, 10).forEach((j: any) => userIds.add(j.user_id));
  (redemptions7 ?? []).slice(0, 10).forEach((r: any) => userIds.add(r.user_id));
  (venueCheckins7 ?? []).slice(0, 10).forEach((c: any) => userIds.add(c.user_id));
  (reviews ?? []).slice(0, 10).forEach((r: any) => userIds.add(r.reviewer_id));

  const profilesMap: Record<string, { display_name: string; avatar_url: string | null }> = {};
  if (userIds.size > 0) {
    const { data: profs } = await supabase.from("profiles")
      .select("id, display_name, avatar_url").in("id", Array.from(userIds));
    (profs ?? []).forEach((p: any) => { profilesMap[p.id] = { display_name: p.display_name ?? "Anonim", avatar_url: p.avatar_url }; });
  }

  return {
    events7: events7 ?? [],
    events14: events14 ?? [],
    reviews: reviews ?? [],
    followers: followers ?? 0,
    followersPrev: followersPrev ?? 0,
    partyJoins7: partyJoins7 ?? [],
    partyJoins14: partyJoins14 ?? [],
    redemptions7: redemptions7 ?? [],
    redemptions14: redemptions14 ?? [],
    venueCheckins7: venueCheckins7 ?? [],
    offerRows: offerRows ?? [],
    venueParties: venueParties ?? [],
    profilesMap,
  };
}

/* ------------------------------------------------------------------ */
/*  Primitive UI helpers                                              */
/* ------------------------------------------------------------------ */
function Card({ children, className = "", title, hint, icon: Icon, id }: { children: any; className?: string; title?: string; hint?: string; icon?: any; id?: string }) {
  return (
    <div id={id} className={`rounded-2xl border border-white/[0.06] bg-zinc-950/70 backdrop-blur-xl overflow-hidden ${className}`}>
      {(title || hint) && (
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div className="flex items-center gap-2">
            {Icon && <div className="w-6 h-6 rounded-lg bg-sunset-amber/10 border border-sunset-amber/20 grid place-items-center"><Icon size={12} className="text-sunset-amber" /></div>}
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-300">{title}</span>
          </div>
          {hint && <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-500">{hint}</span>}
        </div>
      )}
      {children}
    </div>
  );
}

function Delta({ pct }: { pct: number }) {
  if (!isFinite(pct) || pct === 0) return <span className="text-[9px] text-zinc-600">—</span>;
  const up = pct > 0;
  return (
    <span className={`text-[10px] font-mono font-bold ${up ? "text-emerald-400" : "text-rose-400"}`}>
      {up ? "+" : ""}{pct.toFixed(0)}%
    </span>
  );
}

function KpiBlock({ icon: Icon, label, value, delta, color = "amber" }: { icon: any; label: string; value: number | string; delta?: number; color?: "amber"|"orange"|"magenta"|"cyan"|"emerald"|"violet" }) {
  const colorClass = ({
    amber: "text-sunset-amber bg-sunset-amber/10 border-sunset-amber/20",
    orange: "text-sunset-orange bg-sunset-orange/10 border-sunset-orange/20",
    magenta: "text-sunset-magenta bg-sunset-magenta/10 border-sunset-magenta/20",
    cyan: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
    emerald: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    violet: "text-violet-400 bg-violet-400/10 border-violet-400/20",
  })[color];
  return (
    <div className="px-3 py-3">
      <div className="flex items-center gap-2 mb-1.5">
        <div className={`w-7 h-7 rounded-lg border grid place-items-center ${colorClass}`}><Icon size={13} /></div>
      </div>
      <div className="font-display text-2xl leading-none tabular-nums">{typeof value === "number" ? fmt(value) : value}</div>
      <div className="mt-1 flex items-center justify-between gap-1">
        <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-500 truncate">{label}</span>
        {delta !== undefined && <Delta pct={delta} />}
      </div>
    </div>
  );
}

function ActionTile({ icon: Icon, title, hint, accent, onClick }: { icon: any; title: string; hint: string; accent: "amber"|"magenta"|"violet"|"cyan"; onClick: () => void }) {
  const map = {
    amber:   { ring: "hover:border-sunset-amber",   bg: "bg-sunset-amber/10 text-sunset-amber" },
    magenta: { ring: "hover:border-sunset-magenta", bg: "bg-sunset-magenta/10 text-sunset-magenta" },
    violet:  { ring: "hover:border-violet-400",     bg: "bg-violet-400/10 text-violet-400" },
    cyan:    { ring: "hover:border-cyan-400",       bg: "bg-cyan-400/10 text-cyan-400" },
  }[accent];
  return (
    <button onClick={onClick}
      className={`group flex items-center justify-between gap-3 text-left p-3 rounded-2xl bg-zinc-950/70 border border-white/[0.06] ${map.ring} transition-all`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${map.bg} group-hover:scale-110 transition-transform`}>
          <Icon size={16} />
        </div>
        <div className="min-w-0">
          <div className="font-display uppercase text-[12px] tracking-wide truncate">{title}</div>
          <div className="text-[10px] text-zinc-500 truncate">{hint}</div>
        </div>
      </div>
      <Plus size={13} className="text-zinc-600 shrink-0" />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Main                                                              */
/* ------------------------------------------------------------------ */
export function BizCommandCenter({
  business, campaigns, parties, coverSlot, headerSlot,
  onTopup, onNewCampaign, onEditCampaign, onToggleCampaign, onDeleteCampaign, onDuplicateCampaign,
}: Props) {
  const tier = tierConfig(business.tier);
  const { data, isLoading } = useQuery({
    queryKey: ["biz-dashboard", business.id, business.owner_user_id],
    queryFn: () => loadDashboard(business),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const [upgradeDismissed, setUpgradeDismissed] = useState(false);

  // ---------------- Derived KPIs ---------------------------------------
  const profileViews   = business.total_visits ?? 0;
  const reviewCount    = business.total_reviews ?? 0;
  const rating         = Number(business.reputation_score ?? 0);

  // 7d aggregates
  const mapClicks7  = (data?.events7 ?? []).filter((e: any) => /map/.test(e.event_type)).length;
  const mapClicks14 = (data?.events14 ?? []).filter((e: any) => /map/.test(e.event_type)).length;
  const clicks7     = (data?.events7 ?? []).filter((e: any) => /click/.test(e.event_type)).length;
  const impressions7= (data?.events7 ?? []).filter((e: any) => /impression|view/.test(e.event_type)).length;
  const ctr         = impressions7 > 0 ? (clicks7 / impressions7) * 100 : 0;
  const ctrPrev     = (() => {
    const i = (data?.events14 ?? []).filter((e: any) => /impression|view/.test(e.event_type)).length;
    const c = (data?.events14 ?? []).filter((e: any) => /click/.test(e.event_type)).length;
    return i > 0 ? (c / i) * 100 : 0;
  })();

  const uniqueVisitors7 = new Set((data?.events7 ?? []).map((e: any) => e.user_id).filter(Boolean)).size;
  const uniqueVisitors14 = new Set((data?.events14 ?? []).map((e: any) => e.user_id).filter(Boolean)).size;

  const eventJoins7  = data?.partyJoins7?.length ?? 0;
  const eventJoins14 = data?.partyJoins14?.length ?? 0;
  const offerClaims7 = data?.redemptions7?.length ?? 0;
  const offerClaims14= data?.redemptions14?.length ?? 0;

  const views7  = (data?.events7 ?? []).filter((e: any) => /view|impression/.test(e.event_type)).length;
  const views14 = (data?.events14 ?? []).filter((e: any) => /view|impression/.test(e.event_type)).length;

  const pct = (a: number, b: number) => (b === 0 ? (a > 0 ? 100 : 0) : ((a - b) / b) * 100);

  // ---------------- Daily series (7 days) ------------------------------
  const dailySeries = useMemo(() => {
    const days: { date: string; label: string; views: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400_000);
      days.push({
        date: d.toISOString().slice(0, 10),
        label: d.toLocaleDateString("ro-RO", { day: "numeric", month: "short" }),
        views: 0,
      });
    }
    const idx: Record<string, number> = {};
    days.forEach((d, i) => { idx[d.date] = i; });
    for (const e of data?.events7 ?? []) {
      const key = (e.created_at as string).slice(0, 10);
      if (idx[key] !== undefined && /view|impression/.test(e.event_type)) {
        days[idx[key]].views++;
      }
    }
    return days;
  }, [data?.events7]);

  // ---------------- Traffic sources (donut) ----------------------------
  const trafficSources = useMemo(() => {
    const map = { feed: 0, map: 0, search: 0, recom: 0, profile: 0 };
    for (const e of data?.events7 ?? []) {
      const t = (e.event_type || "").toLowerCase();
      if (t.includes("feed") || t.includes("discover")) map.feed++;
      else if (t.includes("map")) map.map++;
      else if (t.includes("search")) map.search++;
      else if (t.includes("recom")) map.recom++;
      else map.profile++;
    }
    return [
      { name: "Hartă",          value: map.map,     color: "#a78bfa" },
      { name: "Feed",           value: map.feed,    color: "#f59e0b" },
      { name: "Căutări",        value: map.search,  color: "#22d3ee" },
      { name: "Recomandări",    value: map.recom,   color: "#10b981" },
      { name: "Profil Business",value: map.profile, color: "#ec4899" },
    ].filter((s) => s.value > 0);
  }, [data?.events7]);

  // ---------------- Event performance (bar chart per day) --------------
  const eventSeries = useMemo(() => {
    const days: { label: string; date: string; interes: number; participare: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400_000);
      days.push({
        date: d.toISOString().slice(0, 10),
        label: d.toLocaleDateString("ro-RO", { day: "numeric", month: "short" }),
        interes: 0,
        participare: 0,
      });
    }
    const idx: Record<string, number> = {};
    days.forEach((d, i) => { idx[d.date] = i; });
    // interes = party_joins pending; participare = accepted
    for (const j of data?.partyJoins7 ?? []) {
      const key = (j.created_at as string).slice(0, 10);
      if (idx[key] !== undefined) days[idx[key]].interes++;
    }
    // venue check-ins as participare
    for (const c of data?.venueCheckins7 ?? []) {
      const key = (c.created_at as string).slice(0, 10);
      if (idx[key] !== undefined) days[idx[key]].participare++;
    }
    return days;
  }, [data?.partyJoins7, data?.venueCheckins7]);

  // ---------------- Live activity feed (merged real events) ------------
  const liveFeed = useMemo(() => {
    type Item = { id: string; who: string; avatar: string | null; action: string; when: string };
    const items: Item[] = [];
    const prof = data?.profilesMap ?? {};
    const name = (uid: string) => prof[uid]?.display_name ?? "Cineva";
    const ava  = (uid: string) => prof[uid]?.avatar_url ?? null;

    for (const r of (data?.reviews ?? []).slice(0, 5)) {
      items.push({ id: `r${r.created_at}`, who: name(r.reviewer_id), avatar: ava(r.reviewer_id),
        action: `a lăsat un review (${r.rating}★)`, when: r.created_at });
    }
    for (const j of (data?.partyJoins7 ?? []).slice(0, 5)) {
      items.push({ id: `j${j.created_at}`, who: name(j.user_id), avatar: ava(j.user_id),
        action: "a marcat că vine la eveniment", when: j.created_at });
    }
    for (const o of (data?.redemptions7 ?? []).slice(0, 5)) {
      items.push({ id: `o${o.redeemed_at}`, who: name(o.user_id), avatar: ava(o.user_id),
        action: "a revendicat oferta ta", when: o.redeemed_at });
    }
    for (const c of (data?.venueCheckins7 ?? []).slice(0, 5)) {
      items.push({ id: `c${c.created_at}`, who: name(c.user_id), avatar: ava(c.user_id),
        action: "s-a interesat de locație", when: c.created_at });
    }
    items.sort((a, b) => +new Date(b.when) - +new Date(a.when));
    return items.slice(0, 6);
  }, [data]);

  // ---------------- Recommendations -----------------------------------
  const completeness = useMemo(() => {
    const fields = [business.brand_name, business.description, business.logo_url, business.cover_url,
      business.address, business.contact_email, business.contact_phone, business.website,
      business.city_id, business.instagram_handle];
    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  }, [business]);

  const upcoming = useMemo(
    () => parties.filter((p) => new Date(p.starts_at).getTime() > Date.now() - 86400_000)
                 .sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at)),
    [parties],
  );

  const recommendations = useMemo(() => {
    const recs: { icon: any; title: string; hint: string; cta: string; onClick: () => void; color: string }[] = [];
    if (completeness < 100) recs.push({
      icon: BadgeCheck, title: "Completează datele lipsă din profil",
      hint: `Profilul complet are cu ~${100 - completeness}% mai multe vizualizări`,
      cta: "Completează", onClick: () => toast.info("Folosește butonul Edit (creion) pe coperta business-ului."),
      color: "emerald",
    });
    if (upcoming.length === 0) recs.push({
      icon: Calendar, title: "Publică un eveniment pentru weekend",
      hint: "Evenimentele au ~3x mai multe interacțiuni",
      cta: "Creează event", onClick: onNewCampaign, color: "magenta",
    });
    if (campaigns.filter((c) => c.status === "active").length === 0) recs.push({
      icon: Rocket, title: "Activează o campanie de promovare",
      hint: "Crește vizibilitatea cu până la 200%",
      cta: "Lansează campanie", onClick: onNewCampaign, color: "amber",
    });
    if ((data?.offerRows ?? []).filter((o: any) => o.active).length === 0) recs.push({
      icon: Ticket, title: "Creează o ofertă Happy Hour",
      hint: "Ofertele cu reducere convertesc ~2x mai bine",
      cta: "Creează ofertă", onClick: onNewCampaign, color: "violet",
    });
    if (rating === 0 || reviewCount < 5) recs.push({
      icon: Star, title: "Cere recenzii primilor clienți",
      hint: "Localurile cu 5+ recenzii apar mai sus în căutări",
      cta: "Distribuie profil", onClick: shareProfile, color: "amber",
    });
    return recs.slice(0, 4);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completeness, upcoming.length, campaigns, data?.offerRows, rating, reviewCount]);

  // ---------------- Plan card -----------------------------------------
  const planDaysLeft = business.tier_renews_at
    ? daysBetween(new Date(), new Date(business.tier_renews_at))
    : 30;
  const planTotalDays = 30;
  const planPct = Math.min(100, Math.max(0, (planDaysLeft / planTotalDays) * 100));

  // ---------------- Actions -------------------------------------------
  async function shareProfile() {
    const url = `${window.location.origin}/biz/${business.slug ?? business.id}`;
    try {
      if (navigator.share) await navigator.share({ title: business.brand_name, url });
      else { await navigator.clipboard.writeText(url); toast.success("Link copiat în clipboard"); }
    } catch {}
  }

  const totalSpent       = campaigns.reduce((s, c) => s + (c.spent_cents || 0), 0);
  const totalBudget      = campaigns.reduce((s, c) => s + (c.budget_cents || 0), 0);
  const totalImpressions = campaigns.reduce((s, c) => s + (c.impressions || 0), 0);
  const totalClicks      = campaigns.reduce((s, c) => s + (c.clicks || 0), 0);
  const activeCount      = campaigns.filter((c) => c.status === "active").length;

  const heroCards = (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <Card className="md:col-span-1 p-4 flex items-center gap-3">
        <Star className="text-sunset-amber fill-current" size={22} />
        <div>
          <div className="font-display text-3xl tabular-nums leading-none">
            {rating ? rating.toFixed(1) : "—"}
          </div>
          <div className="font-mono text-[9px] uppercase tracking-widest text-zinc-500 mt-1">Rating mediu</div>
          <div className="text-[10px] text-zinc-500">{reviewCount} review-uri</div>
        </div>
      </Card>

      <Card className="md:col-span-1 p-4 relative overflow-hidden">
        <div className="flex items-center gap-2">
          <Flame size={14} style={{ color: `hsl(var(--tier-${tier.id}, var(--sunset-amber)))` }} />
          <span className="font-display uppercase text-[13px] tracking-wide">Plan {tier.name}</span>
        </div>
        <div className="text-[10px] text-zinc-500 mt-1">
          {business.tier_renews_at ? `Expiră în ${planDaysLeft} zile` : "Plan demo · 30 zile"}
        </div>
        <div className="mt-3 h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${planPct}%`, background: "var(--gradient-sunset)" }} />
        </div>
      </Card>

      {!upgradeDismissed && tier.id !== "exclusive" ? (
        <Card className="md:col-span-1 p-4 relative bg-gradient-to-br from-sunset-magenta/20 via-violet-500/10 to-transparent border-sunset-magenta/30">
          <button onClick={() => setUpgradeDismissed(true)} className="absolute top-2 right-2 p-1 text-zinc-400 hover:text-white" aria-label="Ascunde">
            <X size={12} />
          </button>
          <div className="flex items-start gap-2">
            <Crown size={18} className="text-sunset-magenta shrink-0 mt-0.5" />
            <div>
              <div className="font-display uppercase text-[13px] tracking-wide">Upgrade Plan</div>
              <div className="text-[11px] text-zinc-400 mt-1">Crește vizibilitatea și adu mai mulți clienți.</div>
              <Link to="/app/biz/plans" className="inline-flex items-center gap-1 mt-3 px-3 py-1.5 rounded-md text-[10px] font-mono uppercase tracking-widest font-bold text-white" style={{ background: "var(--gradient-sunset)" }}>
                Upgrade acum <ArrowUpRight size={11} />
              </Link>
            </div>
          </div>
        </Card>
      ) : <div className="hidden md:block" />}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* ============== HERO: COVER + HEADER + 3 CARDS ============== */}
      {coverSlot || headerSlot ? (
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-3">
          {coverSlot}
          <div className="flex flex-col gap-3 min-w-0">
            {headerSlot}
            {heroCards}
          </div>
        </div>
      ) : heroCards}


      {/* ============== PERFORMANȚĂ GENERALĂ (KPIs) ============== */}
      <div id="biz-stats">
      <Card title="Performanță generală" hint="Ultimele 7 zile" icon={TrendingUp}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-y sm:divide-y-0 divide-white/5">
          <KpiBlock icon={Eye}        label="Vizualizări"     value={views7}          delta={pct(views7, views14)}             color="violet" />
          <KpiBlock icon={MapPin}     label="Click-uri hartă" value={mapClicks7}      delta={pct(mapClicks7, mapClicks14)}     color="amber" />
          <KpiBlock icon={TrendingUp} label="CTR (rata click)"value={`${ctr.toFixed(1)}%`} delta={pct(ctr, ctrPrev)}          color="emerald" />
          <KpiBlock icon={Users}      label="Vizitatori unici"value={uniqueVisitors7} delta={pct(uniqueVisitors7, uniqueVisitors14)} color="cyan" />
          <KpiBlock icon={Calendar}   label="Event joins"     value={eventJoins7}     delta={pct(eventJoins7, eventJoins14)}   color="magenta" />
          <KpiBlock icon={Ticket}     label="Oferte claim"    value={offerClaims7}    delta={pct(offerClaims7, offerClaims14)} color="orange" />
        </div>
      </Card>
      </div>

      {/* ============== QUICK ACTIONS ============== */}
      <div id="biz-events" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <ActionTile icon={Calendar} title="Publică eveniment" hint="Atrage clienți diseară" accent="magenta" onClick={onNewCampaign} />
        <ActionTile icon={Rocket}   title="Lansează campanie" hint="Promovează localul"     accent="amber"   onClick={onNewCampaign} />
        <ActionTile icon={Ticket}   title="Creează ofertă"    hint="Happy Hour sau reducere"accent="violet"  onClick={onNewCampaign} />
        <ActionTile icon={Share2}   title="Distribuie profil" hint="Social Media sau QR"    accent="cyan"    onClick={shareProfile} />
      </div>

      {/* ============== CHART + LIVE FEED ============== */}
      <div id="biz-live" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card className="lg:col-span-2" title="Rezumat activitate · live" hint="Ultimele 7 zile" icon={Activity}>
          <div className="px-4 grid grid-cols-3 sm:grid-cols-6 gap-2 pb-3">
            <Mini label="Vizualizări" value={views7} color="text-sunset-amber" />
            <Mini label="Recenzii noi" value={(data?.reviews ?? []).filter((r: any) => +new Date(r.created_at) > Date.now() - 7*86400_000).length} color="text-sunset-orange" />
            <Mini label="Recenzii total" value={reviewCount} color="text-sunset-magenta" />
            <Mini label="Evenimente" value={upcoming.length} color="text-violet-400" />
            <Mini label="Campanii" value={activeCount} color="text-cyan-400" />
            <Mini label="Oferte" value={(data?.offerRows ?? []).filter((o: any) => o.active).length} color="text-emerald-400" />
          </div>
          <div className="h-64 px-2 pb-3">
            {isLoading ? (
              <div className="h-full rounded-lg bg-white/[0.02] animate-pulse" />
            ) : views7 === 0 ? (
              <div className="h-full grid place-items-center text-[11px] text-zinc-500">Niciun trafic înregistrat încă.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailySeries} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#a78bfa" />
                      <stop offset="100%" stopColor="#ec4899" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="label" tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip contentStyle={{ background: "#09090b", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 11 }} labelStyle={{ color: "#a1a1aa" }} />
                  <Line type="monotone" dataKey="views" stroke="url(#lineGrad)" strokeWidth={2.5} dot={{ r: 3, fill: "#ec4899", strokeWidth: 0 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card title="Activitate live" hint="real-time" icon={Activity}>
          <div className="px-4 pb-3 space-y-2">
            {liveFeed.length === 0 ? (
              <div className="text-[11px] text-zinc-500 py-6 text-center">Nicio activitate încă.</div>
            ) : liveFeed.map((i) => (
              <div key={i.id} className="flex items-center gap-2 py-1.5 border-b border-white/5 last:border-0">
                {i.avatar ? (
                  <img src={i.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sunset-amber to-sunset-magenta grid place-items-center text-[10px] font-bold text-black">
                    {i.who[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] truncate"><span className="font-bold">{i.who}</span></div>
                  <div className="text-[10px] text-zinc-500 truncate">{i.action}</div>
                </div>
                <div className="text-[9px] font-mono text-zinc-600 whitespace-nowrap">{timeAgo(i.when)}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ============== TRAFFIC + EVENT PERFORMANCE + REPUTATION ============== */}
      <div id="biz-visibility" className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card title="Surse de trafic · 7 zile" icon={Eye}>
          <div className="h-56 px-2 pb-2">
            {trafficSources.length === 0 ? (
              <div className="h-full grid place-items-center text-[11px] text-zinc-500">Niciun trafic încă.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={trafficSources} dataKey="value" nameKey="name" innerRadius={42} outerRadius={70} paddingAngle={2} stroke="none">
                    {trafficSources.map((s, i) => <Cell key={i} fill={s.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#09090b", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="px-4 pb-3 space-y-1">
            {trafficSources.map((s) => {
              const total = trafficSources.reduce((a, b) => a + b.value, 0);
              const p = total ? (s.value / total) * 100 : 0;
              return (
                <div key={s.name} className="flex items-center justify-between text-[10px]">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: s.color }} />{s.name}</span>
                  <span className="font-mono text-zinc-400 tabular-nums">{p.toFixed(0)}% · {s.value}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card id="biz-events-perf" title="Performanță evenimente" hint="7 zile" icon={Calendar}>
          <div className="h-56 px-2 pb-2">
            {eventJoins7 === 0 && (data?.venueCheckins7?.length ?? 0) === 0 ? (
              <div className="h-full grid place-items-center text-[11px] text-zinc-500 text-center px-4">Încă nu sunt interacțiuni pe evenimente.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={eventSeries} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="label" tick={{ fill: "#71717a", fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#71717a", fontSize: 9 }} axisLine={false} tickLine={false} width={22} />
                  <Tooltip contentStyle={{ background: "#09090b", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="interes" name="Interes" fill="#ec4899" radius={[3,3,0,0]} />
                  <Bar dataKey="participare" name="Participare" fill="#f59e0b" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card id="biz-reputation" title="Reputație" icon={ShieldCheck}>
          <div className="p-4 flex items-center gap-4">
            <ReputationGauge value={rating} />
            <div className="flex-1 space-y-2">
              <div>
                <div className="font-display text-xl tabular-nums leading-none">{fmt(reviewCount)}</div>
                <div className="font-mono text-[9px] uppercase tracking-widest text-zinc-500">Total recenzii</div>
              </div>
              <div>
                <div className="font-display text-xl tabular-nums leading-none">{completeness}%</div>
                <div className="font-mono text-[9px] uppercase tracking-widest text-zinc-500">Profil completat</div>
              </div>
              <div>
                <div className={`font-display text-xl leading-none ${business.verified ? "text-emerald-400" : "text-zinc-400"}`}>
                  {business.verified ? "DA" : "NU"}
                </div>
                <div className="font-mono text-[9px] uppercase tracking-widest text-zinc-500">Verificat</div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ============== PLANUL TĂU ============== */}
      <Card title="Planul tău" hint={priceLabel(tier)} icon={Crown}>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
          <div>
            <div className="font-display text-2xl uppercase">{tier.name}</div>
            <div className="text-[11px] text-zinc-500 mt-1">{tier.tagline}</div>
            <div className="mt-3 h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${planPct}%`, background: "var(--gradient-sunset)" }} />
            </div>
            <div className="mt-1 text-[10px] text-zinc-500">
              {business.tier_renews_at ? `Îți rămân ${planDaysLeft} zile din plan` : "Plan demo · 30 zile"}
            </div>
            <Link to="/app/biz/plans"
              className="mt-4 inline-flex items-center gap-1 px-4 py-2 rounded-xl text-[11px] font-mono uppercase tracking-widest font-bold text-white"
              style={{ background: "var(--gradient-sunset)" }}>
              {tier.id === "exclusive" ? "Vezi planul" : "Upgradează planul"} <ArrowUpRight size={11} />
            </Link>
          </div>
          <div className="space-y-1.5 text-[11px]">
            <PlanRow label="Vizibilitate pe hartă" value="Inclus" />
            <PlanRow label="Apari în feed"          value={tier.features.feedSponsoredPerWeek === "unlimited" ? "Nelimitat" : `${tier.features.feedSponsoredPerWeek}/săpt.`} />
            <PlanRow label="Event promovate"        value={tier.features.eventsActive === "unlimited" ? "Nelimitat" : `${tier.features.eventsActive}/lună`} />
            <PlanRow label="Featured Tonight"       value={tier.features.featuredTonight ? "Inclus" : "—"} />
            <PlanRow label="Notificări push"        value={tier.features.pushNotifications ? "Inclus" : "—"} />
            <PlanRow label="Rapoarte avansate"      value={tier.features.analytics === "basic" ? "Limitat" : "Inclus"} />
          </div>
        </div>
      </Card>

      {/* ============== RECOMANDĂRI INTELIGENTE ============== */}
      <Card title="Recomandări inteligente" hint="bazat doar pe date reale" icon={Sparkles}>
        <div className="p-3 space-y-2">
          {recommendations.length === 0 ? (
            <div className="text-[11px] text-zinc-500 py-3 text-center">Toate semnalele sunt verzi. Continuă așa.</div>
          ) : recommendations.map((r, i) => {
            const tone = ({
              emerald: "border-emerald-400/30 bg-emerald-400/5 text-emerald-400",
              magenta: "border-sunset-magenta/30 bg-sunset-magenta/5 text-sunset-magenta",
              amber:   "border-sunset-amber/30 bg-sunset-amber/5 text-sunset-amber",
              violet:  "border-violet-400/30 bg-violet-400/5 text-violet-400",
            } as any)[r.color];
            return (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/40 border border-white/5">
                <div className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 border ${tone}`}>
                  <r.icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-display uppercase tracking-wide truncate">{r.title}</div>
                  <div className="text-[10px] text-zinc-500 truncate">{r.hint}</div>
                </div>
                <button onClick={r.onClick}
                  className="shrink-0 px-3 py-1.5 rounded-md border border-sunset-amber/40 text-sunset-amber text-[9px] font-mono uppercase tracking-widest hover:bg-sunset-amber/10">
                  {r.cta}
                </button>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ============== PROMOVARE (campaigns manager) ============== */}
      <Card title="Promovare" hint="opțional" icon={Megaphone}>
        <div className="p-4 space-y-4">
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Promovarea crește vizibilitatea în aplicație. Rezultatele depind de comportamentul utilizatorilor. Nu garantăm vânzări sau clienți.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Tile label="Buget alocat" value={`${ron(totalBudget)} RON`} color="text-sunset-orange" />
            <Tile label="Cheltuit"     value={`${ron(totalSpent)} RON`}  color="text-sunset-amber" />
            <Tile label="Afișări"      value={fmt(totalImpressions)}      color="text-sunset-magenta" />
            <Tile label="CTR"          value={totalImpressions ? `${((totalClicks/totalImpressions)*100).toFixed(1)}%` : "—"} color="text-emerald-400" />
          </div>

          <div className="flex items-center justify-between rounded-xl bg-zinc-900/40 border border-white/5 p-3">
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
            className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-white font-display uppercase text-[11px] tracking-widest"
            style={{ background: "var(--gradient-sunset)" }}>
            <Plus size={13} /> Campanie nouă
          </button>

          {campaigns.length > 0 && (
            <div className="space-y-2">
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
                        <button onClick={() => onEditCampaign(c)} className="p-1.5 rounded-md border border-white/10 text-zinc-400 hover:text-zinc-100" aria-label="Editează"><Pencil size={11} /></button>
                        <button onClick={() => onDuplicateCampaign(c)} className="p-1.5 rounded-md border border-white/10 text-zinc-400 hover:text-zinc-100" aria-label="Duplică"><Copy size={11} /></button>
                        <button onClick={() => onToggleCampaign(c)}
                          className={`p-1.5 rounded-md border ${c.status === "active" ? "border-sunset-orange/40 text-sunset-orange" : "border-sunset-amber/40 text-sunset-amber"}`}
                          aria-label={c.status === "active" ? "Pauză" : "Pornește"}>
                          {c.status === "active" ? <Pause size={11} /> : <Play size={11} />}
                        </button>
                        <button onClick={() => onDeleteCampaign(c)} className="p-1.5 rounded-md border border-white/10 text-zinc-400 hover:text-sunset-orange hover:border-sunset-orange" aria-label="Șterge"><Trash2 size={11} /></button>
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
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-primitives                                                    */
/* ------------------------------------------------------------------ */
function Mini({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <div className="font-mono text-[8px] uppercase tracking-[0.25em] text-zinc-500">{label}</div>
      <div className={`mt-1 font-display text-lg leading-none tabular-nums ${color}`}>{fmt(value)}</div>
    </div>
  );
}

function Tile({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl bg-zinc-900/40 border border-white/5 p-3">
      <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-zinc-500">{label}</div>
      <div className={`mt-1 font-display text-xl leading-none tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

function PlanRow({ label, value }: { label: string; value: string }) {
  const muted = value === "—";
  return (
    <div className="flex items-center justify-between">
      <span className="text-zinc-400">{label}</span>
      <span className={`font-mono uppercase tracking-widest text-[10px] ${muted ? "text-zinc-600" : "text-emerald-400"}`}>{value}</span>
    </div>
  );
}

function ReputationGauge({ value }: { value: number }) {
  const v = Math.max(0, Math.min(5, value));
  const pct = (v / 5) * 100;
  const r = 36;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative w-24 h-24 shrink-0">
      <svg width="96" height="96" className="-rotate-90">
        <circle cx="48" cy="48" r={r} stroke="rgba(255,255,255,0.05)" strokeWidth="8" fill="none" />
        <circle cx="48" cy="48" r={r}
          stroke="url(#gaugeGrad)" strokeWidth="8" fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c} />
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-xl tabular-nums leading-none">{v ? v.toFixed(1) : "—"}</span>
        <span className="text-[8px] text-sunset-amber">★★★★★</span>
      </div>
    </div>
  );
}

function timeAgo(iso: string) {
  const s = Math.max(0, Math.round((Date.now() - +new Date(iso)) / 1000));
  if (s < 60) return `acum ${s}s`;
  if (s < 3600) return `acum ${Math.round(s/60)}m`;
  if (s < 86400) return `acum ${Math.round(s/3600)}h`;
  return `acum ${Math.round(s/86400)}z`;
}

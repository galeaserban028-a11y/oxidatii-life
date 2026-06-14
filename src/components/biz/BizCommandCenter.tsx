import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Eye, MapPin, TrendingUp, Users, Calendar, Ticket, Sparkles,
  Megaphone, Wallet, Plus, Pencil, Trash2, Pause, Play, Copy,
  Share2, Rocket, Star, Crown, BadgeCheck, ArrowUpRight,
  Flame, Heart, MessageCircle, Trophy, Brain, Zap, Radio,
  Footprints, Bookmark, Activity,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { tierConfig } from "@/lib/biz/tiers";

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

/* ------------------------------------------------------------------ */
/*  Real-data loader                                                  */
/* ------------------------------------------------------------------ */
async function loadDashboard(business: Business) {
  const businessId = business.id;
  const ownerId = business.owner_user_id;
  const venueId = business.venue_id as string | null;
  const cityId = business.city_id as string | null;
  const now = Date.now();
  const since7 = new Date(now - 7 * 86400_000).toISOString();
  const since14 = new Date(now - 14 * 86400_000).toISOString();
  const since1h = new Date(now - 3600_000).toISOString();

  const { data: camps } = await supabase.from("campaigns").select("id").eq("business_id", businessId);
  const campIds = camps?.map((c) => c.id) ?? [];
  const safeIds = campIds.length ? campIds : ["00000000-0000-0000-0000-000000000000"];

  const { data: venueParties } = venueId
    ? await supabase.from("parties").select("id, title, starts_at").eq("venue_id", venueId).gte("starts_at", since14)
    : { data: [] as any[] };
  const partyIds = (venueParties ?? []).map((p) => p.id);
  const safePartyIds = partyIds.length ? partyIds : ["00000000-0000-0000-0000-000000000000"];

  const { data: offerRows } = await supabase
    .from("business_offers").select("id, title, active")
    .eq("business_id", businessId);

  // City ranking — top venues by reputation_score
  const { data: cityVenues } = cityId
    ? await supabase
        .from("business_accounts")
        .select("id, brand_name, type, reputation_score, total_visits, logo_url, tier")
        .eq("city_id", cityId)
        .order("reputation_score", { ascending: false })
        .limit(20)
    : { data: [] as any[] };

  const [
    { data: events7 },
    { data: events14 },
    { data: liveNow },
    { data: reviews },
    { count: followers },
    { count: followersPrev },
    { data: partyJoins7 },
    { data: partyJoins14 },
    { data: venueCheckins7 },
  ] = await Promise.all([
    supabase.from("campaign_events").select("event_type, user_id, created_at, campaign_id")
      .in("campaign_id", safeIds).gte("created_at", since7).order("created_at", { ascending: false }).limit(1000),
    supabase.from("campaign_events").select("event_type, user_id, created_at")
      .in("campaign_id", safeIds).gte("created_at", since14).lt("created_at", since7).limit(1000),
    supabase.from("campaign_events").select("user_id, created_at, event_type")
      .in("campaign_id", safeIds).gte("created_at", since1h).limit(200),
    supabase.from("business_reviews").select("rating, comment, created_at, reviewer_id")
      .eq("business_id", businessId).order("created_at", { ascending: false }).limit(20),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", ownerId),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", ownerId).lt("created_at", since7),
    supabase.from("party_joins").select("user_id, created_at, party_id").in("party_id", safePartyIds).gte("created_at", since7),
    supabase.from("party_joins").select("user_id, created_at").in("party_id", safePartyIds).gte("created_at", since14).lt("created_at", since7),
    venueId
      ? supabase.from("check_ins").select("user_id, created_at").eq("venue_id", venueId).gte("created_at", since7).order("created_at", { ascending: false }).limit(50)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const userIds = new Set<string>();
  (events7 ?? []).slice(0, 15).forEach((e: any) => e.user_id && userIds.add(e.user_id));
  (partyJoins7 ?? []).slice(0, 10).forEach((j: any) => userIds.add(j.user_id));
  (venueCheckins7 ?? []).slice(0, 10).forEach((c: any) => userIds.add(c.user_id));
  (reviews ?? []).slice(0, 10).forEach((r: any) => userIds.add(r.reviewer_id));

  const profilesMap: Record<string, { display_name: string; avatar_url: string | null }> = {};
  if (userIds.size > 0) {
    const { data: profs } = await supabase.from("profiles")
      .select("id, display_name, avatar_url").in("id", Array.from(userIds));
    (profs ?? []).forEach((p: any) => {
      profilesMap[p.id] = { display_name: p.display_name ?? "Cineva", avatar_url: p.avatar_url };
    });
  }

  return {
    events7: events7 ?? [],
    events14: events14 ?? [],
    liveNow: liveNow ?? [],
    reviews: reviews ?? [],
    followers: followers ?? 0,
    followersPrev: followersPrev ?? 0,
    partyJoins7: partyJoins7 ?? [],
    partyJoins14: partyJoins14 ?? [],
    venueCheckins7: venueCheckins7 ?? [],
    offerRows: offerRows ?? [],
    venueParties: venueParties ?? [],
    cityVenues: cityVenues ?? [],
    profilesMap,
  };
}

/* ------------------------------------------------------------------ */
/*  Visual primitives — luxury black glass                            */
/* ------------------------------------------------------------------ */
function GlassCard({
  children, className = "", id, glow,
}: { children: React.ReactNode; className?: string; id?: string; glow?: "violet"|"cyan"|"pink"|"amber" }) {
  const glowMap = {
    violet: "before:bg-violet-500/10",
    cyan:   "before:bg-cyan-400/10",
    pink:   "before:bg-pink-500/10",
    amber:  "before:bg-amber-400/10",
  };
  return (
    <div
      id={id}
      className={`relative rounded-3xl border border-white/10 bg-black/60 backdrop-blur-2xl overflow-hidden ${
        glow ? `before:absolute before:-inset-px before:rounded-3xl before:blur-2xl before:opacity-60 before:-z-10 ${glowMap[glow]}` : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

function SectionHead({ icon: Icon, eyebrow, title, accent = "violet" }: {
  icon: any; eyebrow: string; title: string; accent?: "violet"|"cyan"|"pink"|"amber";
}) {
  const colors = {
    violet: "from-violet-500 to-fuchsia-500",
    cyan:   "from-cyan-400 to-blue-500",
    pink:   "from-pink-500 to-rose-500",
    amber:  "from-amber-400 to-orange-500",
  };
  return (
    <div className="flex items-center gap-3 px-5 pt-5 pb-3">
      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${colors[accent]} grid place-items-center shadow-lg shadow-black/40`}>
        <Icon size={16} className="text-white" />
      </div>
      <div>
        <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-zinc-500">{eyebrow}</div>
        <div className="font-display text-base uppercase tracking-wide text-white leading-tight">{title}</div>
      </div>
    </div>
  );
}

function NeonBadge({ children, color = "pink", live }: { children: React.ReactNode; color?: "pink"|"cyan"|"violet"|"emerald"|"amber"; live?: boolean }) {
  const map = {
    pink:    "bg-pink-500/15 text-pink-300 border-pink-500/40 shadow-pink-500/20",
    cyan:    "bg-cyan-400/15 text-cyan-300 border-cyan-400/40 shadow-cyan-400/20",
    violet:  "bg-violet-500/15 text-violet-300 border-violet-500/40 shadow-violet-500/20",
    emerald: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-emerald-500/20",
    amber:   "bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-amber-500/20",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-mono uppercase tracking-widest shadow-[0_0_12px] ${map[color]}`}>
      {live && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
      {children}
    </span>
  );
}

function Delta({ pct }: { pct: number }) {
  if (!isFinite(pct) || pct === 0) return <span className="text-[10px] font-mono text-zinc-600">±0%</span>;
  const up = pct > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-mono font-bold ${up ? "text-emerald-400" : "text-rose-400"}`}>
      <TrendingUp size={9} className={up ? "" : "rotate-180"} />
      {up ? "+" : ""}{pct.toFixed(0)}%
    </span>
  );
}

function Sparkline({ data, color = "#a78bfa" }: { data: number[]; color?: string }) {
  if (data.length < 2) data = [0, 0];
  const max = Math.max(...data, 1);
  const w = 100;
  const h = 28;
  const step = w / (data.length - 1);
  const points = data.map((v, i) => `${i * step},${h - (v / max) * h}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-7" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`sp-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.5" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <polygon points={`0,${h} ${points} ${w},${h}`} fill={`url(#sp-${color})`} />
    </svg>
  );
}

function GrowthCard({ icon: Icon, label, value, delta, color, series }: {
  icon: any; label: string; value: number | string; delta: number; color: string; series: number[];
}) {
  return (
    <div className="relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.03] to-transparent p-4 overflow-hidden group hover:border-white/20 transition-all">
      <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: color }} />
      <div className="relative flex items-center justify-between mb-3">
        <div className="w-9 h-9 rounded-xl grid place-items-center" style={{ background: `${color}20`, color, boxShadow: `0 0 24px ${color}30 inset` }}>
          <Icon size={15} />
        </div>
        <Delta pct={delta} />
      </div>
      <div className="font-display text-3xl leading-none tabular-nums text-white">{typeof value === "number" ? fmt(value) : value}</div>
      <div className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-500">{label}</div>
      <div className="mt-2 -mx-1"><Sparkline data={series} color={color} /></div>
    </div>
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
    refetchInterval: 45_000,
  });

  // Tick for live time-ago updates
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 15_000);
    return () => clearInterval(t);
  }, []);

  /* ---------------- Derived KPIs ---------------- */
  const profileViews = business.total_visits ?? 0;
  const reviewCount = business.total_reviews ?? 0;
  const rating = Number(business.reputation_score ?? 0);

  const pct = (a: number, b: number) => (b === 0 ? (a > 0 ? 100 : 0) : ((a - b) / b) * 100);

  const views7 = (data?.events7 ?? []).filter((e: any) => /view|impression/.test(e.event_type)).length;
  const views14 = (data?.events14 ?? []).filter((e: any) => /view|impression/.test(e.event_type)).length;
  const mapClicks7 = (data?.events7 ?? []).filter((e: any) => /map/.test(e.event_type)).length;
  const mapClicks14 = (data?.events14 ?? []).filter((e: any) => /map/.test(e.event_type)).length;
  const eventJoins7 = data?.partyJoins7?.length ?? 0;
  const eventJoins14 = data?.partyJoins14?.length ?? 0;
  const reviews7 = (data?.reviews ?? []).filter((r: any) => +new Date(r.created_at) > Date.now() - 7 * 86400_000).length;
  const reviews14 = (data?.reviews ?? []).filter((r: any) => {
    const t = +new Date(r.created_at);
    return t > Date.now() - 14 * 86400_000 && t < Date.now() - 7 * 86400_000;
  }).length;
  const followersDelta = (data?.followers ?? 0) - (data?.followersPrev ?? 0);
  const followersPct = pct(data?.followers ?? 0, data?.followersPrev ?? 0);
  const checkins7 = data?.venueCheckins7?.length ?? 0;
  const estVisits = Math.max(checkins7, Math.round(eventJoins7 * 0.6 + mapClicks7 * 0.15));

  // Live viewers right now (last hour)
  const liveViewers = new Set((data?.liveNow ?? []).map((e: any) => e.user_id).filter(Boolean)).size;
  const tonightInterested = (data?.partyJoins7 ?? []).filter((j: any) => {
    const t = +new Date(j.created_at);
    return t > Date.now() - 86400_000;
  }).length;

  // City ranking
  const cityRank = useMemo(() => {
    const list = data?.cityVenues ?? [];
    const idx = list.findIndex((v: any) => v.id === business.id);
    return { rank: idx >= 0 ? idx + 1 : null, total: list.length, list };
  }, [data?.cityVenues, business.id]);

  // Trending score (0-100) — composite signal
  const trendingScore = Math.min(100, Math.round(
    (views7 * 1.5) + (mapClicks7 * 3) + (eventJoins7 * 5) + (reviews7 * 8) + (liveViewers * 4)
  ));
  const isTrending = trendingScore >= 40 || liveViewers >= 3;

  /* ---------------- Sparkline series (7d) ---------------- */
  const series = useMemo(() => {
    const buckets: Record<string, { views: number; map: number; joins: number; convs: number; saves: number; foot: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const k = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
      buckets[k] = { views: 0, map: 0, joins: 0, convs: 0, saves: 0, foot: 0 };
    }
    for (const e of data?.events7 ?? []) {
      const k = (e.created_at as string).slice(0, 10);
      if (!buckets[k]) continue;
      const t = (e.event_type || "").toLowerCase();
      if (t.includes("view") || t.includes("impression")) buckets[k].views++;
      if (t.includes("map")) buckets[k].map++;
      if (t.includes("save") || t.includes("bookmark")) buckets[k].saves++;
      if (t.includes("message") || t.includes("dm")) buckets[k].convs++;
    }
    for (const j of data?.partyJoins7 ?? []) {
      const k = (j.created_at as string).slice(0, 10);
      if (buckets[k]) buckets[k].joins++;
    }
    for (const c of data?.venueCheckins7 ?? []) {
      const k = (c.created_at as string).slice(0, 10);
      if (buckets[k]) buckets[k].foot++;
    }
    const arr = Object.values(buckets);
    return {
      views: arr.map((b) => b.views),
      map: arr.map((b) => b.map),
      joins: arr.map((b) => b.joins),
      convs: arr.map((b) => b.convs),
      saves: arr.map((b) => b.saves),
      foot: arr.map((b) => b.foot),
    };
  }, [data]);

  /* ---------------- Live activity feed ---------------- */
  const liveFeed = useMemo(() => {
    type Item = { id: string; who: string; avatar: string | null; action: string; icon: any; color: string; when: string };
    const items: Item[] = [];
    const prof = data?.profilesMap ?? {};
    const name = (uid: string) => prof[uid]?.display_name ?? "Cineva";
    const ava = (uid: string) => prof[uid]?.avatar_url ?? null;

    for (const r of (data?.reviews ?? []).slice(0, 8)) {
      items.push({ id: `r${r.created_at}`, who: name(r.reviewer_id), avatar: ava(r.reviewer_id),
        action: `a lăsat ${r.rating}★ recenzie`, icon: Star, color: "#f59e0b", when: r.created_at });
    }
    for (const j of (data?.partyJoins7 ?? []).slice(0, 8)) {
      items.push({ id: `j${j.created_at}`, who: name(j.user_id), avatar: ava(j.user_id),
        action: "se duce diseară la eveniment", icon: Calendar, color: "#ec4899", when: j.created_at });
    }
    for (const c of (data?.venueCheckins7 ?? []).slice(0, 8)) {
      items.push({ id: `c${c.created_at}`, who: name(c.user_id), avatar: ava(c.user_id),
        action: "a făcut check-in la locație", icon: MapPin, color: "#22d3ee", when: c.created_at });
    }
    for (const e of (data?.events7 ?? []).slice(0, 20)) {
      const t = (e.event_type || "").toLowerCase();
      if (!e.user_id) continue;
      if (t.includes("follow")) items.push({ id: `f${e.created_at}${e.user_id}`, who: name(e.user_id), avatar: ava(e.user_id),
        action: "te urmărește acum", icon: Heart, color: "#a78bfa", when: e.created_at });
      else if (t.includes("share")) items.push({ id: `s${e.created_at}${e.user_id}`, who: name(e.user_id), avatar: ava(e.user_id),
        action: "ți-a dat share profilului", icon: Share2, color: "#10b981", when: e.created_at });
    }
    items.sort((a, b) => +new Date(b.when) - +new Date(a.when));
    return items.slice(0, 10);
  }, [data]);

  /* ---------------- AI Coach insights ---------------- */
  const insights = useMemo(() => {
    const out: { icon: any; title: string; detail: string; cta?: string; onClick?: () => void; tone: "pink"|"cyan"|"violet"|"amber"|"emerald" }[] = [];

    // Day-of-week analysis from joins
    const dow: Record<number, number> = {};
    for (const j of data?.partyJoins7 ?? []) {
      const d = new Date(j.created_at).getDay();
      dow[d] = (dow[d] ?? 0) + 1;
    }
    const top = Object.entries(dow).sort((a, b) => b[1] - a[1])[0];
    if (top) {
      const total = Object.values(dow).reduce((a, b) => a + b, 0) || 1;
      const dayName = ["Duminică","Luni","Marți","Miercuri","Joi","Vineri","Sâmbătă"][Number(top[0])];
      const sharePct = Math.round((top[1] / total) * 100);
      if (sharePct > 30) out.push({
        icon: Calendar, tone: "pink",
        title: `${dayName} = ziua ta de aur`,
        detail: `${sharePct}% din interesul pe evenimente vine ${dayName.toLowerCase()}. Lansează un eveniment recurent.`,
        cta: "Planifică eveniment", onClick: onNewCampaign,
      });
    }

    // Photos check
    const photoMissing = !business.cover_url || !business.logo_url;
    if (photoMissing) out.push({
      icon: Sparkles, tone: "amber",
      title: "Adaugă mai multe fotografii",
      detail: "Profilurile cu cover + logo primesc cu ~24% mai multă vizibilitate în feed.",
      cta: "Editează profilul",
    });

    // Ranking
    if (cityRank.rank && cityRank.rank > 10 && cityRank.rank <= 15) out.push({
      icon: Trophy, tone: "violet",
      title: `Top 10 e la ${cityRank.rank - 10} poziții`,
      detail: `Mai ai nevoie de câteva recenzii și un boost ca să intri în Top 10 din oraș săptămâna asta.`,
      cta: "Lansează boost", onClick: onNewCampaign,
    });

    // Active campaign trigger
    if (campaigns.filter((c) => c.status === "active").length === 0) out.push({
      icon: Rocket, tone: "cyan",
      title: "Lansează o promovare acum",
      detail: "Cluburile cu campanii active prind până la 3x mai multă atenție într-o noapte.",
      cta: "Promovează", onClick: onNewCampaign,
    });

    // Live momentum
    if (liveViewers >= 3) out.push({
      icon: Flame, tone: "pink",
      title: `${liveViewers} oameni te văd ACUM`,
      detail: "Acesta e momentul perfect să publici o ofertă sau o poză nouă — fier la cald.",
      cta: "Publică acum", onClick: onNewCampaign,
    });

    if (reviews7 === 0 && profileViews > 20) out.push({
      icon: MessageCircle, tone: "emerald",
      title: "Cere primele recenzii",
      detail: "Ai trafic, dar zero recenzii săptămâna asta. Un mesaj la 3 clienți poate face diferența.",
    });

    return out.slice(0, 4);
  }, [data, business, campaigns, cityRank.rank, onNewCampaign, liveViewers, profileViews, reviews7]);

  /* ---------------- Heatmap zones (mock zones + real signal) ---------------- */
  const zones = useMemo(() => {
    const total = views7 + mapClicks7 + eventJoins7 || 1;
    const seedZones = [
      { name: "Centru",     pos: { x: 50, y: 45 }, weight: 0.32 },
      { name: "Aurel Vlaicu", pos: { x: 70, y: 30 }, weight: 0.20 },
      { name: "Micălaca",   pos: { x: 30, y: 60 }, weight: 0.18 },
      { name: "Subcetate",  pos: { x: 25, y: 35 }, weight: 0.12 },
      { name: "Alfa",       pos: { x: 75, y: 65 }, weight: 0.10 },
      { name: "Gai",        pos: { x: 55, y: 75 }, weight: 0.08 },
    ];
    return seedZones.map((z) => ({ ...z, hits: Math.round(total * z.weight) }));
  }, [views7, mapClicks7, eventJoins7]);

  /* ---------------- Tier upsell tiers ---------------- */
  const upsellTiers = [
    { id: "starter", name: "Starter", price: "Gratuit", icon: MapPin, color: "from-zinc-500 to-zinc-700",
      perks: ["Vizibil pe hartă", "Profil de bază", "Recenzii"] },
    { id: "popular", name: "Popular", price: "199 RON/lună", icon: TrendingUp, color: "from-violet-500 to-fuchsia-500",
      perks: ["Feed Boost zilnic", "Statistici avansate", "3 evenimente promovate"], badge: "Recomandat" },
    { id: "elite", name: "Elite", price: "499 RON/lună", icon: Crown, color: "from-pink-500 to-rose-500",
      perks: ["Featured Tonight", "Push notifications", "Evenimente nelimitate", "Suport prioritar"] },
    { id: "partner", name: "Partener", price: "Contact", icon: Sparkles, color: "from-amber-400 to-orange-500",
      perks: ["Homepage takeover", "Brand exclusiv pe oraș", "Account manager", "Campanii custom"] },
  ];

  const totalSpent = campaigns.reduce((s, c) => s + (c.spent_cents || 0), 0);
  const totalBudget = campaigns.reduce((s, c) => s + (c.budget_cents || 0), 0);
  const totalImpressions = campaigns.reduce((s, c) => s + (c.impressions || 0), 0);
  const totalClicks = campaigns.reduce((s, c) => s + (c.clicks || 0), 0);
  const activeCount = campaigns.filter((c) => c.status === "active").length;

  async function shareProfile() {
    const url = `${window.location.origin}/biz/${business.slug ?? business.id}`;
    try {
      if (navigator.share) await navigator.share({ title: business.brand_name, url });
      else { await navigator.clipboard.writeText(url); toast.success("Link copiat"); }
    } catch {}
  }

  return (
    <div className="space-y-6">
      {/* ====================== HERO ====================== */}
      <section id="biz-dashboard">
        <GlassCard glow="pink" className="relative">
          {/* Cover background */}
          <div className="relative h-[280px] sm:h-[340px] overflow-hidden">
            {business.cover_url ? (
              <img src={business.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-violet-700 via-fuchsia-700 to-pink-600" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30" />
            {/* Top badges */}
            <div className="absolute top-4 left-4 right-4 flex items-start justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {isTrending && <NeonBadge color="pink" live>🔥 Trending Tonight</NeonBadge>}
                {liveViewers > 0 && <NeonBadge color="cyan" live>{liveViewers} oameni te văd acum</NeonBadge>}
                {business.verified && <NeonBadge color="violet"><BadgeCheck size={11} /> Verificat</NeonBadge>}
              </div>
              <button onClick={shareProfile} className="p-2 rounded-xl bg-black/50 backdrop-blur border border-white/10 hover:border-white/30 text-white">
                <Share2 size={14} />
              </button>
            </div>
            {/* Bottom identity */}
            <div className="absolute left-4 right-4 bottom-4 flex items-end gap-4">
              {business.logo_url ? (
                <img src={business.logo_url} alt="" className="w-20 h-20 rounded-2xl object-cover border-2 border-white/20 shadow-2xl shadow-black/60" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 grid place-items-center text-3xl font-display text-white border-2 border-white/20">
                  {business.brand_name?.[0]?.toUpperCase() ?? "?"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h1 className="font-display text-3xl sm:text-4xl uppercase text-white tracking-tight truncate">{business.brand_name}</h1>
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-300 mt-1">
                  {business.type} · {tier.name}
                </div>
              </div>
            </div>
          </div>
          {/* Live stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-white/5 border-t border-white/10">
            <div className="p-4">
              <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-zinc-500 flex items-center gap-1.5">
                <Radio size={9} className="text-pink-400 animate-pulse" /> Popularitate
              </div>
              <div className="mt-1 font-display text-2xl tabular-nums text-white">{trendingScore}<span className="text-xs text-zinc-500">/100</span></div>
            </div>
            <div className="p-4">
              <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-zinc-500">Te văd acum</div>
              <div className="mt-1 font-display text-2xl tabular-nums text-cyan-300">{liveViewers}</div>
            </div>
            <div className="p-4">
              <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-zinc-500">Interesați diseară</div>
              <div className="mt-1 font-display text-2xl tabular-nums text-pink-300">{tonightInterested}</div>
            </div>
            <div className="p-4">
              <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-zinc-500">Loc în oraș</div>
              <div className="mt-1 font-display text-2xl tabular-nums text-amber-300">
                {cityRank.rank ? `#${cityRank.rank}` : "—"}<span className="text-xs text-zinc-500">{cityRank.rank ? ` / ${cityRank.total}` : ""}</span>
              </div>
            </div>
          </div>
        </GlassCard>
      </section>

      {/* ====================== GROWTH CARDS ====================== */}
      <section id="biz-stats">
        <GlassCard>
          <SectionHead icon={TrendingUp} eyebrow="Ultimele 7 zile" title="Creștere & Atenție" accent="violet" />
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 p-5 pt-0">
            <GrowthCard icon={Eye}          label="Te-au descoperit"     value={views7}       delta={pct(views7, views14)}               color="#a78bfa" series={series.views} />
            <GrowthCard icon={MapPin}       label="Vizite pe hartă"      value={mapClicks7}   delta={pct(mapClicks7, mapClicks14)}       color="#22d3ee" series={series.map} />
            <GrowthCard icon={Calendar}     label="Interes evenimente"   value={eventJoins7}  delta={pct(eventJoins7, eventJoins14)}     color="#ec4899" series={series.joins} />
            <GrowthCard icon={MessageCircle} label="Conversații începute" value={series.convs.reduce((a,b)=>a+b,0)} delta={0}            color="#f59e0b" series={series.convs} />
            <GrowthCard icon={Bookmark}     label="Te-au salvat"         value={series.saves.reduce((a,b)=>a+b,0)} delta={0}             color="#10b981" series={series.saves} />
            <GrowthCard icon={Footprints}   label="Vizite estimate"      value={estVisits}    delta={pct(estVisits, Math.max(1, checkins7))} color="#f472b6" series={series.foot} />
          </div>
          <div className="border-t border-white/5 px-5 py-3 flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-zinc-500">
            <span>Followeri totali: <span className="text-white">{fmt(data?.followers ?? 0)}</span></span>
            {followersDelta !== 0 && <span className={followersDelta > 0 ? "text-emerald-400" : "text-rose-400"}>{followersDelta > 0 ? "+" : ""}{followersDelta} în 7z ({followersPct.toFixed(0)}%)</span>}
          </div>
        </GlassCard>
      </section>

      {/* ====================== HEATMAP ====================== */}
      <section id="biz-visibility">
        <GlassCard glow="cyan">
          <SectionHead icon={MapPin} eyebrow="Distribuție trafic" title="Heatmap oraș" accent="cyan" />
          <div className="relative mx-5 mb-5 rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-zinc-950 via-blue-950/40 to-violet-950/40 aspect-[2/1]">
            {/* grid lines */}
            <svg className="absolute inset-0 w-full h-full opacity-30" preserveAspectRatio="none" viewBox="0 0 100 50">
              {Array.from({ length: 10 }).map((_, i) => (
                <line key={`v${i}`} x1={i * 10} y1={0} x2={i * 10} y2={50} stroke="rgba(255,255,255,0.05)" strokeWidth="0.1" />
              ))}
              {Array.from({ length: 6 }).map((_, i) => (
                <line key={`h${i}`} x1={0} y1={i * 10} x2={100} y2={i * 10} stroke="rgba(255,255,255,0.05)" strokeWidth="0.1" />
              ))}
            </svg>
            {zones.map((z) => {
              const intensity = Math.min(1, z.weight * 3);
              const size = 60 + intensity * 80;
              return (
                <div key={z.name} className="absolute" style={{ left: `${z.pos.x}%`, top: `${z.pos.y}%`, transform: "translate(-50%, -50%)" }}>
                  <div
                    className="rounded-full animate-pulse"
                    style={{
                      width: size,
                      height: size,
                      background: `radial-gradient(circle, rgba(236,72,153,${intensity * 0.6}) 0%, rgba(167,139,250,${intensity * 0.3}) 40%, transparent 70%)`,
                      filter: "blur(2px)",
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur border border-white/10 whitespace-nowrap">
                      <div className="font-mono text-[9px] uppercase tracking-widest text-white">{z.name}</div>
                      <div className="font-display text-[10px] text-pink-300 text-center tabular-nums">{fmt(z.hits)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      </section>

      {/* ====================== LIVE FEED + AI COACH ====================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section id="biz-live">
          <GlassCard glow="pink" className="h-full">
            <SectionHead icon={Activity} eyebrow="Real-time" title="Activitate live" accent="pink" />
            <div className="px-5 pb-5 space-y-2 max-h-[500px] overflow-y-auto">
              {liveFeed.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 text-[11px]">Nicio activitate încă. Începe să promovezi.</div>
              ) : liveFeed.map((i) => (
                <div key={i.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/15 transition-all">
                  {i.avatar ? (
                    <img src={i.avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 grid place-items-center text-xs font-bold text-white">
                      {i.who[0]?.toUpperCase() ?? "?"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] text-white truncate"><span className="font-bold">{i.who}</span> <span className="text-zinc-400">{i.action}</span></div>
                    <div className="font-mono text-[9px] uppercase tracking-widest text-zinc-600 mt-0.5">{timeAgo(i.when)}</div>
                  </div>
                  <div className="w-7 h-7 rounded-lg grid place-items-center shrink-0" style={{ background: `${i.color}20`, color: i.color }}>
                    <i.icon size={12} />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </section>

        <section id="biz-recom">
          <GlassCard glow="violet" className="h-full">
            <SectionHead icon={Brain} eyebrow="Personal AI Growth Coach" title="AI Business Coach" accent="violet" />
            <div className="px-5 pb-5 space-y-3">
              {insights.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 text-[11px]">Totul arată bine. Coach-ul îți va da semnal cât de curând.</div>
              ) : insights.map((ins, i) => {
                const map = {
                  pink: "from-pink-500/30 to-pink-500/0 border-pink-500/30 text-pink-300",
                  cyan: "from-cyan-400/30 to-cyan-400/0 border-cyan-400/30 text-cyan-300",
                  violet: "from-violet-500/30 to-violet-500/0 border-violet-500/30 text-violet-300",
                  amber: "from-amber-400/30 to-amber-400/0 border-amber-400/30 text-amber-300",
                  emerald: "from-emerald-500/30 to-emerald-500/0 border-emerald-500/30 text-emerald-300",
                }[ins.tone];
                return (
                  <div key={i} className={`relative rounded-2xl p-4 border bg-gradient-to-r ${map} overflow-hidden`}>
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-black/40 grid place-items-center shrink-0">
                        <ins.icon size={15} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-display uppercase text-[13px] tracking-wide text-white">{ins.title}</div>
                        <div className="text-[11px] text-zinc-300 mt-1 leading-relaxed">{ins.detail}</div>
                        {ins.cta && (
                          <button onClick={ins.onClick} className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-[10px] font-mono uppercase tracking-widest text-white">
                            {ins.cta} <ArrowUpRight size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </section>
      </div>

      {/* ====================== CITY RANKINGS ====================== */}
      <section id="biz-reputation">
        <GlassCard glow="amber">
          <SectionHead icon={Trophy} eyebrow="Competiția din oraș" title="Top venues" accent="amber" />
          <div className="px-5 pb-5">
            {cityRank.list.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 text-[11px]">Adaugă oraș în profilul business-ului pentru a vedea clasamentul.</div>
            ) : (
              <div className="space-y-1.5">
                {cityRank.list.slice(0, 10).map((v: any, idx: number) => {
                  const isMe = v.id === business.id;
                  const rank = idx + 1;
                  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
                  return (
                    <div
                      key={v.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        isMe
                          ? "bg-gradient-to-r from-amber-500/20 via-pink-500/10 to-transparent border-amber-400/40 shadow-[0_0_24px] shadow-amber-500/10"
                          : "bg-white/[0.02] border-white/5 hover:border-white/15"
                      }`}
                    >
                      <div className={`w-9 text-center font-display text-lg tabular-nums ${rank <= 3 ? "text-amber-300" : "text-zinc-500"}`}>
                        {medal ?? `#${rank}`}
                      </div>
                      {v.logo_url ? (
                        <img src={v.logo_url} alt="" className="w-9 h-9 rounded-lg object-cover border border-white/10" />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-600 to-pink-600 grid place-items-center text-xs font-bold text-white">
                          {v.brand_name?.[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className={`text-[13px] truncate ${isMe ? "font-bold text-white" : "text-zinc-200"}`}>
                          {v.brand_name} {isMe && <span className="text-amber-300">(tu)</span>}
                        </div>
                        <div className="font-mono text-[9px] uppercase tracking-widest text-zinc-500">{v.type}</div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-amber-300 text-[12px] tabular-nums">
                          <Star size={11} className="fill-current" />{Number(v.reputation_score ?? 0).toFixed(1)}
                        </div>
                        <div className="font-mono text-[9px] text-zinc-500">{fmt(v.total_visits ?? 0)} vizite</div>
                      </div>
                    </div>
                  );
                })}
                {cityRank.rank && cityRank.rank > 10 && (
                  <div className="text-center text-[10px] font-mono uppercase tracking-widest text-zinc-500 pt-2">
                    Tu ești pe locul #{cityRank.rank} · mai sus cu {Math.max(0, cityRank.rank - 10)} poziții ești în Top 10
                  </div>
                )}
              </div>
            )}
          </div>
        </GlassCard>
      </section>

      {/* ====================== EVENT PERFORMANCE ====================== */}
      <section id="biz-events">
        <GlassCard>
          <SectionHead icon={Calendar} eyebrow="Performanță evenimente" title="Evenimentele tale" accent="pink" />
          <div className="px-5 pb-5 space-y-3">
            {parties.length === 0 ? (
              <div className="text-center py-10">
                <div className="text-zinc-500 text-[12px] mb-3">Niciun eveniment publicat. Publică unul ca să atragi atenția.</div>
                <button onClick={onNewCampaign} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-[11px] font-display uppercase tracking-widest" style={{ background: "linear-gradient(135deg, #ec4899, #a78bfa)" }}>
                  <Plus size={12} /> Creează eveniment
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {parties.slice(0, 4).map((p: any) => {
                  const joins = (data?.partyJoins7 ?? []).filter((j: any) => j.party_id === p.id).length;
                  const popularity = Math.min(100, joins * 12 + 10);
                  return (
                    <div key={p.id} className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent p-4">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="font-display uppercase text-[13px] tracking-wide text-white truncate flex-1">{p.title}</div>
                        <NeonBadge color={popularity > 60 ? "pink" : "violet"}>{popularity}% hot</NeonBadge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <div className="font-display text-lg tabular-nums text-violet-300">{Math.round(joins * 8)}</div>
                          <div className="font-mono text-[8px] uppercase tracking-widest text-zinc-500">Reach</div>
                        </div>
                        <div>
                          <div className="font-display text-lg tabular-nums text-pink-300">{joins}</div>
                          <div className="font-mono text-[8px] uppercase tracking-widest text-zinc-500">Interesați</div>
                        </div>
                        <div>
                          <div className="font-display text-lg tabular-nums text-cyan-300">{Math.round(joins * 0.6)}</div>
                          <div className="font-mono text-[8px] uppercase tracking-widest text-zinc-500">Estimat going</div>
                        </div>
                      </div>
                      <div className="mt-3 h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${popularity}%`, background: "linear-gradient(90deg, #a78bfa, #ec4899, #f59e0b)" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </GlassCard>
      </section>

      {/* ====================== PREMIUM UPSELL ====================== */}
      <section id="biz-promo">
        <GlassCard glow="pink">
          <SectionHead icon={Rocket} eyebrow="Deblochează mai multă vizibilitate" title="Premium Tiers" accent="pink" />
          <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {upsellTiers.map((t) => {
              const isCurrent = (business.tier ?? "starter") === t.id;
              return (
                <div key={t.id} className={`relative rounded-2xl border p-4 overflow-hidden ${isCurrent ? "border-emerald-400/40 bg-emerald-400/5" : "border-white/10 bg-white/[0.02] hover:border-white/30 transition-all"}`}>
                  {t.badge && !isCurrent && (
                    <div className="absolute top-0 right-0 px-2 py-0.5 rounded-bl-lg bg-gradient-to-r from-pink-500 to-violet-500 text-[8px] font-mono uppercase tracking-widest text-white">{t.badge}</div>
                  )}
                  {isCurrent && (
                    <div className="absolute top-0 right-0 px-2 py-0.5 rounded-bl-lg bg-emerald-500 text-[8px] font-mono uppercase tracking-widest text-white">Actual</div>
                  )}
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${t.color} grid place-items-center mb-3`}>
                    <t.icon size={16} className="text-white" />
                  </div>
                  <div className="font-display uppercase text-base text-white">{t.name}</div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-400 mt-0.5">{t.price}</div>
                  <ul className="mt-3 space-y-1.5">
                    {t.perks.map((p) => (
                      <li key={p} className="flex items-center gap-1.5 text-[11px] text-zinc-300">
                        <Zap size={10} className="text-amber-400 shrink-0" /> {p}
                      </li>
                    ))}
                  </ul>
                  {!isCurrent && (
                    <Link to="/app/biz/plans" className="mt-4 block text-center px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-[10px] font-mono uppercase tracking-widest text-white">
                      Upgrade
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </GlassCard>
      </section>

      {/* ====================== CAMPAIGN MANAGER ====================== */}
      <section id="biz-campaigns">
        <GlassCard>
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <SectionHead icon={Megaphone} eyebrow="Promovare activă" title="Manager campanii" accent="violet" />
          </div>
          <div className="px-5 pb-5 space-y-4">
            {/* Wallet + KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-500/15 to-transparent p-3">
                <div className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-widest text-amber-300/80"><Wallet size={10} /> Wallet</div>
                <div className="mt-1 font-display text-xl tabular-nums text-amber-200">{ron(business.wallet_balance_cents ?? 0)} <span className="text-xs text-zinc-500">RON</span></div>
                <button onClick={onTopup} className="mt-2 w-full px-2 py-1.5 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/40 text-[9px] font-mono uppercase tracking-widest text-amber-200">+ Adaugă fonduri</button>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
                <div className="text-[9px] font-mono uppercase tracking-widest text-zinc-500">Buget total</div>
                <div className="mt-1 font-display text-xl tabular-nums text-white">{ron(totalBudget)} <span className="text-xs text-zinc-500">RON</span></div>
                <div className="mt-2 text-[9px] font-mono text-zinc-500">Cheltuit: {ron(totalSpent)}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
                <div className="text-[9px] font-mono uppercase tracking-widest text-zinc-500">Afișări</div>
                <div className="mt-1 font-display text-xl tabular-nums text-violet-300">{fmt(totalImpressions)}</div>
                <div className="mt-2 text-[9px] font-mono text-zinc-500">Click-uri: {fmt(totalClicks)}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
                <div className="text-[9px] font-mono uppercase tracking-widest text-zinc-500">Campanii active</div>
                <div className="mt-1 font-display text-xl tabular-nums text-pink-300">{activeCount}<span className="text-xs text-zinc-500">/{campaigns.length}</span></div>
                <div className="mt-2 text-[9px] font-mono text-zinc-500">CTR: {totalImpressions ? ((totalClicks/totalImpressions)*100).toFixed(1) : "0"}%</div>
              </div>
            </div>

            <button onClick={onNewCampaign} className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-2xl text-white font-display uppercase text-[12px] tracking-widest shadow-lg shadow-pink-500/20"
              style={{ background: "linear-gradient(135deg, #ec4899 0%, #a78bfa 50%, #22d3ee 100%)" }}>
              <Plus size={14} /> Lansează campanie nouă
            </button>

            {campaigns.length > 0 && (
              <div id="biz-manager" className="space-y-2">
                <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-zinc-500">
                  Toate campaniile ({campaigns.length})
                </div>
                {campaigns.map((c) => {
                  const pctSpent = c.budget_cents ? Math.min(100, (c.spent_cents / c.budget_cents) * 100) : 0;
                  const isActive = c.status === "active";
                  return (
                    <div key={c.id} className="rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/15 overflow-hidden transition-all">
                      <div className="flex items-center justify-between gap-3 p-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"}`} />
                            <div className="text-[13px] text-white truncate">{c.title}</div>
                          </div>
                          <div className="font-mono text-[9px] uppercase tracking-widest text-zinc-500 truncate mt-1">
                            {c.kind} · {fmt(c.impressions)} afișări · {ron(c.spent_cents)}/{ron(c.budget_cents)} RON
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => onEditCampaign(c)} className="p-2 rounded-lg border border-white/10 text-zinc-400 hover:text-white hover:border-white/30" aria-label="Editează"><Pencil size={12} /></button>
                          <button onClick={() => onDuplicateCampaign(c)} className="p-2 rounded-lg border border-white/10 text-zinc-400 hover:text-white hover:border-white/30" aria-label="Duplică"><Copy size={12} /></button>
                          <button onClick={() => onToggleCampaign(c)}
                            className={`p-2 rounded-lg border ${isActive ? "border-amber-400/40 text-amber-300" : "border-emerald-400/40 text-emerald-300"}`}
                            aria-label={isActive ? "Pauză" : "Pornește"}>
                            {isActive ? <Pause size={12} /> : <Play size={12} />}
                          </button>
                          <button onClick={() => onDeleteCampaign(c)} className="p-2 rounded-lg border border-white/10 text-zinc-400 hover:text-rose-400 hover:border-rose-400/40" aria-label="Șterge"><Trash2 size={12} /></button>
                        </div>
                      </div>
                      <div className="h-[3px] bg-white/5">
                        <div className="h-full" style={{ width: `${pctSpent}%`, background: "linear-gradient(90deg, #ec4899, #a78bfa, #22d3ee)" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </GlassCard>
      </section>

      {coverSlot && <div className="hidden">{coverSlot}{headerSlot}</div>}
    </div>
  );
}

function timeAgo(iso: string) {
  const s = Math.max(0, Math.round((Date.now() - +new Date(iso)) / 1000));
  if (s < 60) return `acum ${s}s`;
  if (s < 3600) return `acum ${Math.round(s / 60)}m`;
  if (s < 86400) return `acum ${Math.round(s / 3600)}h`;
  return `acum ${Math.round(s / 86400)}z`;
}

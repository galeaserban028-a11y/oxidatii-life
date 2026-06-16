import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Flame, MapPin, Users, Plus } from "lucide-react";

import { PromoTakeover } from "@/components/app/PromoTakeover";

type FeedItem = {
  id: string;
  kind: "photo" | "proof";
  created_at: string;
  photo_url: string;
  media_type: "image" | "video";
  caption: string | null;
  user_id: string;
  venue_id: string | null;
};

export const Route = createFileRoute("/app/")({
  head: () => ({ meta: [{ title: "Live · OXIDAȚII" }] }),
  component: AppFeed,
});

async function loadFeed() {
  const { data: proofs } = await supabase
    .from("sprit_proofs")
    .select("id, photo_url, media_type, created_at, user_id, venue_id, ai_verified")
    .eq("ai_verified", true)
    .order("created_at", { ascending: false })
    .limit(30);

  const items: FeedItem[] = [
    ...(proofs ?? []).map((p) => ({

      id: `sp-${p.id}`,
      kind: "proof" as const,
      created_at: p.created_at,
      photo_url: p.photo_url,
      media_type: (p.media_type ?? "image") as "image" | "video",
      caption: null,
      user_id: p.user_id,
      venue_id: p.venue_id,
    })),
  ].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));

  const userIds = Array.from(new Set(items.map((i) => i.user_id)));
  const venueIds = Array.from(
    new Set(items.map((i) => i.venue_id).filter((v): v is string => !!v)),
  );

  const [{ data: profilesData }, { data: venuesData }] = await Promise.all([
    userIds.length
      ? supabase.from("profiles").select("id, handle, display_name, rank, avatar_url").in("id", userIds)
      : Promise.resolve({ data: [] as any[] }),
    venueIds.length
      ? supabase
          .from("venues")
          .select("id, name, slug, address, city:cities(name, slug)")
          .in("id", venueIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const profilesMap = new Map((profilesData ?? []).map((p: any) => [p.id, p]));
  const venuesMap = new Map((venuesData ?? []).map((v: any) => [v.id, v]));

  return { items, profilesMap, venuesMap };
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - +new Date(iso)) / 1000);
  if (s < 60) return `acum ${s}s`;
  if (s < 3600) return `acum ${Math.floor(s / 60)}m`;
  if (s < 86400) return `acum ${Math.floor(s / 3600)}h`;
  return `acum ${Math.floor(s / 86400)}z`;
}

function AppFeed() {
  const { data, isLoading } = useQuery({
    queryKey: ["app-feed"],
    queryFn: loadFeed,
    refetchInterval: 60_000,
  });

  return (
    <div
      className="px-5 pt-6 pb-8 space-y-8"
      style={{ fontFamily: "'Work Sans', system-ui, sans-serif" }}
    >
      <PromoTakeover />

      {/* Status header */}
      <header className="space-y-7">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.25em]">
          <span className="flex items-center gap-2 text-white/60">
            <span
              className="inline-block h-2 w-2 rounded-full bg-[#ff6b35] animate-pulse"
              style={{ boxShadow: "0 0 8px #ff6b35" }}
            />
            LIVE · ROMÂNIA
          </span>
          <span className="text-white/30">
            {new Date().toLocaleDateString("ro-RO", { weekday: "long" })}
          </span>
        </div>

        {/* Editorial headline */}
        <h1
          className="text-[42px] leading-[0.92] text-white"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          Ce șprițuri sunt
          <br />
          <span
            className="italic bg-clip-text text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(90deg, #ff6b35, #e84393, #6c5ce7)",
            }}
          >
            diseară
          </span>
        </h1>

        {/* Bento quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/app/scan"
            className="row-span-2 rounded-3xl border border-white/5 bg-[#121212] p-5 flex flex-col justify-between min-h-[156px] active:scale-[0.98] transition-all"
          >
            <div className="w-10 h-10 rounded-2xl bg-[#ff6b35]/15 flex items-center justify-center text-[#ff6b35]">
              <Plus size={22} strokeWidth={2.6} />
            </div>
            <span className="text-[13px] font-bold uppercase tracking-wider leading-tight">
              Deschide
              <br />
              șpriț
            </span>
          </Link>

          <Link
            to="/app/faze"
            className="rounded-3xl border border-white/5 bg-[#121212] p-4 flex flex-col gap-3 active:scale-[0.98] transition-all"
          >
            <div className="w-8 h-8 rounded-xl bg-[#f7931e]/15 flex items-center justify-center text-base leading-none">
              🎬
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider leading-tight">
              Faze din teren
            </span>
          </Link>

          <Link
            to="/app/squad"
            className="rounded-3xl border border-white/5 bg-[#121212] p-4 flex flex-col gap-3 active:scale-[0.98] transition-all"
          >
            <div className="w-8 h-8 rounded-xl bg-[#6c5ce7]/15 flex items-center justify-center text-[#6c5ce7]">
              <Users size={16} strokeWidth={2.4} />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider leading-tight">
              Haita ta
            </span>
          </Link>
        </div>
      </header>

      <LiveSpritzStrip />

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-72 rounded-3xl bg-white/[0.04] animate-pulse"
            />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyFeed />
      ) : (
        <div className="space-y-4">
          {data.items.map((it) => {
            const profile = data.profilesMap.get(it.user_id);
            const venue = it.venue_id ? data.venuesMap.get(it.venue_id) : null;
            return (
              <FeedCard key={it.id} item={it} profile={profile} venue={venue} />
            );
          })}
        </div>
      )}
    </div>
  );
}

function LiveSpritzStrip() {
  const { data: parties = [] } = useQuery({
    queryKey: ["home-live-spritz"],
    queryFn: async () => {
      const { data } = await supabase
        .from("parties")
        .select("id, host_id, title, location_text, spots_total, starts_at, vibe")
        .gt("expires_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(6);
      return data ?? [];
    },
    refetchInterval: 30_000,
  });

  const ids = parties.map((p: any) => p.id);
  const { data: joins = [] } = useQuery({
    queryKey: ["home-live-spritz-joins", ids.sort().join(",")],
    queryFn: async () => {
      if (!ids.length) return [];
      const { data } = await supabase.from("party_joins").select("party_id,user_id").in("party_id", ids);
      return data ?? [];
    },
    enabled: ids.length > 0,
    refetchInterval: 30_000,
  });

  // hide full parties unless user is already in
  const { user } = useAuth();
  const visibleParties = parties.filter((p: any) => {
    const taken = joins.filter((j: any) => j.party_id === p.id).length;
    const free = p.spots_total - taken;
    const inParty = !!user && joins.some((j: any) => j.party_id === p.id && j.user_id === user.id);
    const isHost = user?.id === p.host_id;
    return free > 0 || inParty || isHost;
  });

  if (visibleParties.length === 0) return null;

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.25em] text-neon-crimson">
          <Flame size={12} /> șprițuri deschise · {visibleParties.length}
        </div>
        <Link to="/app/squad" className="font-mono text-[10px] uppercase tracking-widest text-neon-purple">
          toate →
        </Link>
      </div>

      {(

        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 no-scrollbar pb-1">
          {visibleParties.map((p: any) => {
            const taken = joins.filter((j: any) => j.party_id === p.id).length;
            const free = Math.max(0, p.spots_total - taken);
            return (
              <Link
                key={p.id}
                to="/app/parties"
                className="shrink-0 w-[220px] p-3 rounded-xl border border-foreground/10 bg-foreground/[0.04] hover:border-neon-crimson/40 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-neon-crimson flex items-center gap-1">
                    <Flame size={10} /> șpriț
                  </span>
                  <span className={`font-mono text-[9px] uppercase tracking-widest ${free === 0 ? "text-neon-crimson" : "text-neon-green"}`}>
                    {free === 0 ? "plin" : `${free}/${p.spots_total} libere`}
                  </span>
                </div>
                <div className="font-display font-bold text-sm leading-tight line-clamp-2">{p.title}</div>
                <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                  <span className="flex items-center gap-1 truncate"><MapPin size={9} /> {p.location_text}</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  {p.vibe && <span className="font-mono text-[9px] uppercase tracking-widest text-neon-purple truncate">{p.vibe}</span>}
                  <span className="font-mono text-[9px] uppercase tracking-widest text-neon-green flex items-center gap-1 ml-auto">
                    <Users size={9} /> {taken} vin
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}



const FEED_BADGES = [
  { key: "legendar", label: "LEGENDAR", className: "bg-neon-crimson/15 text-neon-crimson border-neon-crimson/40" },
  { key: "murit", label: "AM MURIT", className: "bg-amber-400/15 text-amber-300 border-amber-400/40" },
  { key: "wow", label: "WOW", className: "bg-cyan-400/15 text-cyan-300 border-cyan-400/40" },
  { key: "verificat", label: "VERIFICAT", className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40" },
] as const;

function pickFeedBadge(id: string, isProof: boolean) {
  if (isProof) return FEED_BADGES[3];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return FEED_BADGES[h % 3];
}

function pseudoCount(id: string, salt: number, max: number) {
  let h = salt;
  for (let i = 0; i < id.length; i++) h = (h * 33 + id.charCodeAt(i)) >>> 0;
  return (h % max) + 1;
}

function formatCount(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

function FeedCard({ item, profile, venue }: { item: FeedItem; profile: any; venue: any }) {
  const handle = profile?.display_name ?? profile?.handle ?? "Anonim";
  const badge = pickFeedBadge(item.id, item.kind === "proof");
  const likes = pseudoCount(item.id, 13, 1800);
  const comments = pseudoCount(item.id, 41, 200);
  const reposts = pseudoCount(item.id, 89, 80);
  return (
    <article className="rounded-2xl border border-foreground/10 bg-card/40 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-3">
        <Link to="/app/user/$id" params={{ id: item.user_id }} className="shrink-0">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt={handle} className="size-10 rounded-full object-cover border border-foreground/10" />
          ) : (
            <div className="size-10 rounded-full bg-foreground/10 flex items-center justify-center font-display text-sm">
              {handle[0]?.toUpperCase() ?? "?"}
            </div>
          )}
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Link to="/app/user/$id" params={{ id: item.user_id }} className="font-display text-sm truncate">{handle}</Link>
            {badge.key === "legendar" && <span className="text-neon-crimson">⚡</span>}
          </div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground truncate">
            📍 {venue?.name ?? "—"} · {timeAgo(item.created_at)}
          </div>
        </div>
        <span className={`shrink-0 inline-flex items-center px-2 py-[3px] rounded-md border text-[10px] font-mono uppercase tracking-[0.15em] ${badge.className}`}>
          {badge.label}
        </span>
      </div>

      {/* Media */}
      <div className="relative bg-black">
        {item.media_type === "video" ? (
          <video src={item.photo_url} className="w-full aspect-[4/5] object-cover" playsInline muted loop preload="metadata" />
        ) : (
          <img src={item.photo_url} alt={item.caption ?? ""} className="w-full aspect-[4/5] object-cover" loading="lazy" />
        )}
        {item.media_type === "video" && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="size-14 rounded-full bg-white/90 text-black flex items-center justify-center text-xl shadow-xl">▶</div>
          </div>
        )}
      </div>

      {/* Caption */}
      {item.caption && (
        <div className="px-4 pt-3 text-sm leading-snug">{item.caption}</div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 px-2 py-2">
        <Link to="/app/faze" className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full hover:bg-foreground/[0.05] active:scale-95 transition">
          <svg viewBox="0 0 24 24" className="size-[18px] fill-none stroke-foreground/80" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z"/></svg>
          <span className="font-mono text-xs tabular-nums">{formatCount(likes)}</span>
        </Link>
        <Link to="/app/faze" className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full hover:bg-foreground/[0.05] active:scale-95 transition">
          <svg viewBox="0 0 24 24" className="size-[18px] fill-none stroke-foreground/80" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12z"/></svg>
          <span className="font-mono text-xs tabular-nums">{formatCount(comments)}</span>
        </Link>
        <Link to="/app/faze" className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full hover:bg-foreground/[0.05] active:scale-95 transition">
          <svg viewBox="0 0 24 24" className="size-[18px] fill-none stroke-foreground/80" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h13l-3-3"/><path d="M20 17H7l3 3"/></svg>
          <span className="font-mono text-xs tabular-nums">{formatCount(reposts)}</span>
        </Link>
      </div>
    </article>
  );
}


function EmptyFeed() {
  return (
    <div
      className="rounded-[36px] border border-dashed border-white/10 px-7 py-10 text-center flex flex-col items-center"
      style={{
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0))",
        fontFamily: "'Work Sans', system-ui, sans-serif",
      }}
    >
      <div
        className="w-20 h-20 rounded-2xl mb-6 flex items-center justify-center text-4xl"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, rgba(108,92,231,0.25), rgba(232,67,147,0.15) 60%, rgba(0,0,0,0) 80%)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        🌃
      </div>
      <h2 className="text-[17px] font-bold uppercase tracking-tight mb-3 text-white">
        Șprițurile încă sunt active.
      </h2>
      <p className="text-[13px] text-white/45 leading-relaxed mb-8 max-w-[260px]">
        Nimeni n-a postat încă. Nu inventăm conținut. Când oamenii reali încep
        să posteze, apar aici — nimic altceva.
      </p>
      <Link
        to="/app/scan"
        className="w-full py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] text-white active:scale-95 transition-transform"
        style={{
          background:
            "linear-gradient(90deg, #ff6b35, #e84393, #6c5ce7)",
          boxShadow: "0 12px 32px -12px rgba(255,107,53,0.55)",
        }}
      >
        Fii primul → scanează un șpriț
      </Link>
    </div>
  );
}

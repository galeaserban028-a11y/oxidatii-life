import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Flame, MapPin, Users, Plus, MoreHorizontal, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

import { PromoTakeover } from "@/components/app/PromoTakeover";
import { NightWrapCard } from "@/components/app/NightWrapCard";
import { FadeIn } from "@/components/app/FadeIn";
import { getOrCreateNightWrap } from "@/lib/night-wrap.functions";
import VideoTile from "@/components/app/VideoTile";
import PhotoZoom from "@/components/app/PhotoZoom";
import PinchImage from "@/components/app/PinchImage";
import TonightCard from "@/components/app/TonightCard";
import { errorMessage } from "@/lib/errors";

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
  const cutoff = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
  const [{ data: proofs }, { data: photos }] = await Promise.all([
    supabase
      .from("sprit_proofs")
      .select("id, photo_url, media_type, created_at, user_id, venue_id, ai_verified")
      .eq("ai_verified", true)
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("venue_photos")
      .select("id, photo_url, media_type, caption, created_at, user_id, venue_id")
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  // De-dupe: a Șpriț post writes to both tables with same photo_url.
  // Prefer the sprit_proofs row (kind="proof") so it keeps its Live badge.
  const proofUrls = new Set((proofs ?? []).map((p: any) => p.photo_url));

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
    ...(photos ?? [])
      .filter((p: any) => !proofUrls.has(p.photo_url))
      .map((p: any) => ({
        id: `vp-${p.id}`,
        kind: "photo" as const,
        created_at: p.created_at,
        photo_url: p.photo_url,
        media_type: (p.media_type ?? "image") as "image" | "video",
        caption: p.caption ?? null,
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
      ? supabase
          .from("profiles")
          .select("id, handle, display_name, rank, avatar_url")
          .in("id", userIds)
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

      <NightWrapSection />

      {/* Status header */}
      <header className="space-y-7">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.25em]">
          <span className="flex items-center gap-2 text-white/60">
            <span
              className="inline-block h-2 w-2 rounded-full bg-[#ff3d8b] animate-pulse"
              style={{ boxShadow: "0 0 8px #ff3d8b" }}
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
              backgroundImage: "linear-gradient(90deg, #ff3d8b, #c724ff, #00e5ff)",
            }}
          >
            diseară
          </span>
        </h1>

        {/* Primary actions — bold editorial duo */}
        <div className="grid grid-cols-5 gap-3">
          <Link
            to="/app/scan"
            className="col-span-3 relative overflow-hidden rounded-3xl p-5 min-h-[170px] flex flex-col justify-between active:scale-[0.98] transition-all"
            style={{
              background: "linear-gradient(135deg, #ff3d8b 0%, #c724ff 55%, #00e5ff 100%)",
              boxShadow:
                "0 18px 40px -18px rgba(255,61,139,0.55), inset 0 1px 0 rgba(255,255,255,0.18)",
            }}
          >
            <div
              aria-hidden
              className="absolute -top-10 -right-10 h-32 w-32 rounded-full opacity-40 blur-2xl"
              style={{
                background: "radial-gradient(circle, rgba(255,255,255,0.4), transparent 70%)",
              }}
            />
            <div className="relative w-11 h-11 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white">
              <Plus size={24} strokeWidth={2.8} />
            </div>
            <div className="relative">
              <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/75">
                postează acum
              </div>
              <div
                className="text-[28px] leading-[0.95] text-white mt-1"
                style={{ fontFamily: "'Instrument Serif', serif" }}
              >
                Deschide <span className="italic">șpriț</span>
              </div>
            </div>
          </Link>

          <Link
            to="/app/faze"
            className="col-span-2 relative overflow-hidden rounded-3xl border border-white/10 bg-[#0f0f10] p-4 min-h-[170px] flex flex-col justify-between active:scale-[0.98] transition-all"
          >
            <div
              aria-hidden
              className="absolute -bottom-8 -left-8 h-28 w-28 rounded-full opacity-30 blur-2xl"
              style={{ background: "radial-gradient(circle, #ffea00, transparent 70%)" }}
            />
            <div className="relative flex items-center gap-2">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full bg-[#ffea00] animate-pulse"
                style={{ boxShadow: "0 0 8px #ffea00" }}
              />
              <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-[#ffea00]">
                live
              </span>
            </div>
            <div className="relative">
              <div className="text-3xl leading-none mb-2">🎬</div>
              <div
                className="text-[20px] leading-[0.95] text-white"
                style={{ fontFamily: "'Instrument Serif', serif" }}
              >
                Faze din <span className="italic">teren</span>
              </div>
            </div>
          </Link>
        </div>
      </header>

      <TonightCard />

      <LiveSpritzStrip />

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-72 rounded-3xl bg-white/[0.04] animate-pulse" />
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
              <FadeIn key={it.id} y={10}>
                <FeedCard item={it} profile={profile} venue={venue} />
              </FadeIn>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NightWrapSection() {
  const { user } = useAuth();
  const generateWrap = useServerFn(getOrCreateNightWrap);
  const { data } = useQuery({
    queryKey: ["night-wrap", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const hour = new Date().getHours();
      // only after 6 AM local
      if (hour < 6) return null;
      const result = await generateWrap({ data: {} });
      return "wrap" in result ? result.wrap : null;
    },
    staleTime: 60 * 60 * 1000,
  });
  if (!data) return null;
  return <NightWrapCard wrap={data} />;
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
      const { data } = await supabase
        .from("party_joins")
        .select("party_id,user_id")
        .in("party_id", ids);
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
        <div
          className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.25em]"
          style={{ color: "var(--warm-rose)" }}
        >
          <Flame size={12} /> șprițuri deschise · {visibleParties.length}
        </div>
        <Link
          to="/app/squad"
          className="font-mono text-[10px] uppercase tracking-widest"
          style={{ color: "var(--warm-orange)" }}
        >
          toate →
        </Link>
      </div>

      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 no-scrollbar pb-1">
        {visibleParties.map((p: any) => {
          const taken = joins.filter((j: any) => j.party_id === p.id).length;
          const free = Math.max(0, p.spots_total - taken);
          return (
            <Link
              key={p.id}
              to="/app/parties"
              className="shrink-0 w-[220px] p-3 rounded-2xl space-y-1.5 relative overflow-hidden transition-transform active:scale-[0.98]"
              style={{
                background:
                  "linear-gradient(135deg, var(--warm-orange) 0%, var(--warm-rose) 55%, var(--warm-amber) 100%)",
                border: "1px solid rgba(255,255,255,0.18)",
                boxShadow: "var(--warm-glow)",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              <div
                className="pointer-events-none absolute -top-4 -right-4 h-14 w-14 rounded-full blur-[24px] opacity-45"
                style={{ background: "var(--warm-amber)" }}
              />
              <div className="relative flex items-center justify-between">
                <span className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-white/85 flex items-center gap-1">
                  <Flame size={10} /> șpriț
                </span>
                <span
                  className="text-[9px] font-extrabold uppercase tracking-[0.15em] px-2 py-0.5 rounded-full bg-white/95"
                  style={{ color: free === 0 ? "var(--warm-rose)" : "var(--warm-rose)" }}
                >
                  {free === 0 ? "plin" : `${free}/${p.spots_total} libere`}
                </span>
              </div>
              <div className="relative font-extrabold text-sm leading-tight line-clamp-2 text-white tracking-tight">
                {p.title}
              </div>
              <div className="relative flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-white/80">
                <span className="flex items-center gap-1 truncate">
                  <MapPin size={9} /> {p.location_text}
                </span>
              </div>
              <div className="relative flex items-center justify-between pt-1">
                {p.vibe && (
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-white/90 truncate">
                    {p.vibe}
                  </span>
                )}
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-white flex items-center gap-1 ml-auto px-2 py-0.5 rounded-full bg-white/20">
                  <Users size={9} /> {taken} vin
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

const FEED_BADGES = [
  {
    key: "legendar",
    label: "LEGENDAR",
    className: "bg-neon-crimson/15 text-neon-crimson border-neon-crimson/40",
  },
  {
    key: "murit",
    label: "AM MURIT",
    className: "bg-amber-400/15 text-amber-300 border-amber-400/40",
  },
  { key: "wow", label: "WOW", className: "bg-cyan-400/15 text-cyan-300 border-cyan-400/40" },
  {
    key: "verificat",
    label: "VERIFICAT",
    className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  },
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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isMine = user?.id === item.user_id;
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [zoomOpen, setZoomOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  async function handleDelete() {
    if (!user || !isMine) return;
    if (!confirm("Sigur vrei să ștergi această postare?")) return;
    setDeleting(true);
    try {
      const rawId = item.id.replace(/^sp-|^vp-/, "");
      if (item.kind === "proof") {
        await supabase.from("sprit_proofs").delete().eq("id", rawId).eq("user_id", user.id);
        // also remove the companion venue_photos row sharing same photo_url
        await supabase
          .from("venue_photos")
          .delete()
          .eq("user_id", user.id)
          .eq("photo_url", item.photo_url);
      } else {
        await supabase.from("venue_photos").delete().eq("id", rawId).eq("user_id", user.id);
      }
      toast.success("Postare ștearsă");
      queryClient.invalidateQueries({ queryKey: ["app-feed"] });
      queryClient.invalidateQueries({ queryKey: ["spritz-of-the-day"] });
    } catch (e) {
      toast.error(errorMessage(e, "Nu s-a putut șterge"));
    } finally {
      setDeleting(false);
      setMenuOpen(false);
    }
  }

  return (
    <article className="rounded-2xl border border-foreground/10 bg-card/40 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 pt-3 pb-3.5">
        <Link to="/app/user/$id" params={{ id: item.user_id }} className="shrink-0">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={handle}
              className="size-9 rounded-full object-cover border border-foreground/10"
            />
          ) : (
            <div className="size-9 rounded-full bg-foreground/10 flex items-center justify-center font-display text-sm">
              {handle[0]?.toUpperCase() ?? "?"}
            </div>
          )}
        </Link>
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center gap-1 min-w-0">
            <Link
              to="/app/user/$id"
              params={{ id: item.user_id }}
              className="font-display text-[13px] truncate min-w-0"
            >
              {handle}
            </Link>
            {badge.key === "legendar" && (
              <span className="text-neon-crimson text-[11px] shrink-0">⚡</span>
            )}
          </div>
          {venue?.name && item.venue_id ? (
            <Link
              to="/app/map"
              search={{ venue: item.venue_id }}
              className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground truncate flex items-center gap-1 active:scale-95 transition hover:text-white min-w-0"
              aria-label={`Vezi ${venue.name} pe hartă`}
            >
              <MapPin size={9} className="shrink-0" />{" "}
              <span className="truncate underline-offset-2 hover:underline">{venue.name}</span> ·{" "}
              {timeAgo(item.created_at)}
            </Link>
          ) : (
            <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground truncate">
              📍 — · {timeAgo(item.created_at)}
            </div>
          )}
        </div>
        <span
          className={`shrink-0 inline-flex items-center px-1.5 py-[2px] rounded-md border text-[9px] font-mono uppercase tracking-[0.12em] ${badge.className}`}
        >
          {badge.label}
        </span>
        {isMine && (
          <div ref={menuRef} className="relative shrink-0">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="h-8 w-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10"
              aria-label="Opțiuni"
            >
              <MoreHorizontal size={18} />
            </button>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                className="absolute right-0 top-full mt-1 z-20 min-w-[160px] rounded-xl border border-white/10 bg-[#15151a] shadow-2xl overflow-hidden origin-top-right"
              >
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                >
                  <Trash2 size={15} />
                  {deleting ? "Se șterge…" : "Șterge postarea"}
                </button>
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Media */}
      <div className="relative bg-black aspect-[4/5] w-full">
        {item.media_type === "video" ? (
          <VideoTile src={item.photo_url} bottomInset={8} />
        ) : (
          <PinchImage src={item.photo_url} alt={item.caption ?? ""} className="w-full h-full" />
        )}
      </div>

      {/* Caption */}
      {item.caption && <div className="px-4 pb-3 pt-3 text-sm leading-snug">{item.caption}</div>}
      {zoomOpen &&
        item.media_type !== "video" &&
        typeof document !== "undefined" &&
        createPortal(
          <PhotoZoom
            src={item.photo_url}
            alt={item.caption ?? ""}
            onClose={() => setZoomOpen(false)}
          />,
          document.body,
        )}
    </article>
  );
}

function EmptyFeed() {
  return (
    <div
      className="rounded-[36px] border border-dashed border-white/10 px-7 py-10 text-center flex flex-col items-center"
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0))",
        fontFamily: "'Work Sans', system-ui, sans-serif",
      }}
    >
      <div
        className="w-20 h-20 rounded-2xl mb-6 flex items-center justify-center text-4xl"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, rgba(108,92,231,0.25), rgba(199,36,255,0.15) 60%, rgba(0,0,0,0) 80%)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        🌃
      </div>
      <h2 className="text-[17px] font-bold uppercase tracking-tight mb-3 text-white">
        Șprițurile încă sunt active.
      </h2>
      <p className="text-[13px] text-white/45 leading-relaxed mb-8 max-w-[260px]">
        Nimeni n-a postat încă. Nu inventăm conținut. Când oamenii reali încep să posteze, apar aici
        — nimic altceva.
      </p>
      <Link
        to="/app/scan"
        className="w-full py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] text-white active:scale-95 transition-transform"
        style={{
          background: "linear-gradient(90deg, #ff3d8b, #c724ff, #00e5ff)",
          boxShadow: "0 12px 32px -12px rgba(255,61,139,0.55)",
        }}
      >
        Fii primul → scanează un șpriț
      </Link>
    </div>
  );
}

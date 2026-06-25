import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect, Fragment } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ReportDialog } from "@/components/app/ReportDialog";
import { openOrCreateDM } from "@/lib/chat";
import { toast } from "sonner";
import { SponsoredFazaCard, usePromoCards } from "@/components/app/SponsoredFazaCard";
import PhotoZoom from "@/components/app/PhotoZoom";
import VideoTile from "@/components/app/VideoTile";

export const Route = createFileRoute("/app/faze")({
  head: () => ({ meta: [{ title: "Cele mai tari faze · OXIDAȚII" }] }),
  component: FazePage,
});

import {
  archivo,
  hind,
  instrument,
  SHEET_BOTTOM,
  type Moment,
  timeAgo,
  formatCount,
} from "@/components/app/faze/shared";
import { PostMenu } from "@/components/app/faze/PostMenu";
import { ShareSheet } from "@/components/app/faze/ShareSheet";
import { UploadSheet } from "@/components/app/faze/UploadSheet";
import { PrizeBanner } from "@/components/app/faze/PrizeBanner";
import { CommentsSheet } from "@/components/app/faze/CommentsSheet";

async function loadMoments(currentUserId: string | null) {
  // Restrict the FAZE feed to the current weekend window (Fri 18:00 -> Mon 06:00 Bucharest).
  // Outside that window, show last weekend (the function handles both cases).
  let startsAt: string | null = null;
  let endsAt: string | null = null;
  try {
    const { data: win } = await supabase.rpc("current_weekend_window" as any);
    const row: any = Array.isArray(win) ? win[0] : win;
    if (row?.starts_at) startsAt = row.starts_at;
    if (row?.ends_at) endsAt = row.ends_at;
  } catch {/* fall through to unfiltered */}

  let q = supabase
    .from("venue_photos")
    .select("id, photo_url, caption, taken_at, user_id, venue_id, media_type")
    .order("taken_at", { ascending: false })
    .limit(60);
  if (startsAt) q = q.gte("taken_at", startsAt);
  if (endsAt) q = q.lt("taken_at", endsAt);
  const { data: photos } = await q;

  const items: Moment[] = (photos ?? []).map((p) => ({
    id: p.id,
    photo_url: p.photo_url,
    caption: p.caption,
    created_at: p.taken_at,
    user_id: p.user_id,
    venue_id: p.venue_id,
    media_type: (p as any).media_type ?? null,
  }));
  const photoIds = items.map((i) => i.id);


  const userIds = Array.from(new Set(items.map((i) => i.user_id)));
  const venueIds = Array.from(new Set(items.map((i) => i.venue_id)));
  const [
    { data: profilesData },
    { data: venuesData },
    { data: likesData },
    { data: commentsData },
    { data: repostsData },
    { data: myLikes },
    { data: myReposts },
  ] = await Promise.all([
    userIds.length
      ? supabase.from("profiles").select("id, handle, display_name, avatar_url").in("id", userIds)
      : Promise.resolve({ data: [] as any[] }),
    venueIds.length
      ? supabase.from("venues").select("id, name, slug, city:cities(name)").in("id", venueIds)
      : Promise.resolve({ data: [] as any[] }),
    photoIds.length
      ? supabase.from("photo_likes").select("photo_id").in("photo_id", photoIds)
      : Promise.resolve({ data: [] as any[] }),
    photoIds.length
      ? supabase.from("photo_comments").select("photo_id").in("photo_id", photoIds)
      : Promise.resolve({ data: [] as any[] }),
    photoIds.length
      ? supabase.from("photo_reposts").select("photo_id").in("photo_id", photoIds)
      : Promise.resolve({ data: [] as any[] }),
    currentUserId && photoIds.length
      ? supabase.from("photo_likes").select("photo_id").eq("user_id", currentUserId).in("photo_id", photoIds)
      : Promise.resolve({ data: [] as any[] }),
    currentUserId && photoIds.length
      ? supabase.from("photo_reposts").select("photo_id").eq("user_id", currentUserId).in("photo_id", photoIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);
  const profilesMap = new Map((profilesData ?? []).map((p: any) => [p.id, p]));
  const venuesMap = new Map((venuesData ?? []).map((v: any) => [v.id, v]));

  const tally = (rows: any[] | null) => {
    const m = new Map<string, number>();
    (rows ?? []).forEach((r) => m.set(r.photo_id, (m.get(r.photo_id) ?? 0) + 1));
    return m;
  };
  const likesMap = tally(likesData);
  const commentsMap = tally(commentsData);
  const repostsMap = tally(repostsData);
  const likedSet = new Set((myLikes ?? []).map((r: any) => r.photo_id));
  const repostedSet = new Set((myReposts ?? []).map((r: any) => r.photo_id));

  return { items, profilesMap, venuesMap, likesMap, commentsMap, repostsMap, likedSet, repostedSet };
}

type TabKey = "pentru-tine" | "prieteni";

const BADGES = [
  { key: "legendar", label: "LEGENDAR", className: "bg-sunset-orange/15 text-sunset-orange border-sunset-orange/40" },
  { key: "murit", label: "AM MURIT", className: "bg-sunset-amber/15 text-sunset-amber border-sunset-amber/40" },
  { key: "fail", label: "FAIL", className: "bg-foreground/8 text-foreground/70 border-foreground/15" },
  { key: "wow", label: "WOW", className: "bg-sunset-magenta/15 text-sunset-magenta border-sunset-magenta/40" },
] as const;

function pickBadge(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return BADGES[h % BADGES.length];
}

function pseudoCount(id: string, salt: number, max: number) {
  let h = salt;
  for (let i = 0; i < id.length; i++) h = (h * 33 + id.charCodeAt(i)) >>> 0;
  return (h % max) + 1;
}


function FazePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["faze", user?.id ?? null],
    queryFn: () => loadMoments(user?.id ?? null),
    refetchInterval: 60_000,
  });
  // Native sponsored cards interleaved in the feed (shared with /app/feed).
  const { data: promoCards = [] } = usePromoCards();
  // Friends list for "Prieteni" tab filtering
  const { data: friendIds = [] } = useQuery({
    queryKey: ["faze-friends", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      const { data: rows } = await supabase
        .from("friendships")
        .select("requester_id,addressee_id,status")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
      return (rows ?? []).map((r: any) => r.requester_id === user.id ? r.addressee_id : r.requester_id);
    },
  });
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabKey>("pentru-tine");
  const [commentsFor, setCommentsFor] = useState<Moment | null>(null);
  const [shareFor, setShareFor] = useState<Moment | null>(null);
  const [menuFor, setMenuFor] = useState<Moment | null>(null);
  const [zoomFor, setZoomFor] = useState<Moment | null>(null);
  const [ctaHidden, setCtaHidden] = useState(false);
  useEffect(() => {
    let lastY = typeof window !== "undefined" ? window.scrollY : 0;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const dy = y - lastY;
        if (y < 80) setCtaHidden(false);
        else if (dy > 6) setCtaHidden(true);
        else if (dy < -6) setCtaHidden(false);
        lastY = y;
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);


  async function toggleLike(it: Moment) {
    if (!user) { toast.error("Trebuie să fii logat."); return; }
    const isLiked = data?.likedSet.has(it.id);
    if (isLiked) {
      await supabase.from("photo_likes").delete().eq("photo_id", it.id).eq("user_id", user.id);
    } else {
      await supabase.from("photo_likes").insert({ photo_id: it.id, user_id: user.id });
      import("@/lib/native").then(({ haptic }) => haptic("light"));
    }
    qc.invalidateQueries({ queryKey: ["faze"] });
  }

  async function toggleRepost(it: Moment) {
    if (!user) { toast.error("Trebuie să fii logat."); return; }
    const isReposted = data?.repostedSet.has(it.id);
    if (isReposted) {
      await supabase.from("photo_reposts").delete().eq("photo_id", it.id).eq("user_id", user.id);
      toast.success("Repost retras.");
    } else {
      await supabase.from("photo_reposts").insert({ photo_id: it.id, user_id: user.id });
      toast.success("Repostat pe contul tău.");
    }
    qc.invalidateQueries({ queryKey: ["faze"] });
    qc.invalidateQueries({ queryKey: ["user-reposts", user.id] });
  }

  async function deletePost(it: Moment) {
    if (!user || it.user_id !== user.id) return;
    if (!confirm("Ștergi definitiv faza asta?")) return;
    const { error } = await supabase.from("venue_photos").delete().eq("id", it.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Postare ștearsă.");
    setMenuFor(null);
    qc.invalidateQueries({ queryKey: ["faze"] });
  }

  const sortedItems = (() => {
    if (!data) return [];
    if (tab === "prieteni") {
      if (!friendIds.length) return [];
      const friendSet = new Set(friendIds);
      return data.items.filter((it) => friendSet.has(it.user_id));
    }
    return [...data.items];
  })();

  return (
    <div className="pb-32 max-w-[480px] mx-auto bg-[#050505] min-h-screen text-white" style={hind}>
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-5 pb-3 sticky top-0 z-30 bg-[#050505]/85 backdrop-blur-xl">
        <div>
          <h1 className="text-[34px] leading-none tracking-tight" style={instrument}>
            FAZE<span className="text-[#ffea00]">.</span>
          </h1>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff3d8b] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff3d8b]" />
            </span>
            <span className="text-[10px] font-bold tracking-[0.18em] text-[#ff3d8b] uppercase">Live din teren</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setOpen(true)}
            aria-label="Postează o fază"
            className="bg-gradient-to-r from-[#ff3d8b] to-[#c724ff] px-4 py-2 rounded-full text-[11px] font-bold tracking-wide uppercase text-white shadow-lg shadow-[#ff3d8b]/25 active:scale-95 transition"
          >
            + Postează
          </button>
          <Link to="/app/notifications" className="relative p-2 rounded-full bg-white/5 border border-white/10 active:scale-95 transition">
            <svg viewBox="0 0 24 24" className="size-5 fill-none stroke-white/80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>
            <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-[#c724ff] border border-black" />
          </Link>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex px-4 gap-6 overflow-x-auto no-scrollbar border-b border-white/5 sticky top-[76px] z-20 bg-[#050505]/85 backdrop-blur-xl">
        {([
          { k: "pentru-tine", label: "Pentru tine" },
          { k: "prieteni", label: "Prieteni" },
        ] as { k: TabKey; label: string }[]).map((t) => {
          const active = tab === t.k;
          return (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              className={`relative shrink-0 py-3 text-sm whitespace-nowrap transition ${
                active ? "text-white font-semibold" : "text-white/40 font-medium"
              }`}
            >
              {t.label}
              {active && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#ff3d8b] to-[#c724ff]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Prize banner */}
      <div className="px-3 pt-3">
        <PrizeBanner />
      </div>

      {isLoading ? (
        <div className="space-y-4 pt-4 px-3">
          {[0,1].map(i => <div key={i} className="aspect-square rounded-2xl bg-foreground/[0.04] animate-pulse" />)}
        </div>
      ) : !data || sortedItems.length === 0 ? (
        <div className="pt-4 space-y-5 px-3">
          {promoCards.length > 0 && <SponsoredFazaCard key={`ad-empty-${promoCards[0].id}`} ad={promoCards[0]} />}
          <div className="mx-1 rounded-3xl border border-dashed border-foreground/15 p-10 text-center space-y-3">
            <div className="text-5xl">🎬</div>
            <div className="uppercase text-lg" style={archivo}>Nicio fază încă.</div>
            <p className="text-sm text-muted-foreground">Fii primul care pune o fază reală din teren.</p>
          </div>
        </div>
      ) : (
        <div className="pt-4 space-y-5 px-3">
          {sortedItems.map((it, idx) => {
            // Boost sponsored visibility: insert an ad after every 3rd post (idx 2,5,8,...).
            const showAd = promoCards.length > 0 && (idx + 1) % 3 === 0;
            const ad = showAd ? promoCards[(Math.floor((idx + 1) / 3) - 1) % promoCards.length] : null;
            const profile = data.profilesMap.get(it.user_id);
            const venue = data.venuesMap.get(it.venue_id);
            const handle = profile?.handle ?? profile?.display_name ?? "anonim";
            const badge = pickBadge(it.id);
            const likes = data.likesMap.get(it.id) ?? 0;
            const comments = data.commentsMap.get(it.id) ?? 0;
            const reposts = data.repostsMap.get(it.id) ?? 0;
            const isVideo = it.media_type === "video" || /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(it.photo_url);
            const isLiked = data.likedSet.has(it.id);
            const isReposted = data.repostedSet.has(it.id);
            const isMine = user?.id === it.user_id;
            const article = (
              <article key={it.id} className="relative rounded-3xl overflow-hidden bg-[#111] border border-white/5 shadow-[0_4px_24px_-12px_rgba(0,0,0,0.8)]">
                {/* Media with floating overlays */}
                <div className="relative aspect-square bg-black">
                  {isVideo ? (
                    <VideoTile src={it.photo_url} bottomInset={88} />
                  ) : (
                    <button type="button" onClick={() => setZoomFor(it)} className="block w-full h-full" aria-label="Mărește poza">
                      <img src={it.photo_url} alt={it.caption ?? ""} className="w-full h-full object-cover" loading="lazy" />
                    </button>
                  )}

                  {/* Top overlay: badge left, author right */}
                  <div className="absolute inset-x-0 top-0 p-3 flex justify-between items-start gap-2 pointer-events-none">
                    <span className={`backdrop-blur-xl bg-black/40 border border-white/10 px-3 py-1 rounded-full text-[10px] font-bold tracking-[0.18em] uppercase ${
                      badge.key === "legendar" ? "text-[#ffea00]" :
                      badge.key === "murit" ? "text-amber-400" :
                      badge.key === "wow" ? "text-[#c724ff]" : "text-white/70"
                    }`}>
                      {badge.label}
                    </span>
                    <div className="flex items-center gap-2 pointer-events-auto">
                      <Link to="/app/user/$id" params={{ id: it.user_id }} className="flex items-center gap-2 backdrop-blur-xl bg-black/40 border border-white/10 pl-1 pr-3 py-1 rounded-full">
                        <div className="size-6 rounded-full overflow-hidden border border-[#ff3d8b]">
                          {profile?.avatar_url ? (
                            <img src={profile.avatar_url} alt={handle} className="size-full object-cover" />
                          ) : (
                            <div className="size-full bg-white/10 grid place-items-center text-[10px] uppercase font-bold">{handle[0]?.toUpperCase()}</div>
                          )}
                        </div>
                        <span className="text-[11px] font-semibold tracking-tight text-white">@{handle}</span>
                      </Link>
                      {isMine ? (
                        <button
                          onClick={() => setMenuFor(it)}
                          aria-label="Opțiuni"
                          className="pointer-events-auto size-8 rounded-full backdrop-blur-xl bg-black/40 border border-white/10 grid place-items-center text-white/80 active:scale-90 transition"
                        >
                          <svg viewBox="0 0 24 24" className="size-4 fill-current"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>
                        </button>
                      ) : (
                        <ReportDialog targetType="photo" targetId={it.id} className="pointer-events-auto size-8 rounded-full backdrop-blur-xl bg-black/40 border border-white/10 grid place-items-center text-white/70 active:scale-95 transition" />
                      )}
                    </div>
                  </div>




                  {/* Bottom floating glass action pill */}
                  <div className="absolute inset-x-3 bottom-3">
                    <div className="backdrop-blur-2xl bg-black/35 border border-white/10 rounded-2xl p-2.5 flex items-center justify-around">
                      <button onClick={() => toggleLike(it)} aria-label="Apreciază" className="flex flex-col items-center gap-0.5 active:scale-90 transition">
                        <svg viewBox="0 0 24 24" className={`size-6 ${isLiked ? "fill-[#c724ff] stroke-[#c724ff]" : "fill-none stroke-white/90"}`} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z"/></svg>
                        <span className="text-[10px] font-bold text-white/90">{likes > 0 ? formatCount(likes) : "0"}</span>
                      </button>
                      <button onClick={() => setCommentsFor(it)} aria-label="Comentează" className="flex flex-col items-center gap-0.5 active:scale-90 transition">
                        <svg viewBox="0 0 24 24" className="size-6 fill-none stroke-white/80" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12z"/></svg>
                        <span className="text-[10px] font-bold text-white/70">{comments > 0 ? formatCount(comments) : "0"}</span>
                      </button>
                      <button onClick={() => setShareFor(it)} aria-label="Trimite" className="flex flex-col items-center gap-0.5 active:scale-90 transition">
                        <svg viewBox="0 0 24 24" className="size-6 fill-none stroke-white/80" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg>
                        <span className="text-[10px] font-bold text-white/70">Trimite</span>
                      </button>
                      <div className="w-px h-8 bg-white/10" />
                      <button onClick={() => toggleRepost(it)} aria-label="Repost" className={`flex flex-col items-center gap-0.5 active:scale-90 transition ${isReposted ? "text-[#ffea00]" : "text-white/80"}`}>
                        <svg viewBox="0 0 24 24" className="size-6 fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                        <span className="text-[10px] font-bold">{reposts > 0 ? formatCount(reposts) : "Repost"}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Caption Area */}
                <div className="p-5 pt-4 bg-[#0a0a0a]">
                  {venue?.name && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <Link
                        to="/app/map"
                        search={{ venue: it.venue_id }}
                        className="flex items-center gap-1.5 text-[#ffea00] active:scale-95 transition"
                        aria-label={`Vezi ${venue.name} pe hartă`}
                      >
                        <svg className="size-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/></svg>
                        <span className="text-[11px] font-bold uppercase tracking-[0.16em] underline-offset-2 hover:underline">{venue.name}</span>
                      </Link>
                      <span className="text-white/20 mx-1">•</span>
                      <span className="text-white/40 text-[10px] uppercase tracking-wider">acum {timeAgo(it.created_at)}</span>
                    </div>
                  )}
                  {it.caption ? (
                    <p className="text-sm text-white/90 leading-relaxed font-light">
                      <Link to="/app/user/$id" params={{ id: it.user_id }} className="font-semibold mr-1.5 text-white">@{handle}</Link>
                      {it.caption}
                    </p>
                  ) : (
                    !venue?.name && (
                      <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">acum {timeAgo(it.created_at)}</div>
                    )
                  )}
                  {comments > 0 && (
                    <button
                      onClick={() => setCommentsFor(it)}
                      className="mt-2 text-[12px] text-white/40 block"
                    >
                      Vezi toate cele {formatCount(comments)} comentarii
                    </button>
                  )}
                </div>
              </article>
            );
            return ad ? [<SponsoredFazaCard key={`ad-${it.id}`} ad={ad} />, article] : article;
          })}
          {/* Always surface at least one sponsored card when the organic feed is too short to hit the cadence. */}
          {promoCards.length > 0 && sortedItems.length > 0 && sortedItems.length < 3 && (
            <SponsoredFazaCard key={`ad-tail-${promoCards[0].id}`} ad={promoCards[0]} />
          )}
        </div>
      )}



      <Link to="/app" className="block text-center text-[10px] uppercase tracking-widest text-muted-foreground pt-5" style={archivo}>
        ← înapoi la live
      </Link>

      {open && typeof document !== "undefined" && createPortal(
        <UploadSheet onClose={() => setOpen(false)} />,
        document.body
      )}
      {commentsFor && typeof document !== "undefined" && createPortal(
        <CommentsSheet photo={commentsFor} onClose={() => { setCommentsFor(null); qc.invalidateQueries({ queryKey: ["faze"] }); }} />,
        document.body
      )}
      {shareFor && typeof document !== "undefined" && createPortal(
        <ShareSheet photo={shareFor} onClose={() => setShareFor(null)} />,
        document.body
      )}
      {menuFor && typeof document !== "undefined" && createPortal(
        <PostMenu photo={menuFor} onClose={() => setMenuFor(null)} onDelete={() => deletePost(menuFor)} />,
        document.body
      )}
      {zoomFor && typeof document !== "undefined" && createPortal(
        <PhotoZoom src={zoomFor.photo_url} alt={zoomFor.caption ?? ""} onClose={() => setZoomFor(null)} />,
        document.body
      )}
    </div>
  );
}

// Sheets and prize banner extracted to src/components/app/faze/*


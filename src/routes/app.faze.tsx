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

export const Route = createFileRoute("/app/faze")({
  head: () => ({ meta: [{ title: "Cele mai tari faze · OXIDAȚII" }] }),
  component: FazePage,
});

// Font helpers — page-local theme overrides
const archivo = { fontFamily: '"Archivo Black", system-ui, sans-serif', letterSpacing: "-0.01em" } as const;
const hind = { fontFamily: '"Work Sans", "Hind", system-ui, sans-serif' } as const;
const instrument = { fontFamily: '"Instrument Serif", "Work Sans", serif', letterSpacing: "-0.02em" } as const;

// Bottom-safe inset for sheets above the global tab bar
const SHEET_BOTTOM = "calc(env(safe-area-inset-bottom) + 5.5rem)";

type Moment = {
  id: string;
  photo_url: string;
  caption: string | null;
  created_at: string;
  user_id: string;
  venue_id: string;
};

async function loadMoments(currentUserId: string | null) {
  const { data: photos } = await supabase
    .from("venue_photos")
    .select("id, photo_url, caption, taken_at, user_id, venue_id")
    .order("taken_at", { ascending: false })
    .limit(60);

  const items: Moment[] = (photos ?? []).map((p) => ({
    id: p.id,
    photo_url: p.photo_url,
    caption: p.caption,
    created_at: p.taken_at,
    user_id: p.user_id,
    venue_id: p.venue_id,
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

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - +new Date(iso)) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}z`;
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

function formatCount(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
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
            FAZE<span className="text-[#f7931e]">.</span>
          </h1>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff6b35] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff6b35]" />
            </span>
            <span className="text-[10px] font-bold tracking-[0.18em] text-[#ff6b35] uppercase">Live din teren</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setOpen(true)}
            aria-label="Postează o fază"
            className="bg-gradient-to-r from-[#ff6b35] to-[#e84393] px-4 py-2 rounded-full text-[11px] font-bold tracking-wide uppercase text-white shadow-lg shadow-[#ff6b35]/25 active:scale-95 transition"
          >
            + Postează
          </button>
          <Link to="/app/notifications" className="relative p-2 rounded-full bg-white/5 border border-white/10 active:scale-95 transition">
            <svg viewBox="0 0 24 24" className="size-5 fill-none stroke-white/80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>
            <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-[#e84393] border border-black" />
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
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#ff6b35] to-[#e84393]" />
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
            const isVideo = /\.(mp4|webm|mov)$/i.test(it.photo_url);
            const isLiked = data.likedSet.has(it.id);
            const isReposted = data.repostedSet.has(it.id);
            const isMine = user?.id === it.user_id;
            const article = (
              <article key={it.id} className="relative rounded-3xl overflow-hidden bg-[#111] border border-white/5 shadow-[0_4px_24px_-12px_rgba(0,0,0,0.8)]">
                {/* Media with floating overlays */}
                <div className="relative aspect-square bg-black">
                  {isVideo ? (
                    <video src={it.photo_url} className="w-full h-full object-cover" playsInline muted loop preload="metadata" />
                  ) : (
                    <img src={it.photo_url} alt={it.caption ?? ""} className="w-full h-full object-cover" loading="lazy" />
                  )}

                  {/* Top overlay: badge left, author right */}
                  <div className="absolute inset-x-0 top-0 p-3 flex justify-between items-start gap-2 pointer-events-none">
                    <span className={`backdrop-blur-xl bg-black/40 border border-white/10 px-3 py-1 rounded-full text-[10px] font-bold tracking-[0.18em] uppercase ${
                      badge.key === "legendar" ? "text-[#f7931e]" :
                      badge.key === "murit" ? "text-amber-400" :
                      badge.key === "wow" ? "text-[#e84393]" : "text-white/70"
                    }`}>
                      {badge.label}
                    </span>
                    <div className="flex items-center gap-2 pointer-events-auto">
                      <Link to="/app/user/$id" params={{ id: it.user_id }} className="flex items-center gap-2 backdrop-blur-xl bg-black/40 border border-white/10 pl-1 pr-3 py-1 rounded-full">
                        <div className="size-6 rounded-full overflow-hidden border border-[#ff6b35]">
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

                  {isVideo && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="size-14 rounded-full bg-white/90 text-black flex items-center justify-center text-xl shadow-xl">▶</div>
                    </div>
                  )}

                  {/* Bottom floating glass action pill */}
                  <div className="absolute inset-x-3 bottom-3">
                    <div className="backdrop-blur-2xl bg-black/35 border border-white/10 rounded-2xl p-2.5 flex items-center justify-around">
                      <button onClick={() => toggleLike(it)} aria-label="Apreciază" className="flex flex-col items-center gap-0.5 active:scale-90 transition">
                        <svg viewBox="0 0 24 24" className={`size-6 ${isLiked ? "fill-[#e84393] stroke-[#e84393]" : "fill-none stroke-white/90"}`} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z"/></svg>
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
                      <button onClick={() => toggleRepost(it)} aria-label="Repost" className={`flex flex-col items-center gap-0.5 active:scale-90 transition ${isReposted ? "text-[#f7931e]" : "text-white/80"}`}>
                        <svg viewBox="0 0 24 24" className="size-6 fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                        <span className="text-[10px] font-bold">{reposts > 0 ? formatCount(reposts) : "Repost"}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Caption Area */}
                <div className="p-5 pt-4 bg-[#0a0a0a]">
                  {venue?.name && (
                    <div className="flex items-center gap-1.5 text-[#f7931e] mb-2">
                      <svg className="size-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/></svg>
                      <span className="text-[11px] font-bold uppercase tracking-[0.16em]">{venue.name}</span>
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
    </div>
  );
}

function PostMenu({ photo: _photo, onClose, onDelete }: { photo: Moment; onClose: () => void; onDelete: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={onClose} style={hind}>
      <div className="w-full sm:max-w-[22rem] bg-background border-t sm:border border-foreground/10 sm:rounded-2xl rounded-t-2xl overflow-hidden" onClick={(e) => e.stopPropagation()} style={{ paddingBottom: `calc(${SHEET_BOTTOM})` }}>
        <div className="py-2">
          <button
            onClick={onDelete}
            className="w-full text-left px-5 py-4 text-sunset-orange uppercase text-[13px] tracking-[0.1em] hover:bg-foreground/5 transition"
            style={archivo}
          >
            Șterge postarea
          </button>
          <div className="h-px bg-foreground/10" />
          <button
            onClick={onClose}
            className="w-full text-left px-5 py-4 text-muted-foreground uppercase text-[13px] tracking-[0.1em] hover:bg-foreground/5 transition"
            style={archivo}
          >
            Anulează
          </button>
        </div>
      </div>
    </div>
  );
}

function ShareSheet({ photo, onClose }: { photo: Moment; onClose: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sending, setSending] = useState<string | null>(null);

  const { data: friends, isLoading } = useQuery({
    queryKey: ["mutual-friends", user?.id ?? null],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      const [{ data: iFollow }, { data: followMe }] = await Promise.all([
        supabase.from("follows").select("following_id").eq("follower_id", user.id).eq("status", "accepted"),
        supabase.from("follows").select("follower_id").eq("following_id", user.id).eq("status", "accepted"),
      ]);
      const iFollowSet = new Set((iFollow ?? []).map((r: any) => r.following_id));
      const mutualIds = (followMe ?? []).map((r: any) => r.follower_id).filter((id: string) => iFollowSet.has(id));
      if (!mutualIds.length) return [];
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, handle, display_name, avatar_url")
        .in("id", mutualIds);
      return profs ?? [];
    },
  });

  async function send(friendId: string) {
    if (!user) return;
    setSending(friendId);
    try {
      const convId = await openOrCreateDM(user.id, friendId);
      const body = `📸 Fază OXI: ${photo.photo_url}${photo.caption ? `\n${photo.caption}` : ""}`;
      const { error } = await supabase.from("messages").insert({
        conversation_id: convId,
        sender_id: user.id,
        body,
      });
      if (error) throw error;
      toast.success("Trimis!");
      onClose();
      setTimeout(() => navigate({ to: "/app/chat/$id", params: { id: convId } }), 200);
    } catch (e: any) {
      toast.error(e.message ?? "Eroare la trimitere");
    } finally {
      setSending(null);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-end" onClick={onClose} style={hind}>
      <div
        className="w-full bg-background border-t border-foreground/10 rounded-t-3xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: `calc(85dvh - ${SHEET_BOTTOM})`, paddingBottom: SHEET_BOTTOM }}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-foreground/10">
          <div className="uppercase text-sm tracking-[0.16em]" style={archivo}>Trimite la prieteni</div>
          <button onClick={onClose} className="text-muted-foreground text-2xl leading-none w-8 h-8 grid place-items-center">×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          {isLoading ? (
            <div className="px-4 py-6 text-sm text-muted-foreground">Se încarcă prietenii…</div>
          ) : !friends || friends.length === 0 ? (
            <div className="text-center py-10 px-6 space-y-2">
              <div className="text-4xl">🤝</div>
              <div className="uppercase text-sm" style={archivo}>Niciun prieten reciproc</div>
              <p className="text-xs text-muted-foreground">Urmărește pe cineva care te urmărește și pe tine ca să poți trimite faze.</p>
            </div>
          ) : (
            <ul className="divide-y divide-foreground/5">
              {friends.map((f: any) => {
                const name = f.display_name ?? f.handle ?? "anonim";
                const initial = (name[0] ?? "?").toUpperCase();
                const isSending = sending === f.id;
                return (
                  <li key={f.id} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="shrink-0">
                      {f.avatar_url ? (
                        <img src={f.avatar_url} alt={name} className="size-11 rounded-full object-cover" />
                      ) : (
                        <div className="size-11 rounded-full bg-foreground/10 grid place-items-center text-sm uppercase" style={archivo}>{initial}</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-semibold truncate">{name}</div>
                      {f.handle && <div className="text-[11px] text-muted-foreground truncate">@{f.handle}</div>}
                    </div>
                    <button
                      onClick={() => send(f.id)}
                      disabled={isSending}
                      className="shrink-0 uppercase text-[11px] tracking-[0.14em] px-4 py-2 rounded-full text-white disabled:opacity-50 active:scale-95 transition"
                      style={{ ...archivo, background: "var(--gradient-sunset)" }}
                    >
                      {isSending ? "..." : "Trimite"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function UploadSheet({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [venueQuery, setVenueQuery] = useState("");
  const [selectedVenue, setSelectedVenue] = useState<{ id: string; name: string; city?: any } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: venues } = useQuery({
    queryKey: ["venues-search", venueQuery],
    queryFn: async () => {
      const q = supabase.from("venues").select("id, name, slug, city:cities(name)").limit(8);
      const { data } = venueQuery.trim()
        ? await q.ilike("name", `%${venueQuery.trim()}%`)
        : await q.order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function submit() {
    if (!user) { toast.error("Trebuie să fii logat."); return; }
    if (!file) { toast.error("Alege o poză."); return; }
    if (!selectedVenue) { toast.error("Alege locația."); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("venue-photos").upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("venue-photos").getPublicUrl(path);
      const { error: insErr } = await supabase.from("venue_photos").insert({
        user_id: user.id,
        venue_id: selectedVenue.id,
        photo_url: pub.publicUrl,
        caption: caption.trim() || null,
      });
      if (insErr) throw insErr;
      toast.success("Faza ta e live.");
      qc.invalidateQueries({ queryKey: ["faze"] });
      qc.invalidateQueries({ queryKey: ["app-feed"] });
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? "Eroare la upload");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-end justify-center px-2" onClick={onClose} style={{ ...hind, paddingBottom: SHEET_BOTTOM, paddingTop: "1rem" }}>
      <div className="w-full max-w-[22rem] bg-background border border-foreground/10 rounded-3xl p-4 space-y-3 overflow-y-auto" onClick={(e) => e.stopPropagation()} style={{ maxHeight: `calc(100dvh - ${SHEET_BOTTOM} - 2rem)` }}>
        <div className="flex items-center justify-between">
          <div className="uppercase text-sm tracking-[0.16em]" style={archivo}>Postează o fază</div>
          <button onClick={onClose} className="text-muted-foreground text-2xl leading-none w-8 h-8 grid place-items-center">×</button>
        </div>

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full aspect-[4/3] rounded-2xl border border-dashed border-foreground/20 flex items-center justify-center overflow-hidden bg-foreground/[0.04]"
        >
          {file ? (
            <img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="text-center space-y-1 text-muted-foreground">
              <div className="text-3xl">📸</div>
              <div className="text-[10px] uppercase tracking-widest" style={archivo}>alege poza</div>
            </div>
          )}
        </button>

        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-widest text-muted-foreground" style={archivo}>Locația</label>
          {selectedVenue ? (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-foreground/[0.06] border border-foreground/10">
              <div className="text-[13px] truncate">{selectedVenue.name} · {selectedVenue.city?.name ?? ""}</div>
              <button onClick={() => setSelectedVenue(null)} className="text-[10px] text-sunset-orange uppercase ml-2 shrink-0" style={archivo}>schimbă</button>
            </div>
          ) : (
            <>
              <input
                value={venueQuery}
                onChange={(e) => setVenueQuery(e.target.value)}
                placeholder="caută un club, bar, terasă..."
                className="w-full p-2.5 rounded-xl bg-foreground/[0.04] border border-foreground/10 text-[13px]"
              />
              <div className="max-h-32 overflow-y-auto space-y-0.5 mt-1">
                {(venues ?? []).map((v: any) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVenue(v)}
                    className="w-full text-left p-2 rounded-lg hover:bg-foreground/[0.06] text-[13px]"
                  >
                    <div className="font-semibold">{v.name}</div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground" style={archivo}>{v.city?.name ?? ""}</div>
                  </button>
                ))}
                {venues && venues.length === 0 && (
                  <div className="text-[11px] text-muted-foreground p-2">Nicio locație găsită.</div>
                )}
              </div>
            </>
          )}
        </div>

        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Spune ceva despre fază... (opțional)"
          rows={2}
          className="w-full p-2.5 rounded-xl bg-foreground/[0.04] border border-foreground/10 text-[13px] resize-none"
        />

        <button
          onClick={submit}
          disabled={uploading || !file || !selectedVenue}
          className="w-full uppercase text-[13px] tracking-[0.18em] py-3 rounded-xl text-white disabled:opacity-40 active:scale-[0.98] transition"
          style={{ ...archivo, background: "var(--gradient-sunset)" }}
        >
          {uploading ? "Se postează..." : "Postează"}
        </button>
      </div>
    </div>
  );
}

function nextMondayMorning() {
  const now = new Date();
  const d = new Date(now);
  const day = d.getDay();
  const daysUntilMon = (8 - day) % 7 || 7;
  d.setDate(d.getDate() + daysUntilMon);
  d.setHours(9, 0, 0, 0);
  return d;
}

function useCountdown(target: Date) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  const ms = Math.max(0, +target - now);
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return { d, h, m, s };
}

function PrizeBanner() {
  const target = nextMondayMorning();
  const { d, h, m } = useCountdown(target);
  const pad = (n: number) => String(n).padStart(2, "0");
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Vezi premiul și regulile"
        className="w-full text-left relative overflow-hidden rounded-2xl border border-sunset-amber/30 bg-gradient-to-r from-sunset-orange/15 via-sunset-amber/10 to-sunset-magenta/15 active:scale-[0.99] transition"
      >
        <div aria-hidden className="absolute -top-10 -right-10 size-28 rounded-full bg-sunset-amber/25 blur-2xl" />
        <div aria-hidden className="absolute -bottom-10 -left-10 size-28 rounded-full bg-sunset-magenta/25 blur-2xl" />

        <div className="relative flex items-center gap-3 px-4 py-3.5">
          <div className="shrink-0 flex flex-col items-center justify-center rounded-xl bg-gradient-to-br from-sunset-amber to-sunset-orange px-3 py-2 text-black shadow-[0_6px_18px_-4px_rgba(245,158,11,0.6)]">
            <div className="text-xl leading-none tabular-nums" style={archivo}>100</div>
            <div className="text-[8px] uppercase tracking-widest leading-none mt-0.5" style={archivo}>lei</div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] uppercase tracking-[0.22em] text-sunset-amber" style={archivo}>Premiul săptămânii</span>
              <span className="size-1 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="text-[13px] leading-tight mt-1 truncate">
              Cea mai tare fază ia <span className="text-sunset-amber font-semibold">100 lei pe Revolut</span>
            </div>
            <div className="text-[9px] uppercase tracking-widest text-muted-foreground mt-0.5 truncate flex items-center gap-1.5" style={archivo}>
              Vezi câștigător & reguli <span aria-hidden>→</span>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <div className="text-[8px] uppercase tracking-widest text-muted-foreground" style={archivo}>Se închide</div>
            <div className="text-sm tabular-nums text-foreground leading-tight" style={archivo}>
              {d}<span className="text-muted-foreground">z</span> {pad(h)}<span className="text-muted-foreground">h</span> {pad(m)}<span className="text-muted-foreground">m</span>
            </div>
          </div>
        </div>
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <PrizeSheet onClose={() => setOpen(false)} />,
        document.body
      )}
    </>
  );
}

function lastWeekendRange() {
  // Returns the Fri 18:00 → Sun 23:59 window of the most recently completed weekend (Bucharest-ish, browser local).
  const now = new Date();
  const d = new Date(now);
  const dow = d.getDay(); // 0=Sun..6=Sat
  // days since last Sunday (the most recently passed Sunday). If today is Sun, use today.
  const daysSinceSun = dow;
  const lastSun = new Date(d);
  lastSun.setDate(d.getDate() - daysSinceSun);
  lastSun.setHours(23, 59, 59, 999);
  // If we're mid-weekend (Fri/Sat/Sun), step back one full week so the "previous" weekend is shown.
  if (dow === 5 || dow === 6 || dow === 0) {
    lastSun.setDate(lastSun.getDate() - 7);
  }
  const lastFri = new Date(lastSun);
  lastFri.setDate(lastSun.getDate() - 2);
  lastFri.setHours(18, 0, 0, 0);
  return { from: lastFri.toISOString(), to: lastSun.toISOString() };
}

function PrizeSheet({ onClose }: { onClose: () => void }) {
  const { data: winner, isLoading } = useQuery({
    queryKey: ["faze-winner"],
    queryFn: async () => {
      const { from, to } = lastWeekendRange();
      const { data: photos } = await supabase
        .from("venue_photos")
        .select("id, photo_url, caption, taken_at, user_id, venue_id")
        .gte("taken_at", from)
        .lte("taken_at", to);
      if (!photos || photos.length === 0) return null;
      const ids = photos.map(p => p.id);
      const [{ data: likes }, { data: comments }, { data: reposts }] = await Promise.all([
        supabase.from("photo_likes").select("photo_id").in("photo_id", ids),
        supabase.from("photo_comments").select("photo_id").in("photo_id", ids),
        supabase.from("photo_reposts").select("photo_id").in("photo_id", ids),
      ]);
      const tally = (rows: any[] | null) => {
        const m = new Map<string, number>();
        (rows ?? []).forEach((r) => m.set(r.photo_id, (m.get(r.photo_id) ?? 0) + 1));
        return m;
      };
      const lm = tally(likes), cm = tally(comments), rm = tally(reposts);
      const scored = photos.map(p => ({
        ...p,
        likes: lm.get(p.id) ?? 0,
        comments: cm.get(p.id) ?? 0,
        reposts: rm.get(p.id) ?? 0,
        score: (lm.get(p.id) ?? 0) + (cm.get(p.id) ?? 0),
      }));
      scored.sort((a, b) => b.score - a.score || b.reposts - a.reposts);
      const top = scored[0];
      if (!top || top.score === 0) return null;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, handle, display_name, avatar_url")
        .eq("id", top.user_id)
        .maybeSingle();
      const { data: venue } = await supabase
        .from("venues")
        .select("id, name")
        .eq("id", top.venue_id)
        .maybeSingle();
      return { ...top, profile, venue };
    },
  });

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-end" onClick={onClose} style={hind}>
      <div
        className="w-full bg-background border-t border-foreground/10 rounded-t-3xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: `calc(90dvh - ${SHEET_BOTTOM})`, marginBottom: SHEET_BOTTOM }}
      >
        {/* Hero */}
        <div className="relative overflow-hidden">
          <div aria-hidden className="absolute -top-16 -right-16 size-56 rounded-full bg-sunset-amber/30 blur-3xl" />
          <div aria-hidden className="absolute -bottom-20 -left-16 size-56 rounded-full bg-sunset-magenta/30 blur-3xl" />
          <div className="relative px-5 pt-5 pb-4 flex items-start justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-sunset-amber" style={archivo}>Premiul săptămânii</div>
              <div className="mt-2 text-4xl leading-none" style={archivo}>
                <span className="text-gradient-sunset">100 lei</span>
              </div>
              <div className="text-[12px] text-muted-foreground mt-1.5">pe Revolut · plătit luni dimineața</div>
            </div>
            <button onClick={onClose} aria-label="Închide" className="text-muted-foreground text-2xl leading-none w-9 h-9 grid place-items-center rounded-full hover:bg-foreground/10">×</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-5">
          {/* Current winner */}
          <section className="rounded-2xl border border-sunset-amber/30 bg-gradient-to-br from-sunset-amber/10 to-sunset-orange/5 overflow-hidden">
            <div className="px-4 pt-3.5 pb-2 flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-[0.18em] text-sunset-amber flex items-center gap-1.5" style={archivo}>
                <span>🏆</span> Câștigător săptămâna trecută
              </div>
            </div>

            {isLoading ? (
              <div className="px-4 pb-4">
                <div className="h-16 rounded-xl bg-foreground/[0.04] animate-pulse" />
              </div>
            ) : !winner ? (
              <div className="px-4 pb-4 flex items-center gap-3">
                <div className="size-12 rounded-full bg-foreground/10 grid place-items-center text-lg">🤷</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold">Niciun câștigător încă</div>
                  <div className="text-[12px] text-muted-foreground">Nu s-au postat faze cu interacțiuni weekend-ul trecut.</div>
                </div>
              </div>
            ) : (
              <div className="px-4 pb-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Link to="/app/user/$id" params={{ id: winner.user_id }} onClick={onClose} className="shrink-0">
                    <div className="p-[2px] rounded-full" style={{ background: "var(--gradient-sunset)" }}>
                      <div className="p-[2px] rounded-full bg-background">
                        {winner.profile?.avatar_url ? (
                          <img src={winner.profile.avatar_url} alt="" className="size-14 rounded-full object-cover" />
                        ) : (
                          <div className="size-14 rounded-full bg-foreground/10 grid place-items-center text-lg uppercase" style={archivo}>
                            {(winner.profile?.display_name ?? winner.profile?.handle ?? "?")[0]?.toUpperCase()}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to="/app/user/$id" params={{ id: winner.user_id }} onClick={onClose} className="text-[16px] font-semibold truncate block">
                      {winner.profile?.display_name ?? winner.profile?.handle ?? "Anonim"}
                    </Link>
                    {winner.profile?.handle && (
                      <div className="text-[12px] text-muted-foreground truncate">@{winner.profile.handle}</div>
                    )}
                    {winner.venue?.name && (
                      <div className="text-[11px] text-muted-foreground truncate mt-0.5">📍 {winner.venue.name}</div>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sunset-amber text-base leading-none" style={archivo}>100 lei</div>
                    <div className="text-[9px] uppercase tracking-widest text-muted-foreground mt-1" style={archivo}>câștig</div>
                  </div>
                </div>

                {winner.photo_url && (
                  <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3]">
                    <img src={winner.photo_url} alt={winner.caption ?? ""} className="w-full h-full object-cover" loading="lazy" />
                    <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/80 to-transparent">
                      <div className="flex items-center gap-3 text-[11px] text-white/95" style={archivo}>
                        <span className="uppercase tracking-widest">❤ {winner.likes}</span>
                        <span className="uppercase tracking-widest">💬 {winner.comments}</span>
                        <span className="uppercase tracking-widest">↻ {winner.reposts}</span>
                      </div>
                    </div>
                  </div>
                )}
                {winner.caption && (
                  <div className="text-[13px] text-foreground/90 leading-snug">"{winner.caption}"</div>
                )}
              </div>
            )}
          </section>



          {/* Rules */}
          <section className="space-y-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground" style={archivo}>Cum câștigi</div>
            <ol className="space-y-2.5">
              {[
                "Trebuie neapărat să ai abonament PRO activ ca să intri în concurs. Fără PRO, faza nu se califică.",
                "Postează o fază reală dintr-un local între vineri 18:00 și duminică 23:59 (ora României).",
                "Faza trebuie să aibă locația selectată și să respecte regulile comunității (fără violență, fără minori, fără conținut sexual).",
                "Câștigă faza cu cele mai multe aprecieri + comentarii combinate. La egalitate, decide repostările.",
                "Trebuie să ai cel puțin 18 ani și un cont OXIDAȚII verificat (handle + avatar).",
                "Premiul se trimite pe Revolut luni până la ora 12:00, pe numărul confirmat prin DM.",
              ].map((t, i) => (
                <li key={i} className="flex gap-3 text-[13px] leading-relaxed">
                  <span className="shrink-0 size-6 rounded-full bg-gradient-to-br from-sunset-amber to-sunset-orange text-black text-[11px] grid place-items-center" style={archivo}>{i + 1}</span>
                  <span>{t}</span>
                </li>
              ))}
            </ol>

            {/* PRO required badge */}
            <Link
              to="/app/premium"
              onClick={onClose}
              className="flex items-center gap-3 rounded-2xl border border-sunset-amber/40 bg-gradient-to-r from-sunset-amber/15 via-sunset-orange/10 to-sunset-magenta/15 p-3.5 active:scale-[0.99] transition"
            >
              <div className="shrink-0 size-10 rounded-xl bg-gradient-to-br from-sunset-amber to-sunset-orange text-black grid place-items-center text-base" style={archivo}>★</div>
              <div className="flex-1 min-w-0">
                <div className="text-[9px] uppercase tracking-[0.22em] text-sunset-amber" style={archivo}>Necesită PRO</div>
                <div className="text-[13px] leading-tight mt-0.5">Doar utilizatorii cu abonament <span className="font-semibold">PRO</span> pot câștiga cei 100 lei.</div>
              </div>
              <span className="shrink-0 text-sunset-amber text-lg" aria-hidden>→</span>
            </Link>
          </section>

          {/* Disqualify */}
          <section className="rounded-2xl border border-sunset-orange/25 bg-sunset-orange/5 p-4 space-y-2">
            <div className="text-[10px] uppercase tracking-[0.18em] text-sunset-orange" style={archivo}>Te descalifică</div>
            <ul className="text-[12.5px] leading-relaxed space-y-1 text-foreground/85">
              <li>· Aprecieri/comentarii cumpărate sau conturi false</li>
              <li>· Conținut reupload care nu îți aparține</li>
              <li>· Reclamații verificate de la local sau persoane</li>
            </ul>
          </section>

          <div className="text-[10px] uppercase tracking-widest text-muted-foreground text-center pt-2" style={archivo}>
            OXIDAȚII · concurs săptămânal · fără înscriere
          </div>
        </div>
      </div>
    </div>
  );
}



function CommentsSheet({ photo, onClose }: { photo: Moment; onClose: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const { data: comments } = useQuery({
    queryKey: ["photo-comments", photo.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("photo_comments")
        .select("id, body, created_at, user_id")
        .eq("photo_id", photo.id)
        .order("created_at", { ascending: true });
      const ids = Array.from(new Set((data ?? []).map((c) => c.user_id)));
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id, handle, display_name, avatar_url").in("id", ids)
        : { data: [] as any[] };
      const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
      return (data ?? []).map((c) => ({ ...c, profile: map.get(c.user_id) }));
    },
  });

  async function submit() {
    if (!user) { toast.error("Trebuie să fii logat."); return; }
    const text = body.trim();
    if (!text) return;
    setSending(true);
    const { error } = await supabase.from("photo_comments").insert({
      photo_id: photo.id, user_id: user.id, body: text,
    });
    setSending(false);
    if (error) { toast.error(error.message); return; }
    setBody("");
    qc.invalidateQueries({ queryKey: ["photo-comments", photo.id] });
    qc.invalidateQueries({ queryKey: ["faze"] });
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-end" onClick={onClose} style={hind}>
      <div
        className="w-full bg-background border-t border-foreground/10 rounded-t-3xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: `calc(85dvh - ${SHEET_BOTTOM})`, marginBottom: SHEET_BOTTOM }}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-foreground/10">
          <div className="uppercase text-sm tracking-[0.16em]" style={archivo}>Comentarii</div>
          <button onClick={onClose} className="text-muted-foreground text-2xl leading-none w-8 h-8 grid place-items-center">×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {!comments ? (
            <div className="text-xs text-muted-foreground">Se încarcă…</div>
          ) : comments.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              <div className="text-3xl mb-1">💬</div>
              Niciun comentariu. Fii primul.
            </div>
          ) : (
            comments.map((c: any) => (
              <div key={c.id} className="flex items-start gap-3">
                {c.profile?.avatar_url ? (
                  <img src={c.profile.avatar_url} alt="" className="size-9 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="size-9 rounded-full bg-foreground/10 shrink-0 grid place-items-center text-xs uppercase" style={archivo}>
                    {(c.profile?.display_name ?? "?")[0]?.toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[13px] font-semibold truncate">{c.profile?.display_name ?? c.profile?.handle ?? "Anonim"}</span>
                    <span className="text-[9px] uppercase tracking-widest text-muted-foreground" style={archivo}>{timeAgo(c.created_at)}</span>
                  </div>
                  <p className="text-[14px] leading-snug whitespace-pre-wrap break-words">{c.body}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-foreground/10 p-3 flex items-end gap-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Scrie un comentariu…"
            rows={1}
            maxLength={500}
            className="flex-1 resize-none p-2.5 rounded-xl bg-foreground/[0.05] border border-foreground/10 text-[14px]"
          />
          <button
            onClick={submit}
            disabled={sending || !body.trim()}
            className="shrink-0 uppercase text-[11px] tracking-widest px-4 py-2.5 rounded-xl text-white disabled:opacity-40"
            style={{ ...archivo, background: "var(--gradient-sunset)" }}
          >
            Trimite
          </button>
        </div>
      </div>
    </div>
  );
}

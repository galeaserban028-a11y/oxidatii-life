import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { TipCreatorButton } from "@/components/app/TipCreatorDialog";
import { shareReel } from "@/lib/reelShare";
import { recordCampaignEvent } from "@/lib/business-promotion.functions";
import { CommentsSheet } from "@/components/app/faze/CommentsSheet";

export const Route = createFileRoute("/app/reels")({
  head: () => ({ meta: [{ title: "Reels · OXIDAȚII" }] }),
  component: ReelsPage,
});

type Sponsored = {
  id: string;
  title: string;
  subtitle: string | null;
  cta_text: string | null;
  cta_url: string | null;
  video_url: string | null;
  image_url: string | null;
  theme_color: string | null;
  brand_name: string | null;
};

async function loadSponsored(): Promise<Sponsored[]> {
  const { data } = await supabase
    .from("campaigns")
    .select(
      "id, title, subtitle, cta_text, cta_url, video_url, image_urls, theme_color, kind, business:business_accounts(brand_name)",
    )
    .eq("kind", "boost_reel")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(10);
  return (data ?? []).map((c: any) => ({
    id: c.id,
    title: c.title,
    subtitle: c.subtitle,
    cta_text: c.cta_text,
    cta_url: c.cta_url,
    video_url: c.video_url,
    image_url: Array.isArray(c.image_urls) && c.image_urls[0] ? c.image_urls[0] : null,
    theme_color: c.theme_color,
    brand_name: c.business?.brand_name ?? null,
  }));
}


type Reel = {
  id: string;
  url: string;
  caption: string | null;
  user_id: string;
  venue_id: string;
  isVideo: boolean;
  handle: string;
  display_name: string | null;
  avatar_url: string | null;
  venue_name: string | null;
  city_name: string | null;
  reason: "friend" | "follow" | "city" | "fresh" | null;
};

async function loadReels(): Promise<Reel[]> {
  let items: any[] = [];
  const { data: fyp } = await supabase.rpc("get_reels_for_you", { p_limit: 80 });
  if (Array.isArray(fyp) && fyp.length) {
    items = fyp.map((r: any) => ({
      id: r.id, photo_url: r.photo_url, caption: r.caption, taken_at: r.taken_at,
      user_id: r.user_id, venue_id: r.venue_id, media_type: r.media_type,
      is_friend: r.is_friend, is_follow: r.is_follow, same_city: r.same_city,
    }));
  } else {
    const { data: photos } = await supabase
      .from("venue_photos")
      .select("id, photo_url, caption, taken_at, user_id, venue_id, media_type")
      .order("taken_at", { ascending: false })
      .limit(80);
    items = photos ?? [];
  }
  if (!items.length) return [];
  const userIds = Array.from(new Set(items.map((p) => p.user_id)));
  const venueIds = Array.from(new Set(items.map((p) => p.venue_id)));
  const [{ data: profiles }, { data: venues }] = await Promise.all([
    supabase.from("profiles").select("id, handle, display_name, avatar_url").in("id", userIds),
    supabase.from("venues").select("id, name, city:cities(name)").in("id", venueIds),
  ]);
  const pmap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
  const vmap = new Map((venues ?? []).map((v: any) => [v.id, v]));
  return items.map((p: any) => {
    const isVideo =
      p.media_type === "video" || /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(p.photo_url);
    const prof = pmap.get(p.user_id);
    const ven = vmap.get(p.venue_id);
    const reason: Reel["reason"] = p.is_friend
      ? "friend"
      : p.is_follow
        ? "follow"
        : p.same_city
          ? "city"
          : "fresh";
    return {
      id: p.id,
      url: p.photo_url,
      caption: p.caption,
      user_id: p.user_id,
      venue_id: p.venue_id,
      isVideo,
      handle: prof?.handle ?? prof?.display_name ?? "anonim",
      display_name: prof?.display_name ?? null,
      avatar_url: prof?.avatar_url ?? null,
      venue_name: ven?.name ?? null,
      city_name: ven?.city?.name ?? null,
      reason,
    } as Reel;
  });
}

const REASON_PILL: Record<NonNullable<Reel["reason"]>, { label: string; cls: string }> = {
  friend: { label: "👥 prieten", cls: "bg-emerald-500/15 text-emerald-200 border-emerald-400/30" },
  follow: { label: "✦ urmărești", cls: "bg-violet-500/15 text-violet-200 border-violet-400/30" },
  city:   { label: "📍 același oraș", cls: "bg-sky-500/15 text-sky-200 border-sky-400/30" },
  fresh:  { label: "🔥 proaspăt", cls: "bg-amber-500/15 text-amber-200 border-amber-400/30" },
};

function ReelTile({
  reel,
  active,
  liked,
  onToggleLike,
  onOpenComments,
}: {
  reel: Reel;
  active: boolean;
  liked: boolean;
  onToggleLike: () => void;
  onOpenComments: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const { user } = useAuth();
  const isOwn = user?.id === reel.user_id;
  const pill = reel.reason ? REASON_PILL[reel.reason] : null;

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (active && !paused) {
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [active, paused]);

  return (
    <section className="relative h-[100svh] w-full snap-start snap-always overflow-hidden bg-black">
      {reel.isVideo ? (
        <video
          ref={videoRef}
          src={reel.url}
          loop
          defaultMuted
          muted={muted}
          playsInline
          preload="metadata"
          className="absolute inset-0 h-full w-full object-cover"
          onClick={() => setPaused((p) => !p)}
        />
      ) : (
        <img
          src={reel.url}
          alt={reel.caption ?? ""}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-60 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

      {/* Reason pill — why this reel */}
      {pill && (
        <div className="absolute top-[calc(env(safe-area-inset-top)+58px)] left-3 z-10">
          <div className={`px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest border backdrop-blur-md ${pill.cls}`}>
            {pill.label}
          </div>
        </div>
      )}

      {paused && reel.isVideo && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-full bg-black/50 p-5 backdrop-blur-md">
            <svg viewBox="0 0 24 24" className="size-10 fill-white">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}

      {/* Right action rail */}
      <div className="absolute right-3 bottom-32 flex flex-col items-center gap-4 text-white">
        <button
          onClick={onToggleLike}
          className="flex flex-col items-center gap-1 active:scale-90 transition"
          aria-label="like"
        >
          <div
            className={`size-12 rounded-full backdrop-blur-md flex items-center justify-center ${
              liked ? "bg-[#ff3d8b]" : "bg-white/10 border border-white/20"
            }`}
          >
            <svg viewBox="0 0 24 24" className="size-6 fill-white">
              <path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z" />
            </svg>
          </div>
          <span className="text-[11px] font-semibold">Like</span>
        </button>
        <button
          onClick={onOpenComments}
          className="flex flex-col items-center gap-1 active:scale-90 transition"
          aria-label="comment"
        >
          <div className="size-12 rounded-full bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="size-6 fill-none stroke-white" strokeWidth="2">
              <path d="M21 12a8 8 0 1 1-3-6.2L21 5l-1 4.5A8 8 0 0 1 21 12z" />
            </svg>
          </div>
          <span className="text-[11px] font-semibold">Coment</span>
        </button>
        {!isOwn && (
          <div className="flex flex-col items-center gap-1">
            <TipCreatorButton recipientId={reel.user_id} recipientName={reel.display_name ?? reel.handle} />
          </div>
        )}
        <button
          onClick={async () => {
            try {
              await shareReel({
                id: reel.id,
                url: reel.url,
                caption: reel.caption,
                handle: reel.handle,
                venue_name: reel.venue_name,
                isVideo: reel.isVideo,
              });
              import("@/lib/native").then(({ haptic }) => haptic?.("light")).catch(() => {});
            } catch {
              toast.error("Nu s-a putut partaja.");
            }
          }}
          className="flex flex-col items-center gap-1 active:scale-90 transition"
          aria-label="share"
        >
          <div className="size-12 rounded-full bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="size-6 fill-none stroke-white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
          </div>
          <span className="text-[11px] font-semibold">Share</span>
        </button>
        {reel.isVideo && (
          <button
            onClick={() => {
              const v = videoRef.current;
              setMuted((m) => {
                const next = !m;
                if (v) {
                  v.muted = next;
                  if (!next) v.play().catch(() => {});
                }
                return next;
              });
            }}
            className="size-10 rounded-full bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center active:scale-90 transition"
            aria-label="mute"
          >
            {muted ? (
              <svg viewBox="0 0 24 24" className="size-5 fill-white">
                <path d="M3 9v6h4l5 4V5L7 9H3zm13.59 3L19 9.59 17.59 8 15 10.59 12.41 8 11 9.59 13.59 12 11 14.41 12.41 16 15 13.41 17.59 16 19 14.41 16.59 12z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="size-5 fill-white">
                <path d="M3 9v6h4l5 4V5L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z" />
              </svg>
            )}
          </button>
        )}
      </div>

      {/* Bottom info */}
      <div className="absolute inset-x-0 bottom-0 px-4 pb-24 text-white">
        <Link
          to="/app/user/$id"
          params={{ id: reel.user_id }}
          className="inline-flex items-center gap-2.5 mb-2"
        >
          {reel.avatar_url ? (
            <img src={reel.avatar_url} className="size-9 rounded-full object-cover ring-2 ring-white/30" />
          ) : (
            <div className="size-9 rounded-full bg-white/20" />
          )}
          <span className="font-bold text-[15px]">@{reel.handle}</span>
        </Link>
        {reel.venue_name && (
          <div className="text-[12px] text-white/70 mb-1.5">
            📍 {reel.venue_name}
            {reel.city_name ? ` · ${reel.city_name}` : ""}
          </div>
        )}
        {reel.caption && (
          <p className="text-[14px] leading-snug line-clamp-3 max-w-[78%]">{reel.caption}</p>
        )}
      </div>
    </section>
  );
}

function SponsoredTile({ ad, active }: { ad: Sponsored; active: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const isVideo = !!ad.video_url;
  const src = ad.video_url || ad.image_url || "";
  const color = ad.theme_color || "#ff3d8b";

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (active) v.play().catch(() => {});
    else v.pause();
  }, [active]);

  const handleClick = async () => {
    try {
      await recordCampaignEvent({ data: { campaignId: ad.id, eventType: "click" } });
    } catch {}
    if (ad.cta_url) window.open(ad.cta_url, "_blank", "noopener,noreferrer");
  };

  return (
    <section className="relative h-[100svh] w-full snap-start snap-always overflow-hidden bg-black">
      {isVideo ? (
        <video
          ref={videoRef}
          src={src}
          loop
          muted={muted}
          playsInline
          preload="metadata"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <img src={src} alt={ad.title} className="absolute inset-0 h-full w-full object-cover" />
      )}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

      <div
        className="absolute top-[calc(env(safe-area-inset-top)+58px)] left-3 z-10 px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest border backdrop-blur-md"
        style={{ background: `${color}22`, borderColor: `${color}66`, color: "#fff" }}
      >
        ✦ Sponsorizat{ad.brand_name ? ` · ${ad.brand_name}` : ""}
      </div>

      {isVideo && (
        <button
          onClick={() => setMuted((m) => !m)}
          className="absolute right-3 top-[calc(env(safe-area-inset-top)+58px)] z-10 size-9 rounded-full bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center"
          aria-label="mute"
        >
          <span className="text-white text-xs">{muted ? "🔇" : "🔊"}</span>
        </button>
      )}

      <div className="absolute inset-x-0 bottom-0 px-4 pb-28 text-white space-y-3">
        <div>
          <div className="font-display uppercase text-2xl leading-tight" style={{ textShadow: "0 2px 12px rgba(0,0,0,.6)" }}>
            {ad.title}
          </div>
          {ad.subtitle && (
            <p className="text-[14px] text-white/85 mt-1 line-clamp-2 max-w-[85%]">{ad.subtitle}</p>
          )}
        </div>
        {(ad.cta_url || ad.cta_text) && (
          <button
            onClick={handleClick}
            className="inline-flex items-center gap-2 font-display uppercase text-[12px] tracking-widest px-5 py-3 rounded-2xl text-black active:scale-95 transition"
            style={{ background: color, boxShadow: `0 8px 32px ${color}55` }}
          >
            {ad.cta_text || "Află mai mult"} →
          </button>
        )}
      </div>
    </section>
  );
}

type FeedItem =
  | { kind: "reel"; reel: Reel }
  | { kind: "ad"; ad: Sponsored };

function ReelsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: reels = [], isLoading } = useQuery({
    queryKey: ["reels"],
    queryFn: loadReels,
    staleTime: 30_000,
  });
  const { data: sponsored = [] } = useQuery({
    queryKey: ["reels-sponsored"],
    queryFn: loadSponsored,
    staleTime: 60_000,
  });
  const { data: myLikes = new Set<string>() } = useQuery({
    queryKey: ["reels-likes", user?.id, reels.map((r) => r.id).join(",")],
    enabled: !!user && reels.length > 0,
    queryFn: async () => {
      if (!user) return new Set<string>();
      const { data } = await supabase
        .from("photo_likes")
        .select("photo_id")
        .eq("user_id", user.id)
        .in(
          "photo_id",
          reels.map((r) => r.id),
        );
      return new Set((data ?? []).map((r: any) => r.photo_id));
    },
  });

  // Interleave sponsored slides every 5 reels
  const feed: FeedItem[] = (() => {
    if (!reels.length) return [];
    const items: FeedItem[] = [];
    let adIdx = 0;
    reels.forEach((r, i) => {
      items.push({ kind: "reel", reel: r });
      if ((i + 1) % 5 === 0 && sponsored.length) {
        items.push({ kind: "ad", ad: sponsored[adIdx % sponsored.length] });
        adIdx++;
      }
    });
    return items;
  })();

  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [commentsFor, setCommentsFor] = useState<Reel | null>(null);
  const seenAds = useRef(new Set<string>());

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const tiles = Array.from(el.querySelectorAll<HTMLElement>("[data-reel]"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio > 0.6) {
            const idx = Number((e.target as HTMLElement).dataset.idx ?? "0");
            setActiveIdx(idx);
          }
        }
      },
      { threshold: [0, 0.6, 1], root: el },
    );
    tiles.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, [feed.length]);

  // Track sponsored impressions once per view
  useEffect(() => {
    const item = feed[activeIdx];
    if (!item || item.kind !== "ad") return;
    const id = item.ad.id;
    if (seenAds.current.has(id)) return;
    seenAds.current.add(id);
    recordCampaignEvent({ data: { campaignId: id, eventType: "impression" } }).catch(() => {});
  }, [activeIdx, feed]);

  async function toggleLike(reel: Reel) {
    if (!user) {
      toast.error("Trebuie să fii logat.");
      return;
    }
    const liked = myLikes.has(reel.id);
    if (liked) {
      await supabase.from("photo_likes").delete().eq("photo_id", reel.id).eq("user_id", user.id);
    } else {
      await supabase.from("photo_likes").insert({ photo_id: reel.id, user_id: user.id });
      import("@/lib/native").then(({ haptic }) => haptic?.("light")).catch(() => {});
    }
    qc.invalidateQueries({ queryKey: ["reels-likes"] });
  }

  return (
    <div className="fixed inset-0 bg-black z-40">
      <div className="absolute top-0 inset-x-0 z-50 flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+10px)] pb-3 bg-gradient-to-b from-black/60 to-transparent">
        <Link to="/app/faze" className="text-white/80 text-[13px] font-medium active:scale-95">
          ← Faze
        </Link>
        <div className="text-white font-bold tracking-tight">REELS</div>
        <div className="w-12" />
      </div>

      {isLoading ? (
        <div className="absolute inset-0 flex items-center justify-center text-white/60">
          Se încarcă reels…
        </div>
      ) : feed.length === 0 ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70 gap-3 px-8 text-center">
          <div className="text-5xl">🎬</div>
          <div className="text-lg font-semibold">Niciun reel încă.</div>
          <Link
            to="/app/faze"
            className="mt-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#ff3d8b] to-[#c724ff] text-white text-sm font-bold"
          >
            Postează primul
          </Link>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="h-[100svh] w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar overscroll-contain"
        >
          {feed.map((item, idx) =>
            item.kind === "reel" ? (
              <div key={`r-${item.reel.id}`} data-reel data-idx={idx}>
                <ReelTile
                  reel={item.reel}
                  active={idx === activeIdx}
                  liked={myLikes.has(item.reel.id)}
                  onToggleLike={() => toggleLike(item.reel)}
                  onOpenComments={() => setCommentsFor(item.reel)}
                />
              </div>
            ) : (
              <div key={`a-${item.ad.id}-${idx}`} data-reel data-idx={idx}>
                <SponsoredTile ad={item.ad} active={idx === activeIdx} />
              </div>
            ),
          )}
        </div>
      )}
      {commentsFor && (
        <CommentsSheet
          photo={{
            id: commentsFor.id,
            photo_url: commentsFor.url,
            caption: commentsFor.caption,
            created_at: new Date().toISOString(),
            user_id: commentsFor.user_id,
            venue_id: commentsFor.venue_id,
            media_type: commentsFor.isVideo ? "video" : "image",
          }}
          onClose={() => setCommentsFor(null)}
        />
      )}
    </div>
  );
}


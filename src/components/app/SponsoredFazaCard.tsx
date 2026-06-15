import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { recordCampaignEvent } from "@/lib/business-promotion.functions";

const archivo = { fontFamily: '"Archivo Black", system-ui, sans-serif', letterSpacing: "-0.01em" } as const;

export type AdCard = {
  id: string;
  title: string | null;
  body: string | null;
  brand: string | null;
  logo: string | null;
  cover: string | null;
  video: string | null;
  ctaUrl: string | null;
  ctaText: string | null;
  theme: string;
  rating: number | null;
  reviewsCount: number | null;
};

// Shared loader used by /app/faze and /app/feed so paying clubs get
// surfaced in both feeds for one campaign cost.
export function usePromoCards() {
  return useQuery({
    queryKey: ["faze-promo-cards"],
    queryFn: async (): Promise<AdCard[]> => {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, title, body, subtitle, theme_color, image_urls, video_url, cta_url, cta_text, venue_id, business_accounts!inner(logo_url, cover_url, brand_name, reputation_score, total_reviews)")
        .eq("status", "active")
        .lte("starts_at", nowIso)
        .or(`ends_at.is.null,ends_at.gt.${nowIso}`)
        .limit(10);
      if (error) {
        console.warn("[usePromoCards]", error.message);
        return [];
      }
      const rows = (data ?? []) as any[];
      const venueIds = Array.from(new Set(rows.map((r) => r.venue_id).filter(Boolean)));
      const venuesMap = new Map<string, string>();
      if (venueIds.length) {
        const { data: vs } = await supabase.from("venues").select("id, name").in("id", venueIds);
        (vs ?? []).forEach((v: any) => venuesMap.set(v.id, v.name));
      }
      return rows.map((c) => ({
        id: c.id as string,
        title: (c.title as string | null) ?? null,
        body: (c.body as string | null) ?? (c.subtitle as string | null) ?? null,
        brand: (venuesMap.get(c.venue_id) ?? c.business_accounts?.brand_name ?? null) as string | null,
        logo: (c.business_accounts?.logo_url ?? null) as string | null,
        cover: ((c.image_urls?.[0] as string | undefined) ?? c.business_accounts?.cover_url ?? null) as string | null,
        video: (c.video_url as string | null) ?? null,
        ctaUrl: (c.cta_url as string | null) ?? null,
        ctaText: (c.cta_text as string | null) ?? null,
        theme: (c.theme_color ?? "#ff8c31") as string,
        rating: (c.business_accounts?.reputation_score as number | null) ?? null,
        reviewsCount: (c.business_accounts?.total_reviews as number | null) ?? null,
      }));
    },
    refetchInterval: 120_000,
  });
}

function useCampaignLikes(campaignId: string, userId: string | undefined) {
  return useQuery({
    queryKey: ["campaign-likes", campaignId, userId ?? null],
    queryFn: async () => {
      const [{ count }, mine] = await Promise.all([
        supabase.from("campaign_likes").select("user_id", { count: "exact", head: true }).eq("campaign_id", campaignId),
        userId
          ? supabase.from("campaign_likes").select("user_id").eq("campaign_id", campaignId).eq("user_id", userId).maybeSingle()
          : Promise.resolve({ data: null } as any),
      ]);
      return { count: count ?? 0, liked: !!mine.data };
    },
    staleTime: 30_000,
  });
}

export function SponsoredFazaCard({ ad }: { ad: AdCard }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: likeState } = useCampaignLikes(ad.id, user?.id);
  const liked = !!likeState?.liked;
  const likes = likeState?.count ?? 0;
  const handle = ad.brand ?? "promovat";
  const [busy, setBusy] = useState(false);
  const trackEvent = useServerFn(recordCampaignEvent);

  // Log a single real impression per mount once the user is signed in.
  const loggedRef = useRef(false);
  useEffect(() => {
    if (!user?.id || loggedRef.current) return;
    loggedRef.current = true;
    trackEvent({ data: { campaignId: ad.id, eventType: "impression" } }).catch(() => {});
  }, [user?.id, ad.id, trackEvent]);

  const logClick = () => {
    if (!user?.id) return;
    trackEvent({ data: { campaignId: ad.id, eventType: "click" } }).catch(() => {});
  };

  const toggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { toast.error("Trebuie să fii logat."); return; }
    if (busy) return;
    setBusy(true);
    if (liked) {
      await supabase.from("campaign_likes").delete().eq("campaign_id", ad.id).eq("user_id", user.id);
    } else {
      await supabase.from("campaign_likes").insert({ campaign_id: ad.id, user_id: user.id });
    }
    qc.invalidateQueries({ queryKey: ["campaign-likes", ad.id] });
    setBusy(false);
  };

  const openDetail = () => {
    logClick();
    navigate({ to: "/app/promo/$id", params: { id: ad.id } });
  };

  return (
    <article
      className="rounded-3xl border overflow-hidden shadow-[0_4px_24px_-12px_rgba(0,0,0,0.6)] animate-fade-in"
      style={{ borderColor: `${ad.theme}66`, background: `linear-gradient(180deg, ${ad.theme}10, transparent 60%)` }}
    >
      {/* Sponsored ribbon — clearly marks the card as a paid placement */}
      <div
        className="flex items-center justify-between gap-2 px-3.5 py-1.5 text-[10px] uppercase tracking-[0.22em]"
        style={{ ...archivo, background: `${ad.theme}22`, color: ad.theme, borderBottom: `1px solid ${ad.theme}33` }}
      >
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full animate-pulse" style={{ background: ad.theme }} />
          Postare sponsorizată
        </span>
        <span
          className="px-2 py-0.5 rounded-full text-[9px] font-black tracking-[0.16em]"
          style={{ background: ad.theme, color: "#06070a" }}
        >
          AD
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 px-3.5 py-3">
        <button onClick={openDetail} className="flex items-center gap-3 flex-1 min-w-0 text-left">
          <div className="p-[2px] rounded-full" style={{ background: `linear-gradient(135deg, #ffd166, ${ad.theme})` }}>
            <div className="p-[2px] rounded-full bg-background">
              {ad.logo ? (
                <img src={ad.logo} alt={handle} className="size-9 rounded-full object-cover" />
              ) : (
                <div className="size-9 rounded-full flex items-center justify-center text-xs font-black" style={{ color: ad.theme, background: "rgba(255,255,255,0.05)" }}>
                  {handle[0]?.toUpperCase()}
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0 leading-tight">
            <div className="text-[14px] font-semibold truncate flex items-center gap-1.5">
              {handle}
              {ad.rating != null && ad.rating > 0 && (
                <span className="text-[11px] font-normal text-amber-400 shrink-0">★ {ad.rating.toFixed(1)}{ad.reviewsCount ? ` (${ad.reviewsCount})` : ""}</span>
              )}
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              Promovat de business
            </div>
          </div>
        </button>
      </div>

      {/* Media */}
      <button onClick={openDetail} className="block w-full text-left">
        {ad.video ? (
          <div className="relative bg-black">
            <video src={ad.video} className="w-full aspect-square object-cover" playsInline muted loop autoPlay preload="metadata" />
          </div>
        ) : ad.cover ? (
          <div className="relative bg-black">
            <img src={ad.cover} alt={ad.title ?? handle} className="w-full aspect-square object-cover" loading="lazy" />
          </div>
        ) : null}
      </button>

      {/* Actions */}
      <div className="flex items-center gap-1 px-2 pt-2.5">
        <button onClick={toggleLike} aria-label="Apreciază" className="size-10 flex items-center justify-center active:scale-90 transition">
          <svg viewBox="0 0 24 24" className={`size-7 ${liked ? "fill-sunset-orange stroke-sunset-orange" : "fill-none stroke-foreground"}`} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z"/></svg>
        </button>
        {ad.ctaUrl && (
          <a
            href={ad.ctaUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => { e.stopPropagation(); logClick(); }}
            className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] px-3 py-1.5 rounded-full"
            style={{ background: `${ad.theme}22`, color: ad.theme }}
          >
            {ad.ctaText || "Deschide"} →
          </a>
        )}
      </div>

      {/* Likes count */}
      {likes > 0 && (
        <div className="px-4 pt-1.5 text-[13px] font-semibold">
          {likes} {likes === 1 ? "apreciere" : "aprecieri"}
        </div>
      )}

      {/* Title + body */}
      <div className="px-4 pt-1 pb-1 text-[14px] leading-snug">
        <span className="font-semibold mr-1.5">{handle}</span>
        {ad.title && <span className="text-foreground/90">{ad.title}</span>}
      </div>
      {ad.body && (
        <div className="px-4 pb-3 text-[13px] leading-snug text-foreground/80 whitespace-pre-wrap">
          {ad.body}
        </div>
      )}

      <div className="px-4 pb-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground" style={archivo}>
        postare sponsorizată
      </div>
    </article>
  );
}

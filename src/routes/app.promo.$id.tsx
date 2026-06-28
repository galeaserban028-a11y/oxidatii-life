import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Heart, ArrowRight, Instagram } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/promo/$id")({
  component: PromoPage,
});

function PromoPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const trackedRef = useRef(false);

  const { data, isLoading } = useQuery({
    queryKey: ["promo", id],
    queryFn: async () => {
      const { data: campaign, error } = await supabase
        .from("campaigns")
        .select(
          "id,business_id,title,body,subtitle,cta_text,cta_url,image_urls,theme_color,starts_at,ends_at,impressions,clicks",
        )
        .eq("id", id)
        .single();
      if (error) throw error;
      const biz = await supabase
        .rpc("get_business_account_public", { _id: campaign.business_id })
        .maybeSingle();
      return { campaign, biz: biz.data };
    },
  });

  const { data: likeState } = useQuery({
    queryKey: ["campaign-likes", id, user?.id ?? null],
    queryFn: async () => {
      const [{ count }, mine] = await Promise.all([
        supabase
          .from("campaign_likes")
          .select("user_id", { count: "exact", head: true })
          .eq("campaign_id", id),
        user
          ? supabase
              .from("campaign_likes")
              .select("user_id")
              .eq("campaign_id", id)
              .eq("user_id", user.id)
              .maybeSingle()
          : Promise.resolve({ data: null } as any),
      ]);
      return { count: count ?? 0, liked: !!mine.data };
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (!data?.campaign || trackedRef.current) return;
    trackedRef.current = true;
    supabase
      .rpc("increment_business_visit", { _business_id: data.campaign.business_id })
      .then(() => {});
    if (user) {
      supabase
        .from("campaign_events")
        .insert({
          campaign_id: data.campaign.id,
          user_id: user.id,
          event_type: "view_detail",
          cost_cents: 0,
        })
        .then(() => {});
    }
  }, [data, user]);

  const [busyLike, setBusyLike] = useState(false);
  const toggleLike = async () => {
    if (!user) {
      toast.error("Conectează-te ca să apreciezi.");
      return;
    }
    if (busyLike) return;
    setBusyLike(true);
    if (likeState?.liked) {
      await supabase.from("campaign_likes").delete().eq("campaign_id", id).eq("user_id", user.id);
    } else {
      await supabase.from("campaign_likes").insert({ campaign_id: id, user_id: user.id });
    }
    qc.invalidateQueries({ queryKey: ["campaign-likes", id] });
    setBusyLike(false);
  };

  const handleCtaClick = () => {
    if (!data?.campaign?.cta_url) return;
    if (user) {
      supabase
        .from("campaign_events")
        .insert({
          campaign_id: data.campaign.id,
          user_id: user.id,
          event_type: "click",
          cost_cents: 0,
        })
        .then(() => {});
    }
    window.open(data.campaign.cta_url, "_blank", "noopener,noreferrer");
  };

  if (isLoading) {
    return <div className="min-h-screen bg-black animate-pulse" />;
  }
  if (!data?.campaign) return <div className="p-6 text-sm">Promovare indisponibilă.</div>;

  const { campaign, biz } = data;
  const hero = campaign.image_urls?.[0];
  const handle = biz?.brand_name ?? "promovat";
  const liked = !!likeState?.liked;
  const body = (campaign.body ?? campaign.subtitle ?? "").trim();
  const title = (campaign.title ?? "").trim();
  const isInstagram = !!campaign.cta_url && /instagram\.com/i.test(campaign.cta_url);
  const ctaLabel = isInstagram ? "Deschide Instagram" : campaign.cta_text || "Deschide";

  // Split title into two lines for billboard typography
  const words = title ? title.split(/\s+/) : [];
  let line1 = title;
  let line2 = "";
  if (words.length >= 2) {
    const mid = Math.ceil(words.length / 2);
    line1 = words.slice(0, mid).join(" ");
    line2 = words.slice(mid).join(" ");
  }

  return (
    <div className="relative min-h-screen w-full bg-black text-white overflow-hidden antialiased">
      {/* Full-bleed background image */}
      <div className="fixed inset-0 z-0">
        {hero ? (
          <img
            src={hero}
            alt={title || handle}
            className="w-full h-full object-cover opacity-70 scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-orange-900/40 via-pink-900/30 to-purple-900/40" />
        )}
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-transparent" />
        {/* Ambient glow */}
        <div className="absolute top-1/2 left-0 w-48 h-96 bg-pink-600/20 blur-[120px] pointer-events-none -translate-x-1/2" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-orange-600/10 blur-[100px] pointer-events-none translate-x-1/4" />
      </div>

      {/* Top branding layer */}
      <div
        className="fixed top-0 inset-x-0 z-30 px-5 pt-4 flex justify-between items-start"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => (history.length > 1 ? history.back() : navigate({ to: "/app" }))}
            className="size-10 rounded-full bg-black/55 backdrop-blur-md border border-white/15 text-white flex items-center justify-center active:scale-95 transition"
            aria-label="Înapoi"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="size-10 rounded-full border-2 border-orange-500 p-0.5 bg-zinc-900">
              {biz?.logo_url ? (
                <img
                  src={biz.logo_url}
                  alt={handle}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 flex items-center justify-center text-white font-black text-sm shadow-[0_0_15px_rgba(249,115,22,0.4)]">
                  {handle[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <div className="leading-none">
              <h3 className="text-white font-bold tracking-tight text-[14px]">{handle}</h3>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                <p className="text-[9px] text-orange-400 font-bold tracking-[0.18em] uppercase">
                  Postare Promovată
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 mt-1">
          <span className="text-[9px] font-black text-white uppercase tracking-[0.18em]">
            Sponsorizat
          </span>
        </div>
      </div>

      {/* Main ad content — anchored at bottom */}
      <div
        className="fixed bottom-0 inset-x-0 z-20 px-5 pb-4 space-y-5"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
      >
        {/* Billboard typography */}
        {title && (
          <div className="space-y-2">
            <h1
              className="font-black text-white uppercase leading-[0.85] tracking-tighter italic"
              style={{
                fontFamily: "'Oswald', 'Anton', 'Bebas Neue', system-ui, sans-serif",
                fontSize: line2 ? "clamp(44px, 14vw, 72px)" : "clamp(40px, 12vw, 64px)",
                textShadow: "0 4px 24px rgba(0,0,0,0.6)",
              }}
            >
              {line2 ? (
                <>
                  <span className="block">{line1}</span>
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500">
                    {line2}
                  </span>
                </>
              ) : (
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500">
                  {line1}
                </span>
              )}
            </h1>
          </div>
        )}

        {body && (
          <p className="text-zinc-200 text-sm max-w-[300px] leading-relaxed border-l-2 border-orange-500 pl-4 whitespace-pre-wrap">
            {body}
          </p>
        )}

        {/* CTA + like */}
        <div className="flex items-center gap-3">
          {campaign.cta_url ? (
            <button
              onClick={handleCtaClick}
              className="flex-1 relative overflow-hidden rounded-xl active:scale-[0.98] transition-transform"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600" />
              <div className="relative m-[1.5px] bg-zinc-950 rounded-[10px] py-4 flex items-center justify-center gap-2">
                {isInstagram && <Instagram size={16} className="text-pink-400" />}
                <span className="text-white font-black uppercase tracking-[0.16em] text-[11px]">
                  {ctaLabel}
                </span>
                <ArrowRight size={14} className="text-orange-400" strokeWidth={3} />
              </div>
            </button>
          ) : (
            <div className="flex-1" />
          )}

          <button
            onClick={toggleLike}
            aria-label="Apreciază"
            className="size-14 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center active:bg-white/20 transition-all"
          >
            <Heart
              size={22}
              className={liked ? "fill-pink-500 text-pink-500" : "text-pink-400"}
              strokeWidth={2}
            />
          </button>
        </div>

        {/* Mandatory health warning */}
        <p className="text-[7px] text-zinc-500 text-center uppercase tracking-[0.22em] font-black pt-1">
          Alcoolul dăunează grav sănătății
        </p>
      </div>
    </div>
  );
}

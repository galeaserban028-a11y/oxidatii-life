import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Eye, MousePointerClick, Heart, Share2, ExternalLink } from "lucide-react";
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
        .select("id,business_id,title,body,subtitle,cta_text,cta_url,image_urls,theme_color,starts_at,ends_at,impressions,clicks")
        .eq("id", id).single();
      if (error) throw error;
      const biz = await supabase
        .from("business_accounts")
        .select("id,brand_name,logo_url,verified")
        .eq("id", campaign.business_id).maybeSingle();
      return { campaign, biz: biz.data };
    },
  });

  const { data: likeState } = useQuery({
    queryKey: ["campaign-likes", id, user?.id ?? null],
    queryFn: async () => {
      const [{ count }, mine] = await Promise.all([
        supabase.from("campaign_likes").select("user_id", { count: "exact", head: true }).eq("campaign_id", id),
        user
          ? supabase.from("campaign_likes").select("user_id").eq("campaign_id", id).eq("user_id", user.id).maybeSingle()
          : Promise.resolve({ data: null } as any),
      ]);
      return { count: count ?? 0, liked: !!mine.data };
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (!data?.campaign || trackedRef.current) return;
    trackedRef.current = true;
    supabase.rpc("increment_business_visit", { _business_id: data.campaign.business_id }).then(() => {});
    if (user) {
      supabase.from("campaign_events").insert({
        campaign_id: data.campaign.id,
        user_id: user.id,
        event_type: "view_detail",
        cost_cents: 0,
      }).then(() => {});
    }
  }, [data, user]);

  const [busyLike, setBusyLike] = useState(false);
  const toggleLike = async () => {
    if (!user) { toast.error("Conectează-te ca să apreciezi."); return; }
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
      supabase.from("campaign_events").insert({
        campaign_id: data.campaign.id,
        user_id: user.id,
        event_type: "click",
        cost_cents: 0,
      }).then(() => {});
    }
    window.open(data.campaign.cta_url, "_blank", "noopener,noreferrer");
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ url, title: data?.campaign?.title ?? "Promovat" });
      else { await navigator.clipboard.writeText(url); toast.success("Link copiat"); }
    } catch {}
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="aspect-square bg-foreground/5 animate-pulse" />
        <div className="p-5 space-y-3">
          <div className="h-4 w-32 bg-foreground/10 rounded animate-pulse" />
          <div className="h-6 w-2/3 bg-foreground/10 rounded animate-pulse" />
        </div>
      </div>
    );
  }
  if (!data?.campaign) return <div className="p-6 text-sm">Promovare indisponibilă.</div>;

  const { campaign, biz } = data;
  const color = campaign.theme_color || "#FF2D55";
  const hero = campaign.image_urls?.[0];
  const handle = biz?.brand_name ?? "promovat";
  const liked = !!likeState?.liked;
  const likes = likeState?.count ?? 0;
  const body = (campaign.body ?? campaign.subtitle ?? "").trim();

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Top bar — floats over image */}
      <div
        className="fixed top-0 inset-x-0 z-30 flex items-center justify-between px-3 pt-3"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.5rem)" }}
      >
        <button
          onClick={() => history.length > 1 ? history.back() : navigate({ to: "/app" })}
          className="p-2 rounded-full bg-black/55 backdrop-blur-md border border-white/15 text-white"
          aria-label="Înapoi"
        >
          <ArrowLeft size={16} />
        </button>
        <span
          className="px-2.5 py-1 rounded-full text-[9px] font-black tracking-[0.18em] uppercase"
          style={{ background: color, color: "#06070a" }}
        >
          Sponsorizat
        </span>
      </div>

      {/* Brand header */}
      <header className="px-4 pt-16 pb-3 flex items-center gap-3">
        <div className="p-[2px] rounded-full" style={{ background: `linear-gradient(135deg, #ffd166, ${color})` }}>
          <div className="p-[2px] rounded-full bg-background">
            {biz?.logo_url ? (
              <img src={biz.logo_url} alt={handle} className="size-10 rounded-full object-cover" />
            ) : (
              <div className="size-10 rounded-full flex items-center justify-center text-sm font-black" style={{ color, background: "rgba(255,255,255,0.05)" }}>
                {handle[0]?.toUpperCase()}
              </div>
            )}
          </div>
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="text-[15px] font-semibold truncate flex items-center gap-1.5">
            {handle}
            {biz?.verified && <span className="text-[10px] text-sky-400">✓</span>}
          </div>
          <div className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
            <span style={{ color }}>●</span> postare promovată
          </div>
        </div>
      </header>

      {/* Hero image */}
      {hero ? (
        <div className="relative bg-black">
          <img src={hero} alt={campaign.title ?? handle} className="w-full aspect-square object-cover" />
        </div>
      ) : (
        <div className="aspect-square flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${color}, ${color}33)` }}>
          <span className="font-display uppercase text-3xl text-white/90">{handle}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 px-3 pt-3">
        <button onClick={toggleLike} aria-label="Apreciază" className="size-11 flex items-center justify-center active:scale-90 transition">
          <Heart size={26} className={liked ? "fill-sunset-orange text-sunset-orange" : "text-foreground"} strokeWidth={1.6} />
        </button>
        <button onClick={share} aria-label="Distribuie" className="size-11 flex items-center justify-center active:scale-90 transition">
          <Share2 size={22} className="text-foreground" strokeWidth={1.6} />
        </button>
        {campaign.cta_url && (
          <button
            onClick={handleCtaClick}
            className="ml-auto inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] px-4 py-2 rounded-full"
            style={{ background: `${color}22`, color }}
          >
            {campaign.cta_text || "Deschide"} <ExternalLink size={13} />
          </button>
        )}
      </div>

      {/* Likes */}
      {likes > 0 && (
        <div className="px-5 pt-2 text-[14px] font-semibold">
          {likes} {likes === 1 ? "apreciere" : "aprecieri"}
        </div>
      )}

      {/* Title + body */}
      <div className="px-5 pt-2 text-[15px] leading-snug">
        <span className="font-semibold mr-1.5">{handle}</span>
        {campaign.title && <span className="text-foreground/90">{campaign.title}</span>}
      </div>
      {body && (
        <div className="px-5 pt-2 text-[14px] leading-relaxed text-foreground/85 whitespace-pre-wrap">
          {body}
        </div>
      )}

      {/* Stats strip */}
      <div className="mx-4 mt-5 rounded-2xl border border-foreground/10 bg-foreground/[0.03] px-4 py-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <span className="flex items-center gap-1.5"><Eye size={12} /> {campaign.impressions.toLocaleString()}</span>
        <span className="flex items-center gap-1.5"><MousePointerClick size={12} /> {campaign.clicks.toLocaleString()}</span>
        <span>{new Date(campaign.starts_at).toLocaleDateString("ro-RO", { day: "2-digit", month: "short" })}{campaign.ends_at ? ` – ${new Date(campaign.ends_at).toLocaleDateString("ro-RO", { day: "2-digit", month: "short" })}` : ""}</span>
      </div>

      <div className="pt-6 text-center font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground/60">
        Promovat de {handle}
      </div>
    </div>
  );
}

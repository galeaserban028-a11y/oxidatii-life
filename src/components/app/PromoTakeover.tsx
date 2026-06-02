import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Sparkles, X, ChevronRight } from "lucide-react";

type Campaign = {
  id: string;
  business_id: string;
  kind: string;
  title: string;
  subtitle: string | null;
  cta_text: string | null;
  cta_url: string | null;
  image_urls: string[] | null;
  theme_color: string | null;
  venue_id: string | null;
  party_id: string | null;
};

type Biz = { id: string; brand_name: string; logo_url: string | null };

const STORAGE_KEY = "oxd:promo:lastSeen";
const COOLDOWN_MS = 1000 * 60 * 5; // 5 min

async function loadActive(): Promise<{ campaign: Campaign; biz: Biz | null } | null> {
  const nowIso = new Date().toISOString();
  // story banners are the headline takeover; fall back to feed boost
  const { data } = await supabase
    .from("campaigns")
    .select("id, business_id, kind, title, subtitle, cta_text, cta_url, image_urls, theme_color, venue_id, party_id")
    .eq("status", "active")
    .lte("starts_at", nowIso)
    .or(`ends_at.is.null,ends_at.gt.${nowIso}`)
    .in("kind", ["boost_story", "boost_feed", "boost_discover"])
    .order("bid_cents", { ascending: false })
    .limit(10);

  const list = (data ?? []) as Campaign[];
  if (!list.length) return null;
  // Weighted random pick favoring boost_story
  const weighted = list.flatMap((c) => {
    const w = c.kind === "boost_story" ? 5 : c.kind === "boost_feed" ? 2 : 1;
    return Array.from({ length: w }, () => c);
  });
  const campaign = weighted[Math.floor(Math.random() * weighted.length)];

  const { data: biz } = await supabase
    .from("business_accounts")
    .select("id, brand_name, logo_url")
    .eq("id", campaign.business_id)
    .maybeSingle();

  return { campaign, biz: (biz as Biz) ?? null };
}

export function PromoTakeover() {
  const { user } = useAuth();
  const [payload, setPayload] = useState<{ campaign: Campaign; biz: Biz | null } | null>(null);
  const [phase, setPhase] = useState<"hidden" | "full" | "mini" | "gone">("hidden");
  const trackedRef = useRef(false);

  useEffect(() => {
    const last = Number(localStorage.getItem(STORAGE_KEY) ?? 0);
    if (Date.now() - last < COOLDOWN_MS) return;
    let alive = true;
    loadActive().then((res) => {
      if (!alive || !res) return;
      setPayload(res);
      setPhase("full");
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    });
    return () => { alive = false; };
  }, []);

  // Track impression once
  useEffect(() => {
    if (phase !== "full" || !payload || trackedRef.current) return;
    trackedRef.current = true;
    if (user) {
      supabase.from("campaign_events").insert({
        campaign_id: payload.campaign.id,
        user_id: user.id,
        event_type: "impression",
        cost_cents: 1,
      }).then(() => {});
      // optimistic counter bump
      supabase.rpc as any; // noop; rely on aggregations
    }
  }, [phase, payload, user]);

  // Auto-collapse to mini after 3s, then auto-hide after 5s more
  useEffect(() => {
    if (phase === "full") {
      const t = setTimeout(() => setPhase("mini"), 3000);
      return () => clearTimeout(t);
    }
    if (phase === "mini") {
      const t = setTimeout(() => setPhase("gone"), 5000);
      return () => clearTimeout(t);
    }
  }, [phase]);

  const handleClick = () => {
    if (!payload) return;
    if (user) {
      supabase.from("campaign_events").insert({
        campaign_id: payload.campaign.id,
        user_id: user.id,
        event_type: "click",
        cost_cents: 5,
      }).then(() => {});
    }
    const c = payload.campaign;
    if (c.cta_url) {
      window.open(c.cta_url, "_blank", "noopener,noreferrer");
    } else if (c.venue_id) {
      window.location.href = `/app/venue/${c.venue_id}`;
    } else if (c.party_id) {
      window.location.href = `/app/parties`;
    }
    setPhase("gone");
  };

  if (!payload || phase === "hidden" || phase === "gone") return null;
  const { campaign, biz } = payload;
  const color = campaign.theme_color || "#FF2D55";
  const img = campaign.image_urls?.[0];

  if (phase === "full") {
    return (
      <div className="fixed inset-0 z-[140] animate-fade-in">
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${color}, ${color}66)` }}>
          {img && <img src={img} alt="" className="absolute inset-0 w-full h-full object-cover opacity-90" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/10" />
        </div>
        <button
          onClick={() => setPhase("mini")}
          className="absolute top-4 right-4 p-2 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 z-10"
          aria-label="Închide"
        >
          <X size={16} className="text-white" />
        </button>
        <div className="absolute top-4 left-4 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-sm flex items-center gap-1.5">
          <Sparkles size={11} className="text-white" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-white">Promovat</span>
        </div>
        <div className="absolute inset-x-0 bottom-0 p-6 pb-24 text-white space-y-4 animate-fade-in">
          <div className="flex items-center gap-2">
            {biz?.logo_url && <img src={biz.logo_url} alt="" className="h-8 w-8 rounded-md object-cover" />}
            <span className="font-mono text-[10px] uppercase tracking-widest opacity-80">{biz?.brand_name ?? "Brand"}</span>
          </div>
          <h2 className="font-display uppercase text-4xl leading-[0.95] tracking-tight">{campaign.title}</h2>
          {campaign.subtitle && <p className="text-base opacity-95 line-clamp-3">{campaign.subtitle}</p>}
          <button
            onClick={handleClick}
            className="w-full mt-2 px-5 py-4 rounded-xl text-base font-display uppercase tracking-widest flex items-center justify-center gap-2"
            style={{ background: color, boxShadow: `0 12px 32px -8px ${color}` }}
          >
            {campaign.cta_text || "Vezi detalii"} <ChevronRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  // mini pill bottom-right above bottom tab bar
  return (
    <button
      onClick={handleClick}
      className="fixed right-3 z-[110] flex items-center gap-2 p-2 pr-3 rounded-full bg-background/95 backdrop-blur-md border border-foreground/15 shadow-xl animate-fade-in active:scale-95 transition"
      style={{
        bottom: "calc(96px + env(safe-area-inset-bottom))",
        boxShadow: `0 8px 24px -6px ${color}66`,
      }}
    >
      <div
        className="h-8 w-8 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
        style={{ background: color }}
      >
        {img ? (
          <img src={img} alt="" className="w-full h-full object-cover" />
        ) : (
          <Sparkles size={14} className="text-white" />
        )}
      </div>
      <div className="text-left">
        <div className="font-mono text-[8px] uppercase tracking-widest opacity-60 leading-none">Promovat</div>
        <div className="font-display text-xs leading-tight max-w-[140px] truncate">Află mai multe</div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); setPhase("gone"); }}
        className="ml-1 p-1 rounded-full hover:bg-foreground/10"
        aria-label="Închide"
      >
        <X size={12} />
      </button>
    </button>
  );
}

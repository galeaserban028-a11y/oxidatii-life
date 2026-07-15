import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useEntitlements } from "@/lib/entitlements";
import { Sparkles, X, ChevronRight, Calendar, MapPin, Ticket, Star, Video } from "lucide-react";

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
  event_starts_at: string | null;
  entry_kind: string | null;
  entry_price_text: string | null;
  street: string | null;
  special_guest: string | null;
  video_url: string | null;
};

type Biz = { id: string; brand_name: string; logo_url: string | null };

const DISMISSED_KEY = "oxd:promo:dismissed";
const SEEN_FULL_KEY = "oxd:promo:seenFull";

function getDismissed(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(DISMISSED_KEY) || "[]");
  } catch {
    return [];
  }
}
function addDismissed(id: string) {
  const list = getDismissed();
  if (!list.includes(id)) list.push(id);
  sessionStorage.setItem(DISMISSED_KEY, JSON.stringify(list));
}
function hasSeenFull(id: string): boolean {
  try {
    return (JSON.parse(sessionStorage.getItem(SEEN_FULL_KEY) || "[]") as string[]).includes(id);
  } catch {
    return false;
  }
}
function markSeenFull(id: string) {
  try {
    const list = JSON.parse(sessionStorage.getItem(SEEN_FULL_KEY) || "[]") as string[];
    if (!list.includes(id)) list.push(id);
    sessionStorage.setItem(SEEN_FULL_KEY, JSON.stringify(list));
  } catch { /* noop */ }
}

async function loadActive(
  excludeIds: string[] = [],
): Promise<{ campaign: Campaign; biz: Biz | null } | null> {
  const { data } = await supabase.rpc("get_active_campaigns", {
    _kinds: ["boost_story", "boost_feed", "boost_discover"],
    _limit: 20,
  });

  const dismissed = new Set([...getDismissed(), ...excludeIds]);
  const list = ((data ?? []) as Campaign[]).filter((c) => !dismissed.has(c.id));
  if (!list.length) return null;
  const weighted = list.flatMap((c) => {
    const w = c.kind === "boost_story" ? 5 : c.kind === "boost_feed" ? 2 : 1;
    return Array.from({ length: w }, () => c);
  });
  const campaign = weighted[Math.floor(Math.random() * weighted.length)];

  const { data: biz } = await supabase
    .rpc("get_business_account_public", { _id: campaign.business_id })
    .maybeSingle();

  return { campaign, biz: (biz as Biz) ?? null };
}

export function PromoTakeover() {
  const { user, profile } = useAuth();
  const { isActive: isPremium } = useEntitlements();
  const [payload, setPayload] = useState<{ campaign: Campaign; biz: Biz | null } | null>(null);
  const [phase, setPhase] = useState<"hidden" | "full" | "mini" | "gone">("hidden");
  const trackedRef = useRef(false);

  useEffect(() => {
    let alive = true;
    loadActive().then((res) => {
      if (!alive || !res) return;
      setPayload(res);
      // If user already saw the full takeover this session, go straight to mini
      setPhase(hasSeenFull(res.campaign.id) ? "mini" : "full");
    });
    return () => {
      alive = false;
    };
  }, []);

  // Track impression once
  useEffect(() => {
    if (phase !== "full" || !payload || trackedRef.current) return;
    trackedRef.current = true;
    if (user) {
      supabase
        .from("campaign_events")
        .insert({
          campaign_id: payload.campaign.id,
          user_id: user.id,
          event_type: "impression",
          cost_cents: 1,
        })
        .then(() => {});
      // optimistic counter bump
      void supabase.rpc; // noop; rely on aggregations
    }
  }, [phase, payload, user]);

  // Auto-collapse to mini after 5s (full reclamă), then mini stays sticky until user dismisses
  useEffect(() => {
    if (phase === "full" && payload) {
      const t = setTimeout(() => {
        markSeenFull(payload.campaign.id);
        setPhase("mini");
      }, 5000);
      return () => clearTimeout(t);
    }
  }, [phase, payload]);

  const rotateNext = () => {
    if (!payload) return;
    const currentId = payload.campaign.id;
    addDismissed(currentId);
    loadActive([currentId]).then((res) => {
      if (!res) {
        setPhase("gone");
        setPayload(null);
        return;
      }
      trackedRef.current = false;
      setPayload(res);
      setPhase(hasSeenFull(res.campaign.id) ? "mini" : "full");
    });
  };

  const handleClick = () => {
    if (!payload) return;
    if (user) {
      supabase
        .from("campaign_events")
        .insert({
          campaign_id: payload.campaign.id,
          user_id: user.id,
          event_type: "click",
          cost_cents: 5,
        })
        .then(() => {});
    }
    const c = payload.campaign;
    if (c.cta_url) {
      window.open(c.cta_url, "_blank", "noopener,noreferrer");
    } else {
      window.location.href = `/app/promo/${c.id}`;
    }
    setPhase("gone");
  };

  if (isPremium) return null;
  if (!payload || phase === "hidden" || phase === "gone") return null;
  const { campaign, biz } = payload;
  const color = campaign.theme_color || "#ff3d8b";
  const img = campaign.image_urls?.[0];

  if (phase === "full") {
    const facts: { Icon: typeof Calendar; text: string }[] = [];
    if (campaign.event_starts_at) {
      const d = new Date(campaign.event_starts_at);
      facts.push({
        Icon: Calendar,
        text: d.toLocaleString("ro-RO", {
          weekday: "long",
          day: "2-digit",
          month: "long",
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
    }
    if (campaign.entry_kind === "free") facts.push({ Icon: Ticket, text: "Intrare gratis" });
    if (campaign.entry_kind === "paid")
      facts.push({ Icon: Ticket, text: campaign.entry_price_text || "Intrare cu bilet" });
    if (campaign.street) facts.push({ Icon: MapPin, text: campaign.street });
    if (campaign.special_guest) facts.push({ Icon: Star, text: campaign.special_guest });

    return (
      <div className="fixed inset-0 z-[140] animate-fade-in flex flex-col">
        {/* Blurred backdrop using the same image */}
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(135deg, ${color}, #000)` }}
        >
          {img && (
            <img
              src={img}
              alt=""
              aria-hidden
              className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-50"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/70 to-black" />
        </div>

        <button
          onClick={() => {
            markSeenFull(payload.campaign.id);
            setPhase("mini");
          }}
          className="absolute top-4 right-4 p-2 rounded-full bg-black/60 border border-white/20 z-20"
          aria-label="Închide"
        >
          <X size={16} className="text-white" />
        </button>
        <div className="absolute top-4 left-4 px-2.5 py-1 rounded-md bg-black/60 flex items-center gap-1.5 z-20">
          <Sparkles size={11} className="text-white" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-white">
            Promovat
          </span>
        </div>

        {/* Scrollable content */}
        <div className="relative z-10 flex-1 overflow-y-auto pt-16 pb-32">
          <div className="max-w-md mx-auto px-4 space-y-4">
            {/* Brand strip */}
            <div className="flex items-center gap-2 text-white">
              {biz?.logo_url && (
                <img
                  src={biz.logo_url}
                  alt=""
                  className="h-9 w-9 rounded-md object-cover border border-white/20"
                />
              )}
              <span className="font-mono text-[10px] uppercase tracking-widest opacity-80">
                {biz?.brand_name ?? "Brand"}
              </span>
            </div>

            {/* Poster — image at native ratio, no crop */}
            {(img || campaign.video_url) && (
              <div className="relative rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl">
                {campaign.video_url ? (
                  <video
                    src={campaign.video_url}
                    controls
                    playsInline
                    autoPlay
                    muted
                    className="w-full max-h-[55vh] object-contain bg-black"
                  />
                ) : (
                  <img src={img!} alt="" className="w-full max-h-[55vh] object-contain bg-black" />
                )}
                {campaign.video_url && (
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/70 flex items-center gap-1">
                    <Video size={10} className="text-white" />
                    <span className="font-mono text-[9px] uppercase tracking-widest text-white">
                      Clip
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Title + subtitle */}
            <div className="text-white space-y-2">
              <h2 className="font-display uppercase text-3xl leading-[0.95] tracking-tight">
                {campaign.title}
              </h2>
              {campaign.subtitle && <p className="text-sm opacity-90">{campaign.subtitle}</p>}
            </div>

            {/* Event facts card */}
            {facts.length > 0 && (
              <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-4 space-y-2.5">
                {facts.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 text-white">
                    <div
                      className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: `${color}33`, color }}
                    >
                      <f.Icon size={14} />
                    </div>
                    <span className="text-sm leading-tight">{f.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sticky CTA */}
        <div className="absolute inset-x-0 bottom-0 p-4 pb-[calc(env(safe-area-inset-bottom)+16px)] bg-gradient-to-t from-black via-black/90 to-transparent z-10">
          <div className="max-w-md mx-auto">
            <button
              onClick={handleClick}
              className="w-full px-5 py-4 rounded-xl text-base font-display uppercase tracking-widest text-white flex items-center justify-center gap-2"
              style={{ background: color, boxShadow: `0 12px 32px -8px ${color}` }}
            >
              {campaign.cta_text || "Vezi detalii"} <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // top sticky banner on home page
  return (
    <div
      className="sticky top-0 z-[110] px-3 pt-2 animate-fade-in"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 8px)" }}
    >
      <style>{`@keyframes promo-shimmer { 0%,100% { box-shadow: 0 0 0 0 ${color}55, 0 6px 20px -6px ${color}66; } 50% { box-shadow: 0 0 0 4px ${color}11, 0 6px 20px -6px ${color}aa; } }`}</style>
      <div
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") handleClick();
        }}
        className="w-full flex items-center gap-3 p-2 pr-2 rounded-full bg-background/95 border active:scale-[0.98] transition text-left cursor-pointer"
        style={{
          borderColor: `${color}55`,
          animation: "promo-shimmer 2.6s ease-in-out infinite",
        }}
      >
        <div
          className="h-9 w-9 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
          style={{ background: color }}
        >
          {img ? (
            <img src={img} alt="" className="w-full h-full object-cover" />
          ) : (
            <Sparkles size={14} className="text-white" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[8px] uppercase tracking-widest opacity-60 leading-none mb-0.5">
            Promovat · {biz?.brand_name ?? ""}
          </div>
          <div className="font-display text-sm leading-tight truncate">{campaign.title}</div>
        </div>
        <span
          className="hidden sm:inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full text-white flex-shrink-0"
          style={{ background: color }}
        >
          {campaign.cta_text || "Vezi"} <ChevronRight size={11} />
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            rotateNext();
          }}
          className="p-1.5 rounded-full hover:bg-foreground/10 flex-shrink-0"
          aria-label="Următoarea reclamă"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}

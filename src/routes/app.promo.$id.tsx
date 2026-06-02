import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useEffect, useRef } from "react";
import { ArrowLeft, Sparkles, MapPin, Calendar, ExternalLink, ChevronRight, Eye, MousePointerClick } from "lucide-react";

export const Route = createFileRoute("/app/promo/$id")({
  component: PromoPage,
});

function PromoPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const trackedRef = useRef(false);

  const { data, isLoading } = useQuery({
    queryKey: ["promo", id],
    queryFn: async () => {
      const { data: campaign, error } = await supabase
        .from("campaigns")
        .select("id,business_id,kind,title,subtitle,cta_text,cta_url,image_urls,theme_color,venue_id,party_id,city_id,starts_at,ends_at,impressions,clicks")
        .eq("id", id).single();
      if (error) throw error;
      const [biz, venue, party] = await Promise.all([
        supabase.from("business_accounts")
          .select("id,brand_name,type,description,logo_url,cover_url,verified,instagram_handle")
          .eq("id", campaign.business_id).maybeSingle(),
        campaign.venue_id
          ? supabase.from("venues").select("id,name,type,address,cover_url,street:streets(name,city:cities(name,slug))").eq("id", campaign.venue_id).maybeSingle()
          : Promise.resolve({ data: null }),
        campaign.party_id
          ? supabase.from("parties").select("id,title,starts_at,description,location_text").eq("id", campaign.party_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      return { campaign, biz: biz.data, venue: venue.data, party: party.data };
    },
  });

  // Track view as impression on this dedicated page (counts as quality engagement)
  useEffect(() => {
    if (!data?.campaign || !user || trackedRef.current) return;
    trackedRef.current = true;
    supabase.from("campaign_events").insert({
      campaign_id: data.campaign.id,
      user_id: user.id,
      event_type: "view_detail",
      cost_cents: 3,
    }).then(() => {});
  }, [data, user]);

  const handleCtaClick = () => {
    if (!data?.campaign) return;
    if (user) {
      supabase.from("campaign_events").insert({
        campaign_id: data.campaign.id,
        user_id: user.id,
        event_type: "click",
        cost_cents: 5,
      }).then(() => {});
    }
    const c = data.campaign;
    if (c.cta_url) {
      window.open(c.cta_url, "_blank", "noopener,noreferrer");
    } else if (c.venue_id) {
      navigate({ to: "/app/venue/$id", params: { id: c.venue_id } });
    } else if (c.party_id) {
      navigate({ to: "/app/parties" });
    }
  };

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Se încarcă…</div>;
  if (!data?.campaign) return <div className="p-6 text-sm">Promovare indisponibilă.</div>;

  const { campaign, biz, venue, party } = data;
  const color = campaign.theme_color || "#FF2D55";
  const images = campaign.image_urls?.length ? campaign.image_urls : (biz?.cover_url ? [biz.cover_url] : []);
  const hero = images[0];

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Hero */}
      <div className="relative h-[55vh] min-h-[360px] overflow-hidden">
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${color}, ${color}55)` }}>
          {hero && <img src={hero} alt="" className="absolute inset-0 w-full h-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        </div>

        <button
          onClick={() => history.length > 1 ? history.back() : navigate({ to: "/app" })}
          className="absolute top-4 left-4 p-2 rounded-full bg-black/50 backdrop-blur-sm border border-white/15 text-white"
          aria-label="Înapoi"
        >
          <ArrowLeft size={16} />
        </button>

        <div className="absolute top-4 right-4 px-2.5 py-1 rounded-md bg-black/55 backdrop-blur-sm flex items-center gap-1.5">
          <Sparkles size={11} className="text-white" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-white">Promovat</span>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-5 space-y-3">
          <div className="flex items-center gap-2">
            {biz?.logo_url && <img src={biz.logo_url} alt="" className="h-9 w-9 rounded-md object-cover border border-white/20" />}
            <div className="min-w-0">
              <div className="font-display uppercase text-sm leading-tight truncate text-white">{biz?.brand_name ?? "Brand"}</div>
              <div className="font-mono text-[9px] uppercase tracking-widest text-white/70">
                {biz?.type ?? "—"}{biz?.verified ? " · verificat" : ""}
              </div>
            </div>
          </div>
          <h1 className="font-display uppercase text-4xl leading-[0.95] tracking-tight text-white">{campaign.title}</h1>
          {campaign.subtitle && <p className="text-base text-white/90 line-clamp-3">{campaign.subtitle}</p>}
        </div>
      </div>

      {/* Body */}
      <div className="px-4 -mt-6 relative space-y-4">
        {/* CTA card */}
        <div className="rounded-2xl bg-foreground/[0.03] border border-foreground/10 p-4 space-y-3">
          <button
            onClick={handleCtaClick}
            className="w-full px-5 py-4 rounded-xl text-base font-display uppercase tracking-widest text-white flex items-center justify-center gap-2"
            style={{ background: color, boxShadow: `0 12px 32px -8px ${color}` }}
          >
            {campaign.cta_text || "Vezi detalii"} <ChevronRight size={18} />
          </button>
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <span className="flex items-center gap-1"><Eye size={11} /> {campaign.impressions.toLocaleString()} views</span>
            <span className="flex items-center gap-1"><MousePointerClick size={11} /> {campaign.clicks.toLocaleString()} clicks</span>
            <span>{new Date(campaign.starts_at).toLocaleDateString("ro-RO", { day: "2-digit", month: "short" })}{campaign.ends_at ? ` – ${new Date(campaign.ends_at).toLocaleDateString("ro-RO", { day: "2-digit", month: "short" })}` : ""}</span>
          </div>
        </div>

        {/* About */}
        {biz?.description && (
          <Section title="Despre">
            <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">{biz.description}</p>
            {biz.instagram_handle && (
              <a href={`https://instagram.com/${biz.instagram_handle.replace(/^@/, "")}`} target="_blank" rel="noreferrer"
                 className="inline-flex items-center gap-1 mt-2 font-mono text-[10px] uppercase tracking-widest text-neon-crimson">
                @{biz.instagram_handle.replace(/^@/, "")} <ExternalLink size={10} />
              </a>
            )}

          </Section>
        )}

        {/* Party */}
        {party && (
          <Section title="În seara asta">
            <Link to="/app/parties" className="block rounded-xl bg-foreground/[0.04] border border-foreground/10 overflow-hidden">
              {/* party has no cover image in schema */}
              <div className="p-3 space-y-1">
                <div className="font-display uppercase text-sm">{party.title}</div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                  <Calendar size={11} /> {new Date(party.starts_at).toLocaleString("ro-RO", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </div>
                {party.description && <p className="text-xs text-muted-foreground line-clamp-2">{party.description}</p>}
              </div>
            </Link>
          </Section>
        )}

        {/* Venue */}
        {venue && (
          <Section title="Locație">
            <Link to="/app/venue/$id" params={{ id: venue.id }} className="block rounded-xl bg-foreground/[0.04] border border-foreground/10 overflow-hidden">
              {venue.cover_url && <img src={venue.cover_url} alt="" className="w-full h-32 object-cover" />}
              <div className="p-3 space-y-1">
                <div className="font-display uppercase text-sm">{venue.name}</div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                  <MapPin size={11} /> {venue.address || `${venue.street?.name ?? ""}${venue.street?.city?.name ? ", " + venue.street.city.name : ""}`}
                </div>
              </div>
            </Link>
          </Section>
        )}

        {/* Gallery */}
        {images.length > 1 && (
          <Section title="Galerie">
            <div className="grid grid-cols-2 gap-2">
              {images.slice(1).map((src, i) => (
                <img key={i} src={src} alt="" className="w-full aspect-square object-cover rounded-lg" />
              ))}
            </div>
          </Section>
        )}

        <div className="pt-4 text-center font-mono text-[9px] uppercase tracking-widest text-muted-foreground/60">
          Conținut promovat de {biz?.brand_name ?? "brand"}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}

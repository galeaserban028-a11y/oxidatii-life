import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useEffect, useRef } from "react";
import { ArrowLeft, Sparkles, MapPin, Calendar, ExternalLink, ChevronRight, Eye, MousePointerClick, Globe, Phone, Mail, Instagram, Music2, Clock, Users, Ticket, Star } from "lucide-react";

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
        .select("id,business_id,kind,title,subtitle,cta_text,cta_url,image_urls,theme_color,venue_id,party_id,city_id,starts_at,ends_at,impressions,clicks,event_starts_at,entry_kind,entry_price_text,street,special_guest,video_url")
        .eq("id", id).single();
      if (error) throw error;
      const [biz, venue, party] = await Promise.all([
        supabase.from("business_accounts_public")
          .select("id,brand_name,type,description,logo_url,cover_url,verified,instagram_handle,tiktok_handle,website,contact_phone,contact_email,address")
          .eq("id", campaign.business_id).maybeSingle(),
        campaign.venue_id
          ? supabase.from("venues").select("id,name,type,address,cover_url,phone,ig_handle,opening_hours,description,street:streets(name,city:cities(name,slug))").eq("id", campaign.venue_id).maybeSingle()
          : Promise.resolve({ data: null }),
        campaign.party_id
          ? supabase.from("parties").select("id,title,starts_at,description,location_text,vibe,spots_total").eq("id", campaign.party_id).maybeSingle()
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

        {/* Event facts */}
        {(campaign.event_starts_at || campaign.entry_kind || campaign.street || campaign.special_guest) && (
          <div className="rounded-2xl bg-foreground/[0.03] border border-foreground/10 p-4 space-y-2.5">
            {campaign.event_starts_at && (
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${color}22`, color }}><Calendar size={14} /></div>
                <span className="text-sm">{new Date(campaign.event_starts_at).toLocaleString("ro-RO", { weekday: "long", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            )}
            {campaign.entry_kind && (
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${color}22`, color }}><Ticket size={14} /></div>
                <span className="text-sm">{campaign.entry_kind === "free" ? "Intrare gratis" : (campaign.entry_price_text || "Intrare cu bilet")}</span>
              </div>
            )}
            {campaign.street && (
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${color}22`, color }}><MapPin size={14} /></div>
                <span className="text-sm">{campaign.street}</span>
              </div>
            )}
            {campaign.special_guest && (
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${color}22`, color }}><Star size={14} /></div>
                <span className="text-sm">Invitat special: <strong>{campaign.special_guest}</strong></span>
              </div>
            )}
          </div>
        )}

        {/* Video clip */}
        {campaign.video_url && (
          <div className="rounded-2xl overflow-hidden border border-foreground/10 bg-black">
            <video src={campaign.video_url} controls playsInline className="w-full max-h-[60vh] object-contain bg-black" />
          </div>
        )}

        {/* About brand */}
        {(biz?.description || biz?.website || biz?.contact_phone || biz?.contact_email || biz?.instagram_handle || biz?.tiktok_handle || biz?.address) && (
          <Section title={`Despre ${biz?.brand_name ?? "brand"}`}>
            {biz?.description && (
              <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">{biz.description}</p>
            )}
            <div className="flex flex-col gap-1.5 pt-1">
              {biz?.address && (
                <InfoRow icon={<MapPin size={12} />}>{biz.address}</InfoRow>
              )}
              {biz?.website && (
                <InfoLink icon={<Globe size={12} />} href={biz.website}>{biz.website.replace(/^https?:\/\//, "")}</InfoLink>
              )}
              {biz?.contact_phone && (
                <InfoLink icon={<Phone size={12} />} href={`tel:${biz.contact_phone}`}>{biz.contact_phone}</InfoLink>
              )}
              {biz?.contact_email && (
                <InfoLink icon={<Mail size={12} />} href={`mailto:${biz.contact_email}`}>{biz.contact_email}</InfoLink>
              )}
              {biz?.instagram_handle && (
                <InfoLink icon={<Instagram size={12} />} href={`https://instagram.com/${biz.instagram_handle.replace(/^@/, "")}`}>@{biz.instagram_handle.replace(/^@/, "")}</InfoLink>
              )}
              {biz?.tiktok_handle && (
                <InfoLink icon={<Music2 size={12} />} href={`https://tiktok.com/@${biz.tiktok_handle.replace(/^@/, "")}`}>@{biz.tiktok_handle.replace(/^@/, "")}</InfoLink>
              )}
            </div>
          </Section>
        )}

        {/* Party */}
        {party && (
          <Section title="În seara asta">
            <Link to="/app/parties" className="block rounded-xl bg-foreground/[0.04] border border-foreground/10 overflow-hidden">
              <div className="p-3 space-y-1.5">
                <div className="font-display uppercase text-sm">{party.title}</div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                  <Calendar size={11} /> {new Date(party.starts_at).toLocaleString("ro-RO", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </div>
                {party.location_text && (
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                    <MapPin size={11} /> {party.location_text}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-0.5">
                  {party.vibe && <span className="px-2 py-0.5 rounded-full bg-foreground/10 font-mono text-[9px] uppercase tracking-widest">{party.vibe}</span>}
                  {party.spots_total != null && <span className="px-2 py-0.5 rounded-full bg-foreground/10 font-mono text-[9px] uppercase tracking-widest flex items-center gap-1"><Users size={9} /> {party.spots_total} locuri</span>}
                </div>
                {party.description && <p className="text-xs text-muted-foreground line-clamp-3 pt-1">{party.description}</p>}
              </div>
            </Link>
          </Section>
        )}

        {/* Venue */}
        {venue && (
          <Section title="Locație">
            <Link to="/app/venue/$id" params={{ id: venue.id }} className="block rounded-xl bg-foreground/[0.04] border border-foreground/10 overflow-hidden">
              {venue.cover_url && <img src={venue.cover_url} alt="" className="w-full h-40 object-cover" />}
              <div className="p-3 space-y-2">
                <div>
                  <div className="font-display uppercase text-base">{venue.name}</div>
                  <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{venue.type}</div>
                </div>
                {venue.description && <p className="text-xs text-foreground/80 line-clamp-3">{venue.description}</p>}
                <div className="flex flex-col gap-1 pt-1">
                  {(venue.address || venue.street?.name) && (
                    <InfoRow icon={<MapPin size={12} />}>
                      {venue.address || ""}
                      {venue.street?.name ? (venue.address ? " · " : "") + `Str. ${venue.street.name}` : ""}
                      {venue.street?.city?.name ? `, ${venue.street.city.name}` : ""}
                    </InfoRow>
                  )}
                  {venue.phone && <InfoRow icon={<Phone size={12} />}>{venue.phone}</InfoRow>}
                  {venue.ig_handle && (
                    <InfoRow icon={<Instagram size={12} />}>@{venue.ig_handle.replace(/^@/, "")}</InfoRow>
                  )}
                  {venue.opening_hours && (
                    <InfoRow icon={<Clock size={12} />}>
                      {typeof venue.opening_hours === "string" ? venue.opening_hours : "Program disponibil"}
                    </InfoRow>
                  )}
                </div>
              </div>
            </Link>
          </Section>
        )}

        {/* External link CTA */}
        {campaign.cta_url && (
          <Section title="Link extern">
            <a href={campaign.cta_url} target="_blank" rel="noreferrer"
               className="flex items-center justify-between rounded-xl bg-foreground/[0.04] border border-foreground/10 p-3">
              <span className="font-mono text-[11px] truncate pr-2">{campaign.cta_url.replace(/^https?:\/\//, "")}</span>
              <ExternalLink size={14} className="text-muted-foreground flex-shrink-0" />
            </a>
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

function InfoRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-xs text-foreground/85">
      <span className="text-muted-foreground mt-0.5">{icon}</span>
      <span className="min-w-0 break-words">{children}</span>
    </div>
  );
}

function InfoLink({ icon, href, children }: { icon: React.ReactNode; href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer"
       className="flex items-start gap-2 text-xs text-foreground/90 hover:text-neon-crimson transition">
      <span className="text-muted-foreground mt-0.5">{icon}</span>
      <span className="min-w-0 break-words underline-offset-2 hover:underline">{children}</span>
      <ExternalLink size={10} className="text-muted-foreground mt-1 flex-shrink-0" />
    </a>
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

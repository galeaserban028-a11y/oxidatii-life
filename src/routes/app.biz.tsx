import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  Building2, Wallet, Rocket, Plus, TrendingUp, Eye, MousePointerClick,
  Image as ImageIcon, MapPin, Megaphone, Sparkles, Bell, Compass, Star,
  Settings2, X, Calendar, Target, Palette, Upload, ChevronRight, Pencil,
  Users, Heart, Flame, ChevronDown, Check, Zap,
} from "lucide-react";

export const Route = createFileRoute("/app/biz")({
  head: () => ({ meta: [{ title: "Business · OXIDAȚII" }] }),
  component: BizPage,
});

const BUSINESS_TYPES = [
  { value: "club", label: "Club" },
  { value: "bar", label: "Bar" },
  { value: "festival", label: "Festival" },
  { value: "promoter", label: "Promoter" },
  { value: "host", label: "Privat" },
  { value: "beach", label: "Beach" },
] as const;

const PLACEMENTS = [
  { value: "boost_feed",     label: "Feed Boost",     icon: TrendingUp, desc: "Apare sus în feed-ul orașului", min: 50, color: "#FF2D55" },
  { value: "boost_map",      label: "Pin pe Hartă",   icon: MapPin,     desc: "Locație evidențiată cu animație pe hartă", min: 80, color: "#FF6B00" },
  { value: "boost_discover", label: "Discover",       icon: Compass,    desc: "Top în pagina Descoperă", min: 100, color: "#9D4EDD" },
  { value: "boost_story",    label: "Story Banner",   icon: Sparkles,   desc: "Banner full-screen între story-uri", min: 120, color: "#00D4FF" },
  { value: "boost_push",     label: "Push Notif",     icon: Bell,       desc: "Notificare targetată (1/zi/user)", min: 200, color: "#FFD60A" },
  { value: "boost_brand",    label: "Spotlight Brand", icon: Star,      desc: "Profil brand promovat în secțiunea VIP", min: 150, color: "#39FF14" },
] as const;

const VIBES = ["techno", "house", "hip-hop", "manele", "rock", "latino", "comercial", "underground", "live"] as const;
const DAYS = [
  { v: 1, l: "L" }, { v: 2, l: "M" }, { v: 3, l: "M" }, { v: 4, l: "J" },
  { v: 5, l: "V" }, { v: 6, l: "S" }, { v: 0, l: "D" },
];

async function loadBiz(userId: string) {
  const { data: businesses } = await supabase
    .from("business_accounts").select("*")
    .eq("owner_user_id", userId).order("created_at", { ascending: false });

  const [{ data: cities }, { data: parties }, { data: venues }] = await Promise.all([
    supabase.from("cities").select("id, name").order("name"),
    supabase.from("parties").select("id, title, location_text, starts_at, expires_at, venue_id")
      .eq("host_id", userId).gt("expires_at", new Date().toISOString())
      .order("starts_at", { ascending: false }),
    supabase.from("venues").select("id, name, city_id, address").order("name").limit(50),
  ]);

  if (!businesses?.length) return { businesses: [], campaigns: [], parties: parties ?? [], cities: cities ?? [], venues: venues ?? [] };
  const bizIds = businesses.map((b) => b.id);
  const { data: campaigns } = await supabase
    .from("campaigns").select("*").in("business_id", bizIds)
    .order("created_at", { ascending: false }).limit(40);

  return { businesses, campaigns: campaigns ?? [], parties: parties ?? [], cities: cities ?? [], venues: venues ?? [] };
}

const ron = (c: number) => (c / 100).toFixed(2);

function BizPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["biz", user?.id], enabled: !!user, queryFn: () => loadBiz(user!.id),
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [brand, setBrand] = useState("");
  const [type, setType] = useState<(typeof BUSINESS_TYPES)[number]["value"]>("promoter");
  const [busy, setBusy] = useState(false);

  if (!user) return <div className="px-4 pt-6 text-sm text-muted-foreground">Conectează-te.</div>;

  const createBusiness = async () => {
    if (!brand.trim()) return;
    setBusy(true);
    const slug = brand.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const { error } = await supabase.from("business_accounts").insert({
      owner_user_id: user.id, brand_name: brand.trim(), slug: slug || null, type,
    });
    setBusy(false);
    if (error) return alert(error.message);
    setBrand(""); setCreateOpen(false);
    qc.invalidateQueries({ queryKey: ["biz"] });
  };

  const topup = async (bizId: string, currentBalance: number, amountRon: number) => {
    const cents = Math.round(amountRon * 100);
    await supabase.from("wallet_ledger").insert({
      business_id: bizId, kind: "topup", amount_cents: cents, note: `Top-up demo +${amountRon} RON`,
    });
    await supabase.from("business_accounts")
      .update({ wallet_balance_cents: currentBalance + cents }).eq("id", bizId);
    qc.invalidateQueries({ queryKey: ["biz"] });
  };

  return (
    <div className="px-4 pt-5 pb-24 space-y-5">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <Building2 size={11} className="text-neon-purple" />
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-neon-purple">// BUSINESS · PROMOVARE</span>
        </div>
        <h1 className="font-display uppercase text-2xl leading-none tracking-tight">
          Promovează <span className="text-gradient-chaos">cum vrei tu.</span>
        </h1>
        <p className="text-xs text-muted-foreground">
          6 tipuri de reclamă · poze · targeting · plătești doar ce consumi.
        </p>
      </header>

      {isLoading ? (
        <div className="h-32 rounded-2xl bg-foreground/[0.04] animate-pulse" />
      ) : data?.businesses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-foreground/15 p-6 text-center space-y-3">
          <div className="text-4xl">🏢</div>
          <div className="font-display uppercase">Niciun business încă</div>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            Înregistrează-ți brandul și începe să promovezi evenimente.
          </p>
          <button onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 font-display uppercase text-[11px] tracking-widest px-4 py-2 rounded-md text-white"
            style={{ background: "var(--gradient-chaos)" }}>
            <Plus size={12} /> Creează business
          </button>
        </div>
      ) : (
        <>
          {data!.businesses.map((b) => (
            <BusinessCard key={b.id} business={b}
              campaigns={data!.campaigns.filter((c) => c.business_id === b.id)}
              parties={data!.parties} cities={data!.cities} venues={data!.venues}
              onTopup={(amt) => topup(b.id, b.wallet_balance_cents, amt)} />
          ))}
          <button onClick={() => setCreateOpen(true)}
            className="w-full font-mono text-[10px] uppercase tracking-widest px-4 py-3 rounded-md border border-dashed border-foreground/20 hover:border-neon-crimson flex items-center justify-center gap-1.5">
            <Plus size={12} /> Adaugă un alt business
          </button>
        </>
      )}

      {createOpen && (
        <Sheet onClose={() => setCreateOpen(false)} title="Business nou">
          <input autoFocus value={brand} onChange={(e) => setBrand(e.target.value)}
            placeholder="Ex: Club Form"
            className="w-full bg-foreground/5 rounded-md px-3 py-2.5 text-sm border border-foreground/10 focus:border-neon-crimson outline-none" />
          <div className="grid grid-cols-3 gap-2">
            {BUSINESS_TYPES.map((t) => (
              <button key={t.value} onClick={() => setType(t.value)}
                className={`px-2 py-2 rounded-md text-[10px] font-mono uppercase tracking-widest border ${
                  type === t.value ? "bg-neon-crimson/15 border-neon-crimson text-neon-crimson" : "border-foreground/10 text-muted-foreground"}`}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setCreateOpen(false)}
              className="flex-1 px-3 py-2.5 rounded-md border border-foreground/15 text-xs font-mono uppercase tracking-widest">Renunță</button>
            <button disabled={busy || !brand.trim()} onClick={createBusiness}
              className="flex-1 px-3 py-2.5 rounded-md text-white text-xs font-display uppercase tracking-widest disabled:opacity-50"
              style={{ background: "var(--gradient-chaos)" }}>{busy ? "..." : "Creează"}</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

function BusinessCard({ business, campaigns, parties, cities, venues, onTopup }: {
  business: any; campaigns: any[]; parties: any[]; cities: any[]; venues: any[];
  onTopup: (amount: number) => void;
}) {
  const qc = useQueryClient();
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const totalSpent = campaigns.reduce((s, c) => s + (c.spent_cents || 0), 0);
  const totalImpressions = campaigns.reduce((s, c) => s + (c.impressions || 0), 0);
  const totalClicks = campaigns.reduce((s, c) => s + (c.clicks || 0), 0);
  const activeCount = campaigns.filter((c) => c.status === "active").length;

  const toggleCampaign = async (c: any) => {
    const next = c.status === "active" ? "paused" : "active";
    await supabase.from("campaigns").update({ status: next }).eq("id", c.id);
    qc.invalidateQueries({ queryKey: ["biz"] });
  };

  return (
    <div className="rounded-2xl bg-foreground/[0.03] border border-foreground/10 overflow-hidden">
      {/* Cover */}
      <div className="relative h-28 bg-gradient-to-br from-neon-purple/30 to-neon-crimson/30 overflow-hidden">
        {business.cover_url && <img src={business.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        <button onClick={() => setEditOpen(true)}
          className="absolute top-2 right-2 p-1.5 rounded-md bg-background/70 backdrop-blur-sm border border-foreground/15">
          <Pencil size={12} />
        </button>
      </div>

      <div className="p-4 -mt-10 relative space-y-3">
        <div className="flex items-end gap-3">
          <div className="w-14 h-14 rounded-xl bg-background border-2 border-background overflow-hidden flex-shrink-0">
            {business.logo_url ? <img src={business.logo_url} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full bg-gradient-to-br from-neon-purple to-neon-crimson flex items-center justify-center font-display text-xl text-white">{business.brand_name?.[0]?.toUpperCase() ?? "?"}</div>}
          </div>
          <div className="min-w-0 flex-1 pb-1">
            <div className="font-display uppercase text-lg leading-tight truncate">{business.brand_name}</div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground truncate">
              {business.type} · {business.verified ? "verificat" : "neverificat"} · {activeCount} active
            </div>
          </div>
        </div>

        {business.description && <p className="text-xs text-muted-foreground line-clamp-2">{business.description}</p>}

        {/* Wallet */}
        <div className="rounded-xl bg-gradient-to-br from-neon-purple/10 to-neon-crimson/10 border border-foreground/10 p-3 flex items-center justify-between gap-3">
          <div>
            <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
              <Wallet size={10} /> Wallet
            </div>
            <div className="font-display text-2xl leading-none mt-0.5">
              {ron(business.wallet_balance_cents)} <span className="text-xs text-muted-foreground">RON</span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            {[20, 100, 500].map((amt) => (
              <button key={amt} onClick={() => onTopup(amt)}
                className="font-mono text-[10px] uppercase tracking-widest px-3 py-1 rounded-md border border-foreground/15 hover:border-neon-crimson">
                +{amt} RON
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Stat icon={<TrendingUp size={11} />} label="Spent" value={`${ron(totalSpent)} RON`} />
          <Stat icon={<Eye size={11} />} label="Views" value={totalImpressions.toLocaleString()} />
          <Stat icon={<MousePointerClick size={11} />} label="Clicks" value={totalClicks.toLocaleString()} />
        </div>

        <button onClick={() => setBuilderOpen(true)}
          disabled={business.wallet_balance_cents < 100}
          className="w-full font-display uppercase text-[12px] tracking-widest px-4 py-3 rounded-md text-white flex items-center justify-center gap-1.5 disabled:opacity-50"
          style={{ background: "var(--gradient-chaos)" }}>
          <Megaphone size={13} /> Promovare nouă
        </button>
        {business.wallet_balance_cents < 100 && (
          <div className="text-[10px] text-muted-foreground text-center">
            Adaugă cel puțin 1 RON ca să poți lansa o campanie.
          </div>
        )}

        {/* Campaign list */}
        {campaigns.length > 0 && (
          <div className="space-y-1.5">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">campanii</div>
            {campaigns.map((c) => {
              const placement = PLACEMENTS.find((p) => p.value === c.kind);
              const Icon = placement?.icon ?? Rocket;
              const pct = c.budget_cents ? Math.min(100, (c.spent_cents / c.budget_cents) * 100) : 0;
              return (
                <div key={c.id} className="rounded-md bg-foreground/[0.03] border border-foreground/10 overflow-hidden">
                  <div className="flex items-center justify-between gap-2 p-2.5">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                        style={{ background: `${placement?.color ?? "#FF2D55"}22`, color: placement?.color ?? "#FF2D55" }}>
                        <Icon size={13} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs truncate">{c.title}</div>
                        <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground truncate">
                          {placement?.label} · {c.impressions} · {ron(c.spent_cents)}/{ron(c.budget_cents)} RON
                        </div>
                      </div>
                    </div>
                    <button onClick={() => toggleCampaign(c)}
                      className={`text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-md border ${
                        c.status === "active" ? "border-neon-crimson text-neon-crimson" : "border-neon-green text-neon-green"}`}>
                      {c.status === "active" ? "Pause" : "Start"}
                    </button>
                  </div>
                  <div className="h-1 bg-foreground/5">
                    <div className="h-full" style={{ width: `${pct}%`, background: placement?.color ?? "#FF2D55" }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {builderOpen && (
        <CampaignBuilder business={business} parties={parties} cities={cities} venues={venues}
          onClose={() => setBuilderOpen(false)} onCreated={() => { setBuilderOpen(false); qc.invalidateQueries({ queryKey: ["biz"] }); }} />
      )}
      {editOpen && (
        <BrandProfileEditor business={business} cities={cities}
          onClose={() => setEditOpen(false)} onSaved={() => { setEditOpen(false); qc.invalidateQueries({ queryKey: ["biz"] }); }} />
      )}
    </div>
  );
}

/* ============================ Campaign Builder ============================ */

function CampaignBuilder({ business, parties, cities, venues, onClose, onCreated }: {
  business: any; parties: any[]; cities: any[]; venues: any[];
  onClose: () => void; onCreated: () => void;
}) {
  const { user } = useAuth();
  const [placement, setPlacement] = useState<(typeof PLACEMENTS)[number]["value"]>("boost_feed");
  const [targetType, setTargetType] = useState<"party" | "venue" | "brand">("party");
  const [partyId, setPartyId] = useState("");
  const [venueId, setVenueId] = useState("");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [ctaText, setCtaText] = useState("Vezi detalii");
  const [ctaUrl, setCtaUrl] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [themeColor, setThemeColor] = useState("#FF2D55");
  const [cityId, setCityId] = useState<string>("");
  const [vibes, setVibes] = useState<string[]>([]);
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(35);
  const [days, setDays] = useState<number[]>([5, 6, 0]);
  const [hourFrom, setHourFrom] = useState(20);
  const [hourTo, setHourTo] = useState(4);
  const [pricingModel, setPricingModel] = useState<"cpm" | "cpc">("cpm");
  const [bidBani, setBidBani] = useState(150);
  const [budget, setBudget] = useState(50);
  const [dailyCap, setDailyCap] = useState(20);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const placementMeta = useMemo(() => PLACEMENTS.find((p) => p.value === placement)!, [placement]);

  // Auto-fill from selected party
  const selectedParty = parties.find((p) => p.id === partyId);
  const autoTitle = title || selectedParty?.title || business.brand_name;
  const autoSubtitle = subtitle || selectedParty?.location_text || "Nu rata";

  const estimated = useMemo(() => Math.floor((budget * 100) / Math.max(bidBani, 1)), [budget, bidBani]);

  const uploadImages = async (files: FileList | null) => {
    if (!files || !user) return;
    const uploaded: string[] = [];
    for (const file of Array.from(files).slice(0, 4)) {
      const path = `biz/${business.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
      const { error } = await supabase.storage.from("venue-photos").upload(path, file, { upsert: false });
      if (error) { alert(error.message); continue; }
      const { data } = supabase.storage.from("venue-photos").getPublicUrl(path);
      uploaded.push(data.publicUrl);
    }
    setImages((prev) => [...prev, ...uploaded].slice(0, 4));
  };

  const submit = async () => {
    if (!autoTitle.trim()) { alert("Adaugă un titlu"); return; }
    if (budget * 100 > business.wallet_balance_cents) {
      alert(`Wallet insuficient: ai ${ron(business.wallet_balance_cents)} RON, ai nevoie de ${budget} RON.`); return;
    }
    setBusy(true);
    const insertData: any = {
      business_id: business.id, kind: placement,
      title: autoTitle, subtitle: autoSubtitle,
      cta_text: ctaText || "Vezi detalii", cta_url: ctaUrl || null,
      image_urls: images, theme_color: themeColor,
      status: "active",
      bid_cents: bidBani, budget_cents: Math.round(budget * 100),
      daily_cap_cents: Math.round(dailyCap * 100),
      pricing_model: pricingModel,
      city_id: cityId || null,
      party_id: targetType === "party" ? partyId || null : null,
      venue_id: targetType === "venue" ? venueId || null : null,
      starts_at: startsAt || new Date().toISOString(),
      ends_at: endsAt || selectedParty?.expires_at || null,
      targeting: { vibes, age_min: ageMin, age_max: ageMax, days, hour_from: hourFrom, hour_to: hourTo },
      schedule: { days, hour_from: hourFrom, hour_to: hourTo },
    };
    const { error } = await supabase.from("campaigns").insert(insertData);
    setBusy(false);
    if (error) return alert(error.message);
    onCreated();
  };

  return (
    <Sheet onClose={onClose} title="Promovare nouă" wide>
      {/* LIVE PREVIEW */}
      <div className="rounded-xl overflow-hidden border border-foreground/15 relative">
        <div className="aspect-[16/9] relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}88)` }}>
          {images[0] && <img src={images[0]} alt="" className="absolute inset-0 w-full h-full object-cover opacity-90" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm">
            <span className="font-mono text-[9px] uppercase tracking-widest text-white">Promovat · {placementMeta.label}</span>
          </div>
          <div className="absolute bottom-0 inset-x-0 p-3 text-white">
            <div className="font-display uppercase text-lg leading-tight line-clamp-1">{autoTitle || "Titlu campanie"}</div>
            <div className="text-xs opacity-80 line-clamp-1">{autoSubtitle}</div>
          </div>
        </div>
        <div className="flex items-center justify-between p-2 bg-foreground/[0.04]">
          <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{business.brand_name}</span>
          <span className="text-[10px] font-display uppercase px-2 py-1 rounded-md text-white" style={{ background: themeColor }}>
            {ctaText || "CTA"} →
          </span>
        </div>
      </div>

      {/* PLACEMENT */}
      <Section icon={<Megaphone size={11} />} title="Tip promovare">
        <div className="grid grid-cols-2 gap-2">
          {PLACEMENTS.map((p) => {
            const Icon = p.icon;
            const selected = placement === p.value;
            return (
              <button key={p.value} onClick={() => { setPlacement(p.value); setThemeColor(p.color); setBidBani(p.min); }}
                className={`text-left p-2.5 rounded-lg border transition ${
                  selected ? "border-neon-crimson bg-neon-crimson/5" : "border-foreground/10 bg-foreground/[0.02]"}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon size={12} style={{ color: p.color }} />
                  <span className="font-display uppercase text-[11px]">{p.label}</span>
                </div>
                <div className="text-[10px] text-muted-foreground line-clamp-2">{p.desc}</div>
                <div className="font-mono text-[9px] uppercase tracking-widest mt-1 text-muted-foreground">de la {(p.min / 100).toFixed(2)} RON</div>
              </button>
            );
          })}
        </div>
      </Section>

      {/* TARGET LINK */}
      <Section icon={<Target size={11} />} title="Ce promovezi">
        <div className="flex gap-2">
          {(["party", "venue", "brand"] as const).map((t) => (
            <button key={t} onClick={() => setTargetType(t)}
              className={`flex-1 px-2 py-2 rounded-md text-[10px] font-mono uppercase tracking-widest border ${
                targetType === t ? "bg-neon-crimson/15 border-neon-crimson text-neon-crimson" : "border-foreground/10 text-muted-foreground"}`}>
              {t === "party" ? "Petrecere" : t === "venue" ? "Locație" : "Brand"}
            </button>
          ))}
        </div>
        {targetType === "party" && (
          parties.length === 0 ? (
            <div className="text-[10px] text-muted-foreground">
              Nu ai petreceri active. <Link to="/app/parties" className="underline">Creează una</Link>.
            </div>
          ) : (
            <select value={partyId} onChange={(e) => setPartyId(e.target.value)} className={selectStyle}>
              <option value="">— alege petrecere —</option>
              {parties.map((p) => <option key={p.id} value={p.id}>{p.title} · {p.location_text}</option>)}
            </select>
          )
        )}
        {targetType === "venue" && (
          <select value={venueId} onChange={(e) => setVenueId(e.target.value)} className={selectStyle}>
            <option value="">— alege locație —</option>
            {venues.map((v) => <option key={v.id} value={v.id}>{v.name} · {v.address}</option>)}
          </select>
        )}
        {targetType === "brand" && (
          <div className="text-[10px] text-muted-foreground">Reclama trimite la pagina ta de brand.</div>
        )}
      </Section>

      {/* CREATIVE */}
      <Section icon={<Palette size={11} />} title="Conținut">
        <input value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder={selectedParty?.title || "Titlu (ex: Vineri techno la Form)"} className={inputStyle} />
        <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)}
          placeholder="Subtitlu (ex: 2 boxe, 6 DJ, intrare 30 lei)" className={inputStyle} />
        <div className="grid grid-cols-2 gap-2">
          <input value={ctaText} onChange={(e) => setCtaText(e.target.value)} placeholder="CTA (ex: Vin)" className={inputStyle} />
          <input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="Link extern (opțional)" className={inputStyle} />
        </div>

        {/* Images */}
        <div>
          <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mb-1.5">Poze (max 4)</div>
          <div className="grid grid-cols-4 gap-1.5">
            {images.map((u, i) => (
              <div key={i} className="relative aspect-square rounded-md overflow-hidden bg-foreground/5">
                <img src={u} alt="" className="w-full h-full object-cover" />
                <button onClick={() => setImages(images.filter((_, j) => j !== i))}
                  className="absolute top-0.5 right-0.5 p-0.5 rounded-md bg-black/60"><X size={10} className="text-white" /></button>
              </div>
            ))}
            {images.length < 4 && (
              <button onClick={() => fileRef.current?.click()}
                className="aspect-square rounded-md border border-dashed border-foreground/20 flex items-center justify-center text-muted-foreground">
                <Upload size={14} />
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
            onChange={(e) => uploadImages(e.target.files)} />
        </div>

        {/* Color */}
        <div className="flex items-center gap-2">
          <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground flex-1">Culoare accent</div>
          <input type="color" value={themeColor} onChange={(e) => setThemeColor(e.target.value)}
            className="w-10 h-8 rounded-md border border-foreground/15 bg-transparent" />
        </div>
      </Section>

      {/* TARGETING */}
      <Section icon={<Target size={11} />} title="Targeting">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mb-1.5">Oraș</div>
          <select value={cityId} onChange={(e) => setCityId(e.target.value)} className={selectStyle}>
            <option value="">Toate orașele</option>
            {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mb-1.5">Vibes</div>
          <div className="flex flex-wrap gap-1.5">
            {VIBES.map((v) => (
              <button key={v} onClick={() => setVibes((s) => s.includes(v) ? s.filter((x) => x !== v) : [...s, v])}
                className={`text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-md border ${
                  vibes.includes(v) ? "bg-neon-purple/15 border-neon-purple text-neon-purple" : "border-foreground/10 text-muted-foreground"}`}>
                {v}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mb-1.5">Vârstă: {ageMin}–{ageMax}</div>
          <div className="flex gap-2">
            <input type="number" min={16} max={99} value={ageMin} onChange={(e) => setAgeMin(+e.target.value)} className={inputStyle} />
            <input type="number" min={16} max={99} value={ageMax} onChange={(e) => setAgeMax(+e.target.value)} className={inputStyle} />
          </div>
        </div>
        <div>
          <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mb-1.5">Zile</div>
          <div className="flex gap-1">
            {DAYS.map((d) => (
              <button key={d.v} onClick={() => setDays((s) => s.includes(d.v) ? s.filter((x) => x !== d.v) : [...s, d.v])}
                className={`flex-1 py-2 rounded-md text-[10px] font-mono uppercase border ${
                  days.includes(d.v) ? "bg-neon-crimson/15 border-neon-crimson text-neon-crimson" : "border-foreground/10 text-muted-foreground"}`}>
                {d.l}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mb-1.5">Interval orar: {hourFrom}:00 → {hourTo}:00</div>
          <div className="flex gap-2">
            <input type="number" min={0} max={23} value={hourFrom} onChange={(e) => setHourFrom(+e.target.value)} className={inputStyle} />
            <input type="number" min={0} max={23} value={hourTo} onChange={(e) => setHourTo(+e.target.value)} className={inputStyle} />
          </div>
        </div>
      </Section>

      {/* BUDGET & SCHEDULE */}
      <Section icon={<Wallet size={11} />} title="Buget & schedule">
        <div className="flex gap-2">
          {(["cpm", "cpc"] as const).map((m) => (
            <button key={m} onClick={() => setPricingModel(m)}
              className={`flex-1 px-2 py-2 rounded-md text-[10px] font-mono uppercase tracking-widest border ${
                pricingModel === m ? "bg-neon-crimson/15 border-neon-crimson text-neon-crimson" : "border-foreground/10 text-muted-foreground"}`}>
              {m === "cpm" ? "per impresie" : "per click"}
            </button>
          ))}
        </div>
        <div>
          <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mb-1.5">
            Bid: {(bidBani / 100).toFixed(2)} RON
          </div>
          <input type="range" min={placementMeta.min} max={placementMeta.min * 5} step={10}
            value={bidBani} onChange={(e) => setBidBani(+e.target.value)} className="w-full accent-neon-crimson" />
        </div>
        <div>
          <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mb-1.5">Buget total: {budget} RON</div>
          <div className="flex gap-2">
            {[20, 50, 100, 250, 500].map((b) => (
              <button key={b} onClick={() => setBudget(b)}
                className={`flex-1 px-2 py-2 rounded-md text-xs font-mono uppercase border ${
                  budget === b ? "bg-neon-crimson/15 border-neon-crimson text-neon-crimson" : "border-foreground/10"}`}>
                {b}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mb-1.5">Limită zilnică: {dailyCap} RON</div>
          <input type="range" min={5} max={budget} step={5} value={Math.min(dailyCap, budget)}
            onChange={(e) => setDailyCap(+e.target.value)} className="w-full accent-neon-purple" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mb-1.5 flex items-center gap-1">
              <Calendar size={10} /> Start
            </div>
            <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={inputStyle} />
          </div>
          <div>
            <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mb-1.5 flex items-center gap-1">
              <Calendar size={10} /> Stop
            </div>
            <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className={inputStyle} />
          </div>
        </div>

        <div className="rounded-md bg-neon-green/10 border border-neon-green/30 p-2.5">
          <div className="font-mono text-[9px] uppercase tracking-widest text-neon-green">estimare</div>
          <div className="text-xs mt-0.5">
            ≈ <strong>{estimated.toLocaleString()}</strong> {pricingModel === "cpm" ? "afișări" : "click-uri"} ·
            ~{Math.ceil(budget / Math.max(dailyCap, 1))} zile de difuzare
          </div>
        </div>
      </Section>

      <div className="flex gap-2 sticky bottom-0 bg-background pt-2 -mx-5 px-5 pb-1 border-t border-foreground/10">
        <button onClick={onClose}
          className="flex-1 px-3 py-2.5 rounded-md border border-foreground/15 text-xs font-mono uppercase tracking-widest">
          Renunță
        </button>
        <button disabled={busy} onClick={submit}
          className="flex-[2] px-3 py-2.5 rounded-md text-white text-xs font-display uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-1.5"
          style={{ background: "var(--gradient-chaos)" }}>
          <Rocket size={12} /> {busy ? "..." : `Lansează ${budget} RON`}
        </button>
      </div>
    </Sheet>
  );
}

/* ============================ Brand profile editor ============================ */

function BrandProfileEditor({ business, cities, onClose, onSaved }: {
  business: any; cities: any[]; onClose: () => void; onSaved: () => void;
}) {
  const [coverUrl, setCoverUrl] = useState(business.cover_url ?? "");
  const [logoUrl, setLogoUrl] = useState(business.logo_url ?? "");
  const [description, setDescription] = useState(business.description ?? "");
  const [website, setWebsite] = useState(business.website ?? "");
  const [ig, setIg] = useState(business.instagram_handle ?? "");
  const [tt, setTt] = useState(business.tiktok_handle ?? "");
  const [address, setAddress] = useState(business.address ?? "");
  const [phone, setPhone] = useState(business.contact_phone ?? "");
  const [email, setEmail] = useState(business.contact_email ?? "");
  const [cityId, setCityId] = useState(business.city_id ?? "");
  const [busy, setBusy] = useState(false);

  const upload = async (file: File, set: (u: string) => void, prefix: string) => {
    const path = `biz/${business.id}/${prefix}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
    const { error } = await supabase.storage.from("venue-photos").upload(path, file, { upsert: true });
    if (error) return alert(error.message);
    const { data } = supabase.storage.from("venue-photos").getPublicUrl(path);
    set(data.publicUrl);
  };

  const save = async () => {
    setBusy(true);
    const { error } = await supabase.from("business_accounts").update({
      cover_url: coverUrl || null, logo_url: logoUrl || null,
      description: description || null, website: website || null,
      instagram_handle: ig || null, tiktok_handle: tt || null,
      address: address || null, contact_phone: phone || null, contact_email: email || null,
      city_id: cityId || null,
    }).eq("id", business.id);
    setBusy(false);
    if (error) return alert(error.message);
    onSaved();
  };

  return (
    <Sheet onClose={onClose} title="Editează brand" wide>
      <Section icon={<ImageIcon size={11} />} title="Vizual">
        <PhotoUploader label="Cover" url={coverUrl} onUpload={(f) => upload(f, setCoverUrl, "cover")} onClear={() => setCoverUrl("")} aspect="aspect-[16/9]" />
        <PhotoUploader label="Logo" url={logoUrl} onUpload={(f) => upload(f, setLogoUrl, "logo")} onClear={() => setLogoUrl("")} aspect="aspect-square w-24" />
      </Section>
      <Section icon={<Settings2 size={11} />} title="Detalii">
        <textarea value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="Descriere (ce face brandul tău)" rows={3} className={inputStyle} />
        <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="Website" className={inputStyle} />
        <div className="grid grid-cols-2 gap-2">
          <input value={ig} onChange={(e) => setIg(e.target.value)} placeholder="Instagram" className={inputStyle} />
          <input value={tt} onChange={(e) => setTt(e.target.value)} placeholder="TikTok" className={inputStyle} />
        </div>
      </Section>
      <Section icon={<MapPin size={11} />} title="Locație & contact">
        <select value={cityId} onChange={(e) => setCityId(e.target.value)} className={selectStyle}>
          <option value="">— oraș —</option>
          {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Adresă" className={inputStyle} />
        <div className="grid grid-cols-2 gap-2">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefon" className={inputStyle} />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className={inputStyle} />
        </div>
      </Section>
      <div className="flex gap-2 sticky bottom-0 bg-background pt-2 -mx-5 px-5 pb-1 border-t border-foreground/10">
        <button onClick={onClose} className="flex-1 px-3 py-2.5 rounded-md border border-foreground/15 text-xs font-mono uppercase tracking-widest">Renunță</button>
        <button disabled={busy} onClick={save}
          className="flex-1 px-3 py-2.5 rounded-md text-white text-xs font-display uppercase tracking-widest disabled:opacity-50"
          style={{ background: "var(--gradient-chaos)" }}>{busy ? "..." : "Salvează"}</button>
      </div>
    </Sheet>
  );
}

/* ============================ Primitives ============================ */

const inputStyle = "w-full bg-foreground/5 rounded-md px-3 py-2.5 text-sm border border-foreground/10 focus:border-neon-crimson outline-none";
const selectStyle = "w-full bg-foreground/5 rounded-md px-3 py-2.5 text-sm border border-foreground/10 outline-none";

function Sheet({ children, onClose, title, wide }: { children: React.ReactNode; onClose: () => void; title: string; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
      <div className={`w-full ${wide ? "max-w-lg" : "max-w-md"} max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-background border border-foreground/15 p-5 space-y-4`}>
        <div className="flex items-center justify-between sticky top-0 -mt-5 -mx-5 px-5 py-3 bg-background border-b border-foreground/10 z-10">
          <div className="font-display uppercase text-base">{title}</div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-foreground/5"><X size={14} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground flex items-center gap-1.5">
        {icon} {title}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function PhotoUploader({ label, url, onUpload, onClear, aspect }: {
  label: string; url: string; onUpload: (f: File) => void; onClear: () => void; aspect: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mb-1.5">{label}</div>
      <div className={`${aspect} rounded-lg overflow-hidden bg-foreground/5 border border-foreground/10 relative`}>
        {url ? (
          <>
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button onClick={onClear} className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/60"><X size={11} className="text-white" /></button>
          </>
        ) : (
          <button onClick={() => ref.current?.click()} className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Upload size={16} />
          </button>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden"
        onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md bg-foreground/[0.03] border border-foreground/10 p-2">
      <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
        {icon} {label}
      </div>
      <div className="font-display text-sm mt-0.5">{value}</div>
    </div>
  );
}

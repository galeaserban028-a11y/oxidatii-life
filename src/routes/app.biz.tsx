import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  Building2, Wallet, Rocket, Plus, TrendingUp, Eye, MousePointerClick,
  Image as ImageIcon, MapPin, Megaphone, Sparkles, Bell, Compass, Star,
  Settings2, X, Calendar, Target, Palette, Upload, ChevronRight, Pencil,
  Users, Heart, Flame, ChevronDown, Check, Zap, Trash2,
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
  const [editCampaign, setEditCampaign] = useState<any | null>(null);

  const totalSpent = campaigns.reduce((s, c) => s + (c.spent_cents || 0), 0);
  const totalImpressions = campaigns.reduce((s, c) => s + (c.impressions || 0), 0);
  const totalClicks = campaigns.reduce((s, c) => s + (c.clicks || 0), 0);
  const activeCount = campaigns.filter((c) => c.status === "active").length;

  const toggleCampaign = async (c: any) => {
    const next = c.status === "active" ? "paused" : "active";
    await supabase.from("campaigns").update({ status: next }).eq("id", c.id);
    qc.invalidateQueries({ queryKey: ["biz"] });
  };

  const deleteCampaign = async (c: any) => {
    if (!confirm(`Ștergi campania „${c.title}"?`)) return;
    await supabase.from("campaigns").delete().eq("id", c.id);
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
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => setEditCampaign(c)}
                        className="p-1.5 rounded-md border border-foreground/10 hover:border-foreground/30 text-muted-foreground"
                        aria-label="Editează">
                        <Pencil size={11} />
                      </button>
                      <button onClick={() => toggleCampaign(c)}
                        className={`text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-md border ${
                          c.status === "active" ? "border-neon-crimson text-neon-crimson" : "border-neon-green text-neon-green"}`}>
                        {c.status === "active" ? "Pause" : "Start"}
                      </button>
                      <button onClick={() => deleteCampaign(c)}
                        className="p-1.5 rounded-md border border-foreground/10 hover:border-neon-crimson hover:text-neon-crimson text-muted-foreground"
                        aria-label="Șterge">
                        <Trash2 size={11} />
                      </button>
                    </div>
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
          onClose={() => setBuilderOpen(false)}
          onCreated={(c) => {
            setBuilderOpen(false);
            qc.invalidateQueries({ queryKey: ["biz"] });
            if (c) setEditCampaign(c);
          }} />
      )}
      {editOpen && (
        <BrandProfileEditor business={business} cities={cities}
          onClose={() => setEditOpen(false)} onSaved={() => { setEditOpen(false); qc.invalidateQueries({ queryKey: ["biz"] }); }} />
      )}
      {editCampaign && (
        <CampaignEditor business={business} campaign={editCampaign}
          onClose={() => setEditCampaign(null)}
          onSaved={() => { setEditCampaign(null); qc.invalidateQueries({ queryKey: ["biz"] }); }} />
      )}
    </div>
  );
}

/* ============================ Campaign Builder ============================ */
/* Psychologically-tuned 3-step flow: GOAL → STORY → BOOST.
   Outcome-framed goals, tier-anchored budgets with social proof,
   live preview that updates as you type, advanced controls collapsed by default. */

const GOALS = [
  {
    id: "fill",
    icon: Users,
    title: "Vreau localul plin",
    promise: "Apar la oameni care ies în seara asta în orașul tău.",
    placement: "boost_feed" as const,
    color: "#FF2D55",
    suggestedBudget: 50,
    cta: "Vin",
  },
  {
    id: "city",
    icon: Flame,
    title: "Vreau să vadă tot orașul",
    promise: "Banner premium + pin animat pe hartă. Maximă expunere.",
    placement: "boost_story" as const,
    color: "#00D4FF",
    suggestedBudget: 150,
    cta: "Vezi locul",
  },
  {
    id: "fans",
    icon: Heart,
    title: "Vreau followers & status",
    promise: "Brandul tău în secțiunea VIP. Construiești comunitate.",
    placement: "boost_brand" as const,
    color: "#9D4EDD",
    suggestedBudget: 100,
    cta: "Urmărește",
  },
] as const;

const BUDGET_TIERS = [
  { ron: 20,  label: "Test",  hint: "vezi cum merge",     badge: null },
  { ron: 50,  label: "Smart", hint: "echilibrul perfect", badge: "ALES DE 73%" },
  { ron: 150, label: "Boost", hint: "umpli localul",      badge: "POPULAR" },
  { ron: 500, label: "Viral", hint: "tot orașul te vede", badge: "🔥" },
] as const;

function CampaignBuilder({ business, parties, cities, venues, onClose, onCreated }: {
  business: any; parties: any[]; cities: any[]; venues: any[];
  onClose: () => void; onCreated: (campaign?: any) => void;
}) {
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [goalId, setGoalId] = useState<(typeof GOALS)[number]["id"]>("fill");
  const goal = useMemo(() => GOALS.find((g) => g.id === goalId)!, [goalId]);

  const [targetType, setTargetType] = useState<"party" | "venue" | "brand">("party");
  const [partyId, setPartyId] = useState("");
  const [venueId, setVenueId] = useState("");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [ctaText, setCtaText] = useState<string>(goal.cta);
  const [ctaUrl, setCtaUrl] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [themeColor, setThemeColor] = useState<string>(goal.color);
  const [cityId, setCityId] = useState<string>(business.city_id ?? "");
  const [vibes, setVibes] = useState<string[]>([]);
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(35);
  const [days, setDays] = useState<number[]>([5, 6, 0]);
  const [hourFrom, setHourFrom] = useState(20);
  const [hourTo, setHourTo] = useState(4);
  const [bidBani, setBidBani] = useState(150);
  const [budget, setBudget] = useState(50);
  const [dailyCap, setDailyCap] = useState(20);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const pickGoal = (id: typeof goalId) => {
    const g = GOALS.find((x) => x.id === id)!;
    setGoalId(id);
    setThemeColor(g.color);
    setCtaText(g.cta);
    setBudget(g.suggestedBudget);
    const pm = PLACEMENTS.find((p) => p.value === g.placement)!;
    setBidBani(pm.min);
    setTargetType(g.id === "fans" ? "brand" : g.id === "city" ? "venue" : "party");
  };

  const selectedParty = parties.find((p) => p.id === partyId);
  const autoTitle = title || selectedParty?.title || business.brand_name;
  const autoSubtitle =
    subtitle ||
    selectedParty?.location_text ||
    (goal.id === "fans" ? "Intră în comunitate" : "Nu rata seara asta");

  const estimated = useMemo(() => Math.floor((budget * 100) / Math.max(bidBani, 1)) * 1000, [budget, bidBani]);

  const uploadImages = async (files: FileList | null) => {
    if (!files || !user) return;
    const uploaded: string[] = [];
    for (const file of Array.from(files).slice(0, 4)) {
      const path = `${user.id}/biz/${business.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
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
      business_id: business.id, kind: goal.placement,
      title: autoTitle, subtitle: autoSubtitle,
      cta_text: ctaText || goal.cta, cta_url: ctaUrl || null,
      image_urls: images, theme_color: themeColor,
      status: "active",
      bid_cents: bidBani, budget_cents: Math.round(budget * 100),
      daily_cap_cents: Math.round(dailyCap * 100),
      pricing_model: "cpm",
      city_id: cityId || null,
      party_id: targetType === "party" ? partyId || null : null,
      venue_id: targetType === "venue" ? venueId || null : null,
      starts_at: startsAt || new Date().toISOString(),
      ends_at: endsAt || selectedParty?.expires_at || null,
      targeting: { vibes, age_min: ageMin, age_max: ageMax, days, hour_from: hourFrom, hour_to: hourTo },
      schedule: { days, hour_from: hourFrom, hour_to: hourTo },
    };
    const { data: inserted, error } = await supabase.from("campaigns").insert(insertData).select().single();
    setBusy(false);
    if (error) return alert(error.message);
    onCreated(inserted);
  };

  const Preview = (
    <div className="rounded-2xl overflow-hidden border border-foreground/15 relative shadow-lg">
      <div className="aspect-[16/9] relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}66)` }}>
        {images[0] && <img src={images[0]} alt="" className="absolute inset-0 w-full h-full object-cover opacity-95" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm flex items-center gap-1">
          <Sparkles size={9} className="text-white" />
          <span className="font-mono text-[9px] uppercase tracking-widest text-white">Promovat</span>
        </div>
        <div className="absolute bottom-0 inset-x-0 p-3 text-white">
          <div className="font-display uppercase text-xl leading-tight line-clamp-1">{autoTitle || "Titlu campanie"}</div>
          <div className="text-xs opacity-90 line-clamp-1">{autoSubtitle}</div>
        </div>
      </div>
      <div className="flex items-center justify-between p-2.5 bg-foreground/[0.04]">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground truncate">{business.brand_name}</span>
        <span className="text-[10px] font-display uppercase px-2.5 py-1 rounded-md text-white" style={{ background: themeColor }}>
          {ctaText || goal.cta} →
        </span>
      </div>
    </div>
  );

  const StepDots = (
    <div className="flex items-center gap-1.5 justify-center">
      {[1, 2, 3].map((n) => (
        <div key={n}
          className={`h-1 rounded-full transition-all ${step === n ? "w-8 bg-foreground" : step > n ? "w-4 bg-foreground/50" : "w-4 bg-foreground/15"}`} />
      ))}
    </div>
  );

  return (
    <Sheet onClose={onClose} title={step === 1 ? "Ce vrei?" : step === 2 ? "Cum arată?" : "Cât bagi?"} wide>
      {StepDots}
      {Preview}

      {step === 1 && (
        <>
          <div className="text-center space-y-1 pt-1">
            <div className="font-display uppercase text-lg">Alege un obiectiv</div>
            <p className="text-xs text-muted-foreground">Restul îl punem noi pe pilot automat.</p>
          </div>

          <div className="space-y-2">
            {GOALS.map((g) => {
              const Icon = g.icon;
              const selected = goalId === g.id;
              return (
                <button key={g.id} onClick={() => pickGoal(g.id)}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition-all relative overflow-hidden ${
                    selected ? "border-foreground bg-foreground/[0.04] scale-[1.01]" : "border-foreground/10 hover:border-foreground/25"
                  }`}
                  style={selected ? { boxShadow: `0 0 0 4px ${g.color}22` } : {}}>
                  {selected && (
                    <div className="absolute top-2 right-2 h-5 w-5 rounded-full flex items-center justify-center" style={{ background: g.color }}>
                      <Check size={12} className="text-white" />
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <div className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${g.color}22`, color: g.color }}>
                      <Icon size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-display uppercase text-base leading-tight">{g.title}</div>
                      <p className="text-xs text-muted-foreground mt-1">{g.promise}</p>
                      <div className="font-mono text-[10px] uppercase tracking-widest mt-2" style={{ color: g.color }}>
                        de la {g.suggestedBudget} RON
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="rounded-xl bg-neon-green/10 border border-neon-green/30 p-3 flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-neon-green/20 flex items-center justify-center flex-shrink-0">
              <Zap size={14} className="text-neon-green" />
            </div>
            <div className="text-[11px] text-muted-foreground leading-snug">
              <strong className="text-foreground">Plătești doar ce consumi.</strong> Poți opri oricând. Fără abonament.
            </div>
          </div>

          <StickyFooter>
            <button onClick={onClose} className="px-4 py-3 rounded-xl border border-foreground/15 text-xs font-mono uppercase tracking-widest">Renunță</button>
            <button onClick={() => setStep(2)}
              className="flex-1 px-4 py-3 rounded-xl text-white text-sm font-display uppercase tracking-widest flex items-center justify-center gap-1.5"
              style={{ background: goal.color }}>
              Continuă <ChevronRight size={14} />
            </button>
          </StickyFooter>
        </>
      )}

      {step === 2 && (
        <>
          <div className="space-y-2">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">link către</div>
            <div className="grid grid-cols-3 gap-1.5">
              {([
                { v: "party", l: "Petrecere" },
                { v: "venue", l: "Locație" },
                { v: "brand", l: "Brand" },
              ] as const).map((t) => (
                <button key={t.v} onClick={() => setTargetType(t.v)}
                  className={`px-2 py-2.5 rounded-xl text-[10px] font-mono uppercase tracking-widest border transition ${
                    targetType === t.v ? "bg-foreground text-background border-foreground" : "border-foreground/10 text-muted-foreground"}`}>
                  {t.l}
                </button>
              ))}
            </div>
            {targetType === "party" && (
              parties.length === 0 ? (
                <div className="text-[11px] text-muted-foreground p-2 rounded-md bg-foreground/[0.03]">
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
                {venues.map((v) => <option key={v.id} value={v.id}>{v.name}{v.address ? " · " + v.address : ""}</option>)}
              </select>
            )}
          </div>

          <div className="space-y-2">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">povestea ta</div>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder={selectedParty?.title || "Titlu mare (3-5 cuvinte care lovesc)"}
              maxLength={50} className={inputStyle} />
            <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Detaliu scurt (ex: 2 boxe, intrare 30 lei)"
              maxLength={80} className={inputStyle} />
            <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
              <input value={ctaText} onChange={(e) => setCtaText(e.target.value)} maxLength={15}
                placeholder="Buton" className={inputStyle} />
              <input type="color" value={themeColor} onChange={(e) => setThemeColor(e.target.value)}
                className="w-12 h-10 rounded-md border border-foreground/15 bg-transparent cursor-pointer" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground flex items-center justify-between">
              <span>poze (max 4)</span>
              <span className="text-foreground/50 normal-case tracking-normal text-[10px]">poza face diferența</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {images.map((u, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-foreground/5">
                  <img src={u} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => setImages(images.filter((_, j) => j !== i))}
                    className="absolute top-0.5 right-0.5 p-0.5 rounded-md bg-black/60"><X size={10} className="text-white" /></button>
                </div>
              ))}
              {images.length < 4 && (
                <button onClick={() => fileRef.current?.click()}
                  className="aspect-square rounded-lg border-2 border-dashed border-foreground/20 hover:border-foreground/40 flex flex-col items-center justify-center text-muted-foreground gap-1">
                  <Upload size={14} />
                  <span className="text-[9px] font-mono uppercase">Adaugă</span>
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
              onChange={(e) => uploadImages(e.target.files)} />
          </div>

          <button onClick={() => setAdvancedOpen((s) => !s)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-foreground/10 hover:border-foreground/25 text-xs">
            <span className="font-mono uppercase tracking-widest text-muted-foreground">Targeting avansat</span>
            <ChevronDown size={14} className={`transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
          </button>

          {advancedOpen && (
            <div className="space-y-3 p-3 rounded-xl bg-foreground/[0.02] border border-foreground/10">
              <div>
                <Label>Oraș</Label>
                <select value={cityId} onChange={(e) => setCityId(e.target.value)} className={selectStyle}>
                  <option value="">Toate orașele</option>
                  {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <Label>Vibes (gol = toate)</Label>
                <div className="flex flex-wrap gap-1.5">
                  {VIBES.map((v) => (
                    <button key={v} onClick={() => setVibes((s) => s.includes(v) ? s.filter((x) => x !== v) : [...s, v])}
                      className={`text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-md border ${
                        vibes.includes(v) ? "bg-foreground text-background border-foreground" : "border-foreground/15 text-muted-foreground"}`}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Vârstă: {ageMin}–{ageMax} ani</Label>
                <div className="flex gap-2">
                  <input type="number" min={16} max={99} value={ageMin} onChange={(e) => setAgeMin(+e.target.value)} className={inputStyle} />
                  <input type="number" min={16} max={99} value={ageMax} onChange={(e) => setAgeMax(+e.target.value)} className={inputStyle} />
                </div>
              </div>
              <div>
                <Label>Zile</Label>
                <div className="flex gap-1">
                  {DAYS.map((d) => (
                    <button key={d.v} onClick={() => setDays((s) => s.includes(d.v) ? s.filter((x) => x !== d.v) : [...s, d.v])}
                      className={`flex-1 py-2 rounded-md text-[10px] font-mono uppercase border ${
                        days.includes(d.v) ? "bg-foreground text-background border-foreground" : "border-foreground/15 text-muted-foreground"}`}>
                      {d.l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Interval orar: {hourFrom}:00 → {hourTo}:00</Label>
                <div className="flex gap-2">
                  <input type="number" min={0} max={23} value={hourFrom} onChange={(e) => setHourFrom(+e.target.value)} className={inputStyle} />
                  <input type="number" min={0} max={23} value={hourTo} onChange={(e) => setHourTo(+e.target.value)} className={inputStyle} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Start</Label>
                  <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={inputStyle} />
                </div>
                <div>
                  <Label>Stop</Label>
                  <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className={inputStyle} />
                </div>
              </div>
            </div>
          )}

          <StickyFooter>
            <button onClick={() => setStep(1)} className="px-4 py-3 rounded-xl border border-foreground/15 text-xs font-mono uppercase tracking-widest">Înapoi</button>
            <button onClick={() => setStep(3)}
              className="flex-1 px-4 py-3 rounded-xl text-white text-sm font-display uppercase tracking-widest flex items-center justify-center gap-1.5"
              style={{ background: goal.color }}>
              Buget <ChevronRight size={14} />
            </button>
          </StickyFooter>
        </>
      )}

      {step === 3 && (
        <>
          <div className="text-center space-y-1 pt-1">
            <div className="font-display uppercase text-lg">Cât pompăm?</div>
            <p className="text-xs text-muted-foreground">Alege un pachet sau setează tu.</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {BUDGET_TIERS.map((t) => {
              const selected = budget === t.ron;
              return (
                <button key={t.ron} onClick={() => { setBudget(t.ron); setDailyCap(Math.max(5, Math.round(t.ron / 3))); }}
                  className={`relative p-3 rounded-2xl border-2 text-left transition-all ${
                    selected ? "border-foreground bg-foreground/[0.04] scale-[1.02]" : "border-foreground/10 hover:border-foreground/25"
                  }`}
                  style={selected ? { boxShadow: `0 0 0 4px ${goal.color}22` } : {}}>
                  {t.badge && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[8px] font-mono uppercase tracking-widest text-white whitespace-nowrap"
                      style={{ background: goal.color }}>
                      {t.badge}
                    </div>
                  )}
                  <div className="font-display text-2xl leading-none">{t.ron}<span className="text-xs text-muted-foreground"> RON</span></div>
                  <div className="font-mono text-[10px] uppercase tracking-widest mt-1">{t.label}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{t.hint}</div>
                </button>
              );
            })}
          </div>

          <div className="space-y-1.5 px-1">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Sau setează</span>
              <span className="font-display text-base">{budget} RON</span>
            </div>
            <input type="range" min={10} max={1000} step={10} value={budget}
              onChange={(e) => { setBudget(+e.target.value); setDailyCap(Math.min(dailyCap, +e.target.value)); }}
              className="w-full" style={{ accentColor: goal.color }} />
          </div>

          <div className="rounded-2xl p-4 text-center relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${goal.color}22, ${goal.color}08)`, border: `1px solid ${goal.color}44` }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: goal.color }}>vei ajunge la</div>
            <div className="font-display text-4xl mt-1" style={{ color: goal.color }}>
              ~{(estimated / 1000).toFixed(estimated >= 10000 ? 0 : 1)}k
            </div>
            <div className="text-xs text-muted-foreground mt-1">oameni din publicul tău</div>
            <div className="mt-3 pt-3 border-t border-foreground/10 grid grid-cols-2 gap-2 text-left">
              <div>
                <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">durată</div>
                <div className="text-xs mt-0.5">~{Math.ceil(budget / Math.max(dailyCap, 1))} zile</div>
              </div>
              <div>
                <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">limită/zi</div>
                <div className="text-xs mt-0.5">{dailyCap} RON</div>
              </div>
            </div>
          </div>

          {budget * 100 > business.wallet_balance_cents && (
            <div className="rounded-xl bg-neon-crimson/10 border border-neon-crimson/30 p-3 text-xs">
              <strong className="text-neon-crimson">Wallet insuficient.</strong> Ai {ron(business.wallet_balance_cents)} RON. Adaugă încă {(budget - business.wallet_balance_cents / 100).toFixed(2)} RON.
            </div>
          )}

          <StickyFooter>
            <button onClick={() => setStep(2)} className="px-4 py-3 rounded-xl border border-foreground/15 text-xs font-mono uppercase tracking-widest">Înapoi</button>
            <button disabled={busy || budget * 100 > business.wallet_balance_cents} onClick={submit}
              className="flex-1 px-4 py-3 rounded-xl text-white text-sm font-display uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-1.5"
              style={{ background: goal.color, boxShadow: `0 8px 24px -8px ${goal.color}` }}>
              <Rocket size={14} /> {busy ? "..." : `Lansează · ${budget} RON`}
            </button>
          </StickyFooter>
        </>
      )}
    </Sheet>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mb-1.5">{children}</div>;
}

function StickyFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 sticky bottom-0 bg-background pt-3 -mx-5 px-5 pb-1 border-t border-foreground/10">
      {children}
    </div>
  );
}


/* ============================ Brand profile editor ============================ */

function BrandProfileEditor({ business, cities, onClose, onSaved }: {
  business: any; cities: any[]; onClose: () => void; onSaved: () => void;
}) {
  const { user } = useAuth();
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
    if (!user) { alert("Trebuie să fii autentificat"); return; }
    const path = `${user.id}/biz/${business.id}/${prefix}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
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


/* ============================ Campaign Editor ============================ */

function CampaignEditor({ business, campaign, onClose, onSaved }: {
  business: any; campaign: any; onClose: () => void; onSaved: () => void;
}) {
  const [title, setTitle] = useState(campaign.title ?? "");
  const [subtitle, setSubtitle] = useState(campaign.subtitle ?? "");
  const [ctaText, setCtaText] = useState(campaign.cta_text ?? "Vezi detalii");
  const [ctaUrl, setCtaUrl] = useState(campaign.cta_url ?? "");
  const [images, setImages] = useState<string[]>(campaign.image_urls ?? []);
  const [themeColor, setThemeColor] = useState(campaign.theme_color ?? "#FF2D55");
  const [status, setStatus] = useState<string>(campaign.status ?? "paused");
  const [budget, setBudget] = useState(Math.round((campaign.budget_cents ?? 0) / 100));
  const [dailyCap, setDailyCap] = useState(Math.round((campaign.daily_cap_cents ?? 0) / 100));
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadImages = async (files: FileList | null) => {
    if (!files) return;
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

  const save = async () => {
    setBusy(true);
    const { error } = await supabase.from("campaigns").update({
      title: title.trim() || campaign.title,
      subtitle: subtitle || null,
      cta_text: ctaText || "Vezi detalii",
      cta_url: ctaUrl || null,
      image_urls: images,
      theme_color: themeColor,
      status: status as any,
      budget_cents: Math.max(0, Math.round(budget * 100)),
      daily_cap_cents: Math.max(0, Math.round(dailyCap * 100)),
    }).eq("id", campaign.id);
    setBusy(false);
    if (error) return alert(error.message);
    onSaved();
  };

  const placement = PLACEMENTS.find((p) => p.value === campaign.kind);

  return (
    <Sheet onClose={onClose} title="Editează campania" wide>
      <div className="rounded-xl bg-foreground/[0.03] border border-foreground/10 p-3 flex items-center gap-2">
        <div className="w-8 h-8 rounded-md flex items-center justify-center"
          style={{ background: `${placement?.color ?? "#FF2D55"}22`, color: placement?.color ?? "#FF2D55" }}>
          <Megaphone size={14} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs">{placement?.label ?? campaign.kind}</div>
          <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
            {campaign.impressions ?? 0} views · {campaign.clicks ?? 0} clicks · {ron(campaign.spent_cents ?? 0)} RON cheltuit
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-2xl overflow-hidden border border-foreground/15 shadow-lg">
        <div className="aspect-[16/9] relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}66)` }}>
          {images[0] && <img src={images[0]} alt="" className="absolute inset-0 w-full h-full object-cover opacity-95" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm flex items-center gap-1">
            <Sparkles size={9} className="text-white" />
            <span className="font-mono text-[9px] uppercase tracking-widest text-white">Promovat</span>
          </div>
          <div className="absolute bottom-0 inset-x-0 p-3 text-white">
            <div className="font-display uppercase text-xl leading-tight line-clamp-1">{title || "Titlu"}</div>
            <div className="text-xs opacity-90 line-clamp-1">{subtitle}</div>
          </div>
        </div>
        <div className="flex items-center justify-between p-2.5 bg-foreground/[0.04]">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground truncate">{business.brand_name}</span>
          <span className="text-[10px] font-display uppercase px-2.5 py-1 rounded-md text-white" style={{ background: themeColor }}>
            {ctaText} →
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Titlu</Label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={50} className={inputStyle} />
        <Label>Subtitlu / detaliu</Label>
        <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} maxLength={80} className={inputStyle} />
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <input value={ctaText} onChange={(e) => setCtaText(e.target.value)} maxLength={15} placeholder="Buton" className={inputStyle} />
          <input type="color" value={themeColor} onChange={(e) => setThemeColor(e.target.value)}
            className="w-12 h-10 rounded-md border border-foreground/15 bg-transparent cursor-pointer" />
        </div>
        <Label>Link (opțional — unde duce click-ul)</Label>
        <input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="https://..." className={inputStyle} />
      </div>

      <div className="space-y-2">
        <Label>Poze (max 4)</Label>
        <div className="grid grid-cols-4 gap-1.5">
          {images.map((u, i) => (
            <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-foreground/5">
              <img src={u} alt="" className="w-full h-full object-cover" />
              <button onClick={() => setImages(images.filter((_, j) => j !== i))}
                className="absolute top-0.5 right-0.5 p-0.5 rounded-md bg-black/60"><X size={10} className="text-white" /></button>
            </div>
          ))}
          {images.length < 4 && (
            <button onClick={() => fileRef.current?.click()}
              className="aspect-square rounded-lg border-2 border-dashed border-foreground/20 hover:border-foreground/40 flex flex-col items-center justify-center text-muted-foreground gap-1">
              <Upload size={14} />
              <span className="text-[9px] font-mono uppercase">Adaugă</span>
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
          onChange={(e) => uploadImages(e.target.files)} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Buget total (RON)</Label>
          <input type="number" min={0} value={budget} onChange={(e) => setBudget(+e.target.value)} className={inputStyle} />
        </div>
        <div>
          <Label>Limită zilnică (RON)</Label>
          <input type="number" min={0} value={dailyCap} onChange={(e) => setDailyCap(+e.target.value)} className={inputStyle} />
        </div>
      </div>

      <div>
        <Label>Status</Label>
        <div className="grid grid-cols-2 gap-2">
          {(["active", "paused"] as const).map((s) => (
            <button key={s} onClick={() => setStatus(s)}
              className={`px-3 py-2.5 rounded-md text-xs font-mono uppercase tracking-widest border ${
                status === s
                  ? s === "active" ? "bg-neon-green/15 border-neon-green text-neon-green" : "bg-foreground/10 border-foreground text-foreground"
                  : "border-foreground/15 text-muted-foreground"
              }`}>
              {s === "active" ? "● Activă" : "❚❚ Pe pauză"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 sticky bottom-0 bg-background pt-3 -mx-5 px-5 pb-1 border-t border-foreground/10">
        <button onClick={onClose} className="px-4 py-3 rounded-xl border border-foreground/15 text-xs font-mono uppercase tracking-widest">Renunță</button>
        <button disabled={busy} onClick={save}
          className="flex-1 px-4 py-3 rounded-xl text-white text-sm font-display uppercase tracking-widest disabled:opacity-50"
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
    <div className="fixed inset-0 z-[120] bg-background/90 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 pb-[calc(112px+env(safe-area-inset-bottom))] sm:pb-4">
      <div className={`w-full ${wide ? "max-w-lg" : "max-w-md"} max-h-[calc(100vh-144px-env(safe-area-inset-bottom))] sm:max-h-[92vh] overflow-y-auto rounded-2xl bg-background border border-foreground/15 p-5 space-y-4`}>
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

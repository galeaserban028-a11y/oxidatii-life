import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { WalletTopupDialog } from "@/components/WalletTopupDialog";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import {
  Building2, Wallet, Rocket, Plus, TrendingUp, Eye, MousePointerClick,
  Image as ImageIcon, MapPin, Megaphone, Sparkles, Bell, Compass, Star,
  Settings2, X, Calendar, Target, Palette, Upload, ChevronRight, Pencil,
  Users, Heart, Flame, ChevronDown, Check, Zap, Trash2, Ticket, Video, Clock,
} from "lucide-react";
import { BizCommandCenter } from "@/components/biz/BizCommandCenter";
import { launchBusinessCampaign } from "@/lib/business-promotion.functions";

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
  { value: "boost_feed",     label: "Feed Boost",      icon: TrendingUp, desc: "Card promovat în feed, cu views și click-uri", min: 50, color: "#FF2D55" },
  { value: "boost_story",    label: "Full-screen Ad",  icon: Sparkles,   desc: "Reclamă full-screen + banner sticky în aplicație", min: 120, color: "#00D4FF" },
  { value: "boost_discover", label: "Banner App",      icon: Compass,    desc: "Banner promovat rotit în aplicație", min: 100, color: "#9D4EDD" },
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
  const [topupBizId, setTopupBizId] = useState<string | null>(null);

  // După întoarcerea din checkout, refresh wallet (webhook actualizează balance)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("topup") === "success") {
      // Poll de câteva ori ca să prindem webhook-ul
      let n = 0;
      const t = setInterval(() => {
        qc.invalidateQueries({ queryKey: ["biz"] });
        if (++n >= 5) clearInterval(t);
      }, 1500);
      window.history.replaceState({}, "", window.location.pathname);
      return () => clearInterval(t);
    }
  }, [qc]);

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

  return (
    <div className="px-4 pt-8 pb-24 space-y-7">
      <PaymentTestModeBanner />
      <WalletTopupDialog
        businessId={topupBizId ?? ""}
        open={!!topupBizId}
        onClose={() => setTopupBizId(null)}
      />
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Building2 size={11} className="text-sunset-amber" />
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">Business · Command Center</span>
        </div>
        <h1 className="font-display uppercase text-3xl leading-[0.95] tracking-tight">
          Gestionează și crește <span className="text-gradient-chaos">localul tău.</span>
        </h1>
        <p className="text-xs text-zinc-400">
          Date reale, măsurabile. Fără promisiuni, fără estimări inventate.
        </p>
      </header>


      {isLoading ? (
        <div className="h-40 rounded-2xl bg-zinc-900/30 border border-white/5 backdrop-blur animate-pulse" />
      ) : data?.businesses.length === 0 ? (
        <div className="rounded-2xl bg-zinc-900/30 border border-white/5 backdrop-blur p-8 text-center space-y-3">
          <div className="text-4xl">🏢</div>
          <div className="font-display uppercase">Niciun business încă</div>
          <p className="text-xs text-zinc-400 max-w-xs mx-auto">
            Înregistrează-ți brandul și începe să promovezi evenimente.
          </p>
          <button onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 font-display uppercase text-[11px] tracking-widest px-4 py-2 rounded-2xl text-white"
            style={{ background: "var(--gradient-chaos)" }}>
            <Plus size={12} /> Creează business
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {data!.businesses.map((b) => (
            <BusinessCard key={b.id} business={b}
              campaigns={data!.campaigns.filter((c) => c.business_id === b.id)}
              parties={data!.parties} cities={data!.cities} venues={data!.venues}
              onTopup={() => setTopupBizId(b.id)} />
          ))}
          <button onClick={() => setCreateOpen(true)}
            className="w-full font-mono text-[10px] uppercase tracking-widest px-4 py-3 rounded-2xl border border-dashed border-white/10 hover:border-neon-crimson text-zinc-400 hover:text-neon-crimson flex items-center justify-center gap-1.5 backdrop-blur">
            <Plus size={12} /> Adaugă un alt business
          </button>
        </div>
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
  onTopup: () => void;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editCampaign, setEditCampaign] = useState<any | null>(null);

  const totalSpent = campaigns.reduce((s, c) => s + (c.spent_cents || 0), 0);
  const totalImpressions = campaigns.reduce((s, c) => s + (c.impressions || 0), 0);
  const totalClicks = campaigns.reduce((s, c) => s + (c.clicks || 0), 0);
  const activeCount = campaigns.filter((c) => c.status === "active").length;
  const hasCampaignFunds = business.wallet_balance_cents >= 5000;

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

  const deleteBusiness = async () => {
    if (!confirm(`Ștergi definitiv business-ul „${business.brand_name}"? Toate campaniile asociate vor fi șterse.`)) return;
    await supabase.from("campaigns").delete().eq("business_id", business.id);
    const { error } = await supabase.from("business_accounts").delete().eq("id", business.id);
    if (error) { alert(error.message); return; }
    qc.invalidateQueries({ queryKey: ["biz"] });
  };


  return (
    <div className="rounded-2xl bg-zinc-900/30 border border-white/5 backdrop-blur overflow-hidden">
      {/* Cover */}
      <div className="relative h-28 bg-gradient-to-br from-neon-purple/30 to-neon-crimson/30 overflow-hidden">
        {business.cover_url && <img src={business.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        <button onClick={() => setEditOpen(true)}
          className="absolute top-2 right-2 p-1.5 rounded-md bg-background/70 backdrop-blur-sm border border-foreground/15">
          <Pencil size={12} />
        </button>
        <button onClick={deleteBusiness}
          className="absolute top-2 right-11 p-1.5 rounded-md bg-background/70 backdrop-blur-sm border border-foreground/15 hover:border-neon-crimson hover:text-neon-crimson"
          aria-label="Șterge business">
          <Trash2 size={12} />
        </button>

      </div>

      <div className="p-4 -mt-10 relative space-y-4">
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

        <BizCommandCenter
          business={business}
          campaigns={campaigns}
          parties={parties}
          onTopup={onTopup}
          onNewCampaign={() => setBuilderOpen(true)}
          onEditCampaign={(c) => setEditCampaign(c)}
          onToggleCampaign={toggleCampaign}
          onDeleteCampaign={deleteCampaign}
          onDuplicateCampaign={async (c) => {
            const { data: copy, error } = await supabase.from("campaigns").insert({
              business_id: c.business_id,
              kind: c.kind,
              party_id: c.party_id,
              venue_id: c.venue_id,
              city_id: c.city_id,
              title: `${c.title} (copie)`,
              subtitle: c.subtitle,
              cta_text: c.cta_text,
              cta_url: c.cta_url,
              image_urls: c.image_urls,
              theme_color: c.theme_color,
              bid_cents: c.bid_cents,
              budget_cents: c.budget_cents,
              pricing_model: c.pricing_model,
              daily_cap_cents: c.daily_cap_cents,
              targeting: c.targeting,
              schedule: c.schedule,
              event_starts_at: c.event_starts_at,
              entry_kind: c.entry_kind,
              entry_price_text: c.entry_price_text,
              street: c.street,
              special_guest: c.special_guest,
              video_url: c.video_url,
              status: "draft",
            }).select().single();
            if (error) { alert(error.message); return; }
            qc.invalidateQueries({ queryKey: ["biz"] });
            if (copy) setEditCampaign(copy);
          }}
        />
      </div>


      {builderOpen && (
        <CampaignBuilder business={business} parties={parties} cities={cities} venues={venues}
          onClose={() => { setBuilderOpen(false); navigate({ to: "/app" }); }}
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
    title: "Card în feed",
    promise: "Brandul tău apare ca un card promovat în feed-ul utilizatorilor din oraș.",
    placement: "boost_feed" as const,
    color: "#FF2D55",
    suggestedBudget: 50,
    cta: "Vezi locul",
  },
  {
    id: "city",
    icon: Flame,
    title: "Reclamă full-screen",
    promise: "Reclamă full-screen la deschiderea aplicației + banner sticky. Expunere maximă.",
    placement: "boost_story" as const,
    color: "#00D4FF",
    suggestedBudget: 150,
    cta: "Vezi locul",
  },
  {
    id: "fans",
    icon: Heart,
    title: "Banner rotativ",
    promise: "Banner promovat rotit în secțiunile principale ale aplicației.",
    placement: "boost_discover" as const,
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

  const [targetType, setTargetType] = useState<"party" | "venue" | "brand">("brand");
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
  // event details (shown on the promo card)
  const [eventStartsAt, setEventStartsAt] = useState(""); // datetime-local
  const [entryKind, setEntryKind] = useState<"" | "free" | "paid">("");
  const [entryPriceText, setEntryPriceText] = useState("");
  const [street, setStreet] = useState("");
  const [specialGuest, setSpecialGuest] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoBusy, setVideoBusy] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  // "Pune-l pe mapă" — auto-create a venue tied to this campaign if the
  // business is not linked to one yet. Pre-fills from existing business data.
  const [createVenueOnMap, setCreateVenueOnMap] = useState<boolean>(!business.venue_id);
  const [venueType, setVenueType] = useState<string>(
    ["club", "bar", "pub", "terasa", "after"].includes(business.type) ? business.type : "club"
  );
  const [venueCityId, setVenueCityId] = useState<string>(business.city_id ?? "");
  const [venueCoords, setVenueCoords] = useState<{ lat: number; lng: number } | null>(
    business.lat != null && business.lng != null ? { lat: Number(business.lat), lng: Number(business.lng) } : null
  );
  const [venueGeoState, setVenueGeoState] = useState<"idle" | "loading" | "ok" | "err">(
    business.lat != null && business.lng != null ? "ok" : "idle"
  );

  const requestVenueLoc = () => {
    if (!navigator.geolocation) { setVenueGeoState("err"); return; }
    setVenueGeoState("loading");
    navigator.geolocation.getCurrentPosition(
      (p) => { setVenueCoords({ lat: p.coords.latitude, lng: p.coords.longitude }); setVenueGeoState("ok"); },
      () => setVenueGeoState("err"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };


  const pickGoal = (id: typeof goalId) => {
    const g = GOALS.find((x) => x.id === id)!;
    setGoalId(id);
    setThemeColor(g.color);
    setCtaText(g.cta);
    setBudget(g.suggestedBudget);
    const pm = PLACEMENTS.find((p) => p.value === g.placement)!;
    setBidBani(pm.min);
    setTargetType("brand");
  };

  const selectedParty = parties.find((p) => p.id === partyId);
  const autoTitle = title || selectedParty?.title || business.brand_name;
  const autoSubtitle =
    subtitle ||
    selectedParty?.location_text ||
    (goal.id === "fans" ? "Intră în comunitate" : "Nu rata seara asta");

  // Prefill event start from party
  useEffect(() => {
    if (selectedParty?.starts_at && !eventStartsAt) {
      const d = new Date(selectedParty.starts_at);
      const pad = (n: number) => String(n).padStart(2, "0");
      setEventStartsAt(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
    }
    if (selectedParty?.location_text && !street) setStreet(selectedParty.location_text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partyId]);

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

  const uploadVideo = async (file: File | null | undefined) => {
    if (!file || !user) return;
    if (file.size > 50 * 1024 * 1024) { alert("Clipul e prea mare (max 50 MB)."); return; }
    setVideoBusy(true);
    const path = `${user.id}/biz/${business.id}/video-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
    const { error } = await supabase.storage.from("venue-photos").upload(path, file, { upsert: false, contentType: file.type });
    if (error) { setVideoBusy(false); alert(error.message); return; }
    const { data } = supabase.storage.from("venue-photos").getPublicUrl(path);
    setVideoUrl(data.publicUrl);
    setVideoBusy(false);
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
      video_url: videoUrl || null,
      event_starts_at: eventStartsAt ? new Date(eventStartsAt).toISOString() : (selectedParty?.starts_at ?? null),
      entry_kind: entryKind || null,
      entry_price_text: entryKind === "paid" ? (entryPriceText.trim() || null) : null,
      street: street.trim() || null,
      special_guest: specialGuest.trim() || null,
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

  const eventFacts: { icon: typeof Calendar; text: string }[] = [];
  if (eventStartsAt) {
    const d = new Date(eventStartsAt);
    eventFacts.push({
      icon: Calendar,
      text: d.toLocaleString("ro-RO", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
    });
  }
  if (entryKind === "free") eventFacts.push({ icon: Ticket, text: "Intrare gratis" });
  if (entryKind === "paid") eventFacts.push({ icon: Ticket, text: entryPriceText || "Intrare cu bilet" });
  if (street.trim()) eventFacts.push({ icon: MapPin, text: street });
  if (specialGuest.trim()) eventFacts.push({ icon: Star, text: specialGuest });

  const Preview = (
    <div className="rounded-2xl overflow-hidden border border-foreground/15 relative shadow-xl bg-background">
      {/* Poster — image at native aspect, blurred backdrop fills the rest */}
      <div className="relative aspect-[4/5] overflow-hidden bg-black">
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}55)` }} />
        {images[0] && (
          <>
            <img src={images[0]} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-60" />
            <img src={images[0]} alt="" className="absolute inset-0 w-full h-full object-contain" />
          </>
        )}
        {!images[0] && videoUrl && (
          <video src={videoUrl} className="absolute inset-0 w-full h-full object-cover" muted playsInline />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10" />
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm flex items-center gap-1">
          <Sparkles size={9} className="text-white" />
          <span className="font-mono text-[9px] uppercase tracking-widest text-white">Promovat</span>
        </div>
        {videoUrl && images[0] && (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm flex items-center gap-1">
            <Video size={9} className="text-white" />
            <span className="font-mono text-[9px] uppercase tracking-widest text-white">Clip</span>
          </div>
        )}
        <div className="absolute bottom-0 inset-x-0 p-3 text-white">
          <div className="font-display uppercase text-xl leading-tight line-clamp-2">{autoTitle || "Titlu campanie"}</div>
          {autoSubtitle && <div className="text-xs opacity-90 line-clamp-2 mt-0.5">{autoSubtitle}</div>}
        </div>
      </div>
      {/* Facts strip */}
      {eventFacts.length > 0 && (
        <div className="px-3 py-2.5 bg-foreground/[0.04] border-t border-foreground/10 space-y-1.5">
          {eventFacts.map((f, i) => {
            const I = f.icon;
            return (
              <div key={i} className="flex items-center gap-2 text-[11px]">
                <I size={11} style={{ color: themeColor }} className="flex-shrink-0" />
                <span className="truncate">{f.text}</span>
              </div>
            );
          })}
        </div>
      )}
      <div className="flex items-center justify-between p-2.5 bg-foreground/[0.02]">
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
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">promovezi</div>
            <div className="rounded-xl border border-foreground/10 bg-foreground/[0.03] p-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ background: `${themeColor}22`, color: themeColor }}>
                <Building2 size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display uppercase text-sm leading-tight truncate">{business.brand_name}</div>
                <div className="text-[11px] text-muted-foreground">Reclama duce către profilul brandului tău.</div>
              </div>
            </div>
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

          {/* Video clip */}
          <div className="space-y-2">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground flex items-center justify-between">
              <span>clip promo (opțional)</span>
              <span className="text-foreground/50 normal-case tracking-normal text-[10px]">max 50 MB · mp4</span>
            </div>
            {videoUrl ? (
              <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
                <video src={videoUrl} controls playsInline className="w-full h-full" />
                <button onClick={() => setVideoUrl("")}
                  className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/70"><X size={12} className="text-white" /></button>
              </div>
            ) : (
              <button onClick={() => videoRef.current?.click()} disabled={videoBusy}
                className="w-full aspect-[3/1] rounded-lg border-2 border-dashed border-foreground/20 hover:border-foreground/40 flex items-center justify-center gap-2 text-muted-foreground disabled:opacity-50">
                <Video size={16} />
                <span className="text-[11px] font-mono uppercase tracking-widest">{videoBusy ? "Se urcă..." : "Adaugă clip"}</span>
              </button>
            )}
            <input ref={videoRef} type="file" accept="video/*" className="hidden"
              onChange={(e) => uploadVideo(e.target.files?.[0])} />
          </div>

          {/* Event details */}
          <div className="space-y-2">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">detaliile evenimentului</div>

            <div className="space-y-1">
              <Label>Când</Label>
              <input type="datetime-local" value={eventStartsAt}
                onChange={(e) => setEventStartsAt(e.target.value)} className={inputStyle} />
            </div>

            <div className="space-y-1">
              <Label>Intrare</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {([
                  { v: "", l: "—" },
                  { v: "free", l: "Gratis" },
                  { v: "paid", l: "Cu bani" },
                ] as const).map((o) => (
                  <button key={o.v} onClick={() => setEntryKind(o.v)}
                    className={`px-2 py-2 rounded-md text-[10px] font-mono uppercase tracking-widest border ${
                      entryKind === o.v ? "bg-foreground text-background border-foreground" : "border-foreground/15 text-muted-foreground"}`}>
                    {o.l}
                  </button>
                ))}
              </div>
              {entryKind === "paid" && (
                <input value={entryPriceText} onChange={(e) => setEntryPriceText(e.target.value)}
                  placeholder="ex: 30 RON / 50 RON la ușă" maxLength={40} className={inputStyle} />
              )}
            </div>

            <div className="space-y-1">
              <Label>Stradă / Adresă</Label>
              <input value={street} onChange={(e) => setStreet(e.target.value)}
                placeholder={selectedParty?.location_text || "ex: Str. Mihai Viteazul 4"}
                maxLength={120} className={inputStyle} />
            </div>

            <div className="space-y-1">
              <Label>Invitat special (opțional)</Label>
              <input value={specialGuest} onChange={(e) => setSpecialGuest(e.target.value)}
                placeholder="ex: DJ Andrei · Connect-R"
                maxLength={80} className={inputStyle} />
            </div>

            <div className="space-y-1">
              <Label>Link extern (opțional — pe el îi duci la click)</Label>
              <input type="url" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)}
                placeholder="https://..."
                className={inputStyle} />
            </div>
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

          <div className="rounded-2xl p-4 relative overflow-hidden space-y-3"
            style={{ background: `linear-gradient(135deg, ${goal.color}18, ${goal.color}06)`, border: `1px solid ${goal.color}40` }}>
            <div className="flex items-start gap-2.5">
              <div className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${goal.color}22`, color: goal.color }}>
                <Zap size={14} />
              </div>
              <div className="text-[12px] leading-snug">
                <div className="font-display uppercase text-foreground">Plătești doar ce consumi.</div>
                <p className="text-muted-foreground mt-0.5">
                  Reclama rulează până se termină bugetul. Vezi views și click-urile pe link în timp real, fără promisiuni false.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-foreground/10">
              <Stat icon={<Eye size={11} />} label="Views" value="real-time" />
              <Stat icon={<MousePointerClick size={11} />} label="Click pe link" value="real-time" />
              <Stat icon={<Calendar size={11} />} label="Limită/zi" value={`${dailyCap} RON`} />
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
  const { user } = useAuth();
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

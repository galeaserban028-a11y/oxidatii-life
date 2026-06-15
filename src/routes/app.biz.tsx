import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Building2, Check, Crown, Sparkles, Zap, X, Plus, Loader2, Play, Pause, Trash2, Eye, MousePointerClick, Megaphone } from "lucide-react";
import { BizPlanEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { cancelBizPlan, type BizPlan } from "@/utils/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { toast } from "sonner";

export const Route = createFileRoute("/app/biz")({
  head: () => ({ meta: [{ title: "Business · OXIDAȚII" }] }),
  component: BizPage,
});

const PLANS: {
  id: BizPlan;
  name: string;
  priceRon: number;
  icon: typeof Sparkles;
  color: string;
  tagline: string;
  features: string[];
  popular?: boolean;
}[] = [
  { id: "basic", name: "Basic", priceRon: 500, icon: Sparkles, color: "#00D4FF",
    tagline: "Pentru localuri care vor să apară pe hartă",
    features: ["Profil business verificat", "Apariție în feed-ul orașului", "Campanii nelimitate", "Statistici de bază"] },
  { id: "pro", name: "Pro", priceRon: 1000, icon: Zap, color: "#FF2D55", popular: true,
    tagline: "Vizibilitate sporită + badge verificat",
    features: ["Tot din Basic", "Badge verificat", "Prioritate în feed", "Statistici avansate", "Suport prioritar"] },
  { id: "elite", name: "Elite", priceRon: 2500, icon: Crown, color: "#FFD700",
    tagline: "Top featured. Cel mai vizibil din oraș.",
    features: ["Tot din Pro", "Featured tonight", "Top în hartă & feed", "Slot exclusiv în oraș", "Account manager"] },
];

async function loadBiz(userId: string) {
  const { data: businesses } = await supabase
    .from("business_accounts").select("id, brand_name, type, pro_tier, pro_until, reputation_score, total_reviews")
    .eq("owner_user_id", userId).order("created_at", { ascending: false });
  return { businesses: businesses ?? [] };
}

async function loadCampaigns(businessId: string) {
  const { data } = await supabase
    .from("campaigns")
    .select("id, title, subtitle, body, status, kind, impressions, clicks, image_urls, video_url, cta_url, event_starts_at, starts_at, ends_at, created_at")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  if (!data || data.length === 0) return [];
  // Fetch like counts in one batched call
  const ids = data.map((c: any) => c.id);
  const { data: likeRows } = await supabase
    .from("campaign_likes")
    .select("campaign_id")
    .in("campaign_id", ids);
  const counts = new Map<string, number>();
  (likeRows ?? []).forEach((r: any) => counts.set(r.campaign_id, (counts.get(r.campaign_id) ?? 0) + 1));
  return data.map((c: any) => ({ ...c, likes: counts.get(c.id) ?? 0 }));
}

// Câte postări sponsorizate poate publica un brand pe lună, în funcție de plan.
const MONTHLY_POST_QUOTA: Record<string, number> = { basic: 4, pro: 10, elite: 20 };

function startOfMonthIso() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

async function countCampaignsThisMonth(businessId: string) {
  const { count } = await supabase
    .from("campaigns")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .gte("created_at", startOfMonthIso());
  return count ?? 0;
}

function BizPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["biz-plans", user?.id], enabled: !!user, queryFn: () => loadBiz(user!.id),
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [brand, setBrand] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkout, setCheckout] = useState<{ businessId: string; plan: BizPlan } | null>(null);
  const [showPlans, setShowPlans] = useState(false);
  const [campaignOpen, setCampaignOpen] = useState(false);

  if (!user) return <div className="px-4 pt-10 text-center text-sm text-muted-foreground">Conectează-te pentru a accesa zona business.</div>;

  const createBusiness = async () => {
    if (!brand.trim()) return;
    setBusy(true);
    const slug = brand.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const { error } = await supabase.from("business_accounts").insert({
      owner_user_id: user.id, brand_name: brand.trim(), slug: slug || null, type: "promoter",
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setBrand(""); setCreateOpen(false);
    qc.invalidateQueries({ queryKey: ["biz-plans"] });
  };

  const cancel = async (businessId: string) => {
    if (!confirm("Anulezi abonamentul la sfârșitul perioadei curente?")) return;
    const res = await cancelBizPlan({ data: { businessId, environment: getStripeEnvironment() } });
    if ("error" in res) return toast.error(res.error);
    toast.success("Abonament anulat. Rămâne activ până la finalul perioadei.");
    qc.invalidateQueries({ queryKey: ["biz-plans"] });
  };

  const businesses = data?.businesses ?? [];
  const activeBiz = businesses[0];
  const isSubscribed = !!(activeBiz?.pro_tier && activeBiz.pro_until && new Date(activeBiz.pro_until) > new Date());

  // --- No business ---
  if (!isLoading && businesses.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 pt-10 pb-24 space-y-6 text-center">
        <div className="text-5xl">🏢</div>
        <h1 className="font-display uppercase text-2xl">Zona Business</h1>
        <p className="text-sm text-zinc-400">Creează-ți brandul ca să poți face campanii și să-ți promovezi localul.</p>
        <button onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-1.5 font-display uppercase text-[11px] tracking-widest px-5 py-3 rounded-2xl text-white"
          style={{ background: "var(--gradient-chaos)" }}>
          <Plus size={12} /> Creează business
        </button>
        <CreateBusinessSheet open={createOpen} onClose={() => setCreateOpen(false)} brand={brand} setBrand={setBrand} busy={busy} onCreate={createBusiness} />
      </div>
    );
  }

  if (isLoading || !activeBiz) {
    return <div className="px-4 pt-10"><div className="h-32 rounded-2xl bg-zinc-900/30 border border-white/5 animate-pulse" /></div>;
  }

  // --- Subscribed: show MANAGER ---
  if (isSubscribed && !showPlans) {
    return (
      <div className="max-w-4xl mx-auto px-4 pt-6 pb-24 space-y-6">
        <header className="rounded-2xl bg-zinc-900/40 border border-white/10 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sunset-magenta to-sunset-amber flex items-center justify-center">
              <Building2 size={22} className="text-white" />
            </div>
            <div>
              <div className="font-display uppercase text-lg">{activeBiz.brand_name}</div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 flex items-center gap-2 flex-wrap">
                <span>Plan <span className="text-emerald-400">{activeBiz.pro_tier}</span></span>
                {activeBiz.pro_until && <span>până {new Date(activeBiz.pro_until).toLocaleDateString("ro-RO")}</span>}
                <span className="text-amber-400">★ {Number(activeBiz.reputation_score ?? 0).toFixed(1)} ({activeBiz.total_reviews ?? 0})</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowPlans(true)}
              className="text-[10px] font-mono uppercase tracking-widest px-3 py-1.5 rounded-md border border-white/10 hover:border-white/30 text-zinc-300">
              Schimbă plan
            </button>
            <button onClick={() => cancel(activeBiz.id)}
              className="text-[10px] font-mono uppercase tracking-widest px-3 py-1.5 rounded-md border border-white/10 hover:border-red-500/40 hover:text-red-400 text-zinc-400">
              Anulează
            </button>
          </div>
        </header>

        <CampaignManager
          businessId={activeBiz.id}
          plan={(activeBiz.pro_tier as string) ?? "basic"}
          onOpenCreate={() => setCampaignOpen(true)}
        />

        {campaignOpen && (
          <CampaignCreateModal
            businessId={activeBiz.id}
            plan={(activeBiz.pro_tier as string) ?? "basic"}
            onClose={() => setCampaignOpen(false)}
            onCreated={() => {
              setCampaignOpen(false);
              qc.invalidateQueries({ queryKey: ["biz-campaigns", activeBiz.id] });
            }}
          />
        )}
      </div>
    );
  }

  // --- Not subscribed (or user explicitly switching plans): show plans ---
  return (
    <div className="max-w-5xl mx-auto px-4 pt-6 pb-24 space-y-8">
      <header className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono uppercase tracking-widest text-zinc-400">
          <Building2 size={11} /> {showPlans ? "Schimbă plan" : "Business"}
        </div>
        <h1 className="font-display uppercase text-3xl md:text-4xl tracking-tight">Alege abonamentul</h1>
        <p className="text-sm text-zinc-400 max-w-md mx-auto">
          Plată lunară. Anulezi oricând. Cu abonament activ poți crea campanii și postări sponsorizate.
        </p>
        {showPlans && (
          <button onClick={() => setShowPlans(false)}
            className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 hover:text-white">
            ← Înapoi la manager
          </button>
        )}
      </header>

      <div className="rounded-2xl bg-zinc-900/40 border border-white/10 p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-sunset-magenta to-sunset-amber flex items-center justify-center">
          <Building2 size={18} className="text-white" />
        </div>
        <div>
          <div className="font-display uppercase text-sm">{activeBiz.brand_name}</div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
            {activeBiz.pro_tier ? <>Plan <span className="text-emerald-400">{activeBiz.pro_tier}</span></> : <>Fără abonament activ</>}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          const isCurrent = activeBiz.pro_tier === plan.id;
          return (
            <div key={plan.id}
              className={`relative rounded-3xl p-6 border backdrop-blur transition ${
                plan.popular ? "border-white/20 bg-zinc-900/60" : "border-white/10 bg-zinc-900/40"
              }`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest text-white"
                  style={{ background: "var(--gradient-chaos)" }}>
                  Cel mai ales
                </div>
              )}
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${plan.color}20`, color: plan.color }}>
                  <Icon size={20} />
                </div>
                <div className="font-display uppercase text-xl">{plan.name}</div>
              </div>
              <p className="text-xs text-zinc-400 mb-4 min-h-[2.5rem]">{plan.tagline}</p>
              <div className="flex items-baseline gap-1 mb-5">
                <span className="font-display text-4xl" style={{ color: plan.color }}>{plan.priceRon}</span>
                <span className="text-xs text-zinc-500 font-mono uppercase tracking-widest">RON/lună</span>
              </div>
              <ul className="space-y-2 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-zinc-300">
                    <Check size={14} className="shrink-0 mt-0.5" style={{ color: plan.color }} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                disabled={isCurrent}
                onClick={() => setCheckout({ businessId: activeBiz.id, plan: plan.id })}
                className="w-full font-display uppercase text-[11px] tracking-widest py-3 rounded-2xl text-white disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: isCurrent ? "#16a34a" : plan.color }}>
                {isCurrent ? "Plan activ" : `Abonează-te ${plan.priceRon} RON`}
              </button>
            </div>
          );
        })}
      </div>

      <p className="text-center text-[10px] font-mono uppercase tracking-widest text-zinc-600">
        Plăți securizate prin Stripe · Mediu de test · Card: 4242 4242 4242 4242
      </p>

      {checkout && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm overflow-y-auto" onClick={() => setCheckout(null)}>
          <div className="min-h-full flex items-start justify-center p-4 py-10">
            <div className="w-full max-w-lg rounded-3xl bg-white overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-black/10 bg-zinc-950 text-white">
                <div className="font-display uppercase text-sm">Plan {checkout.plan}</div>
                <button onClick={() => setCheckout(null)}><X size={16} /></button>
              </div>
              <BizPlanEmbeddedCheckout
                businessId={checkout.businessId}
                plan={checkout.plan}
                returnUrl={`${window.location.origin}/app/biz?checkout=success`}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CreateBusinessSheet({ open, onClose, brand, setBrand, busy, onCreate }: {
  open: boolean; onClose: () => void; brand: string; setBrand: (v: string) => void; busy: boolean; onCreate: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-3xl bg-zinc-950 border border-white/10 p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-display uppercase text-lg">Business nou</h3>
          <button onClick={onClose}><X size={16} /></button>
        </div>
        <input autoFocus value={brand} onChange={(e) => setBrand(e.target.value)}
          placeholder="Ex: Club Form"
          className="w-full bg-white/5 rounded-md px-3 py-2.5 text-sm border border-white/10 focus:border-neon-crimson outline-none" />
        <button disabled={busy || !brand.trim()} onClick={onCreate}
          className="w-full px-3 py-2.5 rounded-md text-white text-xs font-display uppercase tracking-widest disabled:opacity-50"
          style={{ background: "var(--gradient-chaos)" }}>
          {busy ? <Loader2 size={14} className="inline animate-spin" /> : "Creează"}
        </button>
      </div>
    </div>
  );
}

function CampaignManager({ businessId, plan, onOpenCreate }: {
  businessId: string; plan: string; onOpenCreate: () => void;
}) {
  const qc = useQueryClient();
  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["biz-campaigns", businessId],
    queryFn: () => loadCampaigns(businessId),
  });
  const { data: usedThisMonth = 0 } = useQuery({
    queryKey: ["biz-campaigns-month-count", businessId],
    queryFn: () => countCampaignsThisMonth(businessId),
  });

  const quota = MONTHLY_POST_QUOTA[plan] ?? 4;
  const remaining = Math.max(0, quota - usedThisMonth);
  const atLimit = remaining === 0;

  const setStatus = async (id: string, status: "active" | "paused") => {
    const { error } = await supabase.from("campaigns").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(status === "active" ? "Postare activă" : "Postare pe pauză");
    qc.invalidateQueries({ queryKey: ["biz-campaigns", businessId] });
  };

  const del = async (id: string) => {
    if (!confirm("Ștergi postarea sponsorizată? Acțiune ireversibilă.")) return;
    const { error } = await supabase.from("campaigns").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Postare ștearsă");
    qc.invalidateQueries({ queryKey: ["biz-campaigns", businessId] });
    qc.invalidateQueries({ queryKey: ["biz-campaigns-month-count", businessId] });
  };

  return (
    <div className="space-y-4">
      {/* Quota strip */}
      <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-display uppercase text-base">Postări sponsorizate</div>
            <div className="text-[11px] text-zinc-500 mt-0.5">
              {usedThisMonth} din {quota} folosite luna asta · plan <span className="text-emerald-400 uppercase">{plan}</span>
            </div>
          </div>
          <button
            onClick={onOpenCreate}
            disabled={atLimit}
            className="inline-flex items-center gap-1.5 font-display uppercase text-[11px] tracking-widest px-4 py-2.5 rounded-2xl text-white disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "var(--gradient-chaos)" }}
          >
            <Plus size={12} /> Postare nouă
          </button>
        </div>
        <div className="mt-3 h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-sunset-magenta to-sunset-amber transition-all"
            style={{ width: `${Math.min(100, (usedThisMonth / quota) * 100)}%` }} />
        </div>
        {atLimit && (
          <p className="mt-2 text-[11px] text-amber-400">
            Ai atins limita lunară. Schimbă planul pentru mai multe postări sau așteaptă luna următoare.
          </p>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="h-24 rounded-xl bg-zinc-900/30 border border-white/5 animate-pulse" />
      ) : !campaigns || campaigns.length === 0 ? (
        <div className="rounded-2xl bg-zinc-900/30 border border-dashed border-white/10 p-8 text-center space-y-2">
          <Megaphone size={28} className="mx-auto text-zinc-600" />
          <p className="text-sm text-zinc-400">Nu ai nicio postare sponsorizată încă.</p>
          <p className="text-xs text-zinc-600">Apasă „Postare nouă" și apare în feed cu eticheta „sponsorizat".</p>
        </div>
      ) : (
        <div className="space-y-2">
          {campaigns.map((c: any) => (
            <div key={c.id} className="rounded-2xl border border-white/10 bg-zinc-900/40 p-3 flex items-center gap-3">
              {c.image_urls?.[0] ? (
                <img src={c.image_urls[0]} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center text-zinc-600">
                  <Megaphone size={18} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-display text-sm truncate">{c.title}</span>
                  <span className={`font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded ${
                    c.status === "active" ? "bg-emerald-500/20 text-emerald-400" :
                    c.status === "paused" ? "bg-amber-500/20 text-amber-400" :
                    "bg-white/10 text-zinc-400"
                  }`}>{c.status}</span>
                </div>
                {c.subtitle && <div className="text-[11px] text-zinc-400 truncate">{c.subtitle}</div>}
                <div className="font-mono text-[10px] text-zinc-500 flex items-center gap-3 mt-1 flex-wrap">
                  <span className="flex items-center gap-1"><Eye size={10} /> {c.impressions} afișări</span>
                  <span className="flex items-center gap-1"><MousePointerClick size={10} /> {c.clicks} click-uri</span>
                  <span className="flex items-center gap-1 text-sunset-orange">♥ {c.likes ?? 0} aprecieri</span>
                </div>
              </div>
              {c.status === "active" ? (
                <button onClick={() => setStatus(c.id, "paused")} title="Pauză" className="p-2 rounded-lg border border-white/10 hover:bg-white/5">
                  <Pause size={13} />
                </button>
              ) : (
                <button onClick={() => setStatus(c.id, "active")} title="Activează" className="p-2 rounded-lg border border-white/10 hover:bg-white/5">
                  <Play size={13} />
                </button>
              )}
              <button onClick={() => del(c.id)} title="Șterge" className="p-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CampaignCreateModal({ businessId, plan, onClose, onCreated }: {
  businessId: string; plan: string; onClose: () => void; onCreated: () => void;
}) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [body, setBody] = useState("");
  const [mediaKind, setMediaKind] = useState<"image" | "video">("image");
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [eventAt, setEventAt] = useState(""); // datetime-local
  const [ctaUrl, setCtaUrl] = useState("");
  const [ctaText, setCtaText] = useState("Vezi detalii");
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File, kind: "image" | "video") => {
    if (!user?.id) return toast.error("Trebuie să fii autentificat");
    const maxMb = kind === "video" ? 50 : 10;
    if (file.size > maxMb * 1024 * 1024) return toast.error(`Fișier prea mare (max ${maxMb}MB)`);
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || (kind === "video" ? "mp4" : "jpg");
      const path = `${user.id}/campaigns/${businessId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("venue-photos").upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("venue-photos").getPublicUrl(path);
      if (kind === "image") setImageUrl(pub.publicUrl); else setVideoUrl(pub.publicUrl);
      toast.success("Încărcat");
    } catch (e: any) {
      toast.error(e?.message || "Eroare la încărcare");
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!title.trim()) return toast.error("Adaugă un titlu pentru postare");
    if (mediaKind === "image" && !imageUrl.trim()) return toast.error("Adaugă o imagine sau alege video");
    if (mediaKind === "video" && !videoUrl.trim()) return toast.error("Adaugă un video sau alege imagine");
    const used = await countCampaignsThisMonth(businessId);
    const quota = MONTHLY_POST_QUOTA[plan] ?? 4;
    if (used >= quota) {
      toast.error(`Ai atins limita de ${quota} postări pe lună pentru planul ${plan}.`);
      return;
    }
    setBusy(true);
    const eventIso = eventAt ? new Date(eventAt).toISOString() : null;
    const now = new Date();
    const endsAt = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000); // max 2 zile activ
    const { error } = await supabase.from("campaigns").insert({
      business_id: businessId,
      title: title.trim(),
      subtitle: subtitle.trim() || null,
      body: body.trim() || null,
      kind: "boost_feed",
      status: "active",
      bid_cents: 0,
      budget_cents: 0,
      cta_text: ctaText.trim() || "Vezi detalii",
      cta_url: ctaUrl.trim() || null,
      image_urls: mediaKind === "image" && imageUrl.trim() ? [imageUrl.trim()] : [],
      video_url: mediaKind === "video" && videoUrl.trim() ? videoUrl.trim() : null,
      event_starts_at: eventIso,
      starts_at: now.toISOString(),
      ends_at: endsAt.toISOString(),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Postare sponsorizată publicată în feed");
    qc.invalidateQueries({ queryKey: ["biz-campaigns-month-count", businessId] });
    onCreated();
  };

  const inputClass = "w-full bg-white/5 rounded-xl px-3 py-3 text-sm border border-white/10 focus:border-neon-crimson outline-none";

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div className="min-h-full flex items-end sm:items-center justify-center sm:p-4">
        <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-zinc-950 border border-white/10 overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 sticky top-0 bg-zinc-950 z-10">
            <div>
              <h3 className="font-display uppercase text-base">Postare nouă</h3>
              <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mt-0.5">apare în feed ca „sponsorizat" · poate fi like-uită</p>
            </div>
            <button onClick={onClose} className="p-1.5 -mr-1.5 rounded-lg hover:bg-white/5"><X size={18} /></button>
          </div>
          <div className="p-5 space-y-3 max-h-[80vh] overflow-y-auto">
            <Field label="Titlu">
              <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Vineri DJ Set @ Club Form"
                className={inputClass} maxLength={80} />
            </Field>
            <Field label="Subtitlu (opțional)">
              <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Doar pentru cei tari"
                className={inputClass} maxLength={80} />
            </Field>
            <Field label="Detalii / amănunte (opțional)">
              <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Linia 1 line-up, ora ușilor, regulile casei, ce să porți..."
                className={inputClass + " min-h-[100px] resize-y"} maxLength={800} />
            </Field>

            <Field label="Tip media">
              <div className="grid grid-cols-2 gap-2">
                {(["image", "video"] as const).map((k) => (
                  <button key={k} type="button" onClick={() => setMediaKind(k)}
                    className={`px-3 py-2.5 rounded-xl text-[11px] font-mono uppercase tracking-widest border ${
                      mediaKind === k ? "border-neon-crimson bg-neon-crimson/10 text-white" : "border-white/10 text-zinc-400"
                    }`}>
                    {k === "image" ? "📷 Imagine" : "🎬 Video"}
                  </button>
                ))}
              </div>
            </Field>

            {mediaKind === "image" ? (
              <Field label="Imagine">
                {imageUrl ? (
                  <div className="relative rounded-xl overflow-hidden border border-white/10">
                    <img src={imageUrl} alt="preview" className="w-full max-h-64 object-cover" />
                    <button type="button" onClick={() => setImageUrl("")}
                      className="absolute top-2 right-2 bg-black/70 rounded-full p-1.5"><X size={14} /></button>
                  </div>
                ) : (
                  <label className={`flex flex-col items-center justify-center gap-2 cursor-pointer ${inputClass} py-8 border-dashed text-zinc-400 hover:text-white hover:border-neon-crimson/50`}>
                    {uploading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                    <span className="text-[11px] font-mono uppercase tracking-widest">{uploading ? "se încarcă..." : "alege imagine (max 10MB)"}</span>
                    <input type="file" accept="image/*" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f, "image"); e.target.value = ""; }} />
                  </label>
                )}
              </Field>
            ) : (
              <Field label="Video">
                {videoUrl ? (
                  <div className="relative rounded-xl overflow-hidden border border-white/10">
                    <video src={videoUrl} className="w-full max-h-64 object-cover" controls muted />
                    <button type="button" onClick={() => setVideoUrl("")}
                      className="absolute top-2 right-2 bg-black/70 rounded-full p-1.5"><X size={14} /></button>
                  </div>
                ) : (
                  <label className={`flex flex-col items-center justify-center gap-2 cursor-pointer ${inputClass} py-8 border-dashed text-zinc-400 hover:text-white hover:border-neon-crimson/50`}>
                    {uploading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                    <span className="text-[11px] font-mono uppercase tracking-widest">{uploading ? "se încarcă..." : "alege video (max 50MB)"}</span>
                    <input type="file" accept="video/*" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f, "video"); e.target.value = ""; }} />
                  </label>
                )}
              </Field>
            )}

            <Field label="Data și ora evenimentului (opțional)">
              <input type="datetime-local" value={eventAt} onChange={(e) => setEventAt(e.target.value)}
                className={inputClass} />
            </Field>

            <Field label="Instagram (opțional)">
              <div className="flex items-center gap-2">
                <span className="text-zinc-500 text-sm font-mono">@</span>
                <input
                  value={ctaUrl.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@/, "").replace(/\/$/, "")}
                  onChange={(e) => {
                    const u = e.target.value.trim().replace(/^@/, "");
                    setCtaUrl(u ? `https://instagram.com/${u}` : "");
                    if (u) setCtaText("Instagram");
                  }}
                  placeholder="username"
                  className={inputClass}
                />
              </div>
            </Field>
            {ctaUrl.trim() && (
              <Field label="Text buton">
                <input value={ctaText} onChange={(e) => setCtaText(e.target.value)} placeholder="Vezi detalii"
                  className={inputClass} maxLength={15} />
              </Field>
            )}

            <button disabled={busy} onClick={submit}
              className="w-full mt-2 px-3 py-3.5 rounded-2xl text-white text-xs font-display uppercase tracking-widest disabled:opacity-50"
              style={{ background: "var(--gradient-chaos)" }}>
              {busy ? <Loader2 size={14} className="inline animate-spin" /> : "Publică în feed"}
            </button>
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-600 text-center pt-1">
              Plan {plan} · {MONTHLY_POST_QUOTA[plan] ?? 4} postări incluse pe lună
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">{label}</span>
      {children}
    </label>
  );
}


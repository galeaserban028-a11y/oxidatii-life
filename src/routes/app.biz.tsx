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
    .from("business_accounts").select("id, brand_name, type, pro_tier, pro_until")
    .eq("owner_user_id", userId).order("created_at", { ascending: false });
  return { businesses: businesses ?? [] };
}

async function loadCampaigns(businessId: string) {
  const { data } = await supabase
    .from("campaigns")
    .select("id, title, status, kind, bid_cents, budget_cents, spent_cents, impressions, clicks, starts_at, ends_at")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  return data ?? [];
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
              <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                Plan <span className="text-emerald-400">{activeBiz.pro_tier}</span>
                {activeBiz.pro_until && ` · până ${new Date(activeBiz.pro_until).toLocaleDateString("ro-RO")}`}
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

        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display uppercase text-xl">Campaniile tale</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Postări sponsorizate, promovare în feed, evenimente boost-uite.</p>
          </div>
          <button onClick={() => setCampaignOpen(true)}
            className="inline-flex items-center gap-1.5 font-display uppercase text-[11px] tracking-widest px-4 py-2.5 rounded-2xl text-white"
            style={{ background: "var(--gradient-chaos)" }}>
            <Plus size={12} /> Campanie nouă
          </button>
        </div>

        <CampaignList businessId={activeBiz.id} />

        {campaignOpen && (
          <CampaignCreateModal businessId={activeBiz.id} onClose={() => setCampaignOpen(false)} onCreated={() => {
            setCampaignOpen(false);
            qc.invalidateQueries({ queryKey: ["biz-campaigns", activeBiz.id] });
          }} />
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

function CampaignList({ businessId }: { businessId: string }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["biz-campaigns", businessId],
    queryFn: () => loadCampaigns(businessId),
  });

  const setStatus = async (id: string, status: "active" | "paused") => {
    const { error } = await supabase.from("campaigns").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(status === "active" ? "Campanie activată" : "Campanie pe pauză");
    qc.invalidateQueries({ queryKey: ["biz-campaigns", businessId] });
  };

  const del = async (id: string) => {
    if (!confirm("Șterg campania? Acțiune ireversibilă.")) return;
    const { error } = await supabase.from("campaigns").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Campanie ștearsă");
    qc.invalidateQueries({ queryKey: ["biz-campaigns", businessId] });
  };

  if (isLoading) return <div className="h-24 rounded-xl bg-zinc-900/30 border border-white/5 animate-pulse" />;
  if (!data || data.length === 0) {
    return (
      <div className="rounded-2xl bg-zinc-900/30 border border-dashed border-white/10 p-8 text-center space-y-2">
        <Megaphone size={28} className="mx-auto text-zinc-600" />
        <p className="text-sm text-zinc-400">Nu ai niciun campanie încă.</p>
        <p className="text-xs text-zinc-600">Apasă „Campanie nouă" ca să creezi prima ta postare sponsorizată.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {data.map((c: any) => (
        <div key={c.id} className="rounded-xl border border-white/10 bg-zinc-900/40 p-3 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-display text-sm truncate">{c.title}</span>
              <span className={`font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded ${
                c.status === "active" ? "bg-emerald-500/20 text-emerald-400" :
                c.status === "paused" ? "bg-amber-500/20 text-amber-400" :
                "bg-white/10 text-zinc-400"
              }`}>{c.status}</span>
              <span className="font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-white/5 text-zinc-400">{c.kind}</span>
            </div>
            <div className="font-mono text-[10px] text-zinc-500 mt-0.5">
              bid {(c.bid_cents / 100).toFixed(2)} · cheltuit {(c.spent_cents / 100).toFixed(2)} {c.budget_cents > 0 ? `/ ${(c.budget_cents / 100).toFixed(0)} RON` : "· fără cap"}
            </div>
            <div className="font-mono text-[10px] text-zinc-500 flex items-center gap-3 mt-0.5">
              <span className="flex items-center gap-1"><Eye size={10} /> {c.impressions}</span>
              <span className="flex items-center gap-1"><MousePointerClick size={10} /> {c.clicks}</span>
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
  );
}

function CampaignCreateModal({ businessId, onClose, onCreated }: {
  businessId: string; onClose: () => void; onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [kind, setKind] = useState<"boost_feed" | "boost_discover" | "boost_map">("boost_feed");
  const [bidRon, setBidRon] = useState("1.50");
  const [budgetRon, setBudgetRon] = useState("100");
  const [ctaText, setCtaText] = useState("Vezi detalii");
  const [ctaUrl, setCtaUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title.trim()) return toast.error("Titlul e obligatoriu");
    setBusy(true);
    const { error } = await supabase.from("campaigns").insert({
      business_id: businessId,
      title: title.trim(),
      subtitle: subtitle.trim() || null,
      kind,
      status: "active",
      bid_cents: Math.max(1, Math.round(parseFloat(bidRon || "1.5") * 100)),
      budget_cents: Math.max(0, Math.round(parseFloat(budgetRon || "0") * 100)),
      cta_text: ctaText.trim() || "Vezi detalii",
      cta_url: ctaUrl.trim() || null,
      image_urls: imageUrl.trim() ? [imageUrl.trim()] : [],
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Campanie creată și activă");
    onCreated();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div className="min-h-full flex items-start justify-center p-4 py-10">
        <div className="w-full max-w-lg rounded-3xl bg-zinc-950 border border-white/10 overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <h3 className="font-display uppercase text-lg">Campanie nouă</h3>
            <button onClick={onClose}><X size={16} /></button>
          </div>
          <div className="p-5 space-y-3">
            <Field label="Titlu">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Vineri DJ Set @ Club Form"
                className="w-full bg-white/5 rounded-md px-3 py-2.5 text-sm border border-white/10 focus:border-neon-crimson outline-none" />
            </Field>
            <Field label="Subtitlu (opțional)">
              <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Doar pentru cei tari"
                className="w-full bg-white/5 rounded-md px-3 py-2.5 text-sm border border-white/10 focus:border-neon-crimson outline-none" />
            </Field>
            <Field label="Tip campanie">
              <div className="grid grid-cols-3 gap-2">
                {(["boost_feed", "sponsored_party", "takeover"] as const).map((k) => (
                  <button key={k} type="button" onClick={() => setKind(k)}
                    className={`px-2 py-2 rounded-md text-[10px] font-mono uppercase tracking-widest border ${
                      kind === k ? "border-neon-crimson bg-neon-crimson/10 text-white" : "border-white/10 text-zinc-400 hover:text-white"
                    }`}>
                    {k.replace("_", " ")}
                  </button>
                ))}
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Bid (RON / 1000 afișări)">
                <input type="number" step="0.5" min="0.5" value={bidRon} onChange={(e) => setBidRon(e.target.value)}
                  className="w-full bg-white/5 rounded-md px-3 py-2.5 text-sm border border-white/10 focus:border-neon-crimson outline-none" />
              </Field>
              <Field label="Buget total (RON, 0 = fără cap)">
                <input type="number" step="10" min="0" value={budgetRon} onChange={(e) => setBudgetRon(e.target.value)}
                  className="w-full bg-white/5 rounded-md px-3 py-2.5 text-sm border border-white/10 focus:border-neon-crimson outline-none" />
              </Field>
            </div>
            <Field label="Text buton CTA">
              <input value={ctaText} onChange={(e) => setCtaText(e.target.value)}
                className="w-full bg-white/5 rounded-md px-3 py-2.5 text-sm border border-white/10 focus:border-neon-crimson outline-none" />
            </Field>
            <Field label="Link CTA (opțional)">
              <input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="https://..."
                className="w-full bg-white/5 rounded-md px-3 py-2.5 text-sm border border-white/10 focus:border-neon-crimson outline-none" />
            </Field>
            <Field label="URL imagine (opțional)">
              <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..."
                className="w-full bg-white/5 rounded-md px-3 py-2.5 text-sm border border-white/10 focus:border-neon-crimson outline-none" />
            </Field>
            <button disabled={busy} onClick={submit}
              className="w-full mt-2 px-3 py-3 rounded-2xl text-white text-xs font-display uppercase tracking-widest disabled:opacity-50"
              style={{ background: "var(--gradient-chaos)" }}>
              {busy ? <Loader2 size={14} className="inline animate-spin" /> : "Publică campanie"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">{label}</span>
      {children}
    </label>
  );
}

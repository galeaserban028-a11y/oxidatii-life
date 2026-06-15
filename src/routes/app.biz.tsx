import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Building2, Check, Crown, Sparkles, Zap, X, Plus, Loader2 } from "lucide-react";
import { BizPlanEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { cancelBizPlan, type BizPlan } from "@/utils/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";

export const Route = createFileRoute("/app/biz")({
  head: () => ({ meta: [{ title: "Abonamente Business · OXIDAȚII" }] }),
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
  {
    id: "basic",
    name: "Basic",
    priceRon: 500,
    icon: Sparkles,
    color: "#00D4FF",
    tagline: "Pentru localuri care vor să apară pe hartă",
    features: [
      "Profil business verificat",
      "Apariție în feed-ul orașului",
      "Evenimente nelimitate",
      "Statistici de bază",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceRon: 1000,
    icon: Zap,
    color: "#FF2D55",
    tagline: "Vizibilitate sporită + badge verificat",
    popular: true,
    features: [
      "Tot din Basic",
      "Badge verificat",
      "Prioritate în feed",
      "Statistici avansate",
      "Suport prioritar",
    ],
  },
  {
    id: "elite",
    name: "Elite",
    priceRon: 2500,
    icon: Crown,
    color: "#FFD700",
    tagline: "Top featured. Cel mai vizibil din oraș.",
    features: [
      "Tot din Pro",
      "Featured tonight",
      "Top în hartă & feed",
      "Slot exclusiv în oraș",
      "Account manager dedicat",
    ],
  },
];

async function loadBiz(userId: string) {
  const { data: businesses } = await supabase
    .from("business_accounts").select("id, brand_name, type, pro_tier, pro_until")
    .eq("owner_user_id", userId).order("created_at", { ascending: false });
  return { businesses: businesses ?? [] };
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

  if (!user) return <div className="px-4 pt-10 text-center text-sm text-muted-foreground">Conectează-te pentru a accesa abonamentele business.</div>;

  const createBusiness = async () => {
    if (!brand.trim()) return;
    setBusy(true);
    const slug = brand.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const { error } = await supabase.from("business_accounts").insert({
      owner_user_id: user.id, brand_name: brand.trim(), slug: slug || null, type: "promoter",
    });
    setBusy(false);
    if (error) return alert(error.message);
    setBrand(""); setCreateOpen(false);
    qc.invalidateQueries({ queryKey: ["biz-plans"] });
  };

  const cancel = async (businessId: string) => {
    if (!confirm("Anulezi abonamentul la sfârșitul perioadei curente?")) return;
    const res = await cancelBizPlan({ data: { businessId, environment: getStripeEnvironment() } });
    if ("error" in res) return alert(res.error);
    alert("Abonament anulat. Rămâne activ până la finalul perioadei.");
    qc.invalidateQueries({ queryKey: ["biz-plans"] });
  };

  const businesses = data?.businesses ?? [];
  const activeBiz = businesses[0];

  return (
    <div className="max-w-5xl mx-auto px-4 pt-6 pb-24 space-y-8">
      <header className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono uppercase tracking-widest text-zinc-400">
          <Building2 size={11} /> Business
        </div>
        <h1 className="font-display uppercase text-3xl md:text-4xl tracking-tight">Alege abonamentul</h1>
        <p className="text-sm text-zinc-400 max-w-md mx-auto">
          Plată lunară. Anulezi oricând. Plățile sunt în mediul de test (Stripe sandbox).
        </p>
      </header>

      {isLoading ? (
        <div className="h-24 rounded-2xl bg-zinc-900/30 border border-white/5 animate-pulse" />
      ) : businesses.length === 0 ? (
        <div className="rounded-2xl bg-zinc-900/40 border border-white/10 p-8 text-center space-y-3">
          <div className="text-4xl">🏢</div>
          <div className="font-display uppercase">Niciun business înregistrat</div>
          <p className="text-xs text-zinc-400">Creează-ți brandul pentru a abona.</p>
          <button onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 font-display uppercase text-[11px] tracking-widest px-4 py-2 rounded-2xl text-white"
            style={{ background: "var(--gradient-chaos)" }}>
            <Plus size={12} /> Creează business
          </button>
        </div>
      ) : (
        <div className="rounded-2xl bg-zinc-900/40 border border-white/10 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-sunset-magenta to-sunset-amber flex items-center justify-center">
              <Building2 size={18} className="text-white" />
            </div>
            <div>
              <div className="font-display uppercase text-sm">{activeBiz.brand_name}</div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                {activeBiz.pro_tier ? (
                  <>Plan <span className="text-emerald-400">{activeBiz.pro_tier}</span>
                    {activeBiz.pro_until && ` · până ${new Date(activeBiz.pro_until).toLocaleDateString("ro-RO")}`}</>
                ) : (
                  <>Fără abonament activ</>
                )}
              </div>
            </div>
          </div>
          {activeBiz.pro_tier && (
            <button onClick={() => cancel(activeBiz.id)}
              className="text-[10px] font-mono uppercase tracking-widest px-3 py-1.5 rounded-md border border-white/10 hover:border-red-500/40 hover:text-red-400 text-zinc-400">
              Anulează abonamentul
            </button>
          )}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          const isCurrent = activeBiz?.pro_tier === plan.id;
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
                disabled={!activeBiz || isCurrent}
                onClick={() => activeBiz && setCheckout({ businessId: activeBiz.id, plan: plan.id })}
                className="w-full font-display uppercase text-[11px] tracking-widest py-3 rounded-2xl text-white disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: isCurrent ? "#16a34a" : plan.color }}>
                {isCurrent ? "Plan activ" : !activeBiz ? "Creează business" : `Abonează-te ${plan.priceRon} RON`}
              </button>
            </div>
          );
        })}
      </div>

      <p className="text-center text-[10px] font-mono uppercase tracking-widest text-zinc-600">
        Plăți securizate prin Stripe · Mediu de test · Card: 4242 4242 4242 4242
      </p>

      {/* Create business sheet */}
      {createOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center p-4" onClick={() => setCreateOpen(false)}>
          <div className="w-full max-w-sm rounded-3xl bg-zinc-950 border border-white/10 p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-display uppercase text-lg">Business nou</h3>
              <button onClick={() => setCreateOpen(false)}><X size={16} /></button>
            </div>
            <input autoFocus value={brand} onChange={(e) => setBrand(e.target.value)}
              placeholder="Ex: Club Form"
              className="w-full bg-white/5 rounded-md px-3 py-2.5 text-sm border border-white/10 focus:border-neon-crimson outline-none" />
            <button disabled={busy || !brand.trim()} onClick={createBusiness}
              className="w-full px-3 py-2.5 rounded-md text-white text-xs font-display uppercase tracking-widest disabled:opacity-50"
              style={{ background: "var(--gradient-chaos)" }}>
              {busy ? <Loader2 size={14} className="inline animate-spin" /> : "Creează"}
            </button>
          </div>
        </div>
      )}

      {/* Checkout modal */}
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

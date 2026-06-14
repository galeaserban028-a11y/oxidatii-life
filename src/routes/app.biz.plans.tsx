import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { TIER_ORDER, TIERS, tierConfig, type BusinessTier } from "@/lib/biz/tiers";
import { TierCard } from "@/components/biz/TierCard";
import { TierBadge } from "@/components/biz/TierBadge";
import { ArrowLeft, Sparkles, ShieldCheck, Zap, Crown } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/app/biz/plans")({
  head: () => ({ meta: [{ title: "Planuri Business · OXIDAȚII" }] }),
  component: PlansPage,
});

function PlansPage() {
  const { user } = useAuth();
  const [busyTier, setBusyTier] = useState<BusinessTier | null>(null);

  const { data: biz, refetch } = useQuery({
    queryKey: ["my-biz", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("business_accounts")
        .select("id, brand_name, tier, monthly_price_cents, tier_renews_at, city_id, is_exclusive_slot")
        .eq("owner_user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  async function selectTier(tier: BusinessTier) {
    if (!biz?.id) {
      toast.error("Mai întâi creează un profil de business.");
      return;
    }
    setBusyTier(tier);
    try {
      const cfg = TIERS[tier];
      const { error } = await supabase
        .from("business_accounts")
        .update({
          tier,
          monthly_price_cents: cfg.priceRonPerMonth * 100,
          tier_started_at: new Date().toISOString(),
          tier_renews_at: new Date(Date.now() + 30 * 86400_000).toISOString(),
        })
        .eq("id", biz.id);
      if (error) throw error;
      toast.success(`Plan activat: ${cfg.name}. Plata se face din wallet la următoarea înnoire.`);
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Eroare la activare plan");
    } finally {
      setBusyTier(null);
    }
  }

  const current = (biz?.tier ?? "starter") as BusinessTier;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <Link to="/app/biz" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Înapoi la dashboard
        </Link>

        <header className="mt-4 max-w-3xl">
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--tier-elite)]/15 px-3 py-1 text-xs font-bold uppercase tracking-widest text-[var(--tier-elite)]">
            <Sparkles className="size-3.5" /> Sistem premium de promovare
          </span>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
            Plătești pentru <span className="text-[var(--tier-elite)]">vizibilitate</span>,
            nu pentru impresii goale.
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            4 planuri. Fiecare locul lui în feed, pe hartă și în search.
            Anulezi sau urci treaptă oricând. Fără contract.
          </p>
          {biz && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-border/50 bg-card/60 px-3 py-2">
              <span className="text-xs text-muted-foreground">Plan curent pentru</span>
              <strong className="text-sm">{biz.brand_name}</strong>
              <TierBadge tier={current} size="xs" />
            </div>
          )}
        </header>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {TIER_ORDER.map((id) => (
            <TierCard
              key={id}
              tier={TIERS[id]}
              current={id === current}
              highlight={id === "elite"}
              busy={busyTier === id}
              onSelect={() => selectTier(id)}
            />
          ))}
        </div>

        <section className="mt-12 grid gap-4 sm:grid-cols-3">
          <Trust
            icon={<ShieldCheck className="size-5" />}
            title="Fair ranking"
            body="Rating-ul utilizatorilor și activitatea reală cântăresc 55% în algoritm. Bani nu îți cumpără locul 1 dacă nu meriți."
          />
          <Trust
            icon={<Zap className="size-5" />}
            title="ROI vizibil"
            body="Dashboardul îți arată conversiile reale: clicks → check-ins → offer redemptions. Nu impresii fictive."
          />
          <Trust
            icon={<Crown className="size-5" />}
            title="Exclusivitate reală"
            body="Doar 3 sloturi Exclusive Partner per oraș. Când sunt ocupate, restul așteaptă pe waitlist publică."
          />
        </section>

        <section className="mt-10 rounded-3xl border border-border/40 bg-card/40 p-6">
          <h2 className="text-lg font-bold">Algoritm de ranking</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Scorul fiecărui venue se calculează din 5 componente. Tier-ul nu poate compensa rating slab.
          </p>
          <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <li>• <strong>Promovare (×tier)</strong> — 30%</li>
            <li>• <strong>Rating utilizatori</strong> — 20% (min 20 review-uri)</li>
            <li>• <strong>Popularitate 7 zile</strong> — 20%</li>
            <li>• <strong>Activitate evenimente</strong> — 15%</li>
            <li>• <strong>Distanță față de user</strong> — 15%</li>
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            ⚠ Venue-urile cu rating sub 3.5 sau cu peste 3 reports active într-o săptămână nu pot intra în
            Featured Tonight, indiferent de plan.
          </p>
        </section>

        {current === "exclusive" && (
          <div className="mt-8 rounded-3xl border-2 border-[var(--tier-exclusive)]/50 bg-[var(--tier-exclusive)]/10 p-6">
            <h3 className="text-lg font-black text-[var(--tier-exclusive)]">👑 Ai Exclusive Partner</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Revendică-ți slotul de oraș pentru a bloca poziția timp de 30 de zile.
            </p>
            <Link
              to="/app/biz/exclusive"
              className="mt-3 inline-flex rounded-2xl bg-[var(--tier-exclusive)] px-4 py-2 text-sm font-bold uppercase tracking-wider"
              style={{ color: "oklch(0.15 0.02 30)" }}
            >
              Vezi sloturi disponibile
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function Trust({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border/40 bg-card/40 p-4">
      <div className="flex items-center gap-2 text-[var(--tier-elite)]">{icon}<strong className="text-sm">{title}</strong></div>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

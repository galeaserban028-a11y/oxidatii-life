import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Coins, Settings } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { PremiumBadge, type PremiumTier } from "@/components/app/PremiumBadge";
import { PremiumCheckoutDialog } from "@/components/PremiumCheckoutDialog";
import { createPremiumPortalSession } from "@/lib/premium.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { toast } from "sonner";
import { motion } from "framer-motion";

export const Route = createFileRoute("/app/premium")({
  head: () => ({ meta: [{ title: "Șpriț Premium · OXIDAȚII" }] }),
  component: PremiumPage,
});

type Tier = {
  id: Exclude<PremiumTier, null | undefined>;
  name: string;
  price: number;
  coins: number;
  tagline: string;
  perks: string[];
  accent: string; // tailwind color class
  badge?: string;
};

const TIERS: Tier[] = [
  {
    id: "vip", name: "VIP", price: 2.99, coins: 50,
    tagline: "Intri în club. Badge auriu, fără reclame.",
    accent: "text-amber-300",
    perks: ["Badge VIP auriu", "50 coins / lună", "Reacții exclusive în chat", "Zero reclame"],
  },
  {
    id: "vip_plus", name: "VIP+", price: 4.99, coins: 150,
    tagline: "Frame animat, vezi cine te urmărește.",
    accent: "text-fuchsia-300",
    badge: "Cel mai luat",
    perks: ["Tot din VIP", "Frame animat pe avatar", "5 teme exclusive de profil", "150 coins / lună", "Vezi cine ți-a dat rating"],
  },
  {
    id: "pro", name: "PRO", price: 9.99, coins: 500,
    tagline: "Boost săptămânal. Analytics complet.",
    accent: "text-violet-300",
    perks: ["Tot din VIP+", "1× Profile Boost / săptămână", "Reputation Analytics", "Music clip 15s pe profil", "500 coins / lună", "Animated background"],
  },
  {
    id: "elite", name: "ELITE", price: 14.99, coins: 1500,
    tagline: "100 de locuri. Diamond holografic.",
    accent: "text-cyan-200",
    badge: "100 locuri",
    perks: ["Tot din PRO", "Diamond badge holografic", "Featured pe Discover", "Founder recognition", "Cadou aniversar fizic", "1500 coins / lună", "Acces beta features"],
  },
];

const COIN_PACKS = [
  { id: "coins_mic", coins: 50, price: 4.99, label: "Mic" },
  { id: "coins_mediu", coins: 200, price: 14.99, label: "Mediu", bonus: "+10%" },
  { id: "coins_mare", coins: 600, price: 39.99, label: "Mare", bonus: "+20%", popular: true },
  { id: "coins_boss", coins: 1500, price: 89.99, label: "Boss", bonus: "+35%" },
  { id: "coins_legenda", coins: 5000, price: 249, label: "Legenda", bonus: "+50%" },
];

function PremiumPage() {
  const { profile } = useAuth();
  const [annual, setAnnual] = useState(false);
  const [checkout, setCheckout] = useState<{ priceId: string; title: string } | null>(null);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [openTier, setOpenTier] = useState<string | null>("vip_plus");
  const currentTier = (profile as any)?.premium_tier as PremiumTier;

  const handleBuy = (tier: Tier) => {
    setCheckout({ priceId: `${tier.id}_${annual ? "yearly" : "monthly"}`, title: `${tier.name} ${annual ? "anual" : "lunar"}` });
  };
  const handleCoins = (pack: typeof COIN_PACKS[0]) => {
    setCheckout({ priceId: pack.id, title: `${pack.coins} coins · ${pack.label}` });
  };
  const handleManage = async () => {
    setOpeningPortal(true);
    try {
      const result = await createPremiumPortalSession({
        data: { returnUrl: `${window.location.origin}/app/premium`, environment: getStripeEnvironment() },
      });
      if ("error" in result) throw new Error(result.error);
      window.open(result.url, "_blank");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nu pot deschide portalul");
    } finally {
      setOpeningPortal(false);
    }
  };

  return (
    <div className="pb-24">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-xl border-b border-foreground/10 px-3 h-12 flex items-center gap-2">
        <Link to="/app/me" className="p-1.5 -ml-1.5 active:scale-95 transition" aria-label="Înapoi">
          <ArrowLeft size={22} strokeWidth={2.2} />
        </Link>
        <div className="font-mono uppercase text-[11px] tracking-[0.25em] text-muted-foreground">Premium</div>
        {currentTier && <div className="ml-auto"><PremiumBadge tier={currentTier} size="sm" asLink={false} /></div>}
      </header>

      {/* Editorial hero */}
      <section className="px-5 pt-8 pb-6 border-b border-foreground/10 relative overflow-hidden">
        <div
          className="absolute -top-20 -right-16 w-72 h-72 rounded-full pointer-events-none blur-3xl opacity-50"
          style={{ background: "radial-gradient(circle, oklch(0.72 0.22 40 / 60%), transparent 70%)" }}
        />
        <div className="relative">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            <span className="h-px w-6 bg-foreground/40" />
            <span>nr. 01 — abonamente</span>
          </div>
          <h1 className="font-display uppercase text-[clamp(2.6rem,11vw,4.2rem)] leading-[0.85] tracking-[-0.04em] mt-3">
            Plătești <span className="italic font-light">puțin.</span><br />
            Arăți <span className="text-sunset-orange">mult.</span>
          </h1>
          <p className="text-[14px] text-muted-foreground mt-4 max-w-sm leading-snug">
            Patru trepte. Niciuna nu-ți cumpără locul în top — doar stilul, vizibilitatea și câteva monede de aruncat pe masă.
          </p>

          <div className="mt-5 inline-flex items-center gap-0 rounded-full border border-foreground/15 p-[3px] text-[11px] font-mono uppercase tracking-wider">
            <button
              onClick={() => setAnnual(false)}
              className={`px-4 py-1.5 rounded-full transition ${!annual ? "bg-foreground text-background" : "text-muted-foreground"}`}
            >Lunar</button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-4 py-1.5 rounded-full transition flex items-center gap-1.5 ${annual ? "bg-foreground text-background" : "text-muted-foreground"}`}
            >
              Anual <span className={`text-[9px] px-1.5 py-[1px] rounded-full ${annual ? "bg-background/20" : "bg-neon-green/20 text-neon-green"}`}>−17%</span>
            </button>
          </div>
        </div>
      </section>

      {/* Tier "tickets" — editorial list, expandable */}
      <section className="px-3 pt-3">
        {TIERS.map((tier, idx) => {
          const isCurrent = currentTier === tier.id;
          const isOpen = openTier === tier.id;
          const price = annual ? (tier.price * 10).toFixed(2) : tier.price.toFixed(2);
          return (
            <motion.div
              key={tier.id}
              layout
              transition={{ layout: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } }}
              className={`relative border-b border-foreground/10 ${idx === 0 ? "border-t" : ""}`}
            >
              <button
                onClick={() => setOpenTier(isOpen ? null : tier.id)}
                className="w-full text-left px-2 py-4 flex items-center gap-3 active:bg-foreground/5 transition"
              >
                <div className={`font-mono text-[10px] tabular-nums ${tier.accent} w-8 shrink-0`}>
                  0{idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-display uppercase text-xl tracking-tight ${tier.accent}`}>{tier.name}</span>
                    {tier.badge && (
                      <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-[2px] rounded-sm bg-foreground text-background">
                        {tier.badge}
                      </span>
                    )}
                    {isCurrent && (
                      <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-[2px] rounded-sm border border-neon-green text-neon-green">
                        activ
                      </span>
                    )}
                  </div>
                  <div className="text-[12px] text-muted-foreground mt-0.5 truncate">{tier.tagline}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-display text-xl leading-none tabular-nums">
                    {price}<span className="text-[10px] font-mono text-muted-foreground ml-0.5">lei</span>
                  </div>
                  <div className="text-[9px] font-mono uppercase text-muted-foreground/70 mt-0.5">{annual ? "/an" : "/lună"}</div>
                </div>
                <motion.div
                  animate={{ rotate: isOpen ? 45 : 0 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="text-muted-foreground"
                >
                  <Plus size={18} strokeWidth={2.2} />
                </motion.div>
              </button>

              <motion.div
                initial={false}
                animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                style={{ overflow: "hidden" }}
              >
                <div className="px-2 pb-4 pl-[44px]">
                  <ul className="space-y-1.5 mb-3">
                    {tier.perks.map((p) => (
                      <li key={p} className="flex items-baseline gap-2 text-[13px] text-foreground/85">
                        <span className={`font-mono text-[10px] ${tier.accent} shrink-0`}>—</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handleBuy(tier)}
                    disabled={isCurrent}
                    className={`w-full h-10 rounded-lg font-mono uppercase tracking-[0.15em] text-[12px] transition active:scale-[0.98] ${
                      isCurrent
                        ? "bg-foreground/10 text-muted-foreground cursor-not-allowed"
                        : "bg-foreground text-background hover:bg-foreground/90"
                    }`}
                  >
                    {isCurrent ? "ești deja aici" : `→ ia ${tier.name}`}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })}
      </section>

      {/* Coin counter — like a bar tab */}
      <section className="px-5 mt-10">
        <div className="flex items-end justify-between mb-1">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">nr. 02</div>
            <h2 className="font-display uppercase text-2xl leading-tight mt-1">Coins la bar</h2>
          </div>
          <Coins size={20} className="text-amber-300 mb-1" />
        </div>
        <p className="text-[12px] text-muted-foreground mb-4 max-w-xs">
          Boost-uri, cadouri, frames. O dată plătiți, îi folosești când vrei.
        </p>

        <div className="border-t border-foreground/15">
          {COIN_PACKS.map((p) => (
            <button
              key={p.id}
              onClick={() => handleCoins(p)}
              className="w-full flex items-baseline gap-3 py-3 border-b border-foreground/10 active:bg-foreground/5 transition text-left"
            >
              <div className="font-mono text-[10px] text-muted-foreground tabular-nums w-8">
                {String(COIN_PACKS.indexOf(p) + 1).padStart(2, "0")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display uppercase text-[15px] flex items-center gap-2">
                  {p.label}
                  {p.popular && (
                    <span className="text-[8px] font-mono uppercase tracking-wider px-1.5 py-[1px] rounded-sm bg-amber-300 text-black">
                      ales
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground font-mono tabular-nums">
                  {p.coins} coins{p.bonus && <span className="text-neon-green ml-1.5">{p.bonus}</span>}
                </div>
              </div>
              <div className="font-display text-lg tabular-nums">
                {p.price}<span className="text-[10px] font-mono text-muted-foreground ml-0.5">lei</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Manifesto strip */}
      <section className="mt-10 mx-3 rounded-xl border border-foreground/10 bg-card/40 p-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">manifest</div>
        <p className="font-display uppercase text-[18px] leading-tight">
          „Nu vindem locul <span className="italic font-light">întâi</span>. Vindem doar cum arăți când ajungi acolo.”
        </p>
        <div className="mt-3 grid grid-cols-3 gap-3 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          <div>· anulezi oricând</div>
          <div>· plată securizată</div>
          <div>· zero pay-to-win</div>
        </div>
      </section>

      {currentTier && (
        <div className="px-3 mt-4">
          <button
            onClick={handleManage}
            disabled={openingPortal}
            className="w-full flex items-center justify-center gap-2 h-11 rounded-lg border border-foreground/15 bg-card/40 font-mono uppercase text-[11px] tracking-[0.2em] disabled:opacity-50 active:scale-[0.99] transition"
          >
            <Settings size={14} />
            {openingPortal ? "Se deschide…" : "Gestionează abonament"}
          </button>
        </div>
      )}

      <PremiumCheckoutDialog
        priceId={checkout?.priceId ?? null}
        title={checkout?.title ?? ""}
        open={!!checkout}
        onClose={() => setCheckout(null)}
      />
    </div>
  );
}

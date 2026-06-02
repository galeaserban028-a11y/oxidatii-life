import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Check, Crown, Sparkles, Gem, Star, Coins, Zap, Eye, Palette, Heart, ShieldCheck, Settings } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { PremiumBadge, type PremiumTier } from "@/components/app/PremiumBadge";
import { PremiumCheckoutDialog } from "@/components/PremiumCheckoutDialog";
import { createPremiumPortalSession } from "@/lib/premium.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { toast } from "sonner";

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
  highlight?: boolean;
  badge?: string;
  gradient: string;
  ring: string;
  icon: typeof Star;
};

const TIERS: Tier[] = [
  {
    id: "vip", name: "VIP", price: 2.99, coins: 50, icon: Star,
    tagline: "Badge auriu + reacții speciale",
    gradient: "from-amber-300/20 to-amber-500/10", ring: "ring-amber-400/40",
    perks: ["Badge VIP auriu pe profil", "50 Șpriț Coins / lună", "Reacții exclusive în chat", "Fără reclame"],
  },
  {
    id: "vip_plus", name: "VIP+", price: 4.99, coins: 150, icon: Sparkles,
    tagline: "Frame animat + teme profil",
    badge: "POPULAR",
    gradient: "from-pink-400/25 to-fuchsia-500/15", ring: "ring-fuchsia-400/50",
    perks: ["Tot din VIP", "Frame animat pe avatar", "5 teme profil exclusive", "150 Șpriț Coins / lună", "Vezi cine ți-a dat rating"],
  },
  {
    id: "pro", name: "PRO", price: 9.99, coins: 500, icon: Crown,
    highlight: true, badge: "ALES DE 73%",
    tagline: "Profile boost + analytics",
    gradient: "from-violet-500/30 to-indigo-600/20", ring: "ring-violet-400/60",
    perks: ["Tot din VIP+", "1× Profile Boost / săptămână", "Reputation Analytics complet", "Music clip 15s pe profil", "500 Șpriț Coins / lună", "Animated background"],
  },
  {
    id: "elite", name: "ELITE", price: 14.99, coins: 1500, icon: Gem,
    badge: "DOAR 100 LOCURI",
    tagline: "Diamond badge holografic",
    gradient: "from-cyan-300/30 via-fuchsia-400/20 to-amber-300/30", ring: "ring-fuchsia-300/70",
    perks: ["Tot din PRO", "Diamond badge holografic", "Featured pe Discover", "Founder recognition", "Cadou aniversar fizic", "1500 Șpriț Coins / lună", "Acces beta features"],
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
  const currentTier = (profile as any)?.premium_tier as PremiumTier;

  const handleBuy = (tier: Tier) => {
    const priceId = `${tier.id}_${annual ? "yearly" : "monthly"}`;
    setCheckout({ priceId, title: `${tier.name} ${annual ? "anual" : "lunar"}` });
  };

  const handleCoins = (pack: typeof COIN_PACKS[0]) => {
    setCheckout({ priceId: pack.id, title: `${pack.coins} coins · ${pack.label}` });
  };

  const handleManage = async () => {
    setOpeningPortal(true);
    try {
      const result = await createPremiumPortalSession({
        data: {
          returnUrl: `${window.location.origin}/app/premium`,
          environment: getStripeEnvironment(),
        },
      });
      if ("error" in result) throw new Error(result.error);
      window.open(result.url, "_blank");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nu pot deschide portalul");
    } finally {
      setOpeningPortal(false);
    }
  };

  const handleBuy = (tier: Tier) => {
    toast.info(`Plățile se activează curând — ${tier.name} ${annual ? "anual" : "lunar"}`, {
      description: "Lucrăm la integrarea sistemului de plată. Vei fi notificat când e gata.",
    });
  };

  const handleCoins = (pack: typeof COIN_PACKS[0]) => {
    toast.info(`Pachet ${pack.label} — ${pack.coins} coins`, { description: "Plățile se activează curând." });
  };

  return (
    <div className="pb-24">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-xl border-b border-foreground/10 px-3 h-12 flex items-center gap-2">
        <Link to="/app/me" className="p-1.5 -ml-1.5 active:scale-95 transition" aria-label="Înapoi">
          <ArrowLeft size={22} strokeWidth={2.2} />
        </Link>
        <div className="font-display uppercase text-[15px]">Șpriț Premium</div>
        {currentTier && <div className="ml-auto"><PremiumBadge tier={currentTier} size="sm" asLink={false} /></div>}
      </header>

      {/* Hero */}
      <section className="px-4 pt-5 pb-3 text-center">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-cyan-300 via-fuchsia-400 to-amber-300 text-black mb-3 shadow-[0_0_30px_rgba(244,114,182,0.6)]">
          <Gem size={28} strokeWidth={2.4} />
        </div>
        <h1 className="font-display uppercase text-3xl leading-tight">
          Fă-ți profilul <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-pink-400 to-violet-500">legendar</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
          Badge, frame animat, teme, coins, boost — fără pay-to-win. Doar status și stil.
        </p>

        {/* Monthly/Annual toggle */}
        <div className="mt-5 inline-flex items-center gap-1 rounded-full bg-foreground/10 p-1 text-[12px] font-mono uppercase">
          <button
            onClick={() => setAnnual(false)}
            className={`px-4 py-1.5 rounded-full transition ${!annual ? "bg-background text-foreground shadow" : "text-muted-foreground"}`}
          >Lunar</button>
          <button
            onClick={() => setAnnual(true)}
            className={`px-4 py-1.5 rounded-full transition flex items-center gap-1.5 ${annual ? "bg-background text-foreground shadow" : "text-muted-foreground"}`}
          >
            Anual <span className="text-[9px] bg-neon-green/20 text-neon-green px-1.5 py-[1px] rounded-full">-17%</span>
          </button>
        </div>
      </section>

      {/* Tiers */}
      <section className="px-3 mt-2 space-y-3">
        {TIERS.map((tier) => {
          const Icon = tier.icon;
          const isCurrent = currentTier === tier.id;
          const price = annual ? (tier.price * 10).toFixed(2) : tier.price.toFixed(2);
          return (
            <div
              key={tier.id}
              className={`relative rounded-2xl border bg-gradient-to-br ${tier.gradient} backdrop-blur-sm p-4 ${
                tier.highlight ? `border-violet-400/50 ring-2 ${tier.ring} shadow-[0_0_30px_rgba(139,92,246,0.25)]` : "border-foreground/10"
              }`}
            >
              {tier.badge && (
                <div className="absolute -top-2 left-4 text-[9px] font-mono font-bold uppercase tracking-widest px-2 py-[3px] rounded-full bg-foreground text-background">
                  {tier.badge}
                </div>
              )}
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 shrink-0 rounded-xl bg-background/40 border border-foreground/10 flex items-center justify-center">
                  <Icon size={22} strokeWidth={2.3} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <div className="font-display uppercase text-xl">{tier.name}</div>
                    <PremiumBadge tier={tier.id} size="xs" asLink={false} />
                  </div>
                  <div className="text-[12px] text-muted-foreground">{tier.tagline}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-display text-2xl leading-none">{price}<span className="text-[11px] font-mono text-muted-foreground ml-0.5">lei</span></div>
                  <div className="text-[9px] font-mono uppercase text-muted-foreground mt-0.5">{annual ? "/an" : "/lună"}</div>
                </div>
              </div>

              <ul className="mt-3 space-y-1.5">
                {tier.perks.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-[13px]">
                    <Check size={14} className="mt-[3px] shrink-0 text-neon-green" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleBuy(tier)}
                disabled={isCurrent}
                className={`mt-3 w-full h-10 rounded-xl font-mono font-bold uppercase tracking-wider text-[13px] transition active:scale-[0.98] ${
                  isCurrent
                    ? "bg-foreground/10 text-muted-foreground cursor-not-allowed"
                    : tier.highlight
                    ? "bg-gradient-to-r from-violet-500 to-indigo-600 text-white shadow-[0_0_20px_rgba(139,92,246,0.5)]"
                    : "bg-foreground text-background"
                }`}
              >
                {isCurrent ? "Plan curent" : `Devino ${tier.name}`}
              </button>
            </div>
          );
        })}
      </section>

      {/* What you get */}
      <section className="px-4 mt-6">
        <div className="font-display uppercase text-sm text-muted-foreground mb-2">Ce primești</div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { i: Crown, t: "Status",    d: "Badge vizibil oriunde" },
            { i: Palette, t: "Stil",    d: "Teme & frames animate" },
            { i: Eye, t: "Vizibilitate", d: "Boost etic, fără #1" },
            { i: Heart, t: "Reacții",   d: "Sticker & emoji rare" },
            { i: Zap, t: "Coins",       d: "Lunar, în cont" },
            { i: ShieldCheck, t: "Fair", d: "Zero pay-to-win" },
          ].map(({ i: I, t, d }) => (
            <div key={t} className="rounded-xl border border-foreground/10 bg-card/50 p-3">
              <I size={16} className="text-neon-purple" />
              <div className="font-display uppercase text-[13px] mt-1">{t}</div>
              <div className="text-[11px] text-muted-foreground">{d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Coin store */}
      <section className="px-4 mt-6">
        <div className="flex items-center gap-2 mb-2">
          <Coins size={16} className="text-amber-400" />
          <div className="font-display uppercase text-sm">Magazin Șpriț Coins</div>
        </div>
        <p className="text-[11px] text-muted-foreground mb-3">Boost-uri, cadouri, frames, colecționabile. Cumperi o dată, folosești când vrei.</p>
        <div className="space-y-2">
          {COIN_PACKS.map((p) => (
            <button
              key={p.id}
              onClick={() => handleCoins(p)}
              className={`w-full flex items-center gap-3 rounded-xl border p-3 active:scale-[0.99] transition ${
                p.popular ? "border-amber-400/50 bg-amber-400/10 ring-2 ring-amber-400/30" : "border-foreground/10 bg-card/50"
              }`}
            >
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-amber-300 to-amber-500 text-black flex items-center justify-center">
                <Coins size={18} strokeWidth={2.5} />
              </div>
              <div className="flex-1 text-left">
                <div className="font-display uppercase text-sm flex items-center gap-1.5">
                  {p.label}
                  {p.popular && <span className="text-[8px] font-mono px-1.5 py-[1px] rounded-full bg-amber-400 text-black">POPULAR</span>}
                </div>
                <div className="text-[12px] text-muted-foreground font-mono">
                  {p.coins} coins {p.bonus && <span className="text-neon-green ml-1">{p.bonus} bonus</span>}
                </div>
              </div>
              <div className="text-right">
                <div className="font-display text-lg leading-none">{p.price}<span className="text-[10px] font-mono text-muted-foreground ml-0.5">lei</span></div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <p className="text-center text-[10px] font-mono text-muted-foreground/60 mt-6 px-6">
        Anulezi oricând · Fără reînnoiri ascunse · Plată securizată
      </p>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Settings, Check, Plus, Minus, Sparkles, Star } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useEntitlements, type PremiumTier } from "@/lib/entitlements";
import { PremiumBadge } from "@/components/app/PremiumBadge";
import { PremiumCheckoutDialog } from "@/components/PremiumCheckoutDialog";
import { ProfileBoostCard } from "@/components/app/ProfileBoostCard";
import { CrystalBallCard } from "@/components/app/CrystalBallCard";
import { createPremiumPortalSession, syncCheckoutToProfile } from "@/lib/premium.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { toast } from "sonner";

export const Route = createFileRoute("/app/premium")({
  head: () => ({ meta: [{ title: "Membership · OXIDAȚII" }] }),
  validateSearch: (
    search: Record<string, unknown>,
  ): { checkout?: string; session_id?: string } => ({
    checkout: typeof search.checkout === "string" ? search.checkout : undefined,
    session_id: typeof search.session_id === "string" ? search.session_id : undefined,
  }),
  component: PremiumPage,
});

type TierId = Exclude<PremiumTier, null | undefined>;
type Tier = {
  id: TierId;
  name: string;
  price: number;
  coins: number;
  blurb: string;
  perks: string[];
  badge?: string;
  accent: "muted" | "pink" | "cyan" | "gold";
};

const TIERS: Tier[] = [
  {
    id: "vip",
    name: "VIP",
    price: 2.99,
    coins: 5,
    accent: "muted",
    blurb: "Pentru cei care vor să arate că au gust. Fără paradă.",
    perks: ["Insignă VIP", "5 șprițuri pe lună", "Fără reclame"],
  },
  {
    id: "vip_plus",
    name: "VIP+",
    price: 4.99,
    coins: 15,
    accent: "pink",
    badge: "cel mai luat",
    blurb: "Profilul tău începe să fie observat. Frame animat, teme, vederi.",
    perks: [
      "Tot din VIP",
      "Frame animat pe avatar",
      "5 teme exclusive de profil",
      "15 șprițuri pe lună",
      "Vezi cine ți-a dat rating",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 9.99,
    coins: 40,
    accent: "cyan",
    blurb: "Pentru regulari. Boost săptămânal, analytics, music clip pe profil.",
    perks: [
      "Tot din VIP+",
      "1× Profile Boost / săptămână",
      "Reputation analytics complet",
      "Music clip 15s pe profil",
      "40 șprițuri pe lună",
    ],
  },
  {
    id: "elite",
    name: "Elite",
    price: 14.99,
    coins: 120,
    accent: "gold",
    badge: "100 locuri",
    blurb: "O sută de oameni pe an. Numele tău rămâne pe perete.",
    perks: ["Tot din Pro", "Diamond badge holografic", "Concierge privat", "120 șprițuri pe lună"],
  },
];

const COIN_PACKS = [
  { id: "coins_mic", coins: 5, price: 4.99, label: "Un rând" },
  { id: "coins_mediu", coins: 15, price: 12.99, label: "Pentru gașcă", bonus: "+10%" },
  { id: "coins_mare", coins: 40, price: 29.99, label: "Petrecere", bonus: "+20%", popular: true },
  { id: "coins_boss", coins: 100, price: 69.99, label: "Toată haita", bonus: "+35%" },
  { id: "coins_legenda", coins: 300, price: 179, label: "Legendă", bonus: "+50%" },
];

const FAQ = [
  {
    q: "Pot să anulez oricând?",
    a: "Da. Un singur click. Beneficiile rămân până la final de perioadă.",
  },
  {
    q: "Plătesc, intru pe locul 1?",
    a: "Nu. Nu vindem locuri în top. Niciodată. Doar cum arăți când ajungi acolo.",
  },
  {
    q: "Ce sunt șprițurile?",
    a: "Sunt pentru lucruri cosmetice — cadouri în chat, boost-uri scurte, rame. Nu cumperi influență.",
  },
  {
    q: "Cum funcționează plata?",
    a: "Plătești o dată, primești instant. Toate plățile sunt finale, fără returnări.",
  },
];

const ACCENT: Record<
  Tier["accent"],
  { label: string; dot: string; btn: string; border: string; glow: string; ribbon: string }
> = {
  muted: {
    label: "text-muted-foreground",
    dot: "bg-muted-foreground/60",
    btn: "bg-foreground text-background hover:bg-foreground/90",
    border: "border-border",
    glow: "",
    ribbon: "bg-secondary text-secondary-foreground",
  },
  pink: {
    label: "text-primary",
    dot: "bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.9)]",
    btn: "bg-primary text-primary-foreground hover:brightness-110 shadow-[0_8px_30px_-8px_hsl(var(--primary)/0.6)]",
    border: "border-primary/40",
    glow: "shadow-[0_10px_50px_-20px_hsl(var(--primary)/0.6)] bg-primary/[0.06]",
    ribbon: "bg-primary text-primary-foreground",
  },
  cyan: {
    label: "text-accent",
    dot: "bg-accent shadow-[0_0_10px_hsl(var(--accent)/0.9)]",
    btn: "bg-accent text-accent-foreground hover:brightness-110 shadow-[0_8px_30px_-8px_hsl(var(--accent)/0.6)]",
    border: "border-accent/40",
    glow: "shadow-[0_10px_50px_-20px_hsl(var(--accent)/0.6)] bg-accent/[0.06]",
    ribbon: "bg-accent text-accent-foreground",
  },
  gold: {
    label: "text-[color:var(--neon-yellow)]",
    dot: "bg-[color:var(--neon-yellow)] shadow-[0_0_10px_color-mix(in_oklab,var(--neon-yellow)_80%,transparent)]",
    btn: "bg-[color:var(--neon-yellow)] text-background hover:brightness-110 shadow-[0_8px_30px_-8px_color-mix(in_oklab,var(--neon-yellow)_60%,transparent)]",
    border: "border-[color:var(--neon-yellow)]/40",
    glow: "shadow-[0_10px_50px_-20px_color-mix(in_oklab,var(--neon-yellow)_50%,transparent)] bg-[color-mix(in_oklab,var(--neon-yellow)_6%,transparent)]",
    ribbon: "bg-[color:var(--neon-yellow)] text-background",
  },
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.25em]">
        {children}
      </h2>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function PremiumPage() {
  const { profile: _profile, refreshProfile } = useAuth();
  const ent = useEntitlements();
  const search = Route.useSearch();
  const [annual, setAnnual] = useState(false);
  const [checkout, setCheckout] = useState<{ priceId: string; title: string } | null>(null);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [syncingCheckout, setSyncingCheckout] = useState(false);
  const currentTier = ent.tier;

  useEffect(() => {
    const sessionId = search.session_id;
    if (!sessionId || syncingCheckout) return;
    setSyncingCheckout(true);
    (async () => {
      try {
        const result = await syncCheckoutToProfile({
          data: { sessionId, environment: getStripeEnvironment() },
        });
        if ("error" in result && !result.success) {
          console.warn("syncCheckoutToProfile:", result.error);
          return;
        }
        await refreshProfile();
        if (result.tier) {
          toast.success(`Abonamentul ${result.tier.toUpperCase()} este activ`, {
            description: "Poți folosi funcțiile premium imediat.",
          });
        } else if (result.coinsAdded) {
          toast.success(`${result.coinsAdded} șprițuri adăugate în cont`);
        }
      } catch (e) {
        console.warn("Could not sync checkout:", e);
      } finally {
        setSyncingCheckout(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.session_id]);

  const handleBuy = (tier: Tier) =>
    setCheckout({
      priceId: `${tier.id}_${annual ? "yearly" : "monthly"}`,
      title: `${tier.name} ${annual ? "anual" : "lunar"}`,
    });
  const handleCoins = (p: (typeof COIN_PACKS)[0]) =>
    setCheckout({ priceId: p.id, title: `${p.coins} șprițuri · ${p.label}` });
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

  return (
    <div
      className="relative min-h-screen pb-32 bg-background text-foreground antialiased overflow-hidden"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      {/* Ambient neon aura */}
      <div className="pointer-events-none absolute inset-0 -z-0">
        <div className="absolute -top-40 -left-24 h-[420px] w-[420px] rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute top-1/3 -right-32 h-[360px] w-[360px] rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-[300px] w-[300px] rounded-full bg-primary/10 blur-3xl" />
      </div>

      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-background/80 border-b border-border/60 px-4 h-14 flex items-center gap-2">
        <Link to="/app/me" className="p-2 -ml-2 active:scale-95 transition" aria-label="Înapoi">
          <ArrowLeft size={20} strokeWidth={2} />
        </Link>
        <div className="text-[11px] font-medium tracking-[0.3em] text-muted-foreground uppercase">
          Membership
        </div>
        {currentTier && (
          <div className="ml-auto">
            <PremiumBadge tier={currentTier} size="sm" asLink={false} />
          </div>
        )}
      </header>

      {/* Syncing banner */}
      {syncingCheckout && (
        <div className="relative z-10 px-4 pt-3">
          <div className="max-w-md mx-auto flex items-center gap-3 rounded-full border border-primary/40 bg-primary/10 px-4 py-2.5 text-[12px] text-primary">
            <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            Confirmăm plata și activăm beneficiile…
          </div>
        </div>
      )}

      <div className="relative z-10 w-full max-w-md mx-auto px-5 sm:px-6 space-y-9 sm:space-y-12 pt-8 sm:pt-10">
        {/* HERO */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-primary">
            <Sparkles size={12} /> Oxidații Premium
          </div>
          <h1 className="text-foreground text-[2rem] sm:text-4xl font-light tracking-tight leading-[1.1]">
            Alege nivelul{" "}
            <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent font-semibold italic">
              Premium
            </span>
          </h1>
          <p className="text-muted-foreground text-[13px] sm:text-sm max-w-[300px] mx-auto leading-relaxed">
            Deblochează experiența completă și conectează-te cu oameni extraordinari.
          </p>
        </div>

        {/* ACTIVE PLAN */}
        {currentTier &&
          (() => {
            const active = TIERS.find((t) => t.id === currentTier);
            if (!active) return null;
            const a = ACCENT[active.accent];
            return (
              <div
                className={`rounded-2xl border ${a.border} ${a.glow} p-4 flex items-center gap-3`}
              >
                <span className={`w-2 h-2 rounded-full ${a.dot}`} />
                <div className="min-w-0 flex-1">
                  <p className={`text-[10px] uppercase tracking-[0.25em] font-semibold ${a.label}`}>
                    Activ acum
                  </p>
                  <p className="text-sm font-semibold truncate mt-0.5 text-foreground">
                    {active.name} · {active.coins} șprițuri/lună
                  </p>
                </div>
                <Sparkles size={16} className={a.label} />
              </div>
            );
          })()}

        {/* BILLING TOGGLE */}
        <div className="flex gap-1 p-1 bg-card/60 border border-border rounded-full">
          <button
            onClick={() => setAnnual(false)}
            className={`flex-1 py-2.5 text-[11px] font-semibold uppercase tracking-widest rounded-full transition-all ${
              !annual
                ? "bg-primary text-primary-foreground shadow-[0_4px_20px_-4px_hsl(var(--primary)/0.6)]"
                : "text-muted-foreground"
            }`}
          >
            Lunar
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={`flex-1 py-2.5 text-[11px] font-semibold uppercase tracking-widest rounded-full transition-all ${
              annual
                ? "bg-primary text-primary-foreground shadow-[0_4px_20px_-4px_hsl(var(--primary)/0.6)]"
                : "text-muted-foreground"
            }`}
          >
            Anual <span className="opacity-70 ml-1 normal-case">-17%</span>
          </button>
        </div>

        {/* TIERS */}
        <section className="space-y-4">
          {TIERS.map((tier) => {
            const isCurrent = currentTier === tier.id;
            const price = annual ? (tier.price * 10).toFixed(2) : tier.price.toFixed(2);
            const annualSaved = annual ? (tier.price * 12 - tier.price * 10).toFixed(2) : null;
            const a = ACCENT[tier.accent];
            const featured = tier.id === "pro";

            return (
              <div
                key={tier.id}
                className={`relative rounded-3xl p-4 sm:p-5 transition-all bg-card/50 border ${
                  featured ? "border-2 " + a.border + " " + a.glow : a.border
                } ${tier.accent === "gold" ? a.glow + " overflow-hidden" : ""}`}
              >
                {tier.accent === "gold" && (
                  <Star
                    size={96}
                    className="absolute top-0 right-0 -m-4 opacity-[0.06] text-[color:var(--neon-yellow)] pointer-events-none"
                    fill="currentColor"
                  />
                )}
                {(tier.badge || featured) && (
                  <div
                    className={`absolute -top-3 left-5 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${a.ribbon}`}
                  >
                    {featured ? "Cel mai popular" : tier.badge}
                  </div>
                )}

                <div className="flex justify-between items-start mb-5">
                  <div className="min-w-0">
                    <h3
                      className={`text-[11px] font-semibold uppercase tracking-widest mb-1 ${a.label}`}
                    >
                      {tier.name}
                    </h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-[28px] sm:text-3xl font-bold text-foreground tabular-nums">
                        {price}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        RON/{annual ? "an" : "lună"}
                      </span>
                    </div>
                    {annualSaved && (
                      <p className="text-[10px] uppercase tracking-wider text-accent mt-1">
                        economisești {annualSaved} RON
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleBuy(tier)}
                    disabled={isCurrent}
                    className={`shrink-0 min-h-[40px] px-4 sm:px-5 py-2.5 rounded-full font-bold text-xs transition-all disabled:opacity-60 disabled:cursor-not-allowed active:scale-95 ${
                      isCurrent
                        ? "bg-transparent border border-border text-muted-foreground"
                        : a.btn
                    }`}
                  >
                    {isCurrent ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Check size={12} strokeWidth={3} /> Activ
                      </span>
                    ) : (
                      `Vreau ${tier.name}`
                    )}
                  </button>
                </div>

                <p className="text-[12.5px] sm:text-[13px] text-muted-foreground leading-relaxed mb-4 pr-2">
                  {tier.blurb}
                </p>

                <div className="border-t border-border/60 pt-4">
                  <p className="text-[10px] uppercase font-semibold tracking-widest text-muted-foreground mb-3">
                    Ce primești
                  </p>
                  <ul className="space-y-2.5 text-[13px] text-foreground/90">
                    {tier.perks.map((p) => (
                      <li key={p} className="flex items-center gap-2.5">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${a.dot}`} />
                        <span className="leading-snug">{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </section>

        {/* À LA CARTE */}
        <section className="space-y-5">
          <SectionLabel>Single Unlocks</SectionLabel>
          <p className="text-[12px] text-muted-foreground leading-relaxed -mt-2">
            Cumperi o singură dată. Nu se reînnoiește.
          </p>

          {/* Crystal Ball */}
          <div className="bg-card/50 border border-primary/30 rounded-2xl p-5 shadow-[0_10px_40px_-20px_hsl(var(--primary)/0.4)]">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-lg">
                  🔮
                </div>
                <div>
                  <h4 className="text-foreground font-semibold text-sm">Crystal Ball</h4>
                  <p className="text-[11px] text-muted-foreground">7 zile acces</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-base font-bold text-primary tabular-nums">3</span>
                <span className="text-[10px] text-muted-foreground ml-1">RON</span>
              </div>
            </div>
            <p className="text-[12.5px] text-muted-foreground leading-relaxed mb-4">
              <b className="text-foreground">Ce primești:</b> lista cu cine ți-a dat like, follow
              sau ți-a vizitat profilul în ultimele 7 zile. Nume + foto, nu siluetă blur.
            </p>
            <CrystalBallCard />
          </div>

          {/* Replay Night */}
          <Link
            to="/app/replay"
            className="block bg-card/50 border border-[color:var(--neon-yellow)]/30 rounded-2xl p-5 hover:border-[color:var(--neon-yellow)]/50 transition-colors"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[color-mix(in_oklab,var(--neon-yellow)_15%,transparent)] flex items-center justify-center text-lg">
                  🌙
                </div>
                <div>
                  <h4 className="text-foreground font-semibold text-sm">Replay Night</h4>
                  <p className="text-[11px] text-muted-foreground">per noapte</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-base font-bold text-[color:var(--neon-yellow)] tabular-nums">
                  9.99
                </span>
                <span className="text-[10px] text-muted-foreground ml-1">RON</span>
              </div>
            </div>
            <p className="text-[12.5px] text-muted-foreground leading-relaxed">
              <b className="text-foreground">Ce primești:</b> a doua zi dimineață, un wrap
              auto-generat al nopții — traseul, venue-urile, gașca, șprițurile, pozele. Format 9:16,
              gata de Stories.
            </p>
          </Link>

          {/* Last Call */}
          <Link
            to="/app/lastcalls"
            className="block bg-card/50 border border-primary/30 rounded-2xl p-5 hover:border-primary/50 transition-colors"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-lg">
                  📞
                </div>
                <div>
                  <h4 className="text-foreground font-semibold text-sm">Last Call</h4>
                  <p className="text-[11px] text-muted-foreground">ping + reveal</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-base font-bold text-primary tabular-nums">2.99</span>
                <span className="text-[10px] text-muted-foreground ml-1">RON</span>
              </div>
            </div>
            <p className="text-[12.5px] text-muted-foreground leading-relaxed">
              <b className="text-foreground">Ce primești:</b> trimiți un ping anonim — primește
              notificare „cineva vrea să te vadă diseară". Dacă vrea să afle cine ești, plătește{" "}
              <b className="text-foreground">4.99 RON</b> ca să te dezvăluie.
            </p>
          </Link>

          {/* Profile Boost */}
          {ent.isActive && (
            <div className="bg-card/50 border border-accent/30 rounded-2xl p-5">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent/15 flex items-center justify-center text-lg">
                    🚀
                  </div>
                  <div>
                    <h4 className="text-foreground font-semibold text-sm">Profile Boost</h4>
                    <p className="text-[11px] text-muted-foreground">3 ore vizibilitate</p>
                  </div>
                </div>
              </div>
              <p className="text-[12.5px] text-muted-foreground leading-relaxed mb-4">
                <b className="text-foreground">Ce primești:</b> apari mai mare pe hartă + în topul
                feed-ului local timp de 3 ore. Ideal pentru vineri/sâmbătă seara.
              </p>
              <ProfileBoostCard />
            </div>
          )}
        </section>

        {/* COIN PACKS */}
        <section className="space-y-5">
          <SectionLabel>Coin Packs</SectionLabel>
          <p className="text-[12.5px] text-muted-foreground leading-relaxed -mt-2">
            <b className="text-foreground">Ce sunt:</b> monedă internă pentru cadouri în chat,
            frame-uri și boost-uri scurte. <b className="text-foreground">Nu expiră.</b>
          </p>
          <div className="bg-card/50 border border-border rounded-3xl p-3 space-y-2">
            {COIN_PACKS.map((p) => (
              <button
                key={p.id}
                onClick={() => handleCoins(p)}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border bg-background/60 transition-all text-left ${
                  p.popular
                    ? "border-primary/50 ring-1 ring-primary/20 shadow-[0_8px_30px_-15px_hsl(var(--primary)/0.6)]"
                    : "border-border hover:border-primary/30"
                } relative`}
              >
                {p.popular && (
                  <div className="absolute -top-2 left-4 bg-primary text-[8px] px-2 py-0.5 rounded text-primary-foreground font-black uppercase tracking-widest">
                    Best Value
                  </div>
                )}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-base shrink-0">
                    🍹
                  </div>
                  <div className="min-w-0">
                    <div className="text-primary font-bold text-sm tabular-nums">
                      {p.coins} șprițuri
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {p.label}
                      {p.bonus ? ` · ${p.bonus} cadou` : ""}
                    </div>
                  </div>
                </div>
                <span className="text-sm font-semibold text-foreground tabular-nums shrink-0">
                  {p.price}
                  <span className="text-[10px] text-muted-foreground ml-1">RON</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Manage */}
        {ent.isActive && (
          <button
            onClick={handleManage}
            disabled={openingPortal}
            className="w-full flex items-center justify-center gap-2 min-h-[44px] h-11 rounded-full border border-border uppercase text-[10px] tracking-[0.3em] font-semibold disabled:opacity-50 active:scale-[0.99] transition text-foreground/80 hover:bg-card/60 hover:border-primary/40"
          >
            {openingPortal ? (
              <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-foreground border-t-transparent animate-spin" />
            ) : (
              <Settings size={13} />
            )}
            {openingPortal ? "se deschide…" : "Gestionează abonament"}
          </button>
        )}

        {/* FAQ */}
        <section className="space-y-2">
          <SectionLabel>Întrebări frecvente</SectionLabel>
          <div className="divide-y divide-border/60 border-t border-border/60 mt-2">
            {FAQ.map((f, i) => {
              const open = openFaq === i;
              return (
                <div key={i}>
                  <button
                    onClick={() => setOpenFaq(open ? null : i)}
                    className="w-full py-4 flex items-center justify-between gap-4 text-left"
                  >
                    <span className="text-sm font-medium text-foreground/90">{f.q}</span>
                    <span className="w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center shrink-0 text-muted-foreground">
                      {open ? (
                        <Minus size={14} strokeWidth={2.5} />
                      ) : (
                        <Plus size={14} strokeWidth={2.5} />
                      )}
                    </span>
                  </button>
                  {open && (
                    <p className="pb-5 pr-8 text-[12.5px] text-muted-foreground leading-relaxed">
                      {f.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Footer */}
        <footer className="pt-6 border-t border-border/60 space-y-3">
          <p className="text-center text-[10px] text-muted-foreground uppercase tracking-[0.3em] font-semibold">
            Secured · Oxidații Pay
          </p>
          <p className="text-[11px] text-muted-foreground/80 leading-relaxed text-center max-w-[40ch] mx-auto">
            Toate plățile sunt securizate și finale. Anulezi abonamentul oricând, fără explicații.
          </p>
        </footer>
      </div>

      <PremiumCheckoutDialog
        priceId={checkout?.priceId ?? null}
        title={checkout?.title ?? ""}
        open={!!checkout}
        onClose={() => setCheckout(null)}
      />
    </div>
  );
}

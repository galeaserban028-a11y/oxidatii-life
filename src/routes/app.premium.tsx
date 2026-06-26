import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Settings, ArrowUpRight, Plus, Minus, Check, Sparkles } from "lucide-react";
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
  index: string;
  name: string;
  italic: string;
  price: number;
  coins: number;
  blurb: string;
  perks: string[];
  neon: string; // hex neon accent
  textOnNeon: string; // text color when sitting on the neon swatch
  badge?: string;
};

const NEON = {
  yellow: "#ffea00",
  pink: "#ff3d8b",
  violet: "#c724ff",
  cyan: "#00e5ff",
};

const TIERS: Tier[] = [
  {
    id: "vip",
    index: "I",
    name: "VIP",
    italic: "discret",
    price: 2.99,
    coins: 5,
    neon: NEON.yellow,
    textOnNeon: "#050510",
    blurb: "Pentru cei care vor doar să arate că au gust. Fără paradă.",
    perks: ["Insignă VIP auriu", "5 șprițuri pe lună"],
  },
  {
    id: "vip_plus",
    index: "II",
    name: "VIP+",
    italic: "curat",
    price: 4.99,
    coins: 15,
    neon: NEON.pink,
    textOnNeon: "#ffffff",
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
    index: "III",
    name: "Pro",
    italic: "serios",
    price: 9.99,
    coins: 40,
    neon: NEON.violet,
    textOnNeon: "#ffffff",
    blurb: "Pentru regulari. Boost săptămânal, analytics, un music clip pe profil.",
    perks: [
      "Tot din VIP+",
      "1× Profile Boost / săptămână",
      "Reputation analytics complet",
      "Music clip 15s pe profil",
      "40 șprițuri pe lună",
      "Animated background",
    ],
  },
  {
    id: "elite",
    index: "IV",
    name: "Elite",
    italic: "rar",
    price: 14.99,
    coins: 120,
    neon: NEON.cyan,
    textOnNeon: "#050510",
    badge: "100 locuri",
    blurb: "O sută de oameni pe an. Numele tău rămâne pe perete.",
    perks: [
      "Tot din Pro",
      "Diamond badge holografic",
      "120 șprițuri pe lună",
    ],

  },
];

const COIN_PACKS = [
  { id: "coins_mic", coins: 5, price: 4.99, label: "Un rând", neon: NEON.yellow },
  {
    id: "coins_mediu",
    coins: 15,
    price: 12.99,
    label: "Pentru gașcă",
    bonus: "+10%",
    neon: NEON.pink,
  },
  {
    id: "coins_mare",
    coins: 40,
    price: 29.99,
    label: "Petrecere",
    bonus: "+20%",
    popular: true,
    neon: NEON.violet,
  },
  {
    id: "coins_boss",
    coins: 100,
    price: 69.99,
    label: "Toată haita",
    bonus: "+35%",
    neon: NEON.cyan,
  },
  { id: "coins_legenda", coins: 300, price: 179, label: "Legendă", bonus: "+50%", neon: NEON.pink },
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

function PremiumPage() {
  const { profile, refreshProfile } = useAuth();
  const ent = useEntitlements();
  const search = Route.useSearch();
  const [annual, setAnnual] = useState(false);
  const [checkout, setCheckout] = useState<{ priceId: string; title: string } | null>(null);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [syncingCheckout, setSyncingCheckout] = useState(false);
  const currentTier = ent.tier;

  // After returning from Stripe Embedded Checkout, activate the purchase
  // immediately even if webhooks are delayed / not configured for this URL.
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
    <div className="pb-24 min-h-screen text-white selection:bg-fuchsia-500" style={{ background: "#050505" }}>
      {/* Top bar */}
      <header
        className="sticky top-0 z-30 backdrop-blur-xl border-b border-white/10 px-3 h-12 flex items-center gap-2"
        style={{ background: "rgba(5,5,5,0.85)" }}
      >
        <Link to="/app/me" className="p-1.5 -ml-1.5 active:scale-95 transition" aria-label="Înapoi">
          <ArrowLeft size={22} strokeWidth={2.2} />
        </Link>
        <div className="font-mono uppercase text-[10px] tracking-[0.3em] text-white/50">
          Membership
        </div>
        {currentTier && (
          <div className="ml-auto">
            <PremiumBadge tier={currentTier} size="sm" asLink={false} />
          </div>
        )}
      </header>

      <div className="w-full max-w-[440px] mx-auto px-4 sm:px-6 flex flex-col gap-12 pt-10 min-w-0">
        {/* HERO — Editorial */}
        <section className="text-center space-y-3">
          <div className="inline-block">
            <h1
              className="font-display text-5xl font-black italic tracking-tighter uppercase leading-none drop-shadow-[0_0_15px_rgba(255,255,255,0.25)]"
            >
              OXIDAȚII
            </h1>
            <div
              className="h-[2px] w-full mt-2"
              style={{ background: `linear-gradient(to right, transparent, ${NEON.pink}, transparent)` }}
            />
          </div>
          <p className="text-[9px] font-bold tracking-[0.35em] uppercase flex items-center justify-center gap-2" style={{ color: NEON.pink }}>
            <span className="h-px w-5 opacity-50" style={{ background: NEON.pink }} />
            The Nightlife Authority
            <span className="h-px w-5 opacity-50" style={{ background: NEON.pink }} />
          </p>
          <p className="text-[11px] font-mono uppercase tracking-widest text-white/40 pt-1">
            Alege ce funcții deblochezi. Toate prețurile în RON.
          </p>
        </section>

        {/* ACTIVE PLAN BANNER */}
        {currentTier &&
          (() => {
            const active = TIERS.find((t) => t.id === currentTier);
            if (!active) return null;
            return (
              <div
                className="relative p-4 flex items-center gap-3 overflow-hidden"
                style={{
                  background: "#0a0a0a",
                  borderLeft: `4px solid ${active.neon}`,
                }}
              >
                <Sparkles size={18} strokeWidth={2.5} style={{ color: active.neon }} />
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] uppercase tracking-[0.3em] font-bold font-mono" style={{ color: active.neon }}>
                    Activ acum
                  </p>
                  <p className="text-sm font-black uppercase truncate italic mt-0.5">
                    {active.name} · {active.coins} șprițuri/lună
                  </p>
                </div>
              </div>
            );
          })()}

        {/* BILLING TOGGLE */}
        <div className="flex items-center justify-center">
          <div className="p-1 flex border border-white/10" style={{ background: "#0a0a0a" }}>
            <button
              onClick={() => setAnnual(false)}
              className={`px-6 py-2 text-[10px] font-black italic uppercase tracking-widest transition-all ${
                !annual ? "bg-white text-black" : "text-white/40 hover:text-white/70"
              }`}
            >
              Lunar
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-6 py-2 text-[10px] font-black italic uppercase tracking-widest transition-all flex items-center gap-2 ${
                annual ? "bg-white text-black" : "text-white/40 hover:text-white/70"
              }`}
            >
              Anual
              <span
                className="text-[8px] px-1.5 py-[1px] font-black"
                style={{
                  background: annual ? "#000" : NEON.yellow,
                  color: annual ? NEON.yellow : "#000",
                }}
              >
                −17%
              </span>
            </button>
          </div>
        </div>

        {/* TIERS — Editorial brutalist */}
        <section className="space-y-2">
          <div className="flex items-center gap-4 mb-2">
            <h3 className="text-[10px] font-mono font-bold tracking-[0.4em] text-white/50 uppercase whitespace-nowrap italic">
              Abonamente lunare
            </h3>
            <div className="h-px w-full bg-white/10" />
          </div>

          <div className="flex flex-col gap-5">
            {TIERS.map((tier) => {
              const isCurrent = currentTier === tier.id;
              const price = annual ? (tier.price * 10).toFixed(2) : tier.price.toFixed(2);
              const annualSaved = annual ? (tier.price * 12 - tier.price * 10).toFixed(2) : null;
              const featured = tier.id === "elite";

              return (
                <div key={tier.id} className="group relative">
                  {featured && (
                    <div
                      className="absolute -inset-0.5 blur opacity-50 animate-pulse pointer-events-none"
                      style={{
                        background: `linear-gradient(to right, ${NEON.pink}, ${NEON.violet}, ${NEON.cyan})`,
                      }}
                    />
                  )}
                  <div
                    className="relative p-6 overflow-hidden"
                    style={{
                      background: featured ? "#0d0d0d" : "#0a0a0a",
                      border: `1px solid ${isCurrent ? tier.neon : featured ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)"}`,
                    }}
                  >
                    {/* Watermark */}
                    <div className="absolute top-1 right-2 pointer-events-none opacity-[0.06]">
                      <div className="text-5xl font-display font-black italic uppercase tracking-tighter">
                        {tier.index}
                      </div>
                    </div>

                    {/* Badge ribbon */}
                    {(tier.badge || isCurrent) && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-5 py-1 -skew-x-12" style={{ background: tier.neon }}>
                        <span className="text-[9px] font-black italic uppercase tracking-widest block skew-x-12" style={{ color: tier.textOnNeon }}>
                          {isCurrent ? "Planul tău" : tier.badge}
                        </span>
                      </div>
                    )}

                    {/* Title + Price */}
                    <div className="flex justify-between items-end mb-5 mt-2">
                      <div className="min-w-0">
                        <h2 className="font-display text-3xl font-black italic uppercase leading-none">
                          {tier.name === "VIP+" ? (
                            <>VIP<span style={{ color: tier.neon }}>+</span></>
                          ) : (
                            tier.name
                          )}
                        </h2>
                        <p className="font-mono text-[9px] uppercase font-bold tracking-widest mt-2" style={{ color: tier.neon }}>
                          {tier.italic.toUpperCase()} · {annual ? "Anual" : "Lunar"}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="flex items-baseline gap-1 justify-end">
                          <span className="font-display text-3xl font-black tabular-nums tracking-tighter italic">{price}</span>
                          <span className="text-[10px] font-mono font-bold text-white/50">RON</span>
                        </div>
                        {annualSaved && (
                          <p className="text-[9px] font-mono mt-1" style={{ color: NEON.yellow }}>
                            economisești {annualSaved} RON
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Blurb — explică pentru cine e */}
                    <p className="text-[12px] text-white/60 leading-relaxed mb-4 italic">
                      {tier.blurb}
                    </p>

                    {/* Perks — exact ce primește */}
                    <ul className="space-y-2.5 mb-6">
                      {tier.perks.map((p) => (
                        <li key={p} className="flex items-start gap-3 text-[12px] font-mono text-white/85">
                          <span className="w-2 h-2 border mt-1 rotate-45 shrink-0" style={{ borderColor: tier.neon }} />
                          <span className="leading-snug break-words min-w-0 uppercase tracking-tight">{p}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Coins explainer */}
                    <div className="mb-5 px-3 py-2 border border-white/10 flex items-center gap-2 text-[10px] font-mono text-white/60">
                      <span style={{ color: tier.neon }}>●</span>
                      Primești <b className="text-white">{tier.coins}</b> șprițuri / lună pentru cadouri & boost-uri.
                    </div>

                    <button
                      onClick={() => handleBuy(tier)}
                      disabled={isCurrent}
                      className="w-full py-4 font-display font-black italic uppercase tracking-widest text-xs transition-all active:scale-[0.98] disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      style={
                        isCurrent
                          ? {
                              background: "transparent",
                              border: `1px solid ${tier.neon}`,
                              color: tier.neon,
                            }
                          : featured
                          ? {
                              background: `linear-gradient(to right, ${NEON.pink}, ${NEON.violet})`,
                              color: "#fff",
                              boxShadow: `0 0 30px ${NEON.pink}66`,
                            }
                          : {
                              background: "#fff",
                              color: "#000",
                            }
                      }
                    >
                      {isCurrent ? (
                        <><Check size={14} strokeWidth={3} /> Activ</>
                      ) : (
                        <>Devino {tier.name} <ArrowUpRight size={14} strokeWidth={2.5} /></>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* À LA CARTE — Tactical add-ons */}
        <section className="space-y-3">
          <div className="flex items-center gap-4">
            <h3 className="text-[10px] font-mono font-bold tracking-[0.4em] text-white/50 uppercase whitespace-nowrap italic">
              Tactical Add-ons
            </h3>
            <div className="h-px w-full bg-white/10" />
          </div>
          <p className="text-[11px] font-mono text-white/40 uppercase tracking-wider">
            Cumperi o singură dată. Nu se reînnoiește.
          </p>

          {/* Crystal Ball */}
          <div className="p-4" style={{ background: "#0a0a0a", borderLeft: `4px solid ${NEON.cyan}` }}>
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0">
                <h4 className="font-display font-black italic uppercase text-sm tracking-wider" style={{ color: NEON.cyan }}>
                  Crystal Ball
                </h4>
                <p className="text-[10px] font-mono uppercase tracking-widest text-white/40 mt-0.5">7 zile acces</p>
              </div>
              <div className="text-right shrink-0">
                <div className="font-display text-xl font-black italic tabular-nums">3<span className="text-[10px] font-mono text-white/50 ml-1">RON</span></div>
              </div>
            </div>
            <p className="text-[11px] text-white/70 leading-relaxed mb-3">
              <b className="text-white">Ce primești:</b> deblochezi lista cu cine ți-a dat like, follow sau ți-a vizitat profilul în ultimele 7 zile. Vezi nume + foto, nu silueta blur.
            </p>
            <CrystalBallCard />
          </div>

          {/* Replay Night */}
          <Link
            to="/app/replay"
            className="block p-4 hover:bg-white/[0.02] transition-colors"
            style={{ background: "#0a0a0a", borderLeft: `4px solid ${NEON.violet}` }}
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0">
                <h4 className="font-display font-black italic uppercase text-sm tracking-wider" style={{ color: NEON.violet }}>
                  Replay Night
                </h4>
                <p className="text-[10px] font-mono uppercase tracking-widest text-white/40 mt-0.5">per noapte</p>
              </div>
              <div className="text-right shrink-0">
                <div className="font-display text-xl font-black italic tabular-nums">9.99<span className="text-[10px] font-mono text-white/50 ml-1">RON</span></div>
              </div>
            </div>
            <p className="text-[11px] text-white/70 leading-relaxed mb-3">
              <b className="text-white">Ce primești:</b> a doua zi dimineață, un wrap auto-generat al nopții tale — harta cu traseul, venue-urile vizitate, cine a fost cu tine, șprițurile băute, pozele din feed. Format 9:16, gata de Stories.
            </p>
            <div className="flex items-center justify-end gap-2 text-[10px] font-mono uppercase tracking-widest" style={{ color: NEON.violet }}>
              Deschide <ArrowUpRight size={12} strokeWidth={2.5} />
            </div>
          </Link>

          {/* Last Call */}
          <Link
            to="/app/lastcalls"
            className="block p-4 hover:bg-white/[0.02] transition-colors"
            style={{ background: "#0a0a0a", borderLeft: `4px solid ${NEON.pink}` }}
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0">
                <h4 className="font-display font-black italic uppercase text-sm tracking-wider" style={{ color: NEON.pink }}>
                  Last Call
                </h4>
                <p className="text-[10px] font-mono uppercase tracking-widest text-white/40 mt-0.5">ping + reveal</p>
              </div>
              <div className="text-right shrink-0">
                <div className="font-display text-xl font-black italic tabular-nums">2.99<span className="text-[10px] font-mono text-white/50 ml-1">RON</span></div>
              </div>
            </div>
            <p className="text-[11px] text-white/70 leading-relaxed mb-3">
              <b className="text-white">Ce primești:</b> trimiți un ping anonim cuiva — primește o notificare „cineva vrea să te vadă diseară" fără să afle cine ești. Dacă vrea să afle, plătește <b className="text-white">4.99 RON</b> ca să te dezvăluie. Câștigi atenție fără cringe.
            </p>
            <div className="flex items-center justify-end gap-2 text-[10px] font-mono uppercase tracking-widest" style={{ color: NEON.pink }}>
              Trimite ping <ArrowUpRight size={12} strokeWidth={2.5} />
            </div>
          </Link>

          {/* Profile Boost (doar dacă e activ premium) */}
          {ent.isActive && (
            <div className="p-4" style={{ background: "#0a0a0a", borderLeft: `4px solid ${NEON.yellow}` }}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <h4 className="font-display font-black italic uppercase text-sm tracking-wider" style={{ color: NEON.yellow }}>
                    Profile Boost
                  </h4>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-white/40 mt-0.5">3 ore vizibilitate</p>
                </div>
              </div>
              <p className="text-[11px] text-white/70 leading-relaxed mb-3">
                <b className="text-white">Ce primești:</b> apari mai mare pe hartă + în topul feed-ului local timp de 3 ore. Ideal pentru vineri/sâmbătă seara când vrei să fii văzut.
              </p>
              <ProfileBoostCard />
            </div>
          )}
        </section>

        {/* COINS — Bar */}
        <section className="space-y-4">
          <div className="flex items-center gap-4">
            <h3 className="text-[10px] font-mono font-bold tracking-[0.4em] uppercase whitespace-nowrap italic" style={{ color: NEON.yellow }}>
              V. Bar — Șprițuri
            </h3>
            <div className="h-px w-full bg-white/10" />
          </div>
          <p className="text-[11px] text-white/60 leading-relaxed">
            <b className="text-white">Ce sunt:</b> monedă internă pentru cadouri în chat, frame-uri și boost-uri scurte. Plătești o dată, le folosești când vrei. <b className="text-white">Nu expiră.</b>
          </p>

          <div className="space-y-2.5">
            {COIN_PACKS.map((p) => (
              <button
                key={p.id}
                onClick={() => handleCoins(p)}
                className="w-full p-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 transition-colors text-left relative overflow-hidden hover:bg-white/[0.03]"
                style={{
                  background: "#0a0a0a",
                  border: `1px solid ${p.popular ? p.neon : "rgba(255,255,255,0.08)"}`,
                  paddingTop: p.popular ? 22 : 16,
                }}
              >
                {p.popular && (
                  <span
                    className="absolute top-0 left-0 right-0 text-[8px] font-black italic px-2 py-0.5 uppercase tracking-widest text-center"
                    style={{ background: p.neon, color: "#000" }}
                  >
                    ales de mulți
                  </span>
                )}
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-black italic uppercase tracking-wider truncate font-display" style={{ color: p.neon }}>
                    {p.label}
                  </span>
                  <span className="text-[11px] font-mono text-white/60 mt-1 truncate uppercase">
                    {p.coins} șprițuri{p.bonus ? ` · ${p.bonus} cadou` : ""}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-display text-lg font-black italic tabular-nums leading-none whitespace-nowrap">
                    {p.price}<span className="text-[10px] font-mono text-white/50 ml-1">RON</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Manage subscription */}
        {ent.isActive && (
          <button
            onClick={handleManage}
            disabled={openingPortal}
            className="w-full flex items-center justify-center gap-2 h-11 border border-white/20 font-mono italic uppercase text-[10px] tracking-[0.3em] disabled:opacity-50 active:scale-[0.99] transition text-white/70 hover:text-white hover:bg-white/5"
          >
            <Settings size={13} />
            {openingPortal ? "se deschide…" : "Gestionează abonament"}
          </button>
        )}

        {/* MANIFESTO */}
        <section className="py-10 border-y border-white/5">
          <p className="italic text-2xl leading-snug text-white/90 font-display font-black tracking-tight">
            „Nu vindem locul <span className="text-white">întâi</span>. Vindem doar cum arăți când{" "}
            <span style={{ color: NEON.cyan, textShadow: `0 0 12px ${NEON.cyan}` }}>
              ajungi acolo
            </span>."
          </p>
          <div className="mt-6 flex items-center gap-4">
            <div className="h-px flex-1" style={{ background: `linear-gradient(to right, ${NEON.cyan}, transparent)` }} />
            <p className="text-[9px] font-mono uppercase tracking-[0.4em] text-white/40 font-bold">
              Echipa Oxidații
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="space-y-2">
          <h4 className="text-[10px] font-mono font-black uppercase tracking-[0.4em] text-white/50 mb-2 italic">
            Întrebări Frecvente
          </h4>
          <div className="divide-y divide-white/10">
            {FAQ.map((f, i) => {
              const open = openFaq === i;
              return (
                <div key={i}>
                  <button
                    onClick={() => setOpenFaq(open ? null : i)}
                    className="w-full py-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 text-left group"
                  >
                    <span className="text-sm font-mono font-bold text-white/85 group-hover:text-white transition min-w-0 break-words uppercase tracking-tight">
                      {f.q}
                    </span>
                    <span className="w-5 h-5 flex items-center justify-center shrink-0" style={{ color: NEON.pink }}>
                      {open ? <Minus size={16} strokeWidth={2.5} /> : <Plus size={16} strokeWidth={2.5} />}
                    </span>
                  </button>
                  {open && (
                    <div className="pb-5 pr-8 text-[12px] text-white/65 leading-relaxed">
                      {f.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Footer */}
        <footer className="pt-6 border-t border-white/10 space-y-4">
          <div className="h-px w-24 mx-auto" style={{ background: `linear-gradient(to right, transparent, ${NEON.pink}, transparent)` }} />
          <p className="text-center text-[9px] font-mono text-white/40 uppercase tracking-[0.3em] font-bold">
            Secured · Oxidații Pay
          </p>
          <p className="text-[10px] text-white/40 leading-relaxed text-center max-w-[40ch] mx-auto">
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


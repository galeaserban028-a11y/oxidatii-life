import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Settings, ArrowUpRight, Plus, Minus, Check, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useEntitlements } from "@/lib/entitlements";
import { PremiumBadge } from "@/components/app/PremiumBadge";
import { PremiumCheckoutDialog } from "@/components/PremiumCheckoutDialog";
import { ProfileBoostCard } from "@/components/app/ProfileBoostCard";
import { CrystalBallCard } from "@/components/app/CrystalBallCard";
import { createPremiumPortalSession, syncCheckoutToProfile } from "@/lib/premium.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { toast } from "sonner";

export const Route = createFileRoute("/app/premium")({
  head: () => ({ meta: [{ title: "Membership · OXIDAȚII" }] }),
  validateSearch: (search: Record<string, unknown>): { checkout?: string; session_id?: string } => ({
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
  neon: string;        // hex neon accent
  textOnNeon: string;  // text color when sitting on the neon swatch
  badge?: string;
};

const NEON = {
  yellow: "#ffea00",
  pink:   "#ff3d8b",
  violet: "#c724ff",
  cyan:   "#00e5ff",
};

const TIERS: Tier[] = [
  {
    id: "vip", index: "I", name: "VIP", italic: "discret",
    price: 2.99, coins: 5, neon: NEON.yellow, textOnNeon: "#050510",
    blurb: "Pentru cei care vor doar să arate că au gust. Fără paradă.",
    perks: ["Insignă VIP auriu", "5 șprițuri pe lună"],
  },
  {
    id: "vip_plus", index: "II", name: "VIP+", italic: "curat",
    price: 4.99, coins: 15, neon: NEON.pink, textOnNeon: "#ffffff", badge: "cel mai luat",
    blurb: "Profilul tău începe să fie observat. Frame animat, teme, vederi.",
    perks: ["Tot din VIP", "Frame animat pe avatar", "5 teme exclusive de profil", "15 șprițuri pe lună", "Vezi cine ți-a dat rating"],
  },
  {
    id: "pro", index: "III", name: "Pro", italic: "serios",
    price: 9.99, coins: 40, neon: NEON.violet, textOnNeon: "#ffffff",
    blurb: "Pentru regulari. Boost săptămânal, analytics, un music clip pe profil.",
    perks: ["Tot din VIP+", "1× Profile Boost / săptămână", "Reputation analytics complet", "Music clip 15s pe profil", "40 șprițuri pe lună", "Animated background"],
  },
  {
    id: "elite", index: "IV", name: "Elite", italic: "rar",
    price: 14.99, coins: 120, neon: NEON.cyan, textOnNeon: "#050510", badge: "100 locuri",
    blurb: "O sută de oameni pe an. Numele tău rămâne pe perete.",
    perks: ["Tot din Pro", "Diamond badge holografic", "Featured pe Discover", "Founder recognition pe vecie", "Cadou aniversar fizic", "120 șprițuri pe lună", "Acces beta features"],
  },
];

const COIN_PACKS = [
  { id: "coins_mic",     coins: 5,   price: 4.99,  label: "Un rând",       neon: NEON.yellow },
  { id: "coins_mediu",   coins: 15,  price: 12.99, label: "Pentru gașcă",  bonus: "+10%", neon: NEON.pink },
  { id: "coins_mare",    coins: 40,  price: 29.99, label: "Petrecere",     bonus: "+20%", popular: true, neon: NEON.violet },
  { id: "coins_boss",    coins: 100, price: 69.99, label: "Toată haita",   bonus: "+35%", neon: NEON.cyan },
  { id: "coins_legenda", coins: 300, price: 179,   label: "Legendă",       bonus: "+50%", neon: NEON.pink },
];

const FAQ = [
  { q: "Pot să anulez oricând?", a: "Da. Un singur click. Beneficiile rămân până la final de perioadă." },
  { q: "Plătesc, intru pe locul 1?", a: "Nu. Nu vindem locuri în top. Niciodată. Doar cum arăți când ajungi acolo." },
  { q: "Ce sunt șprițurile?", a: "Sunt pentru lucruri cosmetice — cadouri în chat, boost-uri scurte, rame. Nu cumperi influență." },
  { q: "Cum funcționează plata?", a: "Plătești o dată, primești instant. Toate plățile sunt finale, fără returnări." },
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
    setCheckout({ priceId: `${tier.id}_${annual ? "yearly" : "monthly"}`, title: `${tier.name} ${annual ? "anual" : "lunar"}` });
  const handleCoins = (p: typeof COIN_PACKS[0]) =>
    setCheckout({ priceId: p.id, title: `${p.coins} șprițuri · ${p.label}` });
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
    <div className="pb-24 min-h-screen text-white" style={{ background: "#050510" }}>
      {/* Top bar */}
      <header className="sticky top-0 z-30 backdrop-blur-xl border-b border-white/10 px-3 h-12 flex items-center gap-2"
        style={{ background: "rgba(5,5,16,0.7)" }}>
        <Link to="/app/me" className="p-1.5 -ml-1.5 active:scale-95 transition" aria-label="Înapoi">
          <ArrowLeft size={22} strokeWidth={2.2} />
        </Link>
        <div className="font-mono uppercase text-[10px] tracking-[0.3em] text-white/50">Membership</div>
        {currentTier && <div className="ml-auto"><PremiumBadge tier={currentTier} size="sm" asLink={false} /></div>}
      </header>

      <div className="w-full max-w-[420px] mx-auto px-4 sm:px-6 flex flex-col gap-12 pt-10 min-w-0">

        {/* ACTIVE PLAN BANNER */}
        {currentTier && (() => {
          const active = TIERS.find((t) => t.id === currentTier);
          if (!active) return null;
          return (
            <div
              className="relative rounded-2xl p-4 flex items-center gap-3 overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${active.neon}22, transparent 70%)`,
                border: `1px solid ${active.neon}66`,
                boxShadow: `0 0 24px ${active.neon}33`,
              }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ background: active.neon, boxShadow: `0 0 16px ${active.neon}99` }}
              >
                <Sparkles size={18} strokeWidth={2.5} style={{ color: active.textOnNeon }} />
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="text-[9px] uppercase tracking-[0.3em] font-bold"
                  style={{ color: active.neon }}
                >
                  Planul tău activ
                </p>
                <p className="text-sm font-black uppercase truncate">
                  {active.name} <span className="text-white/50 font-normal italic" style={{ fontFamily: "'Instrument Serif', serif" }}>· {active.coins} șprițuri/lună</span>
                </p>
              </div>
            </div>
          );
        })()}

        {/* À LA CARTE — one-off purchases */}
        <section className="space-y-3">
          <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/50 text-center">
            Funcții à la carte
          </div>
          <CrystalBallCard />
        </section>


        {/* HERO */}
        <section className="text-center space-y-4">
          <div
            className="inline-block px-3 py-1 border rounded-full text-[10px] tracking-[0.25em] uppercase font-bold"
            style={{
              borderColor: NEON.cyan,
              color: NEON.cyan,
              boxShadow: `0 0 12px ${NEON.cyan}55`,
            }}
          >
            Upgrade Membership
          </div>
          <h1 className="font-display text-5xl font-black tracking-tighter uppercase italic leading-none">
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40">
              OXIDATE
            </span>
            <span style={{ color: NEON.pink, textShadow: `0 0 10px ${NEON.pink}` }}>+</span>
          </h1>
          <p
            className="text-xl text-white/60 max-w-[280px] mx-auto italic"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            Alege nivelul care îți definește prezența în club.
          </p>
        </section>

        {/* BILLING TOGGLE */}
        <div className="flex items-center justify-center">
          <div className="p-1 rounded-full flex border border-white/10" style={{ background: "#10101a" }}>
            <button
              onClick={() => setAnnual(false)}
              className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
                !annual ? "bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.25)]" : "text-white/50"
              }`}
            >
              Lunar
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${
                annual ? "bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.25)]" : "text-white/50"
              }`}
            >
              Anual
              <span
                className="text-[9px] px-1.5 py-[1px] rounded-sm font-black"
                style={{
                  background: annual ? "#050510" : NEON.yellow,
                  color: annual ? NEON.yellow : "#050510",
                }}
              >
                −17%
              </span>
            </button>
          </div>
        </div>

        {/* TIERS */}
        <div className="flex flex-col gap-8">
          {TIERS.map((tier) => {
            const isCurrent = currentTier === tier.id;
            const price = annual ? (tier.price * 10).toFixed(2) : tier.price.toFixed(2);
            const annualSaved = annual ? (tier.price * 12 - tier.price * 10).toFixed(2) : null;

            return (
              <div key={tier.id} className="relative group">
                {/* outer glow */}
                <div
                  aria-hidden
                  className="absolute -inset-0.5 rounded-2xl blur-xl pointer-events-none transition"
                  style={{
                    background: tier.neon,
                    opacity: isCurrent ? 0.45 : 0.22,
                  }}
                />
                {/* glass card */}
                <div
                  className="relative rounded-2xl p-5 sm:p-6 flex flex-col gap-5 backdrop-blur-xl min-w-0"
                  style={{
                    background: "rgba(10,10,21,0.85)",
                    border: `1px solid ${tier.neon}${isCurrent ? "cc" : "55"}`,
                    boxShadow: isCurrent ? `inset 0 0 24px ${tier.neon}22` : undefined,
                  }}
                >
                  {/* top badges row — flexible, never overflows */}
                  {(tier.badge || isCurrent) && (
                    <div className="absolute -top-3 left-4 right-4 flex items-center gap-2 pointer-events-none">
                      {isCurrent && (
                        <span
                          className="text-[9px] px-2.5 py-1 font-black uppercase tracking-widest rounded-full inline-flex items-center gap-1 max-w-full truncate"
                          style={{ background: tier.neon, color: tier.textOnNeon, boxShadow: `0 0 12px ${tier.neon}88` }}
                        >
                          <Check size={10} strokeWidth={3} /> Planul tău
                        </span>
                      )}
                      {tier.badge && !isCurrent && (
                        <span
                          className="text-[9px] px-2.5 py-1 font-black uppercase tracking-widest rounded-full max-w-full truncate"
                          style={{ background: tier.neon, color: tier.textOnNeon }}
                        >
                          {tier.badge}
                        </span>
                      )}
                    </div>
                  )}

                  {/* title + price row — grid keeps it safe on 320px and landscape */}
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <div className="min-w-0">
                      <p
                        className="text-[10px] uppercase tracking-[0.3em] font-bold truncate"
                        style={{ color: tier.neon }}
                      >
                        Tier {tier.index}
                      </p>
                      <h3 className="font-display text-2xl sm:text-3xl font-black uppercase mt-1 truncate">
                        {tier.name === "VIP+" ? (
                          <>VIP<span style={{ color: tier.neon }}>+</span></>
                        ) : (
                          tier.name
                        )}
                      </h3>
                      <p
                        className="italic text-sm sm:text-base text-white/55 mt-1 truncate"
                        style={{ fontFamily: "'Instrument Serif', serif" }}
                      >
                        &amp; {tier.italic}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-display text-2xl sm:text-3xl font-black tabular-nums leading-none">
                        {price}
                      </p>
                      <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1 whitespace-nowrap">
                        Lei / {annual ? "an" : "lună"}
                      </p>
                      {annualSaved && (
                        <p
                          className="text-[10px] italic mt-1 text-white/55 whitespace-nowrap"
                          style={{ fontFamily: "'Instrument Serif', serif" }}
                        >
                          −{annualSaved} lei
                        </p>
                      )}
                    </div>
                  </div>

                  <p
                    className="italic text-base sm:text-lg leading-snug break-words"
                    style={{ fontFamily: "'Instrument Serif', serif", color: `${tier.neon}cc` }}
                  >
                    „{tier.blurb}"
                  </p>

                  {/* perks — for the active tier, framed as "Beneficiile tale incluse" with checks */}
                  {isCurrent && (
                    <p
                      className="text-[10px] font-bold uppercase tracking-[0.3em] -mb-1"
                      style={{ color: tier.neon }}
                    >
                      Beneficiile tale incluse
                    </p>
                  )}
                  <ul className="space-y-2.5">
                    {tier.perks.map((p) => (
                      <li key={p} className="flex items-start gap-3 text-[13px] text-white/85 min-w-0">
                        {isCurrent ? (
                          <span
                            className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                            style={{ background: tier.neon, boxShadow: `0 0 8px ${tier.neon}99` }}
                          >
                            <Check size={10} strokeWidth={3} style={{ color: tier.textOnNeon }} />
                          </span>
                        ) : (
                          <span
                            className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ background: tier.neon, boxShadow: `0 0 6px ${tier.neon}` }}
                          />
                        )}
                        <span className="leading-snug break-words min-w-0">{p}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleBuy(tier)}
                    disabled={isCurrent}
                    className="w-full py-4 font-black uppercase tracking-widest text-[11px] rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                    style={
                      isCurrent
                        ? {
                            background: `${tier.neon}1a`,
                            border: `1px solid ${tier.neon}88`,
                            color: tier.neon,
                          }
                        : {
                            background: tier.neon,
                            color: tier.textOnNeon,
                            boxShadow: `0 0 24px ${tier.neon}66`,
                          }
                    }
                  >
                    {isCurrent ? (
                      <>
                        <Check size={14} strokeWidth={3} /> Activ
                      </>
                    ) : (
                      <>
                        Devino {tier.name}
                        <ArrowUpRight size={14} strokeWidth={2.5} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );

          })}
        </div>

        {/* BAR — coin packs */}
        <section className="space-y-6 pt-6">
          <div className="flex flex-col gap-1">
            <p
              className="text-[10px] font-bold uppercase tracking-[0.4em]"
              style={{ color: NEON.yellow }}
            >
              V. Bar
            </p>
            <h2 className="font-display text-3xl font-black uppercase leading-tight italic">
              Șprițurile pe care le<br />
              <span style={{ color: NEON.yellow, textShadow: `0 0 14px ${NEON.yellow}` }}>
                arunci pe masă.
              </span>
            </h2>
            <p className="text-[13px] text-white/60 mt-2 max-w-[34ch]">
              Cadouri, boost-uri, frame-uri. O dată plătite, le folosești când vrei. Nu expiră.
            </p>
          </div>

          <div className="space-y-3">
            {COIN_PACKS.map((p) => (
              <button
                key={p.id}
                onClick={() => handleCoins(p)}
                className="w-full p-4 rounded-xl grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 transition-colors text-left relative overflow-hidden"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${p.popular ? `${p.neon}55` : "rgba(255,255,255,0.1)"}`,
                  paddingTop: p.popular ? 22 : 16,
                }}
              >
                {p.popular && (
                  <span
                    className="absolute top-0 left-0 right-0 text-[8px] font-black px-2 py-0.5 uppercase tracking-wider text-center"
                    style={{ background: p.neon, color: "#050510" }}
                  >
                    ales de mulți
                  </span>
                )}
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-black uppercase tracking-wider truncate" style={{ color: p.neon }}>
                    {p.label}
                  </span>
                  <span
                    className="text-[12px] italic text-white/55 mt-0.5 truncate"
                    style={{ fontFamily: "'Instrument Serif', serif" }}
                  >
                    {p.coins} {p.coins === 1 ? "șpriț" : "șprițuri"}
                  </span>
                  {p.bonus && (
                    <span className="text-[10px] font-bold uppercase mt-1" style={{ color: p.neon }}>
                      {p.bonus} cadou
                    </span>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="font-display text-lg font-black tabular-nums leading-none whitespace-nowrap">{p.price}</div>
                  <div className="text-[9px] uppercase tracking-widest text-white/40 mt-1">Lei</div>
                </div>
              </button>
            ))}
          </div>

        </section>

        {/* Manage subscription + boost */}
        {currentTier && (
          <div className="space-y-3">
            <ProfileBoostCard />
            <button
              onClick={handleManage}
              disabled={openingPortal}
              className="w-full flex items-center justify-center gap-2 h-11 rounded-full border border-white/20 font-mono uppercase text-[10px] tracking-[0.3em] disabled:opacity-50 active:scale-[0.99] transition text-white/80 hover:text-white"
            >
              <Settings size={13} />
              {openingPortal ? "se deschide…" : "Gestionează abonament"}
            </button>
          </div>
        )}

        {/* MANIFESTO */}
        <section className="py-10 border-y border-white/5">
          <p
            className="italic text-3xl leading-snug text-white/90"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            „Nu vindem locul <span className="text-white">întâi</span>. Vindem doar cum arăți când{" "}
            <span style={{ color: NEON.cyan, textShadow: `0 0 12px ${NEON.cyan}` }}>
              ajungi acolo
            </span>
            ."
          </p>
          <div className="mt-6 flex items-center gap-4">
            <div
              className="h-px flex-1"
              style={{ background: `linear-gradient(to right, ${NEON.cyan}, transparent)` }}
            />
            <p className="text-[9px] uppercase tracking-[0.4em] text-white/40 font-bold">
              Echipa Oxidații
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="space-y-2">
          <h4 className="text-xs font-black uppercase tracking-widest text-white/50 mb-2">
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
                    <span className="text-sm font-medium text-white/85 group-hover:text-white transition min-w-0 break-words">
                      {f.q}
                    </span>
                    <span
                      className="w-5 h-5 flex items-center justify-center shrink-0"
                      style={{ color: NEON.pink }}
                    >
                      {open ? <Minus size={16} strokeWidth={2.5} /> : <Plus size={16} strokeWidth={2.5} />}
                    </span>
                  </button>

                  {open && (
                    <div
                      className="pb-5 pr-8 text-[13px] text-white/65 leading-relaxed italic"
                      style={{ fontFamily: "'Instrument Serif', serif" }}
                    >
                      {f.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Colophon */}
        <footer className="pt-6 border-t border-white/10">
          <div className="font-mono text-[9px] uppercase tracking-[0.35em] text-white/40 flex items-center justify-between">
            <span>Oxidații Press</span>
            <span>Vol. 04 · Nr. 06</span>
          </div>
          <p className="mt-3 text-[10px] text-white/40 leading-relaxed max-w-[40ch]">
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

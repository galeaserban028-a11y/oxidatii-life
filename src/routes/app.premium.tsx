import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Settings, ArrowUpRight, Plus, Minus, Check } from "lucide-react";
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
  italic: string;
  price: number;
  coins: number;
  blurb: string;
  perks: string[];
  badge?: string;
};

// Single accent — lime editorial
const LIME = "#CCFF00";

const TIERS: Tier[] = [
  {
    id: "vip",
    name: "VIP",
    italic: "discret",
    price: 2.99,
    coins: 5,
    blurb: "Pentru cei care vor să arate că au gust. Fără paradă.",
    perks: ["Insignă VIP auriu", "5 șprițuri pe lună"],
  },
  {
    id: "vip_plus",
    name: "VIP+",
    italic: "curat",
    price: 4.99,
    coins: 15,
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
    italic: "serios",
    price: 9.99,
    coins: 40,
    blurb: "Pentru regulari. Boost săptămânal, analytics, music clip pe profil.",
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
    name: "Elite",
    italic: "rar",
    price: 14.99,
    coins: 120,
    badge: "100 locuri",
    blurb: "O sută de oameni pe an. Numele tău rămâne pe perete.",
    perks: ["Tot din Pro", "Diamond badge holografic", "120 șprițuri pe lună"],
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="text-[11px] font-bold uppercase tracking-[0.25em] text-zinc-500 border-l-2 pl-2"
      style={{ borderColor: LIME }}
    >
      {children}
    </h3>
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
    <div className="min-h-screen pb-24 bg-black text-white antialiased" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
      {/* Top bar */}
      <header
        className="sticky top-0 z-30 backdrop-blur-xl border-b border-white/10 px-3 h-12 flex items-center gap-2"
        style={{ background: "rgba(0,0,0,0.7)" }}
      >
        <Link to="/app/me" className="p-1.5 -ml-1.5 active:scale-95 transition" aria-label="Înapoi">
          <ArrowLeft size={22} strokeWidth={2.2} />
        </Link>
        <div className="text-[10px] font-bold tracking-[0.3em] text-zinc-400 uppercase">
          Membership
        </div>
        {currentTier && (
          <div className="ml-auto">
            <PremiumBadge tier={currentTier} size="sm" asLink={false} />
          </div>
        )}
      </header>

      <div className="w-full max-w-md mx-auto px-6 space-y-8 pt-8">
        {/* HERO */}
        <header className="space-y-2 border-b-2 pb-4" style={{ borderColor: LIME }}>
          <h1
            className="text-5xl font-bold uppercase italic tracking-tighter leading-none"
            style={{ color: LIME, textShadow: `0 0 24px ${LIME}55` }}
          >
            Premium
          </h1>
          <p className="text-sm text-zinc-400">
            Upgrade your nightlife. Toate prețurile în RON.
          </p>
        </header>

        {/* ACTIVE PLAN */}
        {currentTier &&
          (() => {
            const active = TIERS.find((t) => t.id === currentTier);
            if (!active) return null;
            return (
              <div
                className="p-4 flex items-center gap-3 bg-zinc-950 backdrop-blur"
                style={{ borderLeft: `3px solid ${LIME}` }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: LIME, boxShadow: `0 0 10px ${LIME}` }}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className="text-[10px] uppercase tracking-[0.25em] font-bold"
                    style={{ color: LIME }}
                  >
                    Activ acum
                  </p>
                  <p className="text-sm font-bold uppercase italic truncate mt-0.5">
                    {active.name} · {active.coins} șprițuri/lună
                  </p>
                </div>
              </div>
            );
          })()}

        {/* BILLING TOGGLE */}
        <div className="flex gap-2 p-1 bg-zinc-900 border border-zinc-800">
          <button
            onClick={() => setAnnual(false)}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
              !annual ? "text-black" : "text-zinc-500"
            }`}
            style={!annual ? { background: LIME } : undefined}
          >
            Lunar
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
              annual ? "text-black" : "text-zinc-500"
            }`}
            style={annual ? { background: LIME } : undefined}
          >
            Anual <span className="opacity-80">(-17%)</span>
          </button>
        </div>

        {/* TIERS */}
        <section className="space-y-4">
          <SectionLabel>Abonamente</SectionLabel>
          {TIERS.map((tier) => {
            const isCurrent = currentTier === tier.id;
            const price = annual ? (tier.price * 10).toFixed(2) : tier.price.toFixed(2);
            const annualSaved = annual ? (tier.price * 12 - tier.price * 10).toFixed(2) : null;
            const featured = tier.id === "elite" || tier.id === "vip_plus";

            return (
              <div
                key={tier.id}
                className="relative p-6 bg-zinc-900 overflow-hidden"
                style={{
                  border: featured ? `2px solid ${LIME}` : "1px solid rgb(39,39,42)",
                  boxShadow: featured ? `0 0 40px ${LIME}15` : undefined,
                }}
              >
                {(tier.badge || isCurrent) && (
                  <div
                    className="absolute top-0 right-0 text-[10px] px-3 py-1 font-black uppercase tracking-wider"
                    style={{ background: LIME, color: "#000" }}
                  >
                    {isCurrent ? "Planul tău" : tier.badge}
                  </div>
                )}

                <div className="flex justify-between items-baseline mb-1 pr-20">
                  <h2 className="text-2xl font-bold uppercase italic">
                    {tier.name === "VIP+" ? (
                      <>
                        VIP<span style={{ color: LIME }}>+</span>
                      </>
                    ) : (
                      tier.name
                    )}
                  </h2>
                </div>
                <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-3">
                  {tier.italic} · {annual ? "anual" : "lunar"}
                </p>

                <p
                  className="font-black text-3xl mb-1 tabular-nums"
                  style={{ color: LIME }}
                >
                  {price}{" "}
                  <span className="text-xs text-zinc-500 font-normal lowercase">
                    RON {annual ? "/ an" : "/ lună"}
                  </span>
                </p>
                {annualSaved && (
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-3">
                    economisești {annualSaved} RON
                  </p>
                )}

                <p className="text-[12px] text-zinc-400 leading-relaxed italic mt-3 mb-4">
                  {tier.blurb}
                </p>

                <div className="space-y-3 border-t border-zinc-800 pt-4">
                  <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">
                    Ce primești
                  </p>
                  <ul className="space-y-2 text-sm">
                    {tier.perks.map((p) => (
                      <li key={p} className="flex items-start gap-2">
                        <span style={{ color: LIME }} className="mt-0.5">→</span>
                        <span className="text-zinc-200 leading-snug">{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => handleBuy(tier)}
                  disabled={isCurrent}
                  className="w-full mt-6 py-4 font-black uppercase text-sm tracking-wider transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={
                    isCurrent
                      ? { background: "transparent", border: `1px solid ${LIME}`, color: LIME }
                      : { background: LIME, color: "#000" }
                  }
                >
                  {isCurrent ? (
                    <>
                      <Check size={14} strokeWidth={3} /> Activ
                    </>
                  ) : (
                    <>
                      Devino {tier.name} <ArrowUpRight size={14} strokeWidth={2.5} />
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </section>

        {/* À LA CARTE */}
        <section className="space-y-4">
          <SectionLabel>À la carte · Deblocări</SectionLabel>
          <p className="text-[11px] text-zinc-500 uppercase tracking-wider">
            Cumperi o singură dată. Nu se reînnoiește.
          </p>

          {/* Crystal Ball */}
          <div className="border border-zinc-800 p-5 bg-zinc-950 hover:border-zinc-700 transition-colors">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="text-sm font-bold uppercase tracking-wider" style={{ color: LIME }}>
                  Crystal Ball
                </h4>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">
                  7 zile acces
                </p>
              </div>
              <div className="text-right">
                <span className="text-xl font-black tabular-nums">3</span>
                <span className="text-[10px] text-zinc-500 ml-1">RON</span>
              </div>
            </div>
            <p className="text-[12px] text-zinc-400 leading-relaxed mb-4">
              <b className="text-white">Ce primești:</b> deblochezi lista cu cine ți-a dat like,
              follow sau ți-a vizitat profilul în ultimele 7 zile. Vezi nume + foto, nu silueta blur.
            </p>
            <CrystalBallCard />
          </div>

          {/* Replay Night */}
          <Link
            to="/app/replay"
            className="block border border-zinc-800 p-5 bg-zinc-950 hover:border-zinc-700 transition-colors"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="text-sm font-bold uppercase tracking-wider" style={{ color: LIME }}>
                  Replay Night
                </h4>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">
                  per noapte
                </p>
              </div>
              <div className="text-right">
                <span className="text-xl font-black tabular-nums">9.99</span>
                <span className="text-[10px] text-zinc-500 ml-1">RON</span>
              </div>
            </div>
            <p className="text-[12px] text-zinc-400 leading-relaxed mb-3">
              <b className="text-white">Ce primești:</b> a doua zi dimineață, un wrap auto-generat
              al nopții tale — harta cu traseul, venue-urile vizitate, cine a fost cu tine,
              șprițurile băute, pozele din feed. Format 9:16, gata de Stories.
            </p>
            <div
              className="flex items-center justify-end gap-1 text-[10px] uppercase tracking-widest font-bold"
              style={{ color: LIME }}
            >
              Deschide <ArrowUpRight size={12} strokeWidth={2.5} />
            </div>
          </Link>

          {/* Last Call */}
          <Link
            to="/app/lastcalls"
            className="block border border-zinc-800 p-5 bg-zinc-950 hover:border-zinc-700 transition-colors"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="text-sm font-bold uppercase tracking-wider" style={{ color: LIME }}>
                  Last Call
                </h4>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">
                  ping + reveal
                </p>
              </div>
              <div className="text-right">
                <span className="text-xl font-black tabular-nums">2.99</span>
                <span className="text-[10px] text-zinc-500 ml-1">RON</span>
              </div>
            </div>
            <p className="text-[12px] text-zinc-400 leading-relaxed mb-3">
              <b className="text-white">Ce primești:</b> trimiți un ping anonim cuiva — primește o
              notificare „cineva vrea să te vadă diseară" fără să afle cine ești. Dacă vrea să afle,
              plătește <b className="text-white">4.99 RON</b> ca să te dezvăluie.
            </p>
            <div
              className="flex items-center justify-end gap-1 text-[10px] uppercase tracking-widest font-bold"
              style={{ color: LIME }}
            >
              Trimite ping <ArrowUpRight size={12} strokeWidth={2.5} />
            </div>
          </Link>

          {/* Profile Boost */}
          {ent.isActive && (
            <div className="border border-zinc-800 p-5 bg-zinc-950">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider" style={{ color: LIME }}>
                    Profile Boost
                  </h4>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">
                    3 ore vizibilitate
                  </p>
                </div>
              </div>
              <p className="text-[12px] text-zinc-400 leading-relaxed mb-4">
                <b className="text-white">Ce primești:</b> apari mai mare pe hartă + în topul
                feed-ului local timp de 3 ore. Ideal pentru vineri/sâmbătă seara.
              </p>
              <ProfileBoostCard />
            </div>
          )}
        </section>

        {/* COIN PACKS */}
        <section className="space-y-4">
          <SectionLabel>Pachete șprițuri</SectionLabel>
          <p className="text-[12px] text-zinc-400 leading-relaxed">
            <b className="text-white">Ce sunt:</b> monedă internă pentru cadouri în chat, frame-uri
            și boost-uri scurte. <b className="text-white">Nu expiră.</b>
          </p>
          <div className="space-y-2">
            {COIN_PACKS.map((p) => (
              <button
                key={p.id}
                onClick={() => handleCoins(p)}
                className="w-full flex items-center justify-between p-4 bg-zinc-950 border transition-colors hover:border-zinc-600 text-left"
                style={{
                  borderColor: p.popular ? LIME : "rgb(39,39,42)",
                  borderWidth: p.popular ? 2 : 1,
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-6 h-6 rounded-full shrink-0"
                    style={{ background: LIME, boxShadow: `0 0 12px ${LIME}66` }}
                  />
                  <div className="min-w-0">
                    <div className="font-bold uppercase text-sm tracking-wider truncate">
                      {p.coins} șprițuri
                      {p.popular && (
                        <span
                          className="ml-2 text-[10px] italic font-normal tracking-normal"
                          style={{ color: LIME }}
                        >
                          BEST VALUE
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest truncate">
                      {p.label}
                      {p.bonus ? ` · ${p.bonus} cadou` : ""}
                    </div>
                  </div>
                </div>
                <span className="text-sm font-black tabular-nums shrink-0" style={{ color: LIME }}>
                  {p.price}
                  <span className="text-[10px] text-zinc-500 ml-1">RON</span>
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
            className="w-full flex items-center justify-center gap-2 h-11 border border-zinc-700 uppercase text-[10px] tracking-[0.3em] font-bold disabled:opacity-50 active:scale-[0.99] transition text-zinc-300 hover:bg-zinc-900"
          >
            <Settings size={13} />
            {openingPortal ? "se deschide…" : "Gestionează abonament"}
          </button>
        )}

        {/* FAQ */}
        <section className="space-y-2">
          <SectionLabel>Întrebări frecvente</SectionLabel>
          <div className="divide-y divide-zinc-800 border-t border-zinc-800">
            {FAQ.map((f, i) => {
              const open = openFaq === i;
              return (
                <div key={i}>
                  <button
                    onClick={() => setOpenFaq(open ? null : i)}
                    className="w-full py-4 flex items-center justify-between gap-4 text-left"
                  >
                    <span className="text-sm font-bold text-zinc-200 uppercase tracking-tight">
                      {f.q}
                    </span>
                    <span className="w-5 h-5 flex items-center justify-center shrink-0" style={{ color: LIME }}>
                      {open ? <Minus size={16} strokeWidth={2.5} /> : <Plus size={16} strokeWidth={2.5} />}
                    </span>
                  </button>
                  {open && (
                    <p className="pb-5 pr-8 text-[12px] text-zinc-400 leading-relaxed">{f.a}</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Footer */}
        <footer className="pt-6 border-t border-zinc-900 space-y-3">
          <p className="text-center text-[10px] text-zinc-600 uppercase tracking-[0.3em] font-bold">
            Secured · Oxidații Pay
          </p>
          <p className="text-[11px] text-zinc-500 leading-relaxed text-center max-w-[40ch] mx-auto">
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

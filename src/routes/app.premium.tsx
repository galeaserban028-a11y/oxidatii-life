import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Settings, ArrowUpRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { PremiumBadge, type PremiumTier } from "@/components/app/PremiumBadge";
import { PremiumCheckoutDialog } from "@/components/PremiumCheckoutDialog";
import { createPremiumPortalSession } from "@/lib/premium.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { toast } from "sonner";

export const Route = createFileRoute("/app/premium")({
  head: () => ({ meta: [{ title: "Membership · OXIDAȚII" }] }),
  component: PremiumPage,
});

type Tier = {
  id: Exclude<PremiumTier, null | undefined>;
  index: string;
  name: string;
  italic: string; // serif word that becomes the "feel"
  price: number;
  coins: number;
  blurb: string;
  perks: string[];
  hue: string;        // text/border accent (oklch via inline style)
  surface: string;    // soft background tint
  badge?: string;
};

const HUE = {
  amber:   { fg: "oklch(0.85 0.13 75)",  bg: "oklch(0.85 0.13 75 / 0.06)" },
  blush:   { fg: "oklch(0.80 0.13 15)",  bg: "oklch(0.80 0.13 15 / 0.07)" },
  violet:  { fg: "oklch(0.78 0.13 305)", bg: "oklch(0.78 0.13 305 / 0.07)" },
  glacier: { fg: "oklch(0.86 0.08 200)", bg: "oklch(0.86 0.08 200 / 0.07)" },
};

const TIERS: Tier[] = [
  {
    id: "vip", index: "I.", name: "VIP", italic: "discret",
    price: 2.99, coins: 50, hue: HUE.amber.fg, surface: HUE.amber.bg,
    blurb: "Pentru cei care vor doar să arate că au gust. Fără paradă.",
    perks: ["Insignă VIP auriu", "50 șprițuri pe lună", "Reacții doar pentru club", "Fără reclame, nicăieri"],
  },
  {
    id: "vip_plus", index: "II.", name: "VIP+", italic: "curat",
    price: 4.99, coins: 150, hue: HUE.blush.fg, surface: HUE.blush.bg, badge: "cel mai luat",
    blurb: "Profilul tău începe să fie observat. Frame animat, teme, vederi.",
    perks: ["Tot din VIP", "Frame animat pe avatar", "5 teme exclusive de profil", "150 șprițuri pe lună", "Vezi cine ți-a dat rating"],
  },
  {
    id: "pro", index: "III.", name: "Pro", italic: "serios",
    price: 9.99, coins: 500, hue: HUE.violet.fg, surface: HUE.violet.bg,
    blurb: "Pentru regulari. Boost săptămânal, analytics, un music clip pe profil.",
    perks: ["Tot din VIP+", "1× Profile Boost / săptămână", "Reputation analytics complet", "Music clip 15s pe profil", "500 șprițuri pe lună", "Animated background"],
  },
  {
    id: "elite", index: "IV.", name: "Elite", italic: "rar",
    price: 14.99, coins: 1500, hue: HUE.glacier.fg, surface: HUE.glacier.bg, badge: "100 locuri",
    blurb: "O sută de oameni pe an. Numele tău rămâne pe perete.",
    perks: ["Tot din Pro", "Diamond badge holografic", "Featured pe Discover", "Founder recognition pe vecie", "Cadou aniversar fizic", "1500 șprițuri pe lună", "Acces beta features"],
  },
];

const COIN_PACKS = [
  { id: "coins_mic", coins: 50, price: 4.99, label: "Mic" },
  { id: "coins_mediu", coins: 200, price: 14.99, label: "Mediu", bonus: "+10%" },
  { id: "coins_mare", coins: 600, price: 39.99, label: "Mare", bonus: "+20%", popular: true },
  { id: "coins_boss", coins: 1500, price: 89.99, label: "Boss", bonus: "+35%" },
  { id: "coins_legenda", coins: 5000, price: 249, label: "Legendă", bonus: "+50%" },
];

const FAQ = [
  { q: "Pot să anulez oricând?", a: "Da. Un singur click. Beneficiile rămân până la final de perioadă." },
  { q: "Plătesc, intru pe locul 1?", a: "Nu. Nu vindem locuri în top. Niciodată. Doar cum arăți când ajungi acolo." },
  { q: "Ce sunt șprițurile?", a: "Sunt pentru lucruri cosmetice — cadouri în chat, boost-uri scurte, rame. Nu cumperi influență." },
  { q: "Și dacă mă răzgândesc?", a: "În primele 14 zile primești banii înapoi. Fără explicații, fără formulare." },
];

function PremiumPage() {
  const { profile } = useAuth();
  const [annual, setAnnual] = useState(false);
  const [checkout, setCheckout] = useState<{ priceId: string; title: string } | null>(null);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const currentTier = (profile as any)?.premium_tier as PremiumTier;

  const handleBuy = (tier: Tier) =>
    setCheckout({ priceId: `${tier.id}_${annual ? "yearly" : "monthly"}`, title: `${tier.name} ${annual ? "anual" : "lunar"}` });
  const handleCoins = (p: typeof COIN_PACKS[0]) =>
    setCheckout({ priceId: p.id, title: `${p.coins} {p.coins === 1 ? "șpriț" : "șprițuri"} · ${p.label}` });
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
    <div className="pb-24" style={{ background: "oklch(0.14 0.012 30)" }}>
      {/* Top bar — quiet */}
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-xl border-b border-foreground/10 px-3 h-12 flex items-center gap-2">
        <Link to="/app/me" className="p-1.5 -ml-1.5 active:scale-95 transition" aria-label="Înapoi">
          <ArrowLeft size={22} strokeWidth={2.2} />
        </Link>
        <div className="font-mono uppercase text-[10px] tracking-[0.3em] text-muted-foreground">Membership</div>
        {currentTier && <div className="ml-auto"><PremiumBadge tier={currentTier} size="sm" asLink={false} /></div>}
      </header>

      {/* COVER — magazine cover */}
      <section className="relative px-6 pt-10 pb-12 border-b border-foreground/15">
        <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.4em] text-muted-foreground">
          <span>Vol. 04</span>
          <span className="flex items-center gap-2">
            <span className="h-px w-8 bg-foreground/40" />
            membership
          </span>
        </div>

        <h1 className="mt-10 leading-[0.78] tracking-[-0.04em]">
          <span className="block font-display uppercase text-[clamp(2.8rem,13vw,5rem)] font-medium">Plătești</span>
          <span className="block text-[clamp(3.2rem,15vw,5.8rem)] italic font-normal" style={{ fontFamily: "'Instrument Serif', serif", color: "oklch(0.85 0.13 75)" }}>
            puțin.
          </span>
          <span className="block font-display uppercase text-[clamp(2.8rem,13vw,5rem)] font-medium mt-2">Arăți</span>
          <span className="block text-[clamp(3.2rem,15vw,5.8rem)] italic font-normal" style={{ fontFamily: "'Instrument Serif', serif", color: "oklch(0.72 0.20 40)" }}>
            mult.
          </span>
        </h1>

        <p className="mt-8 text-[15px] leading-relaxed text-foreground/80 max-w-[28ch]">
          Patru trepte. Niciuna nu-ți cumpără locul în top — doar
          <span className="italic" style={{ fontFamily: "'Instrument Serif', serif" }}> stilul</span>,
          <span className="italic" style={{ fontFamily: "'Instrument Serif', serif" }}> vizibilitatea</span> și câteva rânduri de aruncat pe masă.
        </p>

        {/* signature line */}
        <div className="mt-8 flex items-end justify-between">
          <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-muted-foreground/70">
            de la 2,99 lei / lună
          </div>
          <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-muted-foreground/70">
            06 · 2026
          </div>
        </div>
      </section>

      {/* Billing toggle — minimal, inline */}
      <section className="px-6 py-5 border-b border-foreground/10 flex items-center justify-between">
        <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-muted-foreground">Plătești</div>
        <div className="inline-flex items-center rounded-full border border-foreground/15 p-[3px] text-[11px] font-mono uppercase tracking-wider">
          <button
            onClick={() => setAnnual(false)}
            className={`px-3.5 py-1.5 rounded-full transition ${!annual ? "bg-foreground text-background" : "text-muted-foreground"}`}
          >Lunar</button>
          <button
            onClick={() => setAnnual(true)}
            className={`px-3.5 py-1.5 rounded-full transition flex items-center gap-1.5 ${annual ? "bg-foreground text-background" : "text-muted-foreground"}`}
          >
            Anual
            <span className={`text-[8px] px-1.5 py-[1px] rounded-full ${annual ? "bg-background/20" : "bg-foreground/10 text-foreground/80"}`}>−17%</span>
          </button>
        </div>
      </section>

      {/* TIERS — magazine spreads */}
      <section>
        {TIERS.map((tier, idx) => {
          const isCurrent = currentTier === tier.id;
          const price = annual ? (tier.price * 10).toFixed(2) : tier.price.toFixed(2);
          const annualSaved = annual ? (tier.price * 12 - tier.price * 10).toFixed(2) : null;
          return (
            <article
              key={tier.id}
              className="relative border-b border-foreground/15 px-6 py-10"
              style={{ background: `linear-gradient(180deg, transparent 0%, ${tier.surface} 100%)` }}
            >
              {/* index + name row */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.35em] text-muted-foreground/80">
                    {tier.index} membership
                  </div>
                  <div className="mt-2 flex items-baseline gap-3 flex-wrap">
                    <h2 className="font-display uppercase text-4xl tracking-tight" style={{ color: tier.hue }}>
                      {tier.name}
                    </h2>
                    <span className="text-3xl italic" style={{ fontFamily: "'Instrument Serif', serif", color: "oklch(0.75 0.02 60)" }}>
                      &amp; {tier.italic}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0 pt-1">
                  <div className="font-display text-3xl leading-none tabular-nums">
                    {price}
                  </div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mt-1">
                    lei {annual ? "/ an" : "/ lună"}
                  </div>
                  {annualSaved && (
                    <div className="text-[9px] italic mt-1 text-foreground/60" style={{ fontFamily: "'Instrument Serif', serif" }}>
                      economisești {annualSaved} lei
                    </div>
                  )}
                </div>
              </div>

              {/* badges row */}
              {(tier.badge || isCurrent) && (
                <div className="mt-3 flex items-center gap-2">
                  {tier.badge && (
                    <span className="text-[9px] font-mono uppercase tracking-[0.2em] px-2 py-1 rounded-full border border-foreground/20 text-foreground/70">
                      {tier.badge}
                    </span>
                  )}
                  {isCurrent && (
                    <span className="text-[9px] font-mono uppercase tracking-[0.2em] px-2 py-1 rounded-full" style={{ background: tier.hue, color: "oklch(0.15 0.02 30)" }}>
                      planul tău
                    </span>
                  )}
                </div>
              )}

              {/* lead blurb */}
              <p className="mt-5 text-[16px] leading-snug text-foreground/85 max-w-[34ch]"
                style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic" }}>
                „{tier.blurb}"
              </p>

              {/* perks — two columns, hairline separator */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 border-t border-foreground/10 pt-4">
                {tier.perks.map((p, i) => (
                  <div key={p} className="flex items-baseline gap-3 py-1.5 border-b border-foreground/5 last:border-b-0">
                    <span className="font-mono text-[9px] tabular-nums text-muted-foreground/60 w-5">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-[13px] text-foreground/90 leading-snug">{p}</span>
                  </div>
                ))}
              </div>

              {/* CTA — full bleed editorial button */}
              <button
                onClick={() => handleBuy(tier)}
                disabled={isCurrent}
                className={`mt-7 w-full h-12 rounded-full flex items-center justify-between px-5 transition active:scale-[0.985] ${
                  isCurrent
                    ? "border border-foreground/10 text-muted-foreground cursor-not-allowed"
                    : "text-background"
                }`}
                style={!isCurrent ? { background: tier.hue } : undefined}
              >
                <span className="font-mono uppercase text-[11px] tracking-[0.25em]">
                  {isCurrent ? "ești deja aici" : `Devino ${tier.name}`}
                </span>
                {!isCurrent && (
                  <span className="flex items-center gap-2 font-mono uppercase text-[11px] tracking-[0.25em]">
                    {price} lei
                    <ArrowUpRight size={16} strokeWidth={2.2} />
                  </span>
                )}
              </button>
            </article>
          );
        })}
      </section>

      {/* DRINKS — bar tab spread */}
      <section className="px-6 pt-12 pb-8 border-b border-foreground/15">
        <div className="flex items-baseline justify-between mb-1">
          <div className="font-mono text-[10px] uppercase tracking-[0.35em] text-muted-foreground">V. bar</div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70">tab la bar</div>
        </div>
        <h2 className="font-display uppercase text-3xl mt-2 leading-tight">
          Șprițurile pe care le <span className="italic font-normal" style={{ fontFamily: "'Instrument Serif', serif", color: "oklch(0.85 0.13 75)" }}>arunci pe masă.</span>
        </h2>
        <p className="text-[13px] text-foreground/70 mt-3 max-w-[36ch]">
          Cadouri, boost-uri, frame-uri. O dată plătite, le folosești când vrei. Nu expiră.
        </p>

        <div className="mt-6">
          {COIN_PACKS.map((p, idx) => (
            <button
              key={p.id}
              onClick={() => handleCoins(p)}
              className="w-full flex items-baseline gap-4 py-4 border-t border-foreground/15 last:border-b active:bg-foreground/[0.04] transition text-left group"
            >
              <div className="font-mono text-[10px] tabular-nums text-muted-foreground/70 w-8">
                {String(idx + 1).padStart(2, "0")}.
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="font-display uppercase text-lg tracking-tight">{p.label}</span>
                  <span className="text-lg italic text-muted-foreground/80" style={{ fontFamily: "'Instrument Serif', serif" }}>
                    {p.coins} {p.coins === 1 ? "șpriț" : "șprițuri"}
                  </span>
                  {p.bonus && (
                    <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300">{p.bonus} cadou</span>
                  )}
                  {p.popular && (
                    <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-[2px] rounded-sm bg-foreground text-background">
                      ales de mulți
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-display text-xl tabular-nums leading-none">{p.price}</div>
                <div className="text-[9px] font-mono uppercase text-muted-foreground/70 mt-1">lei</div>
              </div>
              <ArrowUpRight size={14} className="text-muted-foreground/40 group-hover:text-foreground transition" />
            </button>
          ))}
        </div>
      </section>

      {/* MANIFESTO — pull quote */}
      <section className="px-6 py-14 border-b border-foreground/15">
        <div className="font-mono text-[10px] uppercase tracking-[0.35em] text-muted-foreground mb-5">
          VI. manifest
        </div>
        <p className="text-[26px] leading-[1.15] tracking-tight"
          style={{ fontFamily: "'Instrument Serif', serif" }}>
          „Nu vindem locul <em>întâi</em>. Vindem doar cum arăți când <em>ajungi</em> acolo."
        </p>
        <div className="mt-6 h-px w-12 bg-foreground/30" />
        <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70">
          — echipa oxidații
        </div>
      </section>

      {/* FAQ — accordion, hairlines */}
      <section className="px-6 pt-10 pb-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.35em] text-muted-foreground mb-5">
          VII. întrebări
        </div>
        <div>
          {FAQ.map((f, i) => {
            const open = openFaq === i;
            return (
              <div key={i} className="border-t border-foreground/15 last:border-b">
                <button
                  onClick={() => setOpenFaq(open ? null : i)}
                  className="w-full py-4 flex items-baseline justify-between gap-4 text-left active:bg-foreground/[0.03] transition"
                >
                  <span className="text-[15px] text-foreground/90" style={{ fontFamily: "'Instrument Serif', serif" }}>
                    {f.q}
                  </span>
                  <span className="font-mono text-[18px] text-muted-foreground tabular-nums leading-none">
                    {open ? "−" : "+"}
                  </span>
                </button>
                {open && (
                  <div className="pb-5 pr-8 text-[13px] text-foreground/70 leading-relaxed">
                    {f.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Manage subscription */}
      {currentTier && (
        <div className="px-6 mt-6">
          <button
            onClick={handleManage}
            disabled={openingPortal}
            className="w-full flex items-center justify-center gap-2 h-11 rounded-full border border-foreground/20 font-mono uppercase text-[10px] tracking-[0.3em] disabled:opacity-50 active:scale-[0.99] transition"
          >
            <Settings size={13} />
            {openingPortal ? "se deschide…" : "Gestionează abonament"}
          </button>
        </div>
      )}

      {/* Colophon */}
      <footer className="px-6 mt-10 pt-6 border-t border-foreground/10">
        <div className="font-mono text-[9px] uppercase tracking-[0.35em] text-muted-foreground/60 flex items-center justify-between">
          <span>Oxidații Press</span>
          <span>Vol. 04 · Nr. 06</span>
        </div>
        <p className="mt-3 text-[10px] text-muted-foreground/50 leading-relaxed max-w-[40ch]">
          Toate plățile sunt securizate. Anulezi oricând, fără explicații. 14 zile garantat.
        </p>
      </footer>

      <PremiumCheckoutDialog
        priceId={checkout?.priceId ?? null}
        title={checkout?.title ?? ""}
        open={!!checkout}
        onClose={() => setCheckout(null)}
      />
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlcoholWarning } from "@/components/AlcoholWarning";
import logoLight from "@/assets/logo-oxidatii-light.png";
import {
  MapPin,
  Flame,
  Trophy,
  Users,
  ChevronRight,
  Sparkles,
  Star,
  Zap,
  Camera,
  Crown,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OXIDAȚII — Unde se bea șpriț în orașul tău, ACUM" },
      {
        name: "description",
        content:
          "Harta live de șpriț din Cluj, București, Timișoara, Iași. Vezi unde sunt prietenii, cine-i rege la masă, fă-ți haita. +18.",
      },
      { property: "og:title", content: "OXIDAȚII — Aplicația ta de șpriț" },
      {
        property: "og:description",
        content:
          "Harta live de șpriț + haita + clasament. Vezi unde se bea acum în orașul tău.",
      },
      { property: "og:url", content: "https://oxidatii.life/" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://oxidatii.life/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "MobileApplication",
          name: "OXIDAȚII",
          url: "https://oxidatii.life/",
          inLanguage: "ro-RO",
          applicationCategory: "SocialNetworkingApplication",
          operatingSystem: "iOS, Android, Web",
          offers: { "@type": "Offer", price: "0", priceCurrency: "RON" },
          description:
            "Harta live de șpriț + haita + clasament pentru studenți din România.",
        }),
      },
    ],
  }),
  component: Index,
});

function Index() {
  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get("ref");
      if (ref && /^[A-Z0-9]{4,12}$/i.test(ref)) {
        localStorage.setItem("pending_referral_code", ref.toUpperCase());
      }
    } catch {}
  }, []);

  return (
    <main className="relative min-h-[100svh] mx-auto max-w-md flex flex-col overflow-hidden bg-[#050510] text-white">
      {/* ambient glows */}
      <div className="absolute top-[5%] right-0 w-[70vmin] h-[70vmin] rounded-full pointer-events-none blur-[120px] bg-orange-600/25" />
      <div className="absolute bottom-[10%] -left-20 w-[55vmin] h-[55vmin] rounded-full pointer-events-none blur-[110px] bg-pink-600/20" />
      <div className="absolute top-[40%] left-1/2 -translate-x-1/2 w-[40vmin] h-[40vmin] rounded-full pointer-events-none blur-[100px] bg-purple-700/15" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <img
            src={logoLight}
            alt="Logo OXIDAȚII"
            className="w-10 h-10 object-contain drop-shadow-[0_4px_14px_rgba(255,49,88,0.5)]"
          />
          <div>
            <h1 className="text-sm font-extrabold tracking-widest uppercase">Oxidații</h1>
            <p className="font-mono text-[9px] text-orange-400/90 font-medium uppercase tracking-tight flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
              LIVE · 1.247 online
            </p>
          </div>
        </div>
        <Link
          to="/login"
          className="px-4 py-2 rounded-full bg-white/5 border border-white/10 font-mono text-[10px] font-bold uppercase tracking-widest text-white/80 active:scale-95 transition"
        >
          Login
        </Link>
      </header>

      {/* HERO — Punchline mare, social proof */}
      <section className="relative z-10 px-5 mb-8">
        <div className="relative p-7 rounded-[36px] overflow-hidden border border-white/10 bg-gradient-to-b from-white/[0.08] to-transparent backdrop-blur-sm">
          <div className="absolute top-0 right-0 w-48 h-48 bg-orange-600/35 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-pink-600/25 blur-3xl pointer-events-none" />

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 mb-5">
            <Sparkles className="w-3 h-3 text-orange-400" />
            <span className="font-mono text-[10px] font-bold tracking-widest text-orange-400 uppercase">
              #1 în campusuri 2026
            </span>
          </div>

          <h2 className="font-display text-[clamp(2.4rem,11.5vw,3.6rem)] font-black leading-[0.82] tracking-tighter mb-4 uppercase">
            Nu mai
            <br />
            întreba
            <br />
            <span className="italic text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500">
              „unde mergem?"
            </span>
          </h2>
          <p className="text-[15px] text-white/70 leading-relaxed mb-6 max-w-[300px]">
            Vezi pe hartă <span className="text-orange-400 font-bold">unde-i haita ta acum</span>,
            cine bea șpriț, și unde-i cea mai bună vibe. Live. Zero efort.
          </p>

          {/* Avatar stack social proof */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex -space-x-2">
              {[
                "from-orange-400 to-pink-500",
                "from-purple-500 to-blue-500",
                "from-pink-500 to-rose-500",
                "from-amber-400 to-orange-500",
              ].map((g, i) => (
                <div
                  key={i}
                  className={`w-7 h-7 rounded-full bg-gradient-to-br ${g} border-2 border-[#050510]`}
                />
              ))}
            </div>
            <div className="flex items-center gap-1">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3 h-3 fill-orange-400 text-orange-400" />
                ))}
              </div>
              <span className="font-mono text-[10px] text-white/60 ml-1">
                4.9 · 8.2k oxidați
              </span>
            </div>
          </div>

          <div className="space-y-2.5">
            <Link
              to="/signup"
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 font-extrabold text-sm uppercase tracking-widest shadow-[0_8px_32px_rgba(249,115,22,0.35)] flex items-center justify-center gap-2 group active:scale-[0.98] transition text-white"
            >
              Intră gratuit
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <p className="text-center font-mono text-[9px] text-white/40 uppercase tracking-widest">
              Fără card · 30 sec · +18
            </p>
          </div>
        </div>
      </section>

      {/* CITY TICKER — FOMO real-time */}
      <section className="relative z-10 px-5 mb-8">
        <div className="flex items-center gap-2 mb-3 px-2">
          <Flame className="w-3.5 h-3.5 text-orange-400" />
          <span className="font-mono text-[10px] font-bold tracking-[0.2em] text-white/50 uppercase">
            ACUM în orașe
          </span>
        </div>
        <div className="space-y-2">
          {[
            { city: "Cluj", spot: "Piezișă", n: 87, hot: true },
            { city: "București", spot: "Energiei", n: 64, hot: true },
            { city: "Timișoara", spot: "Fabric", n: 41, hot: false },
            { city: "Iași", spot: "Copou", n: 28, hot: false },
          ].map((r) => (
            <div
              key={r.city}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.06] backdrop-blur-sm"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-2 h-2 rounded-full ${
                    r.hot ? "bg-orange-500 animate-pulse" : "bg-white/30"
                  }`}
                />
                <div>
                  <div className="font-black text-sm uppercase tracking-wider">{r.city}</div>
                  <div className="font-mono text-[10px] text-white/40">{r.spot}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-black text-lg text-orange-400">{r.n}</div>
                <div className="font-mono text-[8px] text-white/40 uppercase tracking-widest">
                  oxidați
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* WHY — 3 reasons */}
      <section className="relative z-10 px-5 mb-8">
        <h3 className="font-display text-2xl font-black uppercase tracking-tight mb-5 px-2">
          De ce <span className="text-orange-400">Oxidații</span>?
        </h3>
        <div className="space-y-3">
          <Feature
            icon={<MapPin className="w-5 h-5" />}
            title="Hartă LIVE"
            sub="Vezi unde-i deschis, cine-i acolo, cât de plin e."
            tone="orange"
          />
          <Feature
            icon={<Users className="w-5 h-5" />}
            title="Haita ta"
            sub="Cheamă gașca într-un click. Fără 47 de mesaje pe grup."
            tone="pink"
          />
          <Feature
            icon={<Trophy className="w-5 h-5" />}
            title="Spritz Score"
            sub="Urcă în clasament. Devino regele șprițului în campusul tău."
            tone="amber"
          />
          <Feature
            icon={<Camera className="w-5 h-5" />}
            title="Faze & Reels"
            sub="Postează seara, vezi ce-au făcut alții, intră în Wrapped."
            tone="purple"
          />
        </div>
      </section>

      {/* TESTIMONIALE */}
      <section className="relative z-10 px-5 mb-8">
        <div className="flex items-center gap-2 mb-3 px-2">
          <Zap className="w-3.5 h-3.5 text-pink-400" />
          <span className="font-mono text-[10px] font-bold tracking-[0.2em] text-white/50 uppercase">
            Ce zic oxidații
          </span>
        </div>
        <Testimonial
          name="Andrei, 21"
          city="UBB Cluj"
          quote={`Frate, gata cu „unde sunteți?" pe WhatsApp. Deschid harta și-i văd pe toți.`}
        />
        <Testimonial
          name="Maria, 23"
          city="ASE București"
          quote="Mi-am făcut haita într-o săptămână. Acum ies în fiecare joi cu 10 oameni."
          highlight
        />
        <Testimonial
          name="Vlad, 19"
          city="Politehnica Timișoara"
          quote="Am ajuns #3 în Timișoara. Mama nu înțelege dar prietenii mei da."
        />
      </section>

      {/* FINAL CTA */}
      <section className="relative z-10 px-5 mb-10">
        <div className="relative p-6 rounded-[28px] overflow-hidden border border-orange-500/20 bg-gradient-to-br from-orange-500/10 via-pink-500/5 to-purple-500/10 backdrop-blur-sm">
          <Crown className="absolute top-4 right-4 w-16 h-16 text-orange-400/10" />
          <h3 className="font-display text-2xl font-black uppercase tracking-tight mb-2 leading-tight">
            Sezonul șprițului<br />
            <span className="text-orange-400">a început.</span>
          </h3>
          <p className="text-white/60 text-sm mb-5 max-w-[260px]">
            Fii primul din campusul tău. Cine ajunge primul la Top 100 primește badge permanent.
          </p>
          <Link
            to="/signup"
            className="w-full py-4 rounded-2xl bg-white text-black font-extrabold text-sm uppercase tracking-widest flex items-center justify-center gap-2 group active:scale-[0.98] transition shadow-xl"
          >
            Vreau în haita
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      {/* Footer mic legal */}
      <footer className="relative z-10 px-6 pb-10 space-y-3">
        <div className="flex items-center justify-center gap-5 font-mono text-[10px] text-white/30 uppercase tracking-widest">
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/cookies">Cookies</Link>
        </div>
        <p className="text-center font-mono text-[8px] text-white/20 uppercase tracking-[0.2em]">
          +18 · Alcoolul dăunează grav sănătății. Consumați responsabil.
        </p>
      </footer>

      <AlcoholWarning />
    </main>
  );
}

function Feature({
  icon,
  title,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  tone: "orange" | "pink" | "amber" | "purple";
}) {
  const toneMap: Record<string, { bg: string; text: string; border: string }> = {
    orange: {
      bg: "bg-orange-500/10",
      text: "text-orange-400",
      border: "border-orange-500/20",
    },
    pink: { bg: "bg-pink-500/10", text: "text-pink-400", border: "border-pink-500/20" },
    amber: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
    purple: {
      bg: "bg-purple-500/10",
      text: "text-purple-400",
      border: "border-purple-500/20",
    },
  };
  const t = toneMap[tone];
  return (
    <div
      className={`p-4 rounded-2xl bg-white/[0.03] border ${t.border} flex items-start gap-4`}
    >
      <div
        className={`shrink-0 w-11 h-11 rounded-xl ${t.bg} flex items-center justify-center ${t.text}`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-black text-[15px] uppercase tracking-wide mb-0.5">{title}</h4>
        <p className="text-[12px] text-white/55 leading-relaxed">{sub}</p>
      </div>
    </div>
  );
}

function Testimonial({
  name,
  city,
  quote,
  highlight,
}: {
  name: string;
  city: string;
  quote: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`p-4 rounded-2xl mb-2.5 backdrop-blur-sm ${
        highlight
          ? "bg-gradient-to-br from-orange-500/10 to-pink-500/5 border border-orange-500/20"
          : "bg-white/[0.04] border border-white/[0.06]"
      }`}
    >
      <p className="text-[13px] text-white/80 leading-relaxed mb-3 italic">"{quote}"</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-pink-500" />
          <div>
            <div className="font-bold text-[11px]">{name}</div>
            <div className="font-mono text-[9px] text-white/40 uppercase tracking-widest">
              {city}
            </div>
          </div>
        </div>
        <div className="flex gap-0.5">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="w-2.5 h-2.5 fill-orange-400 text-orange-400" />
          ))}
        </div>
      </div>
    </div>
  );
}

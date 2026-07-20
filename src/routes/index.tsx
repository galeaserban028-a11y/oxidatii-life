import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import i18n from "@/lib/i18n";
import { AlcoholWarning } from "@/components/AlcoholWarning";
import { SpritzIndexDial } from "@/components/app/SpritzIndexDial";
import logoLight from "@/assets/logo-oxidatii.png.asset.json";
import {
  MapPin,
  Flame,
  Trophy,
  Users,
  Beer,
  Bell,
  Search,
  Plus,
  ChevronRight,
  Languages,
} from "lucide-react";
import { OG_COVER_URL, SITE_URL } from "@/lib/og";

const HERO_HOT_SPOTS = [
  { city: "PITEȘTI", spot: "Terasa Trivale", n: 23 },
  { city: "BUCUREȘTI", spot: "Energiei", n: 41 },
  { city: "CLUJ", spot: "Strada Piezișă", n: 17 },
] as const;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OXIDAȚII — Aplicația de șpriț" },
      {
        name: "description",
        content:
          "Aplicația care-ți spune unde se bea șpriț acum, cu cine, și cine e rege la masă. Doar pentru +18.",
      },
      { property: "og:title", content: "OXIDAȚII — Hai la șpriț în Dumnezeul oxidaților." },
      {
        property: "og:description",
        content: "Aplicația care-ți spune unde se bea șpriț acum, cu cine, și cine e rege la masă.",
      },
      { property: "og:url", content: `${SITE_URL}/` },
      { property: "og:type", content: "website" },
      { property: "og:image", content: OG_COVER_URL },
      { property: "og:image:width", content: "1216" },
      { property: "og:image:height", content: "640" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_COVER_URL },
      { name: "twitter:title", content: "OXIDAȚII — Aplicația de șpriț" },
      {
        name: "twitter:description",
        content: "Unde se bea șpriț acum, cu cine, și cine e rege la masă.",
      },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "OXIDAȚII",
          url: `${SITE_URL}/`,
          inLanguage: "ro-RO",
          description:
            "Aplicația care-ți spune unde se bea șpriț acum, cu cine, și cine e rege la masă.",
        }),
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [lang, setLang] = useState<"ro" | "en">("ro");
  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get("ref");
      if (ref && /^[A-Z0-9]{4,12}$/i.test(ref)) {
        localStorage.setItem("pending_referral_code", ref.toUpperCase());
      }
      const stored = window.localStorage.getItem("oxi-lang");
      if (stored === "en" || stored === "ro") setLang(stored);
    } catch { /* noop */ }
  }, []);
  const pickLang = (next: "ro" | "en") => {
    setLang(next);
    try {
      window.localStorage.setItem("oxi-lang", next);
    } catch { /* noop */ }
    void i18n.changeLanguage(next);
  };
  const t =
    lang === "en"
      ? {
          onlineNow: "1.2k Online Now",
          pickLang: "Pick your language",
          season: "Spritz Season • 2026",
          heroLine1: "Come for a",
          heroWord: "Spritz",
          heroDesc1: "Where people are drinking spritz ",
          heroDescNow: "now",
          heroDesc2: ". Who with. And who's ",
          heroDescKing: "king of the table",
          heroDesc3: ".",
          ctaJoin: "Enter the chaos",
          ctaHave: "I have an account",
          featuresLabel: "What you'll find inside",
          zones: "4 ZONES",
          tMap: "Map",
          tMapSub: "Live places",
          tFaze: "Moments",
          tFazeSub: "Post your night",
          tTop: "Top",
          tTopSub: "God ranking",
          tSquad: "Squad",
          tSquadSub: "Your oxidații",
          liveTitle: "Drinking right now",
          seeAll: "See all",
          dockMap: "Map",
          dockFaze: "Moments",
          dockTop: "Top",
          dockMe: "Me",
          addSpot: "Add spot",
          legal: "Alcohol seriously harms health. Please drink responsibly.",
        }
      : {
          onlineNow: "1.2k Online Acum",
          pickLang: "Alege limba",
          season: "Sezonul Șprițului • 2026",
          heroLine1: "Hai la",
          heroWord: "Șpriț",
          heroDesc1: "Unde se bea șpriț ",
          heroDescNow: "acum",
          heroDesc2: ". Cu cine. Și cine-i ",
          heroDescKing: "rege la masă",
          heroDesc3: ".",
          ctaJoin: "Intră în haos",
          ctaHave: "Am cont",
          featuresLabel: "Ce găsești în app",
          zones: "4 ZONE",
          tMap: "Hartă",
          tMapSub: "Locuri Live",
          tFaze: "Faze",
          tFazeSub: "Postează seara",
          tTop: "Top",
          tTopSub: "Clasament zeu",
          tSquad: "Haita",
          tSquadSub: "Oxidații tăi",
          liveTitle: "Se bea acum",
          seeAll: "Vezi tot",
          dockMap: "Hartă",
          dockFaze: "Faze",
          dockTop: "Top",
          dockMe: "Eu",
          addSpot: "Adaugă spot",
          legal: "Alcoolul dăunează grav sănătății. Consumați responsabil.",
        };
  return (
    <main className="relative min-h-[100svh] mx-auto max-w-md flex flex-col overflow-hidden bg-[#050510] text-white">
      {/* ambient glows */}
      <div className="absolute top-[10%] right-0 w-[60vmin] h-[60vmin] rounded-full pointer-events-none blur-[100px] bg-orange-600/20" />
      <div className="absolute bottom-[20%] -left-20 w-[50vmin] h-[50vmin] rounded-full pointer-events-none blur-[100px] bg-pink-600/15" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <img
            src={logoLight.url}
            alt="Logo OXIDAȚII"
            className="w-11 h-11 object-contain drop-shadow-[0_4px_14px_rgba(255,49,88,0.45)]"
          />
          <div>
            <h1 className="text-sm font-extrabold tracking-widest uppercase">Oxidații</h1>
            <p className="font-mono text-[10px] text-orange-500/80 font-medium uppercase tracking-tight">
              {t.onlineNow}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            aria-label="Caută"
            className="p-2.5 rounded-full bg-white/5 border border-white/10 active:scale-95 transition"
          >
            <Search className="w-4 h-4 text-white/70" />
          </button>
          <button
            aria-label="Notificări"
            className="p-2.5 rounded-full bg-white/5 border border-white/10 relative active:scale-95 transition"
          >
            <Bell className="w-4 h-4 text-white/70" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full border-2 border-[#050510]" />
          </button>
        </div>
      </header>

      {/* Language picker — șpriț style */}
      <section className="relative z-10 px-4 mb-5">
        <div className="relative p-4 rounded-2xl border border-orange-500/20 bg-gradient-to-r from-orange-500/10 via-pink-500/5 to-transparent overflow-hidden">
          <div className="absolute -top-6 -right-6 w-24 h-24 bg-orange-500/20 blur-3xl pointer-events-none" />
          <div className="flex items-center gap-2 mb-3">
            <Languages className="w-3.5 h-3.5 text-orange-400" />
            <span className="font-mono text-[10px] font-black tracking-[0.2em] text-orange-400 uppercase">
              {t.pickLang}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => pickLang("ro")}
              className={`py-3 rounded-xl font-extrabold text-xs uppercase tracking-widest transition active:scale-[0.97] ${
                lang === "ro"
                  ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg shadow-orange-500/30"
                  : "bg-white/5 border border-white/10 text-white/60"
              }`}
            >
              🇷🇴 Română
            </button>
            <button
              onClick={() => pickLang("en")}
              className={`py-3 rounded-xl font-extrabold text-xs uppercase tracking-widest transition active:scale-[0.97] ${
                lang === "en"
                  ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg shadow-orange-500/30"
                  : "bg-white/5 border border-white/10 text-white/60"
              }`}
            >
              🇬🇧 English
            </button>
          </div>
        </div>
      </section>

      {/* Hero */}
      <section className="relative z-10 px-4 mb-6">
        <div className="relative p-7 rounded-[32px] overflow-hidden border border-white/10 bg-gradient-to-b from-white/[0.08] to-transparent">
          <div className="absolute top-0 right-0 w-40 h-40 bg-orange-600/30 blur-3xl pointer-events-none" />
          <div className="inline-block px-3 py-1 rounded-full border border-orange-500/30 bg-orange-500/10 mb-4">
            <span className="font-mono text-[10px] font-bold tracking-widest text-orange-400 uppercase">
              {t.season}
            </span>
          </div>
          <h2 className="font-display text-[clamp(2.6rem,12vw,3.5rem)] font-extrabold leading-[0.85] tracking-tighter mb-4 uppercase">
            {t.heroLine1}
            <br />
            <span className="italic text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-500">
              {t.heroWord}
            </span>
          </h2>
          <p className="text-sm text-white/60 leading-relaxed mb-7 max-w-[260px]">
            {t.heroDesc1}
            <span className="text-white font-bold">{t.heroDescNow}</span>
            {t.heroDesc2}
            <span className="text-orange-400">{t.heroDescKing}</span>
            {t.heroDesc3}
          </p>
          <div className="space-y-3">
            <Link
              to="/signup"
              onClick={(e) => {
                const el = e.currentTarget;
                if (el.dataset.tapped === "1") {
                  e.preventDefault();
                  return;
                }
                el.dataset.tapped = "1";
                el.style.pointerEvents = "none";
                el.style.opacity = "0.6";
              }}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 font-extrabold text-sm uppercase tracking-widest shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 group active:scale-[0.98] transition text-white"
            >
              {t.ctaJoin}
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/signup"
              onClick={(e) => {
                const el = e.currentTarget;
                if (el.dataset.tapped === "1") {
                  e.preventDefault();
                  return;
                }
                el.dataset.tapped = "1";
                el.style.pointerEvents = "none";
                el.style.opacity = "0.6";
              }}
              className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 font-bold text-xs uppercase tracking-widest text-white/70 flex items-center justify-center active:scale-[0.98] transition"
            >
              {t.ctaHave}
            </Link>
          </div>
        </div>
      </section>


      {/* Features Grid */}
      <section className="relative z-10 px-4 mb-8">
        <div className="flex justify-between items-center mb-4 px-2">
          <span className="font-mono text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase">
            {t.featuresLabel}
          </span>
          <span className="font-mono text-[10px] text-orange-500/60">{t.zones}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Tile
            to="/app/map"
            icon={<MapPin className="w-5 h-5" />}
            label={t.tMap}
            sub={t.tMapSub}
            tone="orange"
          />
          <Tile
            to="/app/faze"
            icon={<Flame className="w-5 h-5" />}
            label={t.tFaze}
            sub={t.tFazeSub}
            tone="pink"
          />
          <Tile
            to="/app/top"
            icon={<Trophy className="w-5 h-5" />}
            label={t.tTop}
            sub={t.tTopSub}
            tone="amber"
          />
          <Tile
            to="/app/squad"
            icon={<Users className="w-5 h-5" />}
            label={t.tSquad}
            sub={t.tSquadSub}
            tone="purple"
          />
        </div>
      </section>

      {/* Spritz Index */}
      <section className="relative z-10 px-4 mb-6">
        <SpritzIndexDial compact />
      </section>

      {/* Live Activity */}
      <section className="relative z-10 px-4 mb-28">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-2">
              <Beer className="w-4 h-4 text-orange-400" />
              <span className="font-mono text-[10px] font-black uppercase tracking-[0.2em]">
                {t.liveTitle}
              </span>
            </div>
            <Link
              to="/app"
              className="font-mono text-[10px] font-bold text-orange-400 uppercase tracking-widest flex items-center gap-1"
            >
              {t.seeAll} <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <ul className="space-y-4 font-mono">
            {HERO_HOT_SPOTS.map((r) => (
              <li key={r.city} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                  <span className="font-bold">{r.city}</span>
                  <span className="text-white/30 font-light">• {r.spot}</span>
                </div>
                <span className="text-orange-400/80">{r.n} oxi</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* spacer */}
      <div className="h-4" />

      {/* Bottom Dock */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 z-30 w-full max-w-md p-4 bg-gradient-to-t from-[#050510] via-[#050510]/90 to-transparent pointer-events-none">
        <nav className="bg-white/10 border border-white/10 rounded-full flex items-center justify-between px-5 py-2.5 pointer-events-auto">
          <DockItem to="/app" icon={<MapPin className="w-5 h-5" />} label={t.dockMap} />
          <DockItem to="/app/faze" icon={<Flame className="w-5 h-5" />} label={t.dockFaze} />
          <div className="-mt-10">
            <Link
              to="/signup"
              aria-label={t.addSpot}
              className="w-14 h-14 rounded-full bg-gradient-to-tr from-orange-500 to-pink-600 flex items-center justify-center shadow-xl shadow-orange-500/40 border-4 border-[#050510] active:scale-95 transition"
            >
              <Plus className="w-7 h-7 text-white" />
            </Link>
          </div>
          <DockItem to="/app/top" icon={<Trophy className="w-5 h-5" />} label={t.dockTop} />
          <DockItem to="/login" icon={<Users className="w-5 h-5" />} label={t.dockMe} />
        </nav>
        <p className="text-center font-mono text-[8px] text-white/20 uppercase tracking-[0.2em] mt-3">
          {t.legal}
        </p>
      </div>

      <AlcoholWarning />
    </main>
  );
}

function Tile({
  to,
  icon,
  label,
  sub,
  tone,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  sub: string;
  tone: "orange" | "pink" | "amber" | "purple";
}) {
  const toneMap: Record<string, { bg: string; text: string }> = {
    orange: { bg: "bg-orange-500/10", text: "text-orange-400" },
    pink: { bg: "bg-pink-500/10", text: "text-pink-400" },
    amber: { bg: "bg-amber-500/10", text: "text-amber-400" },
    purple: { bg: "bg-purple-500/10", text: "text-purple-400" },
  };
  const t = toneMap[tone];
  return (
    <Link
      to={to}
      className="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col justify-between aspect-square active:scale-[0.97] transition hover:bg-white/[0.08]"
    >
      <div className="flex justify-between items-start">
        <div className={`w-10 h-10 rounded-xl ${t.bg} flex items-center justify-center ${t.text}`}>
          {icon}
        </div>
        <ChevronRight className="w-4 h-4 text-white/20" />
      </div>
      <div>
        <h3 className="font-black text-sm uppercase tracking-wider mb-0.5">{label}</h3>
        <p className="font-mono text-[10px] text-white/40 uppercase tracking-tight">{sub}</p>
      </div>
    </Link>
  );
}

function DockItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-0.5 py-1 px-2 text-white/40 hover:text-white transition"
    >
      {icon}
      <span className="font-mono text-[8px] uppercase tracking-[0.2em] leading-none">{label}</span>
    </Link>
  );
}

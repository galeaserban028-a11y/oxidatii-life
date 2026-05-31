import { createFileRoute, Link } from "@tanstack/react-router";
import { AlcoholWarning } from "@/components/AlcoholWarning";
import logoLight from "@/assets/logo-oxidatii-light.png";
import { MapPin, Flame, Trophy, Users, Beer, Bell, Search, Plus, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OXIDAȚII — Aplicația de șpriț" },
      { name: "description", content: "Aplicația care-ți spune unde se bea șpriț acum, cu cine, și cine e rege la masă. Doar pentru +18." },
      { property: "og:title", content: "OXIDAȚII — Hai la șpriț în Dumnezeul oxidaților." },
      { property: "og:description", content: "Aplicația care-ți spune unde se bea șpriț acum, cu cine, și cine e rege la masă." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="relative min-h-[100svh] mx-auto max-w-md flex flex-col overflow-hidden">
      {/* ambient glow */}
      <div
        className="absolute -top-32 -right-24 w-[80vmin] h-[80vmin] rounded-full pointer-events-none blur-3xl"
        style={{ background: "radial-gradient(circle, oklch(0.72 0.22 35 / 45%), transparent 65%)" }}
      />
      <div
        className="absolute -bottom-40 -left-20 w-[70vmin] h-[70vmin] rounded-full pointer-events-none blur-3xl"
        style={{ background: "radial-gradient(circle, oklch(0.55 0.25 350 / 35%), transparent 70%)" }}
      />

      {/* fake status bar */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-3 pb-1 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
        <span>22:48</span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-sunset-orange animate-pulse" />
          live
        </span>
      </div>

      {/* app header */}
      <header className="relative z-10 flex items-center justify-between px-5 pt-2 pb-3">
        <div className="flex items-center gap-2">
          <img src={logoLight} alt="OXIDAȚII" className="h-9 w-9 rounded-xl object-cover" />
          <div className="leading-tight">
            <div className="font-display uppercase text-base tracking-[0.06em]">Oxidații</div>
            <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground">1.2k online</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button aria-label="Caută" className="h-9 w-9 grid place-items-center rounded-full border border-border bg-card/60 backdrop-blur">
            <Search className="h-4 w-4" />
          </button>
          <button aria-label="Notificări" className="h-9 w-9 grid place-items-center rounded-full border border-border bg-card/60 backdrop-blur relative">
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-sunset-orange" />
          </button>
        </div>
      </header>

      {/* hero card */}
      <section className="relative z-10 mx-5 mt-2 rounded-3xl border border-border bg-card/60 backdrop-blur p-5 overflow-hidden">
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-primary/40 bg-primary/10 mb-3">
          <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-primary">sezonul șprițului · 2026</span>
        </div>
        <h1 className="font-display uppercase text-[clamp(2.2rem,9vw,3rem)] leading-[0.85] tracking-[-0.03em]">
          <span className="block">Hai la</span>
          <span className="block text-gradient-chaos">șpriț</span>
          <span className="block">în zeu' oxidaților.</span>
        </h1>
        <p className="mt-3 text-sm leading-snug text-foreground/85">
          Unde se bea șpriț <b>acum</b>. Cu cine. Și cine-i <span className="text-sunset-orange">rege la masă</span>.
        </p>

        <div className="mt-4 flex flex-col gap-2">
          <Link
            to="/signup"
            className="font-display uppercase text-sm tracking-[0.12em] px-5 py-3.5 rounded-xl text-primary-foreground text-center shadow-lg shadow-primary/30 active:scale-[0.98] transition"
            style={{ background: "var(--gradient-sunset)" }}
          >
            Intră în haos →
          </Link>
          <Link
            to="/login"
            className="font-mono text-[11px] uppercase tracking-[0.2em] py-3 rounded-xl border border-border text-center hover:border-primary hover:text-primary transition"
          >
            Am cont
          </Link>
        </div>
      </section>

      {/* app tiles */}
      <section className="relative z-10 px-5 mt-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">ce găsești în app</h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">4 zone</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <Tile to="/app/map" icon={<MapPin className="h-5 w-5" />} label="Hartă" sub="Locuri live" tone="orange" />
          <Tile to="/app/faze" icon={<Flame className="h-5 w-5" />} label="Faze" sub="Postează seara" tone="magenta" />
          <Tile to="/app/top" icon={<Trophy className="h-5 w-5" />} label="Top" sub="Clasament zeu" tone="amber" />
          <Tile to="/app/squad" icon={<Users className="h-5 w-5" />} label="Haita" sub="Oxidații tăi" tone="indigo" />
        </div>
      </section>

      {/* now serving strip */}
      <section className="relative z-10 mx-5 mt-5 rounded-2xl border border-border bg-card/40 backdrop-blur p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Beer className="h-4 w-4 text-sunset-orange" />
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">se bea acum</span>
          </div>
          <Link to="/app" className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary flex items-center gap-0.5">
            vezi tot <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <ul className="space-y-2">
          {[
            { city: "Pitești", spot: "Terasa Trivale", n: 23 },
            { city: "București", spot: "Energiei", n: 41 },
            { city: "Cluj", spot: "Strada Piezișă", n: 17 },
          ].map((r) => (
            <li key={r.city} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-sunset-orange animate-pulse" />
                <span className="font-display uppercase tracking-wide">{r.city}</span>
                <span className="text-muted-foreground">· {r.spot}</span>
              </span>
              <span className="font-mono text-[11px] text-foreground/80">{r.n} oxi</span>
            </li>
          ))}
        </ul>
      </section>

      {/* spacer for bottom dock */}
      <div className="h-20" />

      {/* bottom app dock (preview/CTA) */}
      <nav className="fixed bottom-2 left-1/2 -translate-x-1/2 z-20 w-[calc(100%-1rem)] max-w-md">
        <div className="mx-2 rounded-xl border border-border bg-background/85 backdrop-blur-xl shadow-2xl shadow-black/40 px-1.5 py-1.5 flex items-center justify-between">
          <DockItem to="/app" icon={<MapPin className="h-3.5 w-3.5" />} label="Hartă" />
          <DockItem to="/app/faze" icon={<Flame className="h-3.5 w-3.5" />} label="Faze" />
          <Link
            to="/signup"
            aria-label="Adaugă spot"
            className="h-10 w-10 -mt-4 grid place-items-center rounded-full text-primary-foreground shadow-lg shadow-primary/40 active:scale-95 transition"
            style={{ background: "var(--gradient-sunset)" }}
          >
            <Plus className="h-4 w-4" />
          </Link>
          <DockItem to="/app/top" icon={<Trophy className="h-3.5 w-3.5" />} label="Top" />
          <DockItem to="/login" icon={<Users className="h-3.5 w-3.5" />} label="Eu" />
        </div>
      </nav>


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
  tone: "orange" | "magenta" | "amber" | "indigo";
}) {
  const toneMap: Record<string, string> = {
    orange: "from-sunset-orange/25 to-transparent text-sunset-orange",
    magenta: "from-sunset-magenta/25 to-transparent text-sunset-magenta",
    amber: "from-sunset-amber/25 to-transparent text-sunset-amber",
    indigo: "from-sunset-indigo/25 to-transparent text-sunset-indigo",
  };
  return (
    <Link
      to={to}
      className="relative rounded-2xl border border-border bg-card/60 backdrop-blur p-3.5 overflow-hidden active:scale-[0.98] transition"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${toneMap[tone]} opacity-70 pointer-events-none`} />
      <div className="relative flex items-center justify-between">
        <span className={`h-9 w-9 grid place-items-center rounded-xl bg-background/60 border border-border ${toneMap[tone].split(" ").pop()}`}>
          {icon}
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="relative mt-3">
        <div className="font-display uppercase text-sm tracking-[0.06em]">{label}</div>
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{sub}</div>
      </div>
    </Link>
  );
}

function DockItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="flex-1 flex flex-col items-center gap-0 py-1 text-muted-foreground hover:text-foreground transition"
    >
      {icon}
      <span className="font-mono text-[8px] uppercase tracking-[0.2em] leading-none mt-0.5">{label}</span>
    </Link>
  );
}

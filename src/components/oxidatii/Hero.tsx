import { Link } from "@tanstack/react-router";
import logoLight from "@/assets/logo-oxidatii-light.png";

export function Hero() {
  return (
    <section className="relative min-h-[100svh] flex flex-col justify-between overflow-hidden pt-16 pb-6 px-5">
      {/* glow blobs */}
      <div
        className="absolute -top-32 -right-24 w-[80vmin] h-[80vmin] rounded-full pointer-events-none blur-2xl"
        style={{ background: "radial-gradient(circle, oklch(0.72 0.22 35 / 55%), transparent 65%)" }}
      />
      <div
        className="absolute -bottom-40 -left-20 w-[70vmin] h-[70vmin] rounded-full pointer-events-none blur-3xl"
        style={{ background: "radial-gradient(circle, oklch(0.55 0.25 350 / 40%), transparent 70%)" }}
      />

      <img
        src={logoLight}
        alt=""
        aria-hidden
        className="absolute right-[-12vw] bottom-[18vh] w-[90vmin] opacity-[0.07] pointer-events-none select-none mix-blend-screen"
      />

      {/* TOP — live ticker */}
      <div className="relative z-10 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-sunset-orange animate-pulse" />
          live · 1.2k oxidați online
        </span>
        <span>18+</span>
      </div>

      {/* MIDDLE — the punch */}
      <div className="relative z-10 flex-1 flex flex-col justify-center py-8">
        <div className="inline-flex self-start items-center gap-1.5 px-2.5 py-1 rounded-full border border-primary/40 bg-primary/10 mb-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
            sezonul șprițului · ep. 2026
          </span>
        </div>

        <h1 className="font-display uppercase text-[clamp(3.2rem,15vw,6rem)] leading-[0.82] tracking-[-0.04em]">
          <span className="block">DIN LORD AL</span>
          <span className="block text-gradient-chaos">SEMINȚELOR</span>
          <span className="block">ÎN DUMNEZEUL</span>
          <span className="block">OXIDAȚILOR.</span>
        </h1>

        <p className="mt-5 text-base leading-snug text-foreground/85 max-w-sm">
          Aplicația care-ți spune <b>unde se bea șpriț acum</b>,
          cu cine, și cine e <span className="text-sunset-orange">rege la masă</span>.
          <br />
          <span className="text-muted-foreground">Postezi poza. Urci în top. Ești ZEU' până dimineață.</span>
        </p>
      </div>

      {/* BOTTOM — sticky-feel CTA stack */}
      <div className="relative z-10 flex flex-col gap-2">
        <Link
          to="/signup"
          className="font-display uppercase text-base tracking-[0.12em] px-6 py-4 rounded-xl text-primary-foreground text-center shadow-lg shadow-primary/30 active:scale-[0.98] transition"
          style={{ background: "var(--gradient-sunset)" }}
        >
          Intră în haos →
        </Link>
        <div className="flex gap-2">
          <Link
            to="/login"
            className="flex-1 font-mono text-[11px] uppercase tracking-[0.2em] py-3 rounded-xl border border-border text-center hover:border-primary hover:text-primary transition"
          >
            Am cont
          </Link>
          <a
            href="#cum-merge"
            className="flex-1 font-mono text-[11px] uppercase tracking-[0.2em] py-3 rounded-xl border border-border text-center hover:border-primary hover:text-primary transition"
          >
            Cum merge?
          </a>
        </div>

        <div className="mt-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <span>16 orașe</span>
          <span>·</span>
          <span>120+ locuri</span>
          <span>·</span>
          <span>23 haite</span>
        </div>
      </div>
    </section>
  );
}

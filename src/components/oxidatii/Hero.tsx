import { Link } from "@tanstack/react-router";
import logoLight from "@/assets/logo-oxidatii-light.png";

export function Hero() {
  return (
    <section className="relative min-h-[80svh] flex items-end overflow-hidden pt-20 pb-8">
      <div className="absolute inset-0 opacity-30" />

      <div className="absolute -top-20 -right-20 w-[50vmin] h-[50vmin] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, oklch(0.72 0.18 40 / 30%), transparent 60%)" }} />

      <img
        src={logoLight}
        alt=""
        aria-hidden
        className="absolute right-[-6vw] bottom-[2vh] w-[55vmin] max-w-[480px] opacity-[0.12] pointer-events-none select-none mix-blend-screen"
      />

      <div className="relative z-10 w-full max-w-6xl mx-auto px-5 md:px-8">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-3">
          Ziarul nopții · scris de oraș
        </div>

        <h1 className="font-display uppercase text-[clamp(2.4rem,10vw,7rem)] leading-[0.86] tracking-tighter">
          <span className="block">IA UITE</span>
          <span className="block">CE E <span className="text-gradient-chaos">AFARĂ</span></span>
        </h1>

        <div className="mt-4 max-w-xl border-l-2 border-primary/40 pl-3">
          <p className="text-sm md:text-base leading-relaxed text-foreground/80">
            <b>Oxidații</b>. Sufletul petrecerii și al șprițurilor. 
            Vezi ce se-ntâmplă acum în orașul tău — cluburi, terase, haite, oameni. 
            <span className="text-sunset-orange">Postezi. Urci. Ești ZEU'.</span>
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Link
            to="/signup"
            className="font-display uppercase text-sm tracking-[0.12em] px-6 py-3 rounded-md text-primary-foreground"
            style={{ background: "var(--gradient-sunset)" }}
          >
            Intră în haos →
          </Link>
          <Link
            to="/login"
            className="font-mono text-xs uppercase tracking-[0.2em] px-5 py-3 rounded-md border border-border hover:border-primary hover:text-primary transition"
          >
            Am cont
          </Link>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            18+ · bea cu cap
          </span>
        </div>

        <div className="mt-6 flex items-center gap-4 flex-wrap text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          <span>16 orașe</span>
          <span className="text-border">|</span>
          <span>120+ locuri</span>
          <span className="text-border">|</span>
          <span>47 străzi</span>
          <span className="text-border">|</span>
          <span>23 haite</span>
        </div>
      </div>
    </section>
  );
}

import { Link } from "@tanstack/react-router";

export function Hero() {
  return (
    <section className="relative min-h-[100svh] flex items-end overflow-hidden noise pt-24 pb-10">
      <div className="absolute inset-0 grid-bg opacity-60" />

      {/* Glow blobs */}
      <div className="absolute -top-40 -left-40 w-[80vmin] h-[80vmin] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, oklch(0.62 0.28 305 / 35%), transparent 60%)" }} />
      <div className="absolute -bottom-40 -right-40 w-[80vmin] h-[80vmin] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, oklch(0.68 0.27 340 / 28%), transparent 60%)" }} />

      {/* Tabloid stamp */}
      <div className="absolute top-24 right-4 md:right-10 rotate-[6deg] border-2 border-neon-crimson px-3 py-1.5">
        <div className="font-display text-neon-crimson text-[10px] md:text-xs uppercase leading-none">EDIȚIE LIVE · NOAPTE</div>
        <div className="font-mono text-[9px] text-neon-crimson/80 uppercase mt-1">nr. 001 · România</div>
      </div>

      <div className="relative z-10 w-full max-w-6xl mx-auto px-5 md:px-8">
        <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-neon-purple mb-4">
          // ziarul nopții · scris de oraș
        </div>

        <h1 className="font-display uppercase text-[clamp(3rem,14vw,11rem)] leading-[0.82] tracking-tighter">
          <span className="block">ORAȘUL TĂU</span>
          <span className="block">E <span className="text-gradient-chaos">VIU</span> ACUM.</span>
        </h1>

        <div className="mt-6 max-w-2xl border-l-2 border-neon-purple pl-4">
          <p className="text-base md:text-lg leading-relaxed text-foreground/85">
            OXIDAȚII e <b>internetul real al nopții din România</b>. Toate cluburile, toate străzile,
            toate haitele, toți oamenii. Vezi ce se întâmplă acum în Pitești pe Victoriei, în Centrul Vechi,
            la Cluj pe Piezișă. <span className="text-neon-purple">Postezi. Urci. Devii legendă de cartier.</span>
          </p>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            to="/signup"
            className="font-display uppercase text-sm tracking-[0.18em] px-7 py-4 rounded-md text-white glow-purple"
            style={{ background: "var(--gradient-chaos)" }}
          >
            Intră în haos →
          </Link>
          <Link
            to="/login"
            className="font-mono text-xs uppercase tracking-[0.25em] px-6 py-4 rounded-md border border-foreground/20 hover:border-neon-purple hover:text-neon-purple transition"
          >
            Am cont
          </Link>
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            18+ · bea cu cap
          </span>
        </div>

        {/* Live stats strip */}
        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-px bg-foreground/10 border border-foreground/10 rounded-md overflow-hidden">
          {[
            { k: "ORAȘE LIVE", v: "16" },
            { k: "CLUBURI", v: "120+" },
            { k: "STRĂZI HOT", v: "47" },
            { k: "HAITE ACTIVE", v: "23" },
          ].map((s) => (
            <div key={s.k} className="bg-background/80 px-4 py-3">
              <div className="font-display text-2xl md:text-3xl text-neon-purple leading-none">{s.v}</div>
              <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mt-1">{s.k}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

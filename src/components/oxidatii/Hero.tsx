import { Link } from "@tanstack/react-router";

export function Hero() {
  const particles = Array.from({ length: 30 });
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden noise">
      <div className="absolute inset-0 grid-bg" />

      <div className="absolute inset-0 pointer-events-none">
        {particles.map((_, i) => {
          const left = (i * 37) % 100;
          const delay = (i * 0.7) % 12;
          const dur = 10 + (i % 8);
          const size = 1 + (i % 3);
          const color = i % 3 === 0 ? 'var(--neon-purple)' : i % 3 === 1 ? 'var(--neon-blue)' : 'var(--neon-green)';
          return (
            <span
              key={i}
              className="float-particle absolute rounded-full"
              style={{
                left: `${left}%`,
                width: size,
                height: size,
                background: color,
                boxShadow: `0 0 12px ${color}`,
                animationDelay: `-${delay}s`,
                animationDuration: `${dur}s`,
              }}
            />
          );
        })}
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vmin] h-[120vmin] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, oklch(0.65 0.30 305 / 18%), transparent 60%)' }} />

      <div className="relative z-10 max-w-6xl mx-auto px-6 text-center pt-24">
        <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-8 flicker">
          <span className="h-1.5 w-1.5 rounded-full bg-neon-crimson glow-crimson animate-pulse" />
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Live · România · noaptea începe aici
          </span>
        </div>

        <h1 className="font-display font-black text-[clamp(2.5rem,11vw,10rem)] leading-[0.85] tracking-tighter">
          <span className="block">ORAȘUL</span>
          <span className="block text-gradient-chaos">E LIVE.</span>
        </h1>

        <p className="mt-8 max-w-2xl mx-auto text-base md:text-lg text-muted-foreground leading-relaxed">
          OXIDAȚII e harta reală a vieții de noapte din România. Toate cluburile, toate străzile, toți oamenii.
          <span className="text-foreground"> Scanezi șprițul, urci în top. Cine bea cel mai mult cu dovadă — devine ZEU' BALCANIC.</span>
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/signup"
            className="group relative font-display font-bold text-sm uppercase tracking-[0.2em] px-8 py-4 rounded-full text-primary-foreground glow-purple overflow-hidden"
            style={{ background: 'var(--gradient-chaos)' }}
          >
            <span className="relative z-10">Fă-ți cont · gratis</span>
            <span className="absolute inset-0 shimmer" />
          </Link>
          <Link
            to="/login"
            className="font-mono text-xs uppercase tracking-[0.25em] px-7 py-4 rounded-full border border-border hover:border-neon-blue hover:text-neon-blue transition"
          >
            Am deja cont
          </Link>
        </div>

        <div className="mt-6 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          email · google · 30 secunde
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
        scroll · cum funcționează
      </div>
    </section>
  );
}

export function Hero() {
  const particles = Array.from({ length: 30 });
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden noise">
      {/* grid floor */}
      <div className="absolute inset-0 grid-bg" />

      {/* drifting particles */}
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

      {/* radial halo */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vmin] h-[120vmin] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, oklch(0.65 0.30 305 / 18%), transparent 60%)' }} />

      <div className="relative z-10 max-w-6xl mx-auto px-6 text-center pt-24">
        {/* live tag */}
        <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-8 flicker">
          <span className="h-1.5 w-1.5 rounded-full bg-neon-crimson glow-crimson animate-pulse" />
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Live · 14,827 Oxidați online · București
          </span>
        </div>

        <h1 className="font-display font-black text-[clamp(3rem,11vw,10rem)] leading-[0.85] tracking-tighter">
          <span className="block">THE CITY</span>
          <span className="block text-gradient-chaos">IS ALIVE.</span>
        </h1>

        <p className="mt-8 max-w-2xl mx-auto text-base md:text-lg text-muted-foreground leading-relaxed">
          OXIDAȚII transforms real nightlife into a live multiplayer game.
          Cities become maps. Parties become events. People become players.
          <span className="text-foreground"> AI runs the chaos.</span>
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <button className="group relative font-display font-bold text-sm uppercase tracking-[0.2em] px-8 py-4 rounded-full text-primary-foreground glow-purple overflow-hidden"
            style={{ background: 'var(--gradient-chaos)' }}>
            <span className="relative z-10">Intră în haos</span>
            <span className="absolute inset-0 shimmer" />
          </button>
          <button className="font-mono text-xs uppercase tracking-[0.25em] px-7 py-4 rounded-full border border-border hover:border-neon-blue hover:text-neon-blue transition">
            ▶ Watch the night
          </button>
        </div>

        {/* stat strip */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-px bg-border/50 rounded-2xl overflow-hidden glass">
          {[
            { n: '47', l: 'Districts live' },
            { n: '312', l: 'Active squads' },
            { n: '1.2M', l: 'Chaos events' },
            { n: '9:41', l: 'Until blackout' },
          ].map((s) => (
            <div key={s.l} className="bg-background/40 px-4 py-5">
              <div className="font-display font-black text-2xl md:text-3xl text-gradient-toxic">{s.n}</div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1">{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* scroll cue */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
        scroll · noaptea începe aici
      </div>
    </section>
  );
}

export function CTA() {
  return (
    <section className="relative py-32 px-6 overflow-hidden">
      <div className="absolute inset-0 noise" />
      <div className="max-w-4xl mx-auto text-center relative">
        <div className="font-mono text-xs uppercase tracking-[0.3em] text-neon-crimson mb-4 flicker">
          ⚠ WARNING · CHAOS IS ADDICTIVE
        </div>
        <h2 className="font-display font-black text-6xl md:text-8xl leading-[0.85] tracking-tighter">
          The night<br />is <span className="text-gradient-chaos">waiting.</span>
        </h2>
        <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto">
          Join 14,827 Oxidați already live in your city tonight.
          Don't be the one reading about it tomorrow.
        </p>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
          <button className="font-display font-bold text-base uppercase tracking-[0.2em] px-10 py-5 rounded-full text-primary-foreground glow-purple relative overflow-hidden"
            style={{ background: 'var(--gradient-chaos)' }}>
            <span className="relative z-10">Download · iOS</span>
            <span className="absolute inset-0 shimmer" />
          </button>
          <button className="font-display font-bold text-base uppercase tracking-[0.2em] px-10 py-5 rounded-full border border-border hover:border-neon-green hover:text-neon-green transition">
            Download · Android
          </button>
        </div>

        <div className="mt-16 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          18+ · Drink responsibly · Consent always · Built for the night
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border py-10 px-6">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-neon-green glow-green" />
          <span className="font-display font-black tracking-[0.18em] text-sm">OXIDAȚII</span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground ml-2">© 2026 — the city is alive</span>
        </div>
        <div className="flex gap-5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <a href="#" className="hover:text-foreground">Privacy</a>
          <a href="#" className="hover:text-foreground">Safety</a>
          <a href="#" className="hover:text-foreground">Press</a>
          <a href="#" className="hover:text-foreground">Careers</a>
        </div>
      </div>
    </footer>
  );
}

import { Link } from "@tanstack/react-router";

export function CTA() {
  return (
    <section className="relative py-32 px-6 overflow-hidden">
      <div
        className="absolute inset-0 opacity-30"
        style={{ background: "var(--gradient-chaos)" }}
      />
      <div className="relative max-w-3xl mx-auto text-center">
        <h2 className="font-display font-black text-5xl md:text-7xl tracking-tighter leading-none">
          Intră în <span className="text-gradient-chaos">haos.</span>
        </h2>
        <p className="mt-6 text-base md:text-lg text-muted-foreground">
          Cont gratuit. Email sau Google. Ești în top până dimineață.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/signup"
            className="font-display font-bold text-sm uppercase tracking-[0.2em] px-10 py-5 rounded-full text-primary-foreground glow-purple"
            style={{ background: "var(--gradient-chaos)" }}
          >
            Fă-ți cont
          </Link>
          <Link
            to="/login"
            className="font-mono text-xs uppercase tracking-[0.25em] px-7 py-5 rounded-full border border-border hover:border-foreground transition"
          >
            Login
          </Link>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="relative py-10 px-6 border-t border-border">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-neon-green glow-green" />
          <span className="font-display font-black text-sm tracking-[0.18em]">OXIDAȚII</span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground ml-2">
            · made in RO · 18+
          </span>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          bea responsabil · noaptea începe aici
        </div>
      </div>
    </footer>
  );
}

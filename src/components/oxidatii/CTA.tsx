import { Link } from "@tanstack/react-router";

export function CTA() {
  return (
    <section className="relative py-20 px-6 overflow-hidden">
      <div
        className="absolute inset-0 opacity-20"
        style={{ background: "var(--gradient-sunset)" }}
      />
      <div className="relative max-w-2xl mx-auto text-center">
        <h2 className="font-display font-black text-4xl md:text-5xl tracking-tighter leading-none">
          Hai în <span className="text-gradient-chaos">oraș.</span>
        </h2>
        <p className="mt-4 text-sm text-muted-foreground">
          Cont gratis. Email sau Google. Ești în top până dimineață.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          <Link
            to="/signup"
            className="font-display font-bold text-sm uppercase tracking-[0.15em] px-8 py-4 rounded-full text-primary-foreground"
            style={{ background: "var(--gradient-sunset)" }}
          >
            Fă-ți cont
          </Link>
          <Link
            to="/login"
            className="font-mono text-xs uppercase tracking-[0.2em] px-6 py-4 rounded-full border border-border hover:border-foreground transition"
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
    <footer className="relative py-8 px-6 border-t border-border">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-sunset-amber" />
          <span className="font-display font-bold text-sm tracking-[0.12em]">OXIDAȚII</span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            made in RO · 18+
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-neon-crimson">
          <AlertTriangle size={12} />
          Alcoolul dăunează grav sănătății
        </div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          bea responsabil · noaptea începe aici
        </div>
      </div>
    </footer>
  );
}

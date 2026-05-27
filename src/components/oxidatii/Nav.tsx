import { Link } from "@tanstack/react-router";

export function Nav() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-foreground/10 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 md:px-6 py-3 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2.5 min-w-0">
          <span className="relative inline-flex h-2.5 w-2.5">
            <span className="absolute inset-0 rounded-full bg-neon-crimson pulse-ring" />
            <span className="relative h-2.5 w-2.5 rounded-full bg-neon-crimson glow-crimson" />
          </span>
          <span className="font-display uppercase text-base md:text-lg tracking-[0.12em] leading-none">OXIDAȚII</span>
          <span className="hidden sm:inline font-mono text-[9px] uppercase tracking-widest text-muted-foreground border-l border-foreground/15 pl-2 ml-1">
            ediția nopții
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
          <a href="#cum" className="hover:text-foreground transition">Live</a>
          <a href="#orase" className="hover:text-foreground transition">Orașe</a>
          <a href="#haite" className="hover:text-foreground transition">Haite</a>
          <a href="#ranguri" className="hover:text-foreground transition">Ranguri</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="hidden sm:inline-flex font-mono text-[11px] uppercase tracking-widest px-3 py-2 text-muted-foreground hover:text-foreground transition"
          >
            Login
          </Link>
          <Link
            to="/signup"
            className="font-display uppercase text-[11px] tracking-[0.18em] px-4 py-2 rounded-sm text-white glow-purple"
            style={{ background: "var(--gradient-chaos)" }}
          >
            Fă-ți cont
          </Link>
        </div>
      </div>
    </header>
  );
}

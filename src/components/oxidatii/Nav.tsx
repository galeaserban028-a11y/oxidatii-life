import { Link } from "@tanstack/react-router";

export function Nav() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="mx-auto max-w-7xl px-4 py-3">
        <div className="glass rounded-full px-4 py-2.5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="relative inline-flex h-2.5 w-2.5">
              <span className="absolute inset-0 rounded-full bg-neon-green pulse-ring" />
              <span className="relative h-2.5 w-2.5 rounded-full bg-neon-green glow-green" />
            </span>
            <span className="font-display font-black text-base tracking-[0.18em]">OXIDAȚII</span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-xs font-mono uppercase tracking-widest text-muted-foreground">
            <a href="#cum" className="hover:text-foreground transition">Cum merge</a>
            <a href="#orase" className="hover:text-foreground transition">Orașe</a>
            <a href="#ranguri" className="hover:text-foreground transition">Ranguri</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="hidden sm:inline-flex font-mono text-xs uppercase tracking-widest px-4 py-2 rounded-full border border-border hover:border-foreground hover:text-foreground text-muted-foreground transition"
            >
              Login
            </Link>
            <Link
              to="/signup"
              className="font-mono text-xs uppercase tracking-widest px-4 py-2 rounded-full bg-foreground text-background hover:bg-neon-purple hover:text-primary-foreground transition glow-purple"
            >
              Fă-ți cont
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

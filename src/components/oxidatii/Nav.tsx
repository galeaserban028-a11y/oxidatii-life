export function Nav() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="mx-auto max-w-7xl px-6 py-4">
        <div className="glass rounded-full px-5 py-2.5 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <span className="relative inline-flex h-2.5 w-2.5">
              <span className="absolute inset-0 rounded-full bg-neon-green pulse-ring" />
              <span className="relative h-2.5 w-2.5 rounded-full bg-neon-green glow-green" />
            </span>
            <span className="font-display font-black text-base tracking-[0.18em]">OXIDAȚII</span>
          </a>
          <nav className="hidden md:flex items-center gap-7 text-xs font-mono uppercase tracking-widest text-muted-foreground">
            <a href="#city" className="hover:text-foreground transition">City</a>
            <a href="#chaos" className="hover:text-foreground transition">Chaos AI</a>
            <a href="#squads" className="hover:text-foreground transition">Squads</a>
            <a href="#aura" className="hover:text-foreground transition">Aura</a>
            <a href="#pass" className="hover:text-foreground transition">Night Pass</a>
          </nav>
          <button className="font-mono text-xs uppercase tracking-widest px-4 py-2 rounded-full bg-foreground text-background hover:bg-neon-purple hover:text-primary-foreground transition glow-purple">
            Enter Chaos
          </button>
        </div>
      </div>
    </header>
  );
}

const factions = [
  { name: 'WOLVES', color: 'var(--neon-purple)', pct: 34, motto: 'Hunt in packs.' },
  { name: 'SHADOWS', color: 'var(--neon-chrome)', pct: 22, motto: 'Move unseen.' },
  { name: 'CHAOS', color: 'var(--neon-crimson)', pct: 28, motto: 'Burn it all.' },
  { name: 'VENOM', color: 'var(--neon-green)', pct: 16, motto: 'Slow & lethal.' },
];

export function NightPass() {
  return (
    <section id="pass" className="relative py-32 px-6 overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-50" />

      <div className="relative max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <div className="font-mono text-xs uppercase tracking-[0.3em] text-neon-green mb-3">// 05 — NIGHT PASS · S01</div>
          <h2 className="font-display font-black text-5xl md:text-7xl leading-none">
            <span className="text-gradient-chaos">RED NIGHT</span><br />weekend live now.
          </h2>
          <p className="mt-6 text-muted-foreground max-w-xl mx-auto">
            Every weekend is a season. Pick a faction. Fight for the city.
            Unlock lore, exclusive cosmetics, and stories no one else will live.
          </p>
        </div>

        {/* faction war bar */}
        <div className="glass rounded-2xl p-6 mb-10">
          <div className="flex items-center justify-between mb-3">
            <div className="font-display font-bold text-sm tracking-widest">CITY CONTROL</div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">resets in 2d 14h 22m</div>
          </div>
          <div className="flex h-4 rounded-full overflow-hidden">
            {factions.map((f) => (
              <div key={f.name} style={{ width: `${f.pct}%`, background: f.color, boxShadow: `inset 0 0 12px ${f.color}` }} />
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {factions.map((f) => (
              <div key={f.name} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: f.color, boxShadow: `0 0 10px ${f.color}` }} />
                <div>
                  <div className="font-display font-bold text-xs tracking-widest">{f.name}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">{f.pct}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* faction cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {factions.map((f) => (
            <div key={f.name} className="relative glass rounded-2xl p-6 overflow-hidden group hover:-translate-y-1 transition cursor-pointer">
              <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-40 group-hover:opacity-70 transition"
                style={{ background: `radial-gradient(circle, ${f.color}, transparent 70%)` }} />
              <div className="relative">
                <div className="font-display font-black text-4xl" style={{ color: f.color, textShadow: `0 0 20px ${f.color}80` }}>
                  {f.name}
                </div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-2">"{f.motto}"</div>
                <button className="mt-6 font-mono text-[10px] uppercase tracking-[0.25em] px-3 py-1.5 rounded-full border w-full text-center"
                  style={{ borderColor: `${f.color}80`, color: f.color }}>
                  Join faction
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

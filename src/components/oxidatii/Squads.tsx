const squads = [
  { name: 'NEON WOLVES', rank: '#01', xp: '142,820', terr: 'Floreasca · Pipera', color: 'var(--neon-purple)', motto: 'We bite first.' },
  { name: '3AM SYNDICATE', rank: '#02', xp: '128,440', terr: 'Centru Vechi', color: 'var(--neon-crimson)', motto: 'After midnight, we run it.' },
  { name: 'TOXICII', rank: '#03', xp: '119,002', terr: 'Unirii · Tineretului', color: 'var(--neon-green)', motto: 'Spread the poison.' },
  { name: 'SHADOW DIVISION', rank: '#04', xp: '104,773', terr: 'Cotroceni', color: 'var(--neon-chrome)', motto: 'You never see us coming.' },
  { name: 'VENOM CLUB', rank: '#05', xp: '98,210', terr: 'Victoriei', color: 'var(--neon-blue)', motto: 'One bite. One night.' },
];

export function Squads() {
  return (
    <section id="squads" className="relative py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="font-mono text-xs uppercase tracking-[0.3em] text-neon-crimson mb-3">// 03 — SQUAD WARS</div>
          <h2 className="font-display font-black text-5xl md:text-7xl leading-none">
            Form a crew.<br /><span className="text-gradient-chaos">Own the city.</span>
          </h2>
          <p className="mt-6 text-muted-foreground max-w-xl mx-auto">
            Squads claim districts, build reputation, and fight for seasonal dominance.
            Win nights. Unlock cosmetics. Become a name people whisper.
          </p>
        </div>

        <div className="space-y-3">
          {squads.map((s, i) => (
            <div key={s.name}
              className="group relative glass rounded-2xl p-5 flex items-center gap-6 hover:translate-x-1 transition-all duration-300 overflow-hidden"
              style={{ borderColor: `${s.color}40` }}>
              <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: s.color, boxShadow: `0 0 20px ${s.color}` }} />

              <div className="font-display font-black text-3xl md:text-4xl w-20 shrink-0" style={{ color: s.color, textShadow: `0 0 20px ${s.color}80` }}>
                {s.rank}
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-display font-black text-xl md:text-2xl tracking-wide glitch">{s.name}</div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1 truncate">
                  ⚑ {s.terr} · "{s.motto}"
                </div>
              </div>

              <div className="hidden md:block text-right">
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">squad xp</div>
                <div className="font-display font-bold text-lg">{s.xp}</div>
              </div>

              <div className="hidden lg:flex items-center gap-1.5">
                {Array.from({ length: 5 }).map((_, k) => (
                  <span key={k} className="h-6 w-1 rounded-full"
                    style={{ background: k <= 4 - i ? s.color : 'oklch(0.25 0.02 280)', boxShadow: k <= 4 - i ? `0 0 8px ${s.color}` : 'none' }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

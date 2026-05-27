const broadcasts = [
  { time: '23:41', tag: 'EVENT', text: 'Mystery Roulette spawned at OBOR. 4 slots remaining.', color: 'var(--neon-purple)' },
  { time: '23:38', tag: 'DUEL', text: 'NEON WOLVES vs 3AM SYNDICATE — district lock-in at midnight.', color: 'var(--neon-crimson)' },
  { time: '23:35', tag: 'DROP', text: 'Hidden cache unlocked near Pasajul Universității. First to scan wins.', color: 'var(--neon-green)' },
  { time: '23:29', tag: 'CHAOS', text: 'Blackout Hour triggers in 18 min. All squads notified.', color: 'var(--neon-blue)' },
];

export function ChaosEngine() {
  return (
    <section id="chaos" className="relative py-32 px-6 overflow-hidden">
      {/* edge glow */}
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'var(--gradient-edge)' }} />

      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <div className="font-mono text-xs uppercase tracking-[0.3em] text-neon-purple mb-3">// 02 — AI CHAOS ENGINE</div>
          <h2 className="font-display font-black text-5xl md:text-7xl leading-none">
            The night has<br />
            <span className="text-gradient-chaos">a game master.</span>
          </h2>
          <p className="mt-6 text-muted-foreground text-lg leading-relaxed max-w-md">
            An adaptive AI watches the city in real time. It writes missions, spawns rivalries,
            triggers blackouts, and rewards the bold. No two nights are the same.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-3">
            {[
              { k: 'Events / hr', v: '127' },
              { k: 'Active missions', v: '38' },
              { k: 'Surprise rate', v: '6.2x' },
              { k: 'Storylines', v: '∞' },
            ].map((m) => (
              <div key={m.k} className="glass rounded-xl px-4 py-3">
                <div className="font-display font-black text-2xl text-gradient-toxic">{m.v}</div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1">{m.k}</div>
              </div>
            ))}
          </div>
        </div>

        {/* broadcast terminal */}
        <div className="relative">
          <div className="absolute -inset-4 rounded-3xl opacity-50 blur-2xl" style={{ background: 'var(--gradient-chaos)' }} />
          <div className="relative glass rounded-3xl p-6 scanline">
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-neon-crimson animate-pulse" />
                <span className="font-display font-bold text-sm tracking-widest">AI / OXID-CORE</span>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">live feed</span>
            </div>

            <div className="space-y-3">
              {broadcasts.map((b, i) => (
                <div key={i} className="flex items-start gap-3 group">
                  <div className="font-mono text-[10px] text-muted-foreground pt-1 w-12 shrink-0">{b.time}</div>
                  <div className="font-display text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded shrink-0"
                    style={{ background: `${b.color}22`, color: b.color, border: `1px solid ${b.color}55` }}>
                    {b.tag}
                  </div>
                  <div className="text-sm leading-snug text-foreground/90">{b.text}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-border flex items-center gap-3">
              <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                <div className="h-full w-2/3 rounded-full" style={{ background: 'var(--gradient-chaos)' }} />
              </div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">chaos 67%</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

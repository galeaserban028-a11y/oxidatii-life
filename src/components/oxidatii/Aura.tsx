const auras = [
  { name: 'SAVAGE', desc: 'Wins by force.', color: 'var(--neon-crimson)' },
  { name: 'CHAOS', desc: 'Bends the night.', color: 'var(--neon-purple)' },
  { name: 'MYSTERY', desc: 'Reads every room.', color: 'var(--neon-blue)' },
  { name: 'PREDATOR', desc: 'Hunts the spotlight.', color: 'var(--neon-green)' },
  { name: 'GHOST', desc: 'Never seen, always there.', color: 'var(--neon-chrome)' },
  { name: 'ELITE', desc: 'Top 0.4% of the city.', color: 'var(--neon-purple)' },
];

export function Aura() {
  return (
    <section id="aura" className="relative py-32 px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-[1.1fr,1fr] gap-16 items-center">

        {/* Aura visual */}
        <div className="relative aspect-square max-w-xl mx-auto w-full">
          <div className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle, oklch(0.65 0.30 305 / 25%), transparent 70%)' }} />

          {/* concentric rings */}
          {[0, 1, 2, 3].map((r) => (
            <div key={r} className="absolute inset-0 rounded-full border pointer-events-none"
              style={{
                margin: `${r * 10}%`,
                borderColor: r === 0 ? 'var(--neon-purple)' : `oklch(0.65 0.30 305 / ${0.3 - r * 0.07})`,
                boxShadow: r === 0 ? 'var(--glow-purple)' : 'none',
                animation: `spin ${20 + r * 8}s linear infinite ${r % 2 ? 'reverse' : ''}`,
              }} />
          ))}

          {/* center card */}
          <div className="absolute inset-[28%] glass rounded-full flex flex-col items-center justify-center text-center p-6">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">AURA PROFILE</div>
            <div className="font-display font-black text-3xl md:text-4xl text-gradient-chaos mt-2">PREDATOR</div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-neon-green mt-3">LVL 47 · TOP 1.2%</div>

            <div className="mt-4 w-full max-w-[180px] space-y-2">
              {[
                { l: 'Charisma', v: 92 },
                { l: 'Chaos', v: 78 },
                { l: 'Influence', v: 88 },
              ].map((s) => (
                <div key={s.l}>
                  <div className="flex justify-between font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                    <span>{s.l}</span><span>{s.v}</span>
                  </div>
                  <div className="h-1 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${s.v}%`, background: 'var(--gradient-chaos)' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* orbiting dots */}
          {[0, 72, 144, 216, 288].map((deg, i) => (
            <div key={deg} className="absolute top-1/2 left-1/2 w-3 h-3 rounded-full"
              style={{
                background: ['var(--neon-purple)', 'var(--neon-blue)', 'var(--neon-green)', 'var(--neon-crimson)', 'var(--neon-chrome)'][i],
                boxShadow: `0 0 16px currentColor`,
                transform: `translate(-50%,-50%) rotate(${deg}deg) translateY(-46%)`,
              }} />
          ))}
        </div>

        <div>
          <div className="font-mono text-xs uppercase tracking-[0.3em] text-neon-blue mb-3">// 04 — AURA SYSTEM</div>
          <h2 className="font-display font-black text-5xl md:text-7xl leading-none">
            Your identity,<br /><span className="text-gradient-toxic">evolved live.</span>
          </h2>
          <p className="mt-6 text-muted-foreground text-lg max-w-md">
            Every interaction shifts your aura. Win challenges. Influence rooms. Become a legend — or stay invisible by design.
          </p>

          <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {auras.map((a) => (
              <div key={a.name} className="glass rounded-xl p-3 hover:scale-105 transition cursor-pointer"
                style={{ borderColor: `${a.color}40` }}>
                <div className="h-1 w-6 rounded-full mb-2" style={{ background: a.color, boxShadow: `0 0 10px ${a.color}` }} />
                <div className="font-display font-black text-sm tracking-wide">{a.name}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{a.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </section>
  );
}

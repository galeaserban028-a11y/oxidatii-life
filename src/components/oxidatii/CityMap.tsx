const hotspots = [
  { x: 22, y: 30, name: 'CENTRU', tag: 'CHAOS MODE', color: 'var(--neon-crimson)', users: 2841 },
  { x: 65, y: 22, name: 'VICTORIEI', tag: 'DOUBLE XP', color: 'var(--neon-green)', users: 1207 },
  { x: 78, y: 58, name: 'FLOREASCA', tag: 'WOLVES CONTROL', color: 'var(--neon-purple)', users: 944 },
  { x: 38, y: 68, name: 'UNIRII', tag: 'LEGENDARY SPAWN', color: 'var(--neon-blue)', users: 1683 },
  { x: 14, y: 78, name: 'COTROCENI', tag: 'STEALTH ZONE', color: 'var(--neon-chrome)', users: 312 },
  { x: 55, y: 45, name: 'OBOR', tag: 'BLACKOUT IN 12m', color: 'var(--neon-crimson)', users: 421 },
];

export function CityMap() {
  return (
    <section id="city" className="relative py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-end justify-between flex-wrap gap-6 mb-12">
          <div>
            <div className="font-mono text-xs uppercase tracking-[0.3em] text-neon-green mb-3">// 01 — LIVE MAP</div>
            <h2 className="font-display font-black text-5xl md:text-7xl leading-none">
              Orașul tău,<br /><span className="text-gradient-chaos">live tonight.</span>
            </h2>
          </div>
          <p className="max-w-sm text-muted-foreground">
            Each district pulses with real energy. Heat, squad control, AI events — all updated in real time. Tap any zone to drop in.
          </p>
        </div>

        <div className="relative aspect-[16/10] rounded-3xl overflow-hidden glass scanline">
          {/* map grid */}
          <div className="absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(oklch(0.65 0.30 305 / 12%) 1px, transparent 1px), linear-gradient(90deg, oklch(0.65 0.30 305 / 12%) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }} />

          {/* rivers / roads */}
          <svg className="absolute inset-0 w-full h-full opacity-50" viewBox="0 0 100 62" preserveAspectRatio="none">
            <path d="M0,40 Q30,30 50,45 T100,38" stroke="var(--neon-blue)" strokeWidth="0.25" fill="none" />
            <path d="M10,0 Q20,30 35,40 T55,62" stroke="var(--neon-purple)" strokeWidth="0.2" fill="none" opacity="0.6" />
            <path d="M100,10 Q70,25 60,40 T30,62" stroke="var(--neon-green)" strokeWidth="0.2" fill="none" opacity="0.5" />
          </svg>

          {/* heat blobs */}
          {hotspots.map((h) => (
            <div key={h.name} className="absolute rounded-full pointer-events-none"
              style={{
                left: `${h.x}%`, top: `${h.y}%`,
                width: 220, height: 220, transform: 'translate(-50%, -50%)',
                background: `radial-gradient(circle, ${h.color} 0%, transparent 60%)`,
                opacity: 0.25, filter: 'blur(8px)',
              }} />
          ))}

          {/* hotspots */}
          {hotspots.map((h, i) => (
            <div key={h.name + 'p'} className="absolute group cursor-pointer"
              style={{ left: `${h.x}%`, top: `${h.y}%`, transform: 'translate(-50%, -50%)' }}>
              <span className="absolute inset-0 rounded-full pulse-ring"
                style={{ background: h.color, animationDelay: `${i * 0.3}s` }} />
              <span className="relative block h-3 w-3 rounded-full"
                style={{ background: h.color, boxShadow: `0 0 16px ${h.color}, 0 0 32px ${h.color}` }} />
              <div className="absolute left-5 top-1/2 -translate-y-1/2 whitespace-nowrap glass rounded-md px-2.5 py-1.5">
                <div className="font-display font-bold text-[11px] tracking-wider">{h.name}</div>
                <div className="font-mono text-[9px] uppercase tracking-widest opacity-70" style={{ color: h.color }}>
                  {h.tag} · {h.users}
                </div>
              </div>
            </div>
          ))}

          {/* HUD */}
          <div className="absolute top-4 left-4 glass rounded-lg px-3 py-2 font-mono text-[10px] uppercase tracking-widest">
            <div className="text-neon-green">● ONLINE</div>
            <div className="text-muted-foreground mt-0.5">SECTOR 7 · 44.4268°N 26.1025°E</div>
          </div>
          <div className="absolute top-4 right-4 glass rounded-lg px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-right">
            <div className="text-neon-crimson">CHAOS LVL 7.3</div>
            <div className="text-muted-foreground mt-0.5">peak in 02:14</div>
          </div>
          <div className="absolute bottom-4 left-4 right-4 glass rounded-lg px-3 py-2 flex items-center justify-between">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <span className="text-neon-purple">AI BROADCAST</span> · 3 legendary Oxidați entered VICTORIEI. Survive 20 min for elite drops.
            </div>
            <button className="font-display text-[10px] uppercase tracking-widest px-3 py-1 rounded bg-neon-crimson/20 text-neon-crimson border border-neon-crimson/40">
              JOIN
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

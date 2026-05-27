import { useMemo, useState } from 'react';

type City = {
  name: string;
  x: number; y: number;
  users: number;
  chaos: number;
  tag: string;
  color: string;
  streets: string[];
};

const CITIES: City[] = [
  { name: 'BUCUREȘTI', x: 56, y: 76, users: 12840, chaos: 9.4, tag: 'CAPITAL CHAOS', color: 'var(--neon-crimson)',
    streets: ['Calea Victoriei', 'Lipscani', 'Dorobanți', 'Floreasca', 'Centru Vechi', 'Berceni', 'Pipera', 'Băneasa'] },
  { name: 'CLUJ-NAPOCA', x: 38, y: 32, users: 8420, chaos: 8.7, tag: 'STUDENT RIOT', color: 'var(--neon-purple)',
    streets: ['Piața Unirii', 'Eroilor', 'Mărășești', 'Horea', 'Mănăștur', 'Zorilor', 'Calea Turzii'] },
  { name: 'TIMIȘOARA', x: 16, y: 52, users: 5210, chaos: 7.9, tag: 'WEST FRONT', color: 'var(--neon-green)',
    streets: ['Piața Victoriei', 'Iosefin', 'Fabric', 'Bd. Revoluției', 'Take Ionescu'] },
  { name: 'IAȘI', x: 80, y: 28, users: 6100, chaos: 8.2, tag: 'MOLDOVA RISING', color: 'var(--neon-blue)',
    streets: ['Lăpușneanu', 'Copou', 'Palas', 'Bd. Independenței', 'Tătărași'] },
  { name: 'CONSTANȚA', x: 84, y: 72, users: 4870, chaos: 8.6, tag: 'SEASIDE BLACKOUT', color: 'var(--neon-blue)',
    streets: ['Mamaia', 'Tomis Nord', 'Faleză Nord', 'Centru Vechi', 'Cazino'] },
  { name: 'BRAȘOV', x: 56, y: 50, users: 3940, chaos: 7.4, tag: 'MOUNTAIN PACK', color: 'var(--neon-chrome)',
    streets: ['Republicii', 'Sfatului', 'Centru Istoric', 'Schei', 'Tractorul'] },
  { name: 'SIBIU', x: 44, y: 54, users: 2120, chaos: 6.8, tag: 'STEALTH MODE', color: 'var(--neon-chrome)',
    streets: ['Piața Mare', 'Nicolae Bălcescu', 'Podul Minciunilor', 'Strand'] },
  { name: 'CRAIOVA', x: 42, y: 80, users: 3220, chaos: 7.6, tag: 'OLTENIA BURN', color: 'var(--neon-crimson)',
    streets: ['Calea Unirii', 'Lipscani CV', 'Brazda lui Novac', 'Craiovița'] },
  { name: 'ORADEA', x: 22, y: 30, users: 1980, chaos: 7.1, tag: 'NEON BORDER', color: 'var(--neon-green)',
    streets: ['Republicii', 'Piața Unirii', 'Rogerius', 'Iosia'] },
  { name: 'GALAȚI', x: 78, y: 54, users: 2410, chaos: 7.3, tag: 'DOCK RIOT', color: 'var(--neon-purple)',
    streets: ['Bd. Domnească', 'Țiglina', 'Mazepa', 'Faleza'] },
  { name: 'PLOIEȘTI', x: 58, y: 66, users: 2780, chaos: 7.8, tag: 'OIL & FIRE', color: 'var(--neon-crimson)',
    streets: ['Republicii', 'Cantacuzino', 'Mihai Bravu', 'Vest'] },
  { name: 'SUCEAVA', x: 66, y: 18, users: 1340, chaos: 6.4, tag: 'NORTHERN PACT', color: 'var(--neon-blue)',
    streets: ['Centru', 'Burdujeni', 'Areni', 'George Enescu'] },
  { name: 'TG. MUREȘ', x: 50, y: 38, users: 1620, chaos: 6.9, tag: 'NEUTRAL ZONE', color: 'var(--neon-chrome)',
    streets: ['Trandafirilor', 'Centru', '7 Noiembrie', 'Tudor'] },
  { name: 'PITEȘTI', x: 50, y: 70, users: 1810, chaos: 7.2, tag: 'SOUTH SURGE', color: 'var(--neon-purple)',
    streets: ['Victoriei', 'Trivale', 'Găvana', 'Bd. Republicii'] },
  { name: 'BACĂU', x: 68, y: 38, users: 1450, chaos: 6.7, tag: 'EAST PACK', color: 'var(--neon-green)',
    streets: ['Centru', '9 Mai', 'Mioriței', 'Republicii'] },
  { name: 'ARAD', x: 16, y: 42, users: 1290, chaos: 6.5, tag: 'BORDER RUN', color: 'var(--neon-green)',
    streets: ['Bd. Revoluției', 'Aurel Vlaicu', 'Micălaca', 'Centru'] },
];

export function CityMap() {
  const [active, setActive] = useState<City>(CITIES[0]);
  const total = useMemo(() => CITIES.reduce((s, c) => s + c.users, 0), []);

  return (
    <section id="city" className="relative py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-end justify-between flex-wrap gap-6 mb-12">
          <div>
            <div className="font-mono text-xs uppercase tracking-[0.3em] text-neon-green mb-3">// 01 — LIVE MAP · ROMÂNIA</div>
            <h2 className="font-display font-black text-5xl md:text-7xl leading-none">
              Toată țara,<br /><span className="text-gradient-chaos">live tonight.</span>
            </h2>
          </div>
          <p className="max-w-sm text-muted-foreground">
            {CITIES.length} orașe. {total.toLocaleString('ro-RO')} de Oxidați activi. Fiecare stradă pulsează. Alege harta — intră în haos.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1.6fr_1fr] gap-4">
          {/* MAP */}
          <div className="relative aspect-[4/3] rounded-3xl overflow-hidden glass scanline">
            {/* grid */}
            <div className="absolute inset-0"
              style={{
                backgroundImage:
                  'linear-gradient(oklch(0.65 0.30 305 / 10%) 1px, transparent 1px), linear-gradient(90deg, oklch(0.65 0.30 305 / 10%) 1px, transparent 1px)',
                backgroundSize: '32px 32px',
              }} />

            {/* România silhouette (stylized) + rivers */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 75" preserveAspectRatio="none">
              <defs>
                <linearGradient id="ro-fill" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.65 0.30 305 / 14%)" />
                  <stop offset="100%" stopColor="oklch(0.7 0.25 200 / 10%)" />
                </linearGradient>
              </defs>
              {/* approximate Romania border */}
              <path
                d="M10,38 L14,28 L22,22 L34,18 L46,14 L58,12 L66,14 L74,20 L82,22 L88,28 L90,36 L88,46 L86,56 L84,66 L80,72 L72,70 L62,72 L52,74 L44,76 L36,72 L28,68 L20,62 L14,54 L10,46 Z"
                fill="url(#ro-fill)"
                stroke="oklch(0.65 0.30 305 / 50%)"
                strokeWidth="0.4"
              />
              {/* Dunărea */}
              <path d="M18,62 Q34,70 50,68 T82,68 L88,62" stroke="var(--neon-blue)" strokeWidth="0.3" fill="none" opacity="0.6" />
              {/* Carpați */}
              <path d="M22,32 Q40,42 56,48 T78,42" stroke="var(--neon-purple)" strokeWidth="0.25" fill="none" opacity="0.5" strokeDasharray="1 1" />
              {/* connection lines from active city */}
              {CITIES.filter(c => c.name !== active.name).slice(0, 6).map(c => (
                <line key={c.name + 'ln'}
                  x1={active.x} y1={active.y * 0.75} x2={c.x} y2={c.y * 0.75}
                  stroke={active.color} strokeWidth="0.1" opacity="0.4" strokeDasharray="0.6 0.6" />
              ))}
            </svg>

            {/* heat blobs */}
            {CITIES.map(c => (
              <div key={c.name + 'h'} className="absolute rounded-full pointer-events-none"
                style={{
                  left: `${c.x}%`, top: `${c.y}%`,
                  width: 60 + c.chaos * 14, height: 60 + c.chaos * 14,
                  transform: 'translate(-50%, -50%)',
                  background: `radial-gradient(circle, ${c.color} 0%, transparent 65%)`,
                  opacity: c === active ? 0.55 : 0.22, filter: 'blur(6px)',
                }} />
            ))}

            {/* city dots */}
            {CITIES.map((c, i) => (
              <button key={c.name} onClick={() => setActive(c)}
                className="absolute group"
                style={{ left: `${c.x}%`, top: `${c.y}%`, transform: 'translate(-50%, -50%)' }}>
                {c === active && (
                  <span className="absolute inset-0 rounded-full pulse-ring"
                    style={{ background: c.color, animationDelay: `${i * 0.15}s` }} />
                )}
                <span className="relative block rounded-full"
                  style={{
                    width: c === active ? 14 : 8, height: c === active ? 14 : 8,
                    background: c.color,
                    boxShadow: `0 0 12px ${c.color}, 0 0 24px ${c.color}`,
                  }} />
                <div className={`absolute left-1/2 -translate-x-1/2 top-full mt-1 whitespace-nowrap font-display font-bold text-[9px] tracking-widest ${c === active ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`}
                  style={{ color: c.color, textShadow: `0 0 8px ${c.color}` }}>
                  {c.name}
                </div>
              </button>
            ))}

            {/* HUD */}
            <div className="absolute top-4 left-4 glass rounded-lg px-3 py-2 font-mono text-[10px] uppercase tracking-widest">
              <div className="text-neon-green">● {total.toLocaleString('ro-RO')} ONLINE · RO</div>
              <div className="text-muted-foreground mt-0.5">{CITIES.length} ORAȘE · 8.1 CHAOS AVG</div>
            </div>
            <div className="absolute top-4 right-4 glass rounded-lg px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-right">
              <div style={{ color: active.color }}>◉ {active.name}</div>
              <div className="text-muted-foreground mt-0.5">CHAOS {active.chaos.toFixed(1)} · {active.users.toLocaleString('ro-RO')}</div>
            </div>
            <div className="absolute bottom-4 left-4 right-4 glass rounded-lg px-3 py-2 flex items-center justify-between gap-3">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground truncate">
                <span className="text-neon-purple">AI BROADCAST</span> · {active.name} {active.tag} — squad wars on {active.streets[0]}.
              </div>
              <button className="shrink-0 font-display text-[10px] uppercase tracking-widest px-3 py-1 rounded bg-neon-crimson/20 text-neon-crimson border border-neon-crimson/40">
                DROP IN
              </button>
            </div>
          </div>

          {/* STREET PANEL */}
          <div className="glass rounded-3xl p-5 flex flex-col">
            <div className="flex items-baseline justify-between mb-1">
              <div className="font-display font-black text-2xl" style={{ color: active.color, textShadow: `0 0 14px ${active.color}` }}>
                {active.name}
              </div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {active.users.toLocaleString('ro-RO')} live
              </div>
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-neon-green mb-4">{active.tag}</div>

            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">// străzi active</div>
            <div className="space-y-1.5 overflow-auto flex-1">
              {active.streets.map((s, i) => {
                const heat = 40 + ((i * 137 + s.length * 53) % 800);
                const lvl = Math.min(100, 30 + ((i * 17) % 70));
                return (
                  <div key={s} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-foreground/5 hover:bg-foreground/10 transition cursor-pointer">
                    <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: active.color, boxShadow: `0 0 8px ${active.color}` }} />
                    <span className="flex-1 text-sm font-medium truncate">{s}</span>
                    <div className="h-1 w-16 bg-foreground/10 rounded-full overflow-hidden">
                      <div className="h-full" style={{ width: `${lvl}%`, background: active.color }} />
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground w-10 text-right">{heat}</span>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-lg bg-foreground/5 p-2">
                <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">events / h</div>
                <div className="font-display font-black text-lg text-neon-green">{Math.round(active.chaos * 7)}</div>
              </div>
              <div className="rounded-lg bg-foreground/5 p-2">
                <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">squad control</div>
                <div className="font-display font-black text-lg" style={{ color: active.color }}>{active.tag.split(' ')[0]}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

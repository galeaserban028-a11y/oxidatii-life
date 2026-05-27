import { useState } from 'react';

type Entry = {
  rank: number;
  handle: string;
  city: string;
  count: number;
  proof: number; // verified proofs
  status: 'GOD' | 'ASCENDING' | 'CHALLENGER' | 'MORTAL';
  streak: number;
};

const LEADERBOARD: Entry[] = [
  { rank: 1, handle: '@vladtepes_3am', city: 'CLUJ', count: 27, proof: 27, status: 'GOD', streak: 4 },
  { rank: 2, handle: '@neon_lupul', city: 'BUCUREȘTI', count: 24, proof: 22, status: 'ASCENDING', streak: 2 },
  { rank: 3, handle: '@spritzilla', city: 'TIMIȘOARA', count: 22, proof: 21, status: 'ASCENDING', streak: 3 },
  { rank: 4, handle: '@mirceaplm', city: 'IAȘI', count: 19, proof: 19, status: 'CHALLENGER', streak: 1 },
  { rank: 5, handle: '@bautoru.exe', city: 'CONSTANȚA', count: 18, proof: 16, status: 'CHALLENGER', streak: 2 },
  { rank: 6, handle: '@boier_de_oltenia', city: 'CRAIOVA', count: 17, proof: 17, status: 'CHALLENGER', streak: 1 },
  { rank: 7, handle: '@gabi.zeu', city: 'BRAȘOV', count: 15, proof: 14, status: 'MORTAL', streak: 1 },
  { rank: 8, handle: '@ana_pe_traseu', city: 'ORADEA', count: 14, proof: 13, status: 'MORTAL', streak: 1 },
];

const statusColor: Record<Entry['status'], string> = {
  GOD: 'var(--neon-crimson)',
  ASCENDING: 'var(--neon-purple)',
  CHALLENGER: 'var(--neon-blue)',
  MORTAL: 'var(--neon-chrome)',
};

export function SpritKing() {
  const [tab, setTab] = useState<'TODAY' | 'WEEK' | 'ALL TIME'>('TODAY');

  return (
    <section id="sprit-king" className="relative py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-end justify-between flex-wrap gap-6 mb-12">
          <div>
            <div className="font-mono text-xs uppercase tracking-[0.3em] text-neon-crimson mb-3">
              // 02 — ȘPRIȚ KING · DAILY DIVINITY
            </div>
            <h2 className="font-display font-black text-5xl md:text-7xl leading-none">
              Cine bea cel mai mult,<br />
              <span className="text-gradient-chaos">ăla-i zeu.</span>
            </h2>
          </div>
          <p className="max-w-md text-muted-foreground">
            Cea mai veche regulă din nopțile României, acum cu dovadă. Scanezi fiecare șpriț, AI-ul validează, orașul te încoronează. Reset la 06:00.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_1.4fr] gap-4">
          {/* THE KING */}
          <div className="glass rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full"
              style={{ background: 'radial-gradient(circle, var(--neon-crimson) 0%, transparent 60%)', opacity: 0.4, filter: 'blur(20px)' }} />
            <div className="relative">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-neon-crimson mb-3">// ZEUL DE AZI</div>
              <div className="flex items-center gap-4 mb-6">
                <div className="relative">
                  <div className="h-20 w-20 rounded-full flex items-center justify-center font-display font-black text-3xl"
                    style={{
                      background: 'linear-gradient(135deg, var(--neon-crimson), var(--neon-purple))',
                      boxShadow: '0 0 32px var(--neon-crimson)',
                    }}>
                    👑
                  </div>
                  <span className="absolute inset-0 rounded-full pulse-ring" style={{ background: 'var(--neon-crimson)' }} />
                </div>
                <div>
                  <div className="font-display font-black text-2xl">@vladtepes_3am</div>
                  <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">CLUJ-NAPOCA · STREAK 4 NOPȚI</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-5">
                <Stat label="șprițuri" value="27" color="var(--neon-crimson)" />
                <Stat label="verificate" value="27" color="var(--neon-green)" />
                <Stat label="aură" value="+840" color="var(--neon-purple)" />
              </div>

              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">// timeline azi</div>
              <div className="flex gap-1 h-10">
                {Array.from({ length: 24 }).map((_, i) => {
                  const intense = [19, 20, 21, 22, 23, 0, 1, 2, 3].includes(i % 24);
                  const h = intense ? 60 + Math.random() * 40 : 10 + Math.random() * 25;
                  return (
                    <div key={i} className="flex-1 rounded-sm self-end" style={{
                      height: `${h}%`,
                      background: intense ? 'var(--neon-crimson)' : 'oklch(0.5 0.05 280 / 50%)',
                      boxShadow: intense ? '0 0 8px var(--neon-crimson)' : 'none',
                    }} />
                  );
                })}
              </div>
              <div className="flex justify-between font-mono text-[9px] text-muted-foreground mt-1">
                <span>00</span><span>06</span><span>12</span><span>18</span><span>24</span>
              </div>

              <button className="mt-6 w-full font-display font-bold text-sm tracking-widest uppercase py-3 rounded-xl border border-neon-crimson/60 bg-neon-crimson/15 text-neon-crimson hover:bg-neon-crimson/30 transition">
                📸 SCANEAZĂ ȘPRIȚ · +1 PROOF
              </button>
              <p className="font-mono text-[10px] text-muted-foreground mt-2 text-center">
                AI verifică paharul, locația și ora. Fake = ban 30 zile.
              </p>
            </div>
          </div>

          {/* LEADERBOARD */}
          <div className="glass rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="font-display font-bold text-lg">LIVE LEADERBOARD · RO</div>
              <div className="flex gap-1">
                {(['TODAY', 'WEEK', 'ALL TIME'] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-md transition ${
                      tab === t ? 'bg-neon-crimson/20 text-neon-crimson border border-neon-crimson/40' : 'text-muted-foreground hover:text-foreground'
                    }`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              {LEADERBOARD.map(e => (
                <div key={e.handle}
                  className="grid grid-cols-[28px_1fr_auto_auto] items-center gap-3 px-3 py-2.5 rounded-xl bg-foreground/5 hover:bg-foreground/10 transition">
                  <div className="font-display font-black text-lg text-center"
                    style={{ color: e.rank === 1 ? 'var(--neon-crimson)' : e.rank <= 3 ? 'var(--neon-purple)' : 'var(--muted-foreground)' }}>
                    {e.rank}
                  </div>
                  <div className="min-w-0">
                    <div className="font-display font-bold text-sm truncate">{e.handle}</div>
                    <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                      {e.city} · streak {e.streak} · {e.proof}/{e.count} proof
                    </div>
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-widest px-2 py-1 rounded border"
                    style={{ color: statusColor[e.status], borderColor: statusColor[e.status] + '60' }}>
                    {e.status}
                  </div>
                  <div className="font-display font-black text-xl tabular-nums w-10 text-right"
                    style={{ color: statusColor[e.status], textShadow: `0 0 10px ${statusColor[e.status]}` }}>
                    {e.count}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <Mini label="oraș top" value="CLUJ" color="var(--neon-purple)" />
              <Mini label="total / RO" value="38.2k" color="var(--neon-green)" />
              <Mini label="reset în" value="04:21" color="var(--neon-crimson)" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl bg-foreground/5 p-3 text-center">
      <div className="font-display font-black text-2xl" style={{ color, textShadow: `0 0 12px ${color}` }}>{value}</div>
      <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

function Mini({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg bg-foreground/5 p-2 text-center">
      <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-display font-black text-base" style={{ color }}>{value}</div>
    </div>
  );
}

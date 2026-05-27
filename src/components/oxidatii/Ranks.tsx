const tiers = [
  {
    label: "MDS-uri (începători)",
    color: "var(--muted-foreground)",
    ranks: ["Băiat de Scară", "Client la Nonstop", "Ucenic de Șpriț", "Lord al Semințelor", "Rookie de Terasă"],
  },
  {
    label: "Mid — oameni serioși",
    color: "var(--neon-blue)",
    ranks: ["Regele Meseurilor", "Baron de Șpriț", "Bombardier Premium", "Șef de Club", "Campion la After", "Rechin de Terasă", "Sultanul Shoturilor"],
  },
  {
    label: "High — boși de cartier",
    color: "var(--neon-purple)",
    ranks: ["Marele Haosar", "Boss Final de Cartier", "Zeul Afterului", "Călăul Ficatelor", "Stăpânul Victoriei"],
  },
  {
    label: "ZEI — un singur loc pe zi",
    color: "var(--neon-crimson)",
    ranks: ["Împăratul Nopții", "Regele Balcanic", "Dumnezeul Oxidaților 👑"],
  },
];

export function Ranks() {
  return (
    <section id="ranguri" className="relative py-20 px-5 md:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-10">
          <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-neon-purple mb-2">
            // 20+ ranguri reale
          </div>
          <h2 className="font-display uppercase text-3xl md:text-5xl tracking-tighter leading-none max-w-3xl">
            De la <span className="text-muted-foreground">Lord al Semințelor</span> la <span className="text-gradient-chaos">Dumnezeul Oxidaților</span>
          </h2>
          <p className="mt-4 text-sm text-muted-foreground max-w-xl">
            Fiecare șpriț validat, fiecare apariție, fiecare clip viral te urcă. Nimic fake. Doar dovadă.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          {tiers.map((t) => (
            <div key={t.label} className="border border-foreground/10 rounded-md p-4 bg-background/50"
              style={{ borderLeft: `3px solid ${t.color}` }}>
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] mb-3" style={{ color: t.color }}>
                {t.label}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {t.ranks.map((r) => (
                  <span key={r}
                    className="font-display uppercase text-[11px] md:text-xs px-2.5 py-1.5 rounded-sm border"
                    style={{ borderColor: `${t.color}55`, color: t.color, background: `${t.color}10` }}>
                    {r}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const tiers = [
  {
    label: "MDS-uri (începători)",
    color: "var(--muted-foreground)",
    ranks: ["Băiat de Scară", "Client la Nonstop", "Ucenic de Șpriț", "Lord al Semințelor", "Rookie de Terasă"],
  },
  {
    label: "Mid — oameni serioși",
    color: "var(--sunset-indigo)",
    ranks: ["Regele Meseurilor", "Baron de Șpriț", "Bombardier Premium", "Șef de Club", "Campion la After", "Rechin de Terasă", "Sultanul Shoturilor"],
  },
  {
    label: "High — boși de cartier",
    color: "var(--sunset-magenta)",
    ranks: ["Marele Haosar", "Boss Final de Cartier", "Zeul Afterului", "Călăul Ficatelor", "Stăpânul Victoriei"],
  },
  {
    label: "ZEI — un singur loc pe zi",
    color: "var(--sunset-orange)",
    ranks: ["Împăratul Nopții", "Regele Balcanic", "Dumnezeul Oxidaților 👑"],
  },
];

export function Ranks() {
  return (
    <section className="relative py-14 px-5 md:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h2 className="font-display uppercase text-2xl md:text-4xl tracking-tighter leading-none">
            De la <span className="text-muted-foreground">Lord al Semințelor</span> la <span className="text-gradient-chaos">Dumnezeul Oxidaților</span>
          </h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-lg">
            Fiecare șpriț, fiecare poză, fiecare seară te urcă. Nimic fake. Doar dovadă.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-2">
          {tiers.map((t) => (
            <div key={t.label} className="border border-border rounded-md p-3 bg-card/40"
              style={{ borderLeft: `3px solid ${t.color}` }}>
              <div className="font-mono text-[10px] uppercase tracking-widest mb-2" style={{ color: t.color }}>
                {t.label}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {t.ranks.map((r) => (
                  <span key={r}
                    className="font-display uppercase text-[11px] px-2 py-1 rounded-sm border"
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

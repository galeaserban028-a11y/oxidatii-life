const haite = [
  { name: "Mafia Șprițului", city: "București", members: 142, motto: "Cinste sau moarte.", color: "var(--neon-crimson)" },
  { name: "Lupii de la Victoriei", city: "Pitești", members: 87, motto: "Strada e a noastră.", color: "var(--neon-purple)" },
  { name: "Șobolanii de Lux", city: "Cluj", members: 64, motto: "Versace și 4 lei la nonstop.", color: "#fde047" },
  { name: "Clanul BMW", city: "Timișoara", members: 53, motto: "M3 sau nimic.", color: "var(--neon-blue)" },
  { name: "Frații Afterului", city: "Constanța", members: 78, motto: "Soarele răsare la noi.", color: "var(--neon-green)" },
  { name: "Liga Ficatelor Distruse", city: "Iași", members: 102, motto: "Mai bem una și plecăm.", color: "var(--neon-purple)" },
];

export function Haite() {
  return (
    <section id="haite" className="relative py-20 px-5 md:px-8 border-t border-foreground/10">
      <div className="max-w-6xl mx-auto">
        <div className="mb-10">
          <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-neon-crimson mb-2">
            // sistemul HAITE
          </div>
          <h2 className="font-display uppercase text-3xl md:text-5xl tracking-tighter leading-none max-w-3xl">
            Singur ești MDS. <span className="text-gradient-chaos">În haită ești legendă.</span>
          </h2>
          <p className="mt-4 text-sm text-muted-foreground max-w-xl">
            Faci haită cu băieții tăi. Vă luați teritoriu, vă bateți la reputație, vă urcați în topul orașului împreună.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {haite.map((h) => (
            <div key={h.name} className="group relative bg-background/60 border border-foreground/10 hover:border-foreground/30 rounded-md overflow-hidden transition">
              <div className="absolute top-0 left-0 right-0 h-1" style={{ background: h.color, boxShadow: `0 0 12px ${h.color}` }} />
              <div className="p-5">
                <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest">
                  <span style={{ color: h.color }}>{h.city}</span>
                  <span className="text-muted-foreground">{h.members} membri</span>
                </div>
                <div className="mt-3 font-display uppercase text-2xl leading-tight tracking-tight">
                  {h.name}
                </div>
                <div className="mt-3 text-sm italic text-muted-foreground border-l-2 pl-3" style={{ borderColor: h.color }}>
                  „{h.motto}"
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

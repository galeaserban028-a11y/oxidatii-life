const haite = [
  { name: "Mafia Șprițului", city: "București", members: 142, motto: "Cinste sau moarte.", color: "var(--sunset-orange)" },
  { name: "Lupii de la Victoriei", city: "Pitești", members: 87, motto: "Strada e a noastră.", color: "var(--sunset-magenta)" },
  { name: "Șobolanii de Lux", city: "Cluj", members: 64, motto: "Versace și 4 lei la nonstop.", color: "var(--sunset-amber)" },
  { name: "Clanul BMW", city: "Timișoara", members: 53, motto: "M3 sau nimic.", color: "var(--sunset-indigo)" },
  { name: "Frații Afterului", city: "Constanța", members: 78, motto: "Soarele răsare la noi.", color: "var(--sunset-orange)" },
  { name: "Liga Ficatelor Distruse", city: "Iași", members: 102, motto: "Mai bem una și plecăm.", color: "var(--sunset-magenta)" },
];

export function Haite() {
  return (
    <section className="relative py-14 px-5 md:px-8 border-t border-border">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h2 className="font-display uppercase text-2xl md:text-4xl tracking-tighter leading-none">
            Singur ești MDS. <span className="text-gradient-chaos">În haită ești legendă.</span>
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {haite.map((h) => (
            <div key={h.name} className="group relative bg-card/40 border border-border hover:border-foreground/30 rounded-md overflow-hidden transition">
              <div className="absolute top-0 left-0 right-0 h-1" style={{ background: h.color }} />
              <div className="p-4">
                <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest">
                  <span style={{ color: h.color }}>{h.city}</span>
                  <span className="text-muted-foreground">{h.members} membri</span>
                </div>
                <div className="mt-2 font-display uppercase text-lg leading-tight tracking-tight">
                  {h.name}
                </div>
                <div className="mt-2 text-xs italic text-muted-foreground border-l-2 pl-2" style={{ borderColor: h.color }}>
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

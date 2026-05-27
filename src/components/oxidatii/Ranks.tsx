const ranks = [
  { rank: "MDS", req: "sub 3 șprițuri/săptămână", color: "var(--muted-foreground)", desc: "Începătorul. Toți pleacă de aici." },
  { rank: "Crăi de cartier", req: "10 șprițuri / 7 zile", color: "var(--neon-blue)", desc: "Te știe barmanul de la colț." },
  { rank: "Șprițarul", req: "25 / 7 zile", color: "var(--neon-green)", desc: "Constant, serios, mereu pe poziții." },
  { rank: "Cămătaru' de Pahar", req: "50 / 7 zile", color: "#f59e0b", desc: "Faci tu cinste. Mereu." },
  { rank: "Boierul Nopții", req: "100 / 7 zile", color: "var(--neon-purple)", desc: "Vin oamenii la masa ta." },
  { rank: "Regele Centrului", req: "top 10 oraș", color: "var(--neon-crimson)", desc: "Bărci, baruri, totul te ascultă." },
  { rank: "ZEU' BALCANIC 👑", req: "#1 național / zi", color: "#fde047", desc: "Un singur om pe zi în toată România." },
];

export function Ranks() {
  return (
    <section id="ranguri" className="relative py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground mb-3">
            // ranguri reale
          </div>
          <h2 className="font-display font-black text-4xl md:text-6xl tracking-tighter">
            De la MDS la <span className="text-gradient-chaos">ZEU' BALCANIC</span>
          </h2>
          <p className="mt-4 text-sm text-muted-foreground max-w-xl mx-auto">
            Fiecare șpriț validat de AI te urcă. Fără invenții, fără fake-uri. Doar dovadă.
          </p>
        </div>

        <div className="space-y-2">
          {ranks.map((r, i) => (
            <div
              key={r.rank}
              className="glass rounded-xl p-4 flex items-center gap-4 hover:scale-[1.01] transition"
              style={{ borderLeft: `3px solid ${r.color}` }}
            >
              <div
                className="font-mono text-[10px] uppercase tracking-widest w-8 text-right"
                style={{ color: r.color }}
              >
                #{i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display font-black text-lg md:text-xl" style={{ color: r.color }}>
                  {r.rank}
                </div>
                <div className="text-xs text-muted-foreground">{r.desc}</div>
              </div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground text-right shrink-0">
                {r.req}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

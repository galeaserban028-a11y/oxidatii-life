// Tabloid-style LIVE FEED preview — looks like a real-time city scroll
const feed = [
  { city: "PITEȘTI", street: "Strada Victoriei", chaos: 94, head: "VICTORIEI ÎN STARE DE RĂZBOI", body: "7 BMW-uri parcate la o singură terasă. Haita Alcooliștilor domină centrul.", color: "var(--neon-crimson)" },
  { city: "BUCUREȘTI", street: "Centrul Vechi", chaos: 88, head: "BERCENIUL IAR A INTRAT ÎN OVERTIME", body: "Un individ cu tricou Versace și IQ negativ a luat micul pe terasă la 04:17.", color: "var(--neon-purple)" },
  { city: "CLUJ", street: "Piezișă", chaos: 76, head: "PHI 21 — coadă de 200m la fum", body: "Studenții au declarat oficial seara de marți drept weekend.", color: "var(--neon-blue)" },
  { city: "TIMIȘOARA", street: "Piața Victoriei", chaos: 71, head: "NUBA — zeu de marți confirmat", body: "DANI_BMW raportat la al 14-lea șpriț. Echipa Top îl pune deja pe podium.", color: "#fde047" },
  { city: "IAȘI", street: "Lăpușneanu", chaos: 65, head: "4 indivizi din Liga Ficatelor văzuți la shaormerie", body: "Comanda: 4 cu de toate, 2 fără ceapă, un șpriț de proteste.", color: "var(--neon-green)" },
  { city: "ORADEA", street: "Piața Unirii", chaos: 58, head: "Moszkva Cafe — terasa e ruptă", body: "Crăii de cartier au mutat ședința la Insomnia după ora 02:00.", color: "var(--neon-purple)" },
];

export function HowItWorks() {
  return (
    <section id="cum" className="relative py-20 px-5 md:px-8 border-y border-foreground/10">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-end justify-between mb-8 gap-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-neon-crimson mb-2 flicker">
              ● LIVE · ACUM
            </div>
            <h2 className="font-display uppercase text-3xl md:text-5xl tracking-tighter leading-none">
              Ce <span className="text-gradient-chaos">URLĂ</span> orașele acum
            </h2>
          </div>
          <div className="hidden md:block font-mono text-[10px] uppercase tracking-widest text-muted-foreground text-right">
            simulare<br/>se actualizează<br/>la fiecare 30s
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-2">
          {feed.map((f, i) => (
            <article key={i} className="group relative bg-background/60 border border-foreground/10 hover:border-neon-purple/60 transition rounded-md overflow-hidden">
              {/* chaos bar */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-foreground/10">
                <div className="h-full" style={{ width: `${f.chaos}%`, background: f.color, boxShadow: `0 0 10px ${f.color}` }} />
              </div>

              <div className="p-4 md:p-5">
                <div className="flex items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-widest">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: f.color, boxShadow: `0 0 8px ${f.color}` }} />
                    <span style={{ color: f.color }}>{f.city}</span>
                    <span className="text-muted-foreground">/ {f.street}</span>
                  </div>
                  <span className="text-muted-foreground">haos {f.chaos}%</span>
                </div>

                <h3 className="mt-3 font-display uppercase text-xl md:text-2xl leading-tight tracking-tight">
                  {f.head}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.body}</p>

                <div className="mt-4 flex items-center gap-3 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  <span>● 247 oxidați</span>
                  <span>● 18 clipuri</span>
                  <span className="ml-auto group-hover:text-neon-purple transition">vezi feed →</span>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Marquee strip */}
        <div className="mt-8 border border-foreground/10 rounded-md overflow-hidden bg-background/60">
          <div className="flex whitespace-nowrap marquee py-2 font-mono text-[11px] uppercase tracking-widest">
            {Array.from({ length: 2 }).map((_, k) => (
              <div key={k} className="flex gap-8 px-4 shrink-0">
                <span className="text-neon-crimson">● BREAKING</span>
                <span>Sultanul Shoturilor a căzut la Fratelli</span>
                <span className="text-neon-purple">●</span>
                <span>Brașovul cere reînființarea afterului</span>
                <span className="text-neon-green">●</span>
                <span>Constanța: terasa de la mare = nivel zeu</span>
                <span className="text-neon-blue">●</span>
                <span>Călăul Ficatelor a fost văzut la Nuba</span>
                <span className="text-neon-crimson">●</span>
                <span>Haita BMW-urilor a luat strada</span>
                <span className="text-neon-purple">●</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

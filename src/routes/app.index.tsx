import { createFileRoute, Link } from "@tanstack/react-router";

const feed = [
  { city: "PITEȘTI", street: "Victoriei", chaos: 94, head: "VICTORIEI ÎN STARE DE RĂZBOI", body: "7 BMW-uri, o terasă, o legendă în devenire.", color: "var(--neon-crimson)" },
  { city: "BUCUREȘTI", street: "Centrul Vechi", chaos: 88, head: "BERCENIUL IAR A INTRAT ÎN OVERTIME", body: "Versace + IQ negativ = șef de masă la 04:17.", color: "var(--neon-purple)" },
  { city: "CLUJ", street: "Piezișă", chaos: 76, head: "PHI 21 — coadă de 200m la fum", body: "Marți confirmat oficial drept weekend.", color: "var(--neon-blue)" },
  { city: "TIMIȘOARA", street: "Piața Victoriei", chaos: 71, head: "NUBA — zeu de marți confirmat", body: "DANI_BMW la al 14-lea șpriț. Podium asigurat.", color: "#fde047" },
  { city: "IAȘI", street: "Lăpușneanu", chaos: 65, head: "Liga Ficatelor a luat shaormeria", body: "4 cu de toate, 2 fără ceapă, un șpriț de proteste.", color: "var(--neon-green)" },
  { city: "ORADEA", street: "Piața Unirii", chaos: 58, head: "Moszkva Cafe — terasa e ruptă", body: "Crăii au mutat ședința la Insomnia după 02:00.", color: "var(--neon-purple)" },
];

export const Route = createFileRoute("/app/")({
  head: () => ({ meta: [{ title: "Feed · OXIDAȚII" }] }),
  component: AppFeed,
});

function AppFeed() {
  return (
    <div className="px-4 pt-5 pb-6 space-y-4">
      <header className="space-y-2">
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest">
          <span className="text-neon-crimson flicker">● LIVE · ROMÂNIA</span>
          <span className="text-muted-foreground">aseară · azi · acum</span>
        </div>
        <h1 className="font-display uppercase text-2xl leading-none tracking-tight">
          Ce <span className="text-gradient-chaos">URLĂ</span> orașele.
        </h1>
      </header>

      <div className="space-y-3">
        {feed.map((f, i) => (
          <article key={i} className="relative bg-foreground/[0.04] border border-foreground/10 rounded-xl overflow-hidden active:scale-[0.99] transition">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-foreground/10">
              <div className="h-full" style={{ width: `${f.chaos}%`, background: f.color, boxShadow: `0 0 10px ${f.color}` }} />
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: f.color, boxShadow: `0 0 8px ${f.color}` }} />
                  <span style={{ color: f.color }}>{f.city}</span>
                  <span className="text-muted-foreground">/ {f.street}</span>
                </div>
                <span className="text-muted-foreground">{f.chaos}% haos</span>
              </div>

              <h2 className="mt-3 font-display uppercase text-lg leading-tight tracking-tight">
                {f.head}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground leading-snug">{f.body}</p>

              <div className="mt-3 flex items-center gap-3 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                <span>● 247 oxidați</span>
                <span>● 18 clipuri</span>
                <Link to="/app/map" className="ml-auto text-neon-purple">vezi pe hartă →</Link>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="text-center pt-2">
        <Link to="/app/top" className="inline-flex font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-neon-purple">
          vezi topul zilei →
        </Link>
      </div>
    </div>
  );
}

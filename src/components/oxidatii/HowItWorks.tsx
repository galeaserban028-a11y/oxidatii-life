import { Link } from "@tanstack/react-router";

const steps = [
  {
    n: "01",
    title: "Fă-ți contul tău",
    body: "Email sau Google. Alegi un handle (@boierul), orașul, și ești înăuntru.",
    color: "var(--neon-purple)",
  },
  {
    n: "02",
    title: "Scanezi șprițul",
    body: "Camera deschisă, șpriț în mână, poza pleacă. AI verifică dacă e real. Fake = ban 30 de zile.",
    color: "var(--neon-blue)",
  },
  {
    n: "03",
    title: "Urci în top",
    body: "Fiecare șpriț validat = aură. Aură multă = rang mare. Top-ul se resetează zilnic la 06:00.",
    color: "var(--neon-green)",
  },
];

export function HowItWorks() {
  return (
    <section id="cum" className="relative py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground mb-3">
            // cum funcționează
          </div>
          <h2 className="font-display font-black text-4xl md:text-6xl tracking-tighter">
            Trei pași. <span className="text-gradient-chaos">Zero glume.</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {steps.map((s) => (
            <div
              key={s.n}
              className="glass rounded-2xl p-6 relative overflow-hidden hover:scale-[1.02] transition"
              style={{ boxShadow: `inset 0 0 0 1px ${s.color}22` }}
            >
              <div
                className="font-display font-black text-7xl opacity-20 leading-none"
                style={{ color: s.color }}
              >
                {s.n}
              </div>
              <div className="mt-4 font-display font-black text-2xl">{s.title}</div>
              <div className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.body}</div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            to="/signup"
            className="inline-flex font-mono text-xs uppercase tracking-[0.25em] px-7 py-4 rounded-full bg-foreground text-background hover:bg-neon-purple hover:text-primary-foreground transition glow-purple"
          >
            Începe acum →
          </Link>
        </div>
      </div>
    </section>
  );
}

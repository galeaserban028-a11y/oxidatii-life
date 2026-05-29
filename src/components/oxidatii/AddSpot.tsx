import { Link } from "@tanstack/react-router";

export function AddSpot() {
  return (
    <section className="relative py-12 px-5 overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.08] pointer-events-none"
        style={{ background: "var(--gradient-sunset)" }}
      />
      <div className="relative max-w-2xl mx-auto">
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-sunset-orange mb-2">
          // tu construiești harta
        </div>
        <h2 className="font-display uppercase text-[clamp(2rem,9vw,3rem)] leading-[0.88] tracking-tighter">
          Adaugă <span className="text-gradient-chaos">locul tău</span> de șpriț.
        </h2>
        <p className="mt-3 text-sm text-foreground/80 leading-relaxed">
          Terasa din colț, barul din bloc, banca din parc — orice loc unde se bea șpriț
          intră pe hartă. <b>Tu îl pui</b>, oxidații îl găsesc, beți în mai mulți.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <div className="border border-border rounded-xl p-3 bg-card/40">
            <div className="font-display text-xl">+</div>
            <div className="font-display uppercase text-xs mt-1">Pin pe hartă</div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
              30 sec
            </div>
          </div>
          <div className="border border-border rounded-xl p-3 bg-card/40">
            <div className="font-display text-xl">⚡</div>
            <div className="font-display uppercase text-xs mt-1">Cheamă haita</div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
              1 click
            </div>
          </div>
        </div>

        <Link
          to="/signup"
          className="mt-5 inline-flex font-display uppercase text-sm tracking-[0.12em] px-5 py-3 rounded-xl text-primary-foreground"
          style={{ background: "var(--gradient-sunset)" }}
        >
          Pune-ți locul tău →
        </Link>
      </div>
    </section>
  );
}

export function FindOxidati() {
  return (
    <section className="relative py-12 px-5 border-y border-border">
      <div className="max-w-2xl mx-auto">
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">
          // nu mai bei singur
        </div>
        <h2 className="font-display uppercase text-[clamp(2rem,9vw,3rem)] leading-[0.88] tracking-tighter">
          Găsește-ți <span className="text-gradient-chaos">oxidații</span> de șpriț.
        </h2>
        <p className="mt-3 text-sm text-foreground/80 leading-relaxed">
          Cauți MDS? Cauți oameni cu care să faci șpriț în mai mulți?
          Vezi cine-i online <b>acum</b>, în orașul tău, pe ce terasă.
          Dai mesaj, te duci, gata — masă plină.
        </p>

        <div className="mt-5 flex flex-wrap gap-1.5">
          {["#mds", "#șpriț-după-muncă", "#after-club", "#haită-cluj", "#terase-bucurești", "#sezon-vară"].map((t) => (
            <span
              key={t}
              className="font-mono text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full border border-border bg-card/40 text-muted-foreground"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

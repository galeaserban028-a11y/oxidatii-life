import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

type LiveCity = { slug: string; name: string; venue_count: number };

export function HowItWorks() {
  const [hotCities, setHotCities] = useState<LiveCity[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("cities")
        .select("slug, name, venues(count)")
        .order("name")
        .limit(8);
      if (data) {
        setHotCities(
          data.map((c: any) => ({
            slug: c.slug,
            name: c.name,
            venue_count: c.venues?.[0]?.count ?? 0,
          })),
        );
      }
    })();
  }, []);

  const steps = [
    { n: "01", t: "Faci cont", b: "Email sau Google. 20 de secunde. Gata." },
    { n: "02", t: "Faci poze", b: "La club, la terasă, la after. Postezi ce vezi." },
    { n: "03", t: "Devii faimos", b: "Top-ul se resetează zilnic. Doar dovadă reală urcă." },
  ];

  return (
    <section className="relative py-14 px-5 md:px-8 border-y border-border">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h2 className="font-display uppercase text-2xl md:text-4xl tracking-tighter leading-none">
            Trei pași. <span className="text-gradient-chaos">Zero bătăi de cap.</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-2 mb-10">
          {steps.map((s) => (
            <div key={s.n} className="border border-border rounded-md p-4 bg-card/40">
              <div className="font-display text-3xl text-primary/30 leading-none">{s.n}</div>
              <div className="mt-2 font-display uppercase text-base">{s.t}</div>
              <p className="mt-1 text-sm text-muted-foreground">{s.b}</p>
            </div>
          ))}
        </div>

        {hotCities.length > 0 && (
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
              Orașe cu viață
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {hotCities.map((c) => (
                <Link
                  key={c.slug}
                  to="/app/city/$slug"
                  params={{ slug: c.slug }}
                  className="border border-border hover:border-primary/60 transition rounded-md p-3 bg-card/40"
                >
                  <div className="font-display uppercase text-sm">{c.name}</div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
                    {c.venue_count} locuri
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

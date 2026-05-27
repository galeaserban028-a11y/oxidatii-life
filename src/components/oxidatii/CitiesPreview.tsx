import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

type CityRow = {
  slug: string;
  name: string;
  region: string | null;
  venue_count: number;
};

export function CitiesPreview() {
  const [cities, setCities] = useState<CityRow[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("cities")
        .select("slug, name, region, venues(count)")
        .order("name");
      if (data) {
        setCities(
          data.map((c: any) => ({
            slug: c.slug,
            name: c.name,
            region: c.region,
            venue_count: c.venues?.[0]?.count ?? 0,
          })),
        );
      }
    })();
  }, []);

  return (
    <section id="orase" className="relative py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground mb-3">
            // toată țara
          </div>
          <h2 className="font-display font-black text-4xl md:text-6xl tracking-tighter">
            Cluburi reale. <span className="text-gradient-chaos">Străzi reale.</span>
          </h2>
          <p className="mt-4 text-sm text-muted-foreground max-w-xl mx-auto">
            Dai pe Oradea → Piața Unirii → vezi toate barurile cu poze, IG, ce s-a întâmplat aseară.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {cities.map((c) => (
            <Link
              key={c.slug}
              to="/app/city/$slug"
              params={{ slug: c.slug }}
              className="glass rounded-xl p-4 hover:scale-[1.03] hover:border-neon-purple transition group"
            >
              <div className="font-display font-black text-lg group-hover:text-gradient-chaos">
                {c.name}
              </div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
                {c.region ?? "RO"}
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="font-display font-black text-2xl text-neon-green">
                  {c.venue_count}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  cluburi
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

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
    <section className="relative py-14 px-5 md:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h2 className="font-display uppercase text-2xl md:text-4xl tracking-tighter">
            Cluburi. <span className="text-gradient-chaos">Terase. Străzi.</span>
          </h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-lg">
            Dai pe oraș, vezi ce-i acolo. Poze, oameni, ce s-a-ntâmplat aseară. Real, nu fake.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {cities.map((c) => (
            <Link
              key={c.slug}
              to="/app/city/$slug"
              params={{ slug: c.slug }}
              className="border border-border hover:border-primary/60 rounded-md p-3 bg-card/40 transition"
            >
              <div className="font-display font-bold text-sm">{c.name}</div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
                {c.region ?? "RO"}
              </div>
              <div className="mt-2 font-display text-lg text-primary/80">
                {c.venue_count}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

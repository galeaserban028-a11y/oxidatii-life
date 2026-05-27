import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

type LiveCity = { slug: string; name: string; venue_count: number };
type LiveStats = { users: number; venues: number; cities: number; proofs: number };

export function HowItWorks() {
  const [stats, setStats] = useState<LiveStats | null>(null);
  const [hotCities, setHotCities] = useState<LiveCity[]>([]);

  useEffect(() => {
    (async () => {
      const [users, venues, cities, proofs, hot] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("venues").select("id", { count: "exact", head: true }),
        supabase.from("cities").select("id", { count: "exact", head: true }),
        supabase.from("sprit_proofs").select("id", { count: "exact", head: true }).eq("ai_verified", true),
        supabase.from("cities").select("slug, name, venues(count)").order("name").limit(8),
      ]);
      setStats({
        users: users.count ?? 0,
        venues: venues.count ?? 0,
        cities: cities.count ?? 0,
        proofs: proofs.count ?? 0,
      });
      setHotCities(
        (hot.data ?? []).map((c: any) => ({
          slug: c.slug,
          name: c.name,
          venue_count: c.venues?.[0]?.count ?? 0,
        })),
      );
    })();
  }, []);

  const steps = [
    { n: "01", t: "Cont real", b: "Email sau Google. Alegi @handle-ul, orașul. 30 secunde." },
    { n: "02", t: "Postezi ce vezi", b: "Poză de la club, terasă, after. Sau scanezi un șpriț — AI verifică dacă e real." },
    { n: "03", t: "Urci în top", b: "Doar dovadă reală urcă. Top-ul orașului tău se resetează zilnic la 06:00." },
  ];

  return (
    <section id="cum" className="relative py-20 px-5 md:px-8 border-y border-foreground/10">
      <div className="max-w-6xl mx-auto">
        <div className="mb-10">
          <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-neon-purple mb-2">
            // cum merge
          </div>
          <h2 className="font-display uppercase text-3xl md:text-5xl tracking-tighter leading-none max-w-3xl">
            Trei pași. <span className="text-gradient-chaos">Zero invenții.</span>
          </h2>
          <p className="mt-4 text-sm text-muted-foreground max-w-xl">
            Tot ce vezi în aplicație vine de la oameni reali. Fără boți, fără conținut generat. Fără fake.
          </p>
        </div>

        {/* Real stats from DB */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-foreground/10 border border-foreground/10 rounded-md overflow-hidden mb-10">
          {[
            { k: "ORAȘE", v: stats?.cities },
            { k: "CLUBURI INDEXATE", v: stats?.venues },
            { k: "OXIDAȚI ÎNSCRIȘI", v: stats?.users },
            { k: "ȘPRIȚURI VERIFICATE", v: stats?.proofs },
          ].map((s) => (
            <div key={s.k} className="bg-background/80 px-4 py-4">
              <div className="font-display text-3xl text-neon-purple leading-none">
                {s.v === undefined ? "—" : s.v}
              </div>
              <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mt-1.5">{s.k}</div>
            </div>
          ))}
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-3 mb-12">
          {steps.map((s) => (
            <div key={s.n} className="border border-foreground/10 rounded-md p-5 bg-background/40">
              <div className="font-display text-5xl text-neon-purple/30 leading-none">{s.n}</div>
              <div className="mt-3 font-display uppercase text-lg">{s.t}</div>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.b}</p>
            </div>
          ))}
        </div>

        {/* Hot cities — real venue counts */}
        {hotCities.length > 0 && (
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-3">
              // orașe indexate · cluburi reale
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {hotCities.map((c) => (
                <Link
                  key={c.slug}
                  to="/app/city/$slug"
                  params={{ slug: c.slug }}
                  className="border border-foreground/10 hover:border-neon-purple/60 transition rounded-md p-3 bg-background/60"
                >
                  <div className="font-display uppercase text-base">{c.name}</div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
                    {c.venue_count} cluburi
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

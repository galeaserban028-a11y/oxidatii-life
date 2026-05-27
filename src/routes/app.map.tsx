import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RomaniaMap } from "@/components/app/RomaniaMap";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/map")({
  head: () => ({ meta: [{ title: "Hartă · OXIDAȚII" }] }),
  component: MapPage,
});

function MapPage() {
  const { profile } = useAuth();
  const { data: cities = [], isLoading } = useQuery({
    queryKey: ["cities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cities")
        .select("id,slug,name,lat,lng,chaos_level")
        .order("chaos_level", { ascending: false });
      if (error) throw error;
      return data.map(c => ({ ...c, lat: Number(c.lat), lng: Number(c.lng), chaos_level: Number(c.chaos_level) }));
    },
  });

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <header className="flex items-end justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-neon-green">// HARTĂ · ROMÂNIA</div>
          <h1 className="font-display font-black text-2xl mt-1">Orașul e live.</h1>
        </div>
        <div className="text-right text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          salut, <span className="text-neon-purple">@{profile?.handle ?? "tu"}</span>
        </div>
      </header>

      {isLoading ? (
        <div className="aspect-[5/4] rounded-2xl bg-foreground/5 animate-pulse" />
      ) : (
        <RomaniaMap cities={cities} />
      )}

      <div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">// orașe</div>
        <div className="grid grid-cols-2 gap-2">
          {cities.map(c => (
            <a key={c.id} href={`/app/city/${c.slug}`}
              className="rounded-xl bg-foreground/5 border border-foreground/10 p-3 active:scale-[0.98] transition">
              <div className="font-display font-bold text-sm">{c.name}</div>
              <div className="font-mono text-[10px] text-muted-foreground mt-0.5">chaos {c.chaos_level.toFixed(1)}</div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

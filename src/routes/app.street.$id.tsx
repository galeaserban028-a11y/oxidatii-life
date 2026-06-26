import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Instagram } from "lucide-react";

export const Route = createFileRoute("/app/street/$id")({
  component: StreetPage,
});

function StreetPage() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["street", id],
    queryFn: async () => {
      const { data: street, error } = await supabase
        .from("streets")
        .select("id,name,city:cities(name,slug)")
        .eq("id", id)
        .single();
      if (error) throw error;
      const { data: venues } = await supabase
        .from("venues")
        .select("id,slug,name,type,description,ig_handle,cover_url,verified")
        .eq("street_id", id)
        .order("verified", { ascending: false });
      return { street, venues: venues ?? [] };
    },
  });

  if (isLoading || !data)
    return <div className="p-6 text-sm text-muted-foreground">Se încarcă...</div>;

  return (
    <div className="px-4 pt-6 pb-4 space-y-5">
      <Link
        to="/app/city/$slug"
        params={{ slug: (data.street.city as any).slug }}
        className="inline-flex items-center gap-1 text-xs font-mono uppercase tracking-widest text-muted-foreground"
      >
        <ArrowLeft size={14} /> {(data.street.city as any).name}
      </Link>
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-neon-green/80">
          teritoriu activ · {data.venues.length} locuri
        </div>
        <h1 className="font-display font-black text-3xl mt-1">{data.street.name}</h1>
      </div>

      <div className="space-y-4">
        {data.venues.length === 0 && (
          <div className="rounded-xl border border-dashed border-foreground/15 p-6 text-center text-sm text-muted-foreground">
            Niciun loc încă pe strada asta. Adaugă tu primul.
          </div>
        )}
        {data.venues.map((v: any) => (
          <Link
            key={v.id}
            to="/app/venue/$id"
            params={{ id: v.id }}
            className="block rounded-2xl bg-foreground/5 border border-foreground/10 overflow-hidden active:scale-[0.99] transition"
          >
            <div className="h-44 bg-gradient-to-br from-neon-purple/30 via-neon-crimson/20 to-neon-blue/30 relative">
              {v.cover_url && (
                <img
                  src={v.cover_url}
                  alt={v.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              )}
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
              {v.verified && (
                <div className="absolute top-3 right-3 text-[9px] font-mono uppercase tracking-widest px-2 py-1 rounded-full bg-neon-green/15 text-neon-green border border-neon-green/40 backdrop-blur">
                  ✓ verificat
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 p-3 flex items-end justify-between gap-2">
                <div className="font-display font-black text-xl leading-tight text-white drop-shadow">
                  {v.name}
                </div>
                {v.ig_handle && (
                  <span className="text-[10px] font-mono text-white/80 flex items-center gap-1 shrink-0">
                    <Instagram size={11} />@{v.ig_handle}
                  </span>
                )}
              </div>
            </div>
            {v.description && (
              <div className="px-3 py-2.5 text-xs text-muted-foreground line-clamp-2">
                {v.description}
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

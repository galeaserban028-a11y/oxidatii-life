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
        .from("streets").select("id,name,city:cities(name,slug)").eq("id", id).single();
      if (error) throw error;
      const { data: venues } = await supabase
        .from("venues").select("id,slug,name,type,description,ig_handle,cover_url,verified")
        .eq("street_id", id).order("verified", { ascending: false });
      return { street, venues: venues ?? [] };
    },
  });

  if (isLoading || !data) return <div className="p-6 text-sm text-muted-foreground">Se încarcă...</div>;

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <Link to="/app/city/$slug" params={{ slug: (data.street.city as any).slug }} className="inline-flex items-center gap-1 text-xs font-mono uppercase tracking-widest text-muted-foreground">
        <ArrowLeft size={14} /> {(data.street.city as any).name}
      </Link>
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-neon-green">// stradă</div>
        <h1 className="font-display font-black text-3xl">{data.street.name}</h1>
      </div>

      <div className="space-y-3">
        {data.venues.length === 0 && (
          <div className="rounded-xl border border-dashed border-foreground/15 p-6 text-center text-sm text-muted-foreground">
            Niciun venue încă pe strada asta. Adaugă tu primul.
          </div>
        )}
        {data.venues.map((v: any) => (
          <Link key={v.id} to="/app/venue/$id" params={{ id: v.id }}
            className="block rounded-2xl bg-foreground/5 border border-foreground/10 overflow-hidden active:scale-[0.99] transition">
            <div className="h-32 bg-gradient-to-br from-neon-purple/30 via-neon-crimson/20 to-neon-blue/30 relative">
              {v.cover_url && <img src={v.cover_url} alt={v.name} className="h-full w-full object-cover" />}
              <div className="absolute top-2 left-2 text-[9px] font-mono uppercase tracking-widest px-2 py-1 rounded bg-black/50 backdrop-blur">
                {v.type}
              </div>
              {v.verified && <div className="absolute top-2 right-2 text-[9px] font-mono uppercase tracking-widest px-2 py-1 rounded bg-neon-green/20 text-neon-green border border-neon-green/40">✓ verificat</div>}
            </div>
            <div className="p-3">
              <div className="flex items-center justify-between">
                <div className="font-display font-bold text-base">{v.name}</div>
                {v.ig_handle && <span className="text-[10px] font-mono text-neon-purple flex items-center gap-1"><Instagram size={11}/>@{v.ig_handle}</span>}
              </div>
              {v.description && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{v.description}</div>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Camera, MapPin, Instagram } from "lucide-react";

export const Route = createFileRoute("/app/venue/$id")({
  component: VenuePage,
});

function VenuePage() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["venue", id],
    queryFn: async () => {
      const { data: venue, error } = await supabase
        .from("venues")
        .select("id,name,type,description,ig_handle,address,cover_url,verified,street:streets(id,name,city:cities(name,slug))")
        .eq("id", id).single();
      if (error) throw error;
      const { data: photos } = await supabase
        .from("venue_photos").select("id,photo_url,caption,created_at")
        .eq("venue_id", id).order("created_at", { ascending: false }).limit(12);
      const { count: liveCount } = await supabase
        .from("check_ins").select("id", { count: "exact", head: true })
        .eq("venue_id", id).gt("expires_at", new Date().toISOString());
      return { venue, photos: photos ?? [], liveCount: liveCount ?? 0 };
    },
  });

  if (isLoading || !data) return <div className="p-6 text-sm text-muted-foreground">Se încarcă...</div>;
  const v = data.venue as any;

  return (
    <div className="pb-4">
      <div className="relative h-56 bg-gradient-to-br from-neon-purple/40 via-neon-crimson/30 to-neon-blue/40">
        {v.cover_url && <img src={v.cover_url} alt={v.name} className="h-full w-full object-cover" />}
        <Link to="/app/street/$id" params={{ id: v.street.id }} className="absolute top-4 left-4 h-9 w-9 rounded-full bg-black/50 backdrop-blur flex items-center justify-center">
          <ArrowLeft size={18}/>
        </Link>
        <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-neon-green">{v.type} · {v.street.city.name}</div>
            <h1 className="font-display font-black text-3xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">{v.name}</h1>
          </div>
          {data.liveCount > 0 && (
            <div className="rounded-full bg-neon-green/20 border border-neon-green/40 px-3 py-1 text-[10px] font-mono uppercase tracking-widest text-neon-green">
              ● {data.liveCount} aici acum
            </div>
          )}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {v.description && <p className="text-sm text-muted-foreground">{v.description}</p>}

        <div className="flex items-center gap-2 flex-wrap">
          {v.ig_handle && (
            <a href={`https://instagram.com/${v.ig_handle}`} target="_blank" rel="noreferrer"
              className="text-xs font-mono px-3 py-1.5 rounded-full bg-foreground/5 border border-foreground/10 flex items-center gap-1.5">
              <Instagram size={12}/> @{v.ig_handle}
            </a>
          )}
          <div className="text-xs font-mono px-3 py-1.5 rounded-full bg-foreground/5 border border-foreground/10 flex items-center gap-1.5">
            <MapPin size={12}/> {v.street.name}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Link to="/app/scan"
            className="rounded-xl bg-neon-crimson/20 border border-neon-crimson/40 text-neon-crimson py-3 text-center text-sm font-display font-bold uppercase tracking-widest flex items-center justify-center gap-2">
            <Camera size={16}/> Scanează șpriț
          </Link>
          <button className="rounded-xl bg-neon-green/20 border border-neon-green/40 text-neon-green py-3 text-sm font-display font-bold uppercase tracking-widest">
            Sunt aici
          </button>
        </div>

        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">// poze de aseară</div>
          {data.photos.length === 0 ? (
            <div className="rounded-xl border border-dashed border-foreground/15 p-6 text-center text-xs text-muted-foreground">
              Încă nu sunt poze. Fii primul.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {data.photos.map(p => (
                <div key={p.id} className="aspect-square rounded-md overflow-hidden bg-foreground/5">
                  <img src={p.photo_url} alt="" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

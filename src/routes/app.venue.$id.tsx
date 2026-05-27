import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Camera, MapPin, Instagram, Upload } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useRef, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/venue/$id")({
  component: VenuePage,
});

// Stock fallback photos by venue type — curated Unsplash imagery
const STOCK_PHOTOS: Record<string, string[]> = {
  club: [
    "https://images.unsplash.com/photo-1566737236500-c8ac43014a8e?w=600&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1571266028243-d220bc1d49d6?w=600&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1545128485-c400e7702796?w=600&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1574391884720-bbc049ec09ad?w=600&q=80&auto=format&fit=crop",
  ],
  bar: [
    "https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=600&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1574096079513-d8259312b785?w=600&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=600&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&q=80&auto=format&fit=crop",
  ],
  restaurant: [
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=600&q=80&auto=format&fit=crop",
  ],
  default: [
    "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=600&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1485872299712-c92ed99a4afb?w=600&q=80&auto=format&fit=crop",
  ],
};

function VenuePage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState<"users" | "web">("users");

  const { data, isLoading } = useQuery({
    queryKey: ["venue", id],
    queryFn: async () => {
      const { data: venue, error } = await supabase
        .from("venues")
        .select("id,name,type,description,ig_handle,address,cover_url,verified,street:streets(id,name,city:cities(name,slug))")
        .eq("id", id).single();
      if (error) throw error;
      const { data: photos } = await supabase
        .from("venue_photos").select("id,photo_url,caption,created_at,user_id")
        .eq("venue_id", id).order("created_at", { ascending: false }).limit(24);
      const { count: liveCount } = await supabase
        .from("check_ins").select("id", { count: "exact", head: true })
        .eq("venue_id", id).gt("expires_at", new Date().toISOString());
      return { venue, photos: photos ?? [], liveCount: liveCount ?? 0 };
    },
  });

  async function uploadPhoto(file: File) {
    if (!user) { toast.error("Trebuie să fii logat"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${user.id}/${id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("venue-photos").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("venue-photos").getPublicUrl(path);
      const { error: insErr } = await supabase.from("venue_photos").insert({
        venue_id: id, user_id: user.id, photo_url: pub.publicUrl,
      });
      if (insErr) throw insErr;
      await qc.invalidateQueries({ queryKey: ["venue", id] });
      toast.success("Poză adăugată");
    } catch (e: any) {
      toast.error(e.message ?? "Nu s-a putut încărca");
    } finally {
      setUploading(false);
    }
  }

  if (isLoading || !data) return <div className="p-6 text-sm text-muted-foreground">Se încarcă...</div>;
  const v = data.venue as any;
  const stock = STOCK_PHOTOS[v.type] ?? STOCK_PHOTOS.default;

  return (
    <div className="pb-4">
      <div className="relative h-56 bg-gradient-to-br from-neon-purple/40 via-neon-crimson/30 to-neon-blue/40">
        {(v.cover_url || stock[0]) && <img src={v.cover_url || stock[0]} alt={v.name} className="h-full w-full object-cover" />}
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

        {/* Photo gallery with tabs */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex gap-1">
              <button
                onClick={() => setTab("users")}
                className={`font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-md border ${tab === "users" ? "bg-neon-crimson/15 border-neon-crimson/40 text-neon-crimson" : "border-foreground/10 text-muted-foreground"}`}
              >
                din aplicație ({data.photos.length})
              </button>
              <button
                onClick={() => setTab("web")}
                className={`font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-md border ${tab === "web" ? "bg-neon-purple/15 border-neon-purple/40 text-neon-purple" : "border-foreground/10 text-muted-foreground"}`}
              >
                de pe net
              </button>
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading || !user}
              className="font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-md border border-neon-green/40 text-neon-green flex items-center gap-1.5 disabled:opacity-50"
            >
              <Upload size={11}/> {uploading ? "trimit..." : "pune poză"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); e.target.value = ""; }}
            />
          </div>

          {tab === "users" ? (
            data.photos.length === 0 ? (
              <div className="rounded-xl border border-dashed border-foreground/15 p-6 text-center text-xs text-muted-foreground">
                Încă nu sunt poze de la oameni. Fii primul → apasă „pune poză".
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1">
                {data.photos.map(p => (
                  <div key={p.id} className="aspect-square rounded-md overflow-hidden bg-foreground/5">
                    <img src={p.photo_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                  </div>
                ))}
              </div>
            )
          ) : (
            <div>
              <div className="grid grid-cols-3 gap-1">
                {stock.map((url, i) => (
                  <div key={i} className="aspect-square rounded-md overflow-hidden bg-foreground/5 relative">
                    <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
                    <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-sm bg-black/60 backdrop-blur-sm">
                      <span className="font-mono text-[8px] uppercase text-white/80">stock</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mt-2">
                poze ilustrative · cum arată de obicei {v.type}-uri
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Camera, Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/app/scan")({
  head: () => ({ meta: [{ title: "Pune un șpriț · OXIDAȚII" }] }),
  component: ScanPage,
});

function ScanPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [venueQuery, setVenueQuery] = useState("");
  const [selectedVenue, setSelectedVenue] = useState<{ id: string; name: string; city?: any } | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: venues = [] } = useQuery({
    queryKey: ["scan-venues", venueQuery],
    queryFn: async () => {
      const base = supabase.from("venues").select("id, name, city:cities(name)").limit(8);
      const { data } = venueQuery.trim()
        ? await base.ilike("name", `%${venueQuery.trim()}%`)
        : await base.order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function submit() {
    if (!user) return toast.error("Trebuie să fii logat.");
    if (!file) return toast.error("Alege o poză.");
    if (!selectedVenue) return toast.error("Alege locația.");
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${user.id}/${selectedVenue.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("venue-photos").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("venue-photos").getPublicUrl(path);
      const { error: insErr } = await supabase.from("venue_photos").insert({
        venue_id: selectedVenue.id,
        user_id: user.id,
        photo_url: pub.publicUrl,
        caption: caption.trim() || null,
      });
      if (insErr) throw insErr;
      toast.success("Șprițul tău e live.");
      qc.invalidateQueries({ queryKey: ["faze"] });
      qc.invalidateQueries({ queryKey: ["top-ro"] });
      qc.invalidateQueries({ queryKey: ["venue", selectedVenue.id] });
      nav({ to: "/app/top" });
    } catch (e: any) {
      toast.error(e.message ?? "Nu s-a putut încărca");
    } finally {
      setUploading(false);
    }
  }

  const ready = !!file && !!selectedVenue && !uploading;

  return (
    <div className="px-5 pt-6 pb-6 max-w-xl mx-auto space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="font-display font-bold text-2xl leading-tight">Pune un șpriț</h1>
        <Link to="/app" className="text-xs text-muted-foreground">închide</Link>
      </header>

      {/* Photo */}
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)} />

      <button
        onClick={() => fileRef.current?.click()}
        className="block w-full aspect-square rounded-3xl overflow-hidden bg-card border border-border active:scale-[0.99] transition relative"
      >
        {file ? (
          <>
            <img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover" />
            <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-full bg-black/60 text-white text-xs backdrop-blur">
              schimbă
            </div>
          </>
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground gap-3">
            <div className="h-16 w-16 rounded-full flex items-center justify-center" style={{ background: "var(--gradient-sunset)" }}>
              <Camera size={28} className="text-white" />
            </div>
            <div className="font-display font-semibold text-foreground text-lg">fă poza</div>
            <div className="text-xs">sau alege din galerie</div>
          </div>
        )}
      </button>

      {/* Venue — inline, always visible */}
      {selectedVenue ? (
        <div className="flex items-center justify-between p-3 rounded-2xl bg-card border border-primary/40">
          <div className="min-w-0">
            <div className="font-display font-semibold truncate">📍 {selectedVenue.name}</div>
            <div className="text-[11px] text-muted-foreground truncate">{selectedVenue.city?.name ?? ""}</div>
          </div>
          <button onClick={() => setSelectedVenue(null)} className="p-2 text-muted-foreground">
            <X size={16}/>
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={venueQuery}
              onChange={(e) => setVenueQuery(e.target.value)}
              placeholder="unde ești? club, bar, terasă..."
              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          {venues.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
              {venues.map((v: any) => (
                <button key={v.id} onClick={() => setSelectedVenue(v)}
                  className="shrink-0 px-3 py-2 rounded-full bg-card border border-border text-xs font-medium active:scale-95 transition">
                  {v.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Caption — inline, single line, optional */}
      <input
        value={caption} onChange={(e) => setCaption(e.target.value)}
        placeholder="caption (opțional)"
        className="w-full px-4 py-3 rounded-2xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
      />

      {/* Submit */}
      <button
        onClick={submit}
        disabled={!ready}
        className="w-full py-4 rounded-2xl text-white font-semibold disabled:opacity-40 shadow-[var(--shadow-elevated)] active:scale-[0.98] transition"
        style={{ background: "var(--gradient-sunset)" }}
      >
        {uploading ? "Se postează..." : "Postează"}
      </button>
    </div>
  );
}

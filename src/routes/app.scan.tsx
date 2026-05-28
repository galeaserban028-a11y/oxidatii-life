import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Camera, ImagePlus, Search } from "lucide-react";
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

  const { data: venues } = useQuery({
    queryKey: ["scan-venues", venueQuery],
    queryFn: async () => {
      const base = supabase.from("venues").select("id, name, city:cities(name)").limit(6);
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

  return (
    <div className="px-5 pt-6 pb-8 max-w-xl mx-auto space-y-5">
      <header className="space-y-1">
        <div className="text-[11px] uppercase tracking-[0.2em] text-primary font-medium">Postează</div>
        <h1 className="font-display font-bold text-3xl leading-tight">Pune un șpriț.</h1>
        <p className="text-sm text-muted-foreground">O poză + locația. Atât. Intri direct pe Top România.</p>
      </header>

      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)} />

      <button
        onClick={() => fileRef.current?.click()}
        className="block w-full aspect-[4/5] rounded-2xl overflow-hidden bg-card border-2 border-dashed border-border active:scale-[0.99] transition"
      >
        {file ? (
          <img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground gap-2">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Camera size={26} className="text-primary" />
            </div>
            <div className="font-display font-semibold text-foreground">Apasă să faci poza</div>
            <div className="text-xs">sau alege din galerie</div>
          </div>
        )}
      </button>

      {file && (
        <button onClick={() => fileRef.current?.click()}
          className="w-full text-xs text-primary font-medium flex items-center justify-center gap-1.5">
          <ImagePlus size={14}/> schimbă poza
        </button>
      )}

      {/* Venue picker */}
      <div className="space-y-2">
        <label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium">Locația</label>
        {selectedVenue ? (
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-card border border-border">
            <div>
              <div className="font-display font-semibold">{selectedVenue.name}</div>
              <div className="text-[11px] text-muted-foreground">{selectedVenue.city?.name ?? ""}</div>
            </div>
            <button onClick={() => setSelectedVenue(null)} className="text-xs text-primary font-medium">schimbă</button>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={venueQuery}
                onChange={(e) => setVenueQuery(e.target.value)}
                placeholder="caută club, bar, terasă..."
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="space-y-1 max-h-56 overflow-y-auto">
              {(venues ?? []).map((v: any) => (
                <button key={v.id} onClick={() => setSelectedVenue(v)}
                  className="w-full text-left p-3 rounded-xl hover:bg-secondary transition">
                  <div className="font-display font-medium text-sm">{v.name}</div>
                  <div className="text-[11px] text-muted-foreground">{v.city?.name ?? ""}</div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <textarea
        value={caption} onChange={(e) => setCaption(e.target.value)}
        placeholder="Spune ceva... (opțional)"
        rows={2}
        className="w-full p-3.5 rounded-2xl bg-card border border-border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
      />

      <button
        onClick={submit}
        disabled={uploading || !file || !selectedVenue}
        className="w-full py-4 rounded-2xl text-white font-semibold disabled:opacity-40 shadow-md active:scale-[0.98] transition"
        style={{ background: "var(--gradient-sunset)" }}
      >
        {uploading ? "Se postează..." : "Postează șprițul"}
      </button>

      <Link to="/app" className="block text-center text-xs text-muted-foreground pt-2">
        ← înapoi
      </Link>
    </div>
  );
}

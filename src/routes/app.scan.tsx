import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Camera, Search, X, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { errorMessage } from "@/lib/errors";

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
  const [selectedVenue, setSelectedVenue] = useState<{
    id: string;
    name: string;
    city?: any;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [postType, setPostType] = useState<"spritz" | "normal">("spritz");
  const [addOpen, setAddOpen] = useState(false);
  const [newVenueName, setNewVenueName] = useState("");
  const [newVenueType, setNewVenueType] = useState<"club" | "bar" | "terasa">("club");
  const [newVenueCityId, setNewVenueCityId] = useState<string>("");
  const [creating, setCreating] = useState(false);

  const { data: cities = [] } = useQuery({
    queryKey: ["all-cities"],
    queryFn: async () => {
      const { data } = await supabase.from("cities").select("id,name").order("name");
      return data ?? [];
    },
  });

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
    if (!file) return toast.error("Alege o poză sau un clip.");
    if (!selectedVenue) return toast.error("Alege locația.");
    setUploading(true);
    try {
      const isVideo = file.type.startsWith("video/");
      const ext = file.name.split(".").pop()?.toLowerCase() ?? (isVideo ? "mp4" : "jpg");
      const path = `${user.id}/${selectedVenue.id}/${Date.now()}.${ext}`;

      // For Spritz posts: enforce 1/day in Top
      if (postType === "spritz") {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const { count } = await supabase
          .from("sprit_proofs")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("created_at", startOfDay.toISOString());
        if ((count ?? 0) > 0) {
          toast.error("Ai postat deja Șprițul zilei. Revino mâine 🥃");
          setUploading(false);
          return;
        }
      }

      const { error: upErr } = await supabase.storage
        .from("venue-photos")
        .upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("venue-photos").getPublicUrl(path);

      // Always post to profile gallery (the user explicitly chose to share something)
      const { error: insErr } = await supabase.from("venue_photos").insert({
        venue_id: selectedVenue.id,
        user_id: user.id,
        photo_url: pub.publicUrl,
        media_type: isVideo ? "video" : "image",
        caption: caption.trim() || null,
      });
      if (insErr) throw insErr;

      // Only Spritz posts go into sprit_proofs (live feed + Top "Șprițul zilei")
      if (postType === "spritz") {
        const { error: proofErr } = await supabase.from("sprit_proofs").insert({
          user_id: user.id,
          venue_id: selectedVenue.id,
          photo_url: pub.publicUrl,
          media_type: isVideo ? "video" : "image",
          ai_verified: true,
        });
        if (proofErr) console.warn("sprit_proofs insert failed", proofErr);
      }

      toast.success(
        postType === "spritz"
          ? isVideo
            ? "Clipul tău e Șprițul zilei."
            : "Șprițul zilei e live."
          : "Postarea ta e live pe profil.",
      );
      qc.invalidateQueries({ queryKey: ["faze"] });
      qc.invalidateQueries({ queryKey: ["app-feed"] });
      qc.invalidateQueries({ queryKey: ["app-private-feed"] });
      qc.invalidateQueries({ queryKey: ["spritz-of-the-day"] });
      qc.invalidateQueries({ queryKey: ["venue", selectedVenue.id] });
      nav({ to: postType === "spritz" ? "/app/top" : "/app/me" });
    } catch (e) {
      toast.error(errorMessage(e, "Nu s-a putut încărca"));
    } finally {
      setUploading(false);
    }
  }

  async function createVenue() {
    if (!user) return toast.error("Trebuie să fii logat.");
    const name = newVenueName.trim();
    if (!name) return toast.error("Pune un nume.");
    if (!newVenueCityId) return toast.error("Alege orașul.");
    setCreating(true);
    try {
      const slug =
        name
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "") +
        "-" +
        Math.random().toString(36).slice(2, 6);
      const { data, error } = await supabase
        .from("venues")
        .insert({
          name,
          slug,
          type: newVenueType,
          city_id: newVenueCityId,
        })
        .select("id, name, city:cities(name)")
        .single();
      if (error) throw error;
      setSelectedVenue(data as any);
      setAddOpen(false);
      setNewVenueName("");
      toast.success("Locație adăugată.");
    } catch (e) {
      toast.error(errorMessage(e, "Nu s-a putut adăuga"));
    } finally {
      setCreating(false);
    }
  }

  const ready = !!file && !!selectedVenue && !uploading;

  return (
    <div className="px-5 pt-6 pb-6 max-w-xl mx-auto space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="font-display font-bold text-2xl leading-tight">Pune un șpriț</h1>
        <Link to="/app" className="text-xs text-muted-foreground">
          închide
        </Link>
      </header>

      {/* Hidden picker */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        capture="environment"
        className="hidden"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />

      {!file ? (
        /* STEP 1 — camera only, full-bleed prompt */
        <div className="space-y-3">
          <button
            onClick={() => fileRef.current?.click()}
            className="block w-full aspect-[3/4] rounded-3xl overflow-hidden bg-card border border-border active:scale-[0.99] transition relative"
          >
            <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground gap-4">
              <div
                className="h-20 w-20 rounded-full flex items-center justify-center shadow-[var(--shadow-elevated)]"
                style={{ background: "var(--gradient-sunset)" }}
              >
                <Camera size={34} className="text-white" />
              </div>
              <div className="text-center space-y-1">
                <div className="font-display font-bold text-foreground text-xl">
                  fă o poză sau un clip
                </div>
                <div className="text-xs">apasă să deschizi camera</div>
              </div>
            </div>
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full py-3 rounded-2xl text-white font-semibold shadow-[var(--shadow-elevated)] active:scale-[0.98] transition"
            style={{ background: "var(--gradient-sunset)" }}
          >
            deschide camera
          </button>
          <p className="text-center text-[11px] text-muted-foreground">
            după ce faci poza alegi locul și postezi.
          </p>
        </div>
      ) : (
        /* STEP 2 — preview + venue + caption + submit */
        <>
          <button
            onClick={() => fileRef.current?.click()}
            className="block w-full aspect-square rounded-3xl overflow-hidden bg-card border border-border active:scale-[0.99] transition relative"
          >
            {file.type.startsWith("video/") ? (
              <video
                src={URL.createObjectURL(file)}
                className="h-full w-full object-cover"
                autoPlay
                muted
                loop
                playsInline
              />
            ) : (
              <img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover" />
            )}
            <div className="absolute top-3 left-3 px-2 py-1 rounded-full bg-black/70 text-white text-[10px] font-mono uppercase tracking-widest backdrop-blur">
              {file.type.startsWith("video/") ? "▶ clip" : "📷 poză"}
            </div>
            <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-full bg-black/60 text-white text-xs backdrop-blur">
              schimbă
            </div>
          </button>

          {/* Venue */}
          {selectedVenue ? (
            <div className="flex items-center justify-between p-3 rounded-2xl bg-card border border-primary/40">
              <div className="min-w-0">
                <div className="font-display font-semibold truncate">📍 {selectedVenue.name}</div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {selectedVenue.city?.name ?? ""}
                </div>
              </div>
              <button onClick={() => setSelectedVenue(null)} className="p-2 text-muted-foreground">
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium">
                unde ai făcut șprițul?
              </div>
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  value={venueQuery}
                  onChange={(e) => setVenueQuery(e.target.value)}
                  placeholder="club, bar, terasă..."
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              {venues.length > 0 && (
                <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                  {venues.map((v: any) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVenue(v)}
                      className="shrink-0 px-3 py-2 rounded-full bg-card border border-border text-xs font-medium active:scale-95 transition"
                    >
                      {v.name}
                    </button>
                  ))}
                </div>
              )}

              {!addOpen ? (
                <button
                  onClick={() => {
                    setAddOpen(true);
                    setNewVenueName(venueQuery);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-2xl border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition"
                >
                  <Plus size={14} />{" "}
                  {venueQuery ? `adaugă „${venueQuery}"` : "nu găsești? adaugă o locație"}
                </button>
              ) : (
                <div className="p-3 rounded-2xl border border-primary/40 bg-card space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium">
                      Locație nouă
                    </div>
                    <button onClick={() => setAddOpen(false)} className="text-muted-foreground">
                      <X size={14} />
                    </button>
                  </div>
                  <input
                    value={newVenueName}
                    onChange={(e) => setNewVenueName(e.target.value)}
                    placeholder="nume locație"
                    className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <div className="grid grid-cols-3 gap-1.5">
                    {(["club", "bar", "terasa"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setNewVenueType(t)}
                        className={`py-2 rounded-xl text-xs font-medium border transition ${
                          newVenueType === t
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-secondary border-border text-muted-foreground"
                        }`}
                      >
                        {t === "terasa" ? "terasă" : t}
                      </button>
                    ))}
                  </div>
                  <select
                    value={newVenueCityId}
                    onChange={(e) => setNewVenueCityId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="">alege orașul...</option>
                    {(cities as any[]).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={createVenue}
                    disabled={creating || !newVenueName.trim() || !newVenueCityId}
                    className="w-full py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-40 active:scale-[0.98] transition"
                    style={{ background: "var(--gradient-sunset)" }}
                  >
                    {creating ? "se adaugă..." : "adaugă locație"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Caption */}
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="caption (opțional)"
            className="w-full px-4 py-3 rounded-2xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />

          {/* Post type selector */}
          <div className="space-y-1.5">
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium">
              tip postare
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPostType("spritz")}
                className={`p-3 rounded-2xl border text-left transition active:scale-[0.98] ${
                  postType === "spritz"
                    ? "border-transparent text-white shadow-[var(--shadow-elevated)]"
                    : "bg-card border-border text-foreground"
                }`}
                style={postType === "spritz" ? { background: "var(--gradient-sunset)" } : undefined}
              >
                <div className="text-sm font-display font-bold flex items-center gap-1.5">
                  🥃 Șpriț
                </div>
                <div
                  className={`text-[10px] mt-0.5 ${postType === "spritz" ? "text-white/85" : "text-muted-foreground"}`}
                >
                  Intri în Topul zilei · max 1/zi
                </div>
              </button>
              <button
                type="button"
                onClick={() => setPostType("normal")}
                className={`p-3 rounded-2xl border text-left transition active:scale-[0.98] ${
                  postType === "normal"
                    ? "bg-foreground text-background border-transparent"
                    : "bg-card border-border text-foreground"
                }`}
              >
                <div className="text-sm font-display font-bold flex items-center gap-1.5">
                  📷 Postare
                </div>
                <div
                  className={`text-[10px] mt-0.5 ${postType === "normal" ? "text-background/70" : "text-muted-foreground"}`}
                >
                  Doar pe profil, fără Top
                </div>
              </button>
            </div>
          </div>

          <p className="text-[10px] text-center text-muted-foreground">
            {postType === "spritz"
              ? "șprițul apare în story-ul zilei din Top și pe profilul tău."
              : "postarea apare doar pe profilul tău, nu intră în Top."}
          </p>

          {/* Submit */}
          <button
            onClick={submit}
            disabled={!ready}
            className="w-full py-4 rounded-2xl text-white font-semibold disabled:opacity-40 shadow-[var(--shadow-elevated)] active:scale-[0.98] transition"
            style={{ background: "var(--gradient-sunset)" }}
          >
            {uploading ? "Se postează..." : "Postează"}
          </button>
        </>
      )}
    </div>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, X, Plus, MapPin, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { errorMessage } from "@/lib/errors";
import { detectMediaKind, mediaContentType, mediaFileExt } from "@/lib/media-file";
import { SnapCapture } from "@/components/app/SnapCapture";
import { getCurrentPosition } from "@/lib/native-geo";
import { createUserVenue, nearestCityId } from "@/lib/create-user-venue";

export const Route = createFileRoute("/app/scan")({
  head: () => ({ meta: [{ title: "Pune un șpriț · OXIDAȚII" }] }),
  component: ScanPage,
});

/** Start of "today" in Europe/Bucharest as ISO (UTC). */
function bucharestDayStartIso(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Bucharest",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  // Probe both EET (+02) and EEST (+03); pick the one whose Bucharest calendar day matches.
  for (const offset of ["+03:00", "+02:00"] as const) {
    const candidate = new Date(`${y}-${m}-${d}T00:00:00${offset}`);
    const check = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Bucharest",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(candidate);
    if (check === `${y}-${m}-${d}`) return candidate.toISOString();
  }
  return new Date(`${y}-${m}-${d}T00:00:00+03:00`).toISOString();
}

function ScanPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();

  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [venueQuery, setVenueQuery] = useState("");
  type VenueLite = { id: string; name: string; city?: { name: string } | null };
  const [selectedVenue, setSelectedVenue] = useState<VenueLite | null>(null);
  const [uploading, setUploading] = useState(false);
  const [postType, setPostType] = useState<"spritz" | "normal">("spritz");
  const [addOpen, setAddOpen] = useState(false);
  const [newVenueName, setNewVenueName] = useState("");
  const [newVenueType, setNewVenueType] = useState<"club" | "bar" | "terasa">("club");
  const [newVenueCityId, setNewVenueCityId] = useState<string>("");
  const [newCoords, setNewCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoState, setGeoState] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [creating, setCreating] = useState(false);
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const { data: cities = [] } = useQuery({
    queryKey: ["all-cities-geo"],
    queryFn: async () => {
      const { data } = await supabase.from("cities").select("id,name,lat,lng").order("name");
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
    if (!selectedVenue) return toast.error("Alege locația (clubul/barul) unde ești.");
    setUploading(true);
    try {
      const kind = detectMediaKind(file);
      const isVideo = kind === "video";
      const ext = mediaFileExt(file, kind);
      const path = `${user.id}/${selectedVenue.id}/${Date.now()}.${ext}`;

      // For Spritz posts: enforce 1/day in Top (Bucharest calendar day)
      if (postType === "spritz") {
        const { count } = await supabase
          .from("sprit_proofs")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("created_at", bucharestDayStartIso());
        if ((count ?? 0) > 0) {
          toast.error("Ai postat deja Șprițul zilei. Poți posta pe profil (nu în Top).");
          setPostType("normal");
          setUploading(false);
          return;
        }
      }

      const { error: upErr } = await supabase.storage
        .from("venue-photos")
        .upload(path, file, { contentType: mediaContentType(file, kind), upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("venue-photos").getPublicUrl(path);

      const { error: insErr } = await supabase.from("venue_photos").insert({
        venue_id: selectedVenue.id,
        user_id: user.id,
        photo_url: pub.publicUrl,
        media_type: kind,
        caption: caption.trim() || null,
      });
      if (insErr) throw insErr;

      if (postType === "spritz") {
        const { error: proofErr } = await supabase.from("sprit_proofs").insert({
          user_id: user.id,
          venue_id: selectedVenue.id,
          photo_url: pub.publicUrl,
          media_type: kind,
          ai_verified: true,
        });
        if (proofErr) throw proofErr;
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

  async function captureCoords() {
    setGeoState("loading");
    setNewCoords(null);
    try {
      const pos = await getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 20_000,
        maximumAge: 5_000,
      });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setNewCoords({ lat, lng });
      setGeoState("ok");
      const cityId = nearestCityId(lat, lng, cities);
      if (cityId) setNewVenueCityId(cityId);
    } catch (e) {
      setGeoState("err");
      toast.error(errorMessage(e, "Nu am putut citi GPS-ul"));
    }
  }

  function openAddVenue() {
    setAddOpen(true);
    setNewVenueName(venueQuery.trim());
    setNewVenueType("club");
    setNewCoords(null);
    setGeoState("idle");
    void captureCoords();
  }

  function closeAddVenue() {
    setAddOpen(false);
    setNewVenueName("");
    setNewCoords(null);
    setGeoState("idle");
  }

  async function createVenue() {
    if (!user) return toast.error("Trebuie să fii logat.");
    const name = newVenueName.trim();
    if (!name) return toast.error("Pune un nume.");
    if (!newCoords) return toast.error("Mai întâi prinde coordonatele GPS.");
    const cityId = newVenueCityId || nearestCityId(newCoords.lat, newCoords.lng, cities);
    if (!cityId) return toast.error("Nu am găsit orașul. Alege unul.");
    setCreating(true);
    try {
      const data = await createUserVenue({
        name,
        type: newVenueType,
        cityId,
        lat: newCoords.lat,
        lng: newCoords.lng,
      });
      setSelectedVenue(data);
      closeAddVenue();
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

      {!file ? (
        /* STEP 1 — Snap-style in-app camera */
        <div className="space-y-3">
          <SnapCapture onCapture={setFile} />
          <p className="text-center text-[11px] text-muted-foreground">
            după poză/clip alegi locul și postezi.
          </p>
        </div>
      ) : (
        /* STEP 2 — preview + venue + caption + submit */
        <>
          <button
            onClick={() => setFile(null)}
            className="block w-full aspect-square rounded-3xl overflow-hidden bg-card border border-border active:scale-[0.99] transition relative"
          >
            {detectMediaKind(file) === "video" ? (
              <video
                src={previewUrl ?? undefined}
                className="h-full w-full object-cover"
                autoPlay
                muted
                loop
                playsInline
              />
            ) : (
              <img src={previewUrl ?? undefined} alt="" className="h-full w-full object-cover" />
            )}
            <div className="absolute top-3 left-3 px-2 py-1 rounded-full bg-black/70 text-white text-[10px] font-mono uppercase tracking-widest">
              {detectMediaKind(file) === "video" ? "▶ clip" : "📷 poză"}
            </div>
            <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-full bg-black/60 text-white text-xs">
              refă
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
                  {(venues as unknown as VenueLite[]).map((v) => (
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
                  onClick={openAddVenue}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-2xl border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition"
                >
                  <Plus size={14} />{" "}
                  {venueQuery ? `adaugă „${venueQuery}"` : "nu găsești? adaugă o locație"}
                </button>
              ) : (
                <div className="p-3 rounded-2xl border border-primary/40 bg-card space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium">
                      Locație nouă
                    </div>
                    <button onClick={closeAddVenue} className="text-muted-foreground">
                      <X size={14} />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => void captureCoords()}
                    disabled={geoState === "loading"}
                    className="w-full p-3 rounded-xl border border-dashed border-primary/40 bg-secondary/60 flex flex-col items-center gap-1.5"
                  >
                    {geoState === "loading" ? (
                      <Loader2 className="animate-spin text-primary" size={22} />
                    ) : geoState === "ok" ? (
                      <Check className="text-primary" size={22} />
                    ) : (
                      <MapPin className="text-primary" size={22} />
                    )}
                    <div className="text-xs font-medium">
                      {geoState === "loading"
                        ? "citesc GPS…"
                        : geoState === "ok"
                          ? "coordonate prinse"
                          : geoState === "err"
                            ? "reîncearcă GPS"
                            : "permite locația"}
                    </div>
                    {newCoords && (
                      <div className="font-mono text-[10px] text-muted-foreground">
                        {newCoords.lat.toFixed(5)}, {newCoords.lng.toFixed(5)}
                      </div>
                    )}
                  </button>

                  <input
                    value={newVenueName}
                    onChange={(e) => setNewVenueName(e.target.value)}
                    placeholder="nume locație (club / bar…)"
                    className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <div className="grid grid-cols-3 gap-1.5">
                    {(["club", "bar", "terasa"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
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
                    <option value="">oraș (auto din GPS)…</option>
                    {(cities as Array<{ id: string; name: string }>).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => void createVenue()}
                    disabled={creating || !newVenueName.trim() || !newCoords}
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

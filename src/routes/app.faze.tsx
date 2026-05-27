import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/app/faze")({
  head: () => ({ meta: [{ title: "Cele mai tari faze · OXIDAȚII" }] }),
  component: FazePage,
});

type Moment = {
  id: string;
  photo_url: string;
  caption: string | null;
  created_at: string;
  user_id: string;
  venue_id: string;
};

async function loadMoments() {
  const { data: photos } = await supabase
    .from("venue_photos")
    .select("id, photo_url, caption, taken_at, user_id, venue_id")
    .order("taken_at", { ascending: false })
    .limit(60);

  const items: Moment[] = (photos ?? []).map((p) => ({
    id: p.id,
    photo_url: p.photo_url,
    caption: p.caption,
    created_at: p.taken_at,
    user_id: p.user_id,
    venue_id: p.venue_id,
  }));

  const userIds = Array.from(new Set(items.map((i) => i.user_id)));
  const venueIds = Array.from(new Set(items.map((i) => i.venue_id)));
  const [{ data: profilesData }, { data: venuesData }] = await Promise.all([
    userIds.length
      ? supabase.from("profiles").select("id, handle, display_name, avatar_url").in("id", userIds)
      : Promise.resolve({ data: [] as any[] }),
    venueIds.length
      ? supabase.from("venues").select("id, name, slug, city:cities(name)").in("id", venueIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);
  const profilesMap = new Map((profilesData ?? []).map((p: any) => [p.id, p]));
  const venuesMap = new Map((venuesData ?? []).map((v: any) => [v.id, v]));
  return { items, profilesMap, venuesMap };
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - +new Date(iso)) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}z`;
}

function FazePage() {
  const { data, isLoading } = useQuery({ queryKey: ["faze"], queryFn: loadMoments, refetchInterval: 60_000 });
  const [open, setOpen] = useState(false);

  return (
    <div className="px-4 pt-5 pb-24 space-y-4">
      <header className="space-y-1">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-neon-crimson">// CELE MAI TARI FAZE</div>
        <h1 className="font-display uppercase text-2xl leading-none tracking-tight">
          Faze <span className="text-gradient-chaos">din teren</span>
        </h1>
        <p className="text-xs text-muted-foreground">Postează ce-ai prins în club, la șpriț, pe stradă. Real, brut, fără filtre.</p>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-2">
          {[0,1,2,3].map(i => <div key={i} className="aspect-[4/5] rounded-lg bg-foreground/[0.04] animate-pulse" />)}
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-foreground/15 p-8 text-center space-y-3">
          <div className="text-5xl">🎬</div>
          <div className="font-display uppercase text-lg">Nicio fază încă.</div>
          <p className="text-sm text-muted-foreground">Fii primul care pune o fază reală din teren.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {data.items.map((it) => {
            const profile = data.profilesMap.get(it.user_id);
            const venue = data.venuesMap.get(it.venue_id);
            const handle = profile?.handle ?? profile?.display_name ?? "anonim";
            return (
              <div key={it.id} className="relative aspect-[4/5] rounded-lg overflow-hidden bg-foreground/[0.04] border border-foreground/10">
                <img src={it.photo_url} alt={it.caption ?? ""} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                  <div className="font-display text-xs text-white truncate">@{handle}</div>
                  <div className="font-mono text-[9px] uppercase tracking-widest text-white/70 truncate">
                    {venue ? `${venue.name} · ${venue.city?.name ?? ""}` : "—"} · {timeAgo(it.created_at)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating CTA */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-40 font-display uppercase text-xs tracking-[0.18em] px-5 py-4 rounded-full text-white shadow-xl"
        style={{ background: "var(--gradient-chaos)" }}
      >
        + Postează o fază
      </button>

      <Link to="/app" className="block text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground pt-4">
        ← înapoi la live
      </Link>

      {open && <UploadSheet onClose={() => setOpen(false)} />}
    </div>
  );
}

function UploadSheet({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [venueQuery, setVenueQuery] = useState("");
  const [selectedVenue, setSelectedVenue] = useState<{ id: string; name: string; city?: any } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: venues } = useQuery({
    queryKey: ["venues-search", venueQuery],
    queryFn: async () => {
      const q = supabase.from("venues").select("id, name, slug, city:cities(name)").limit(8);
      const { data } = venueQuery.trim()
        ? await q.ilike("name", `%${venueQuery.trim()}%`)
        : await q.order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function submit() {
    if (!user) { toast.error("Trebuie să fii logat."); return; }
    if (!file) { toast.error("Alege o poză."); return; }
    if (!selectedVenue) { toast.error("Alege locația."); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("venue-photos").upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("venue-photos").getPublicUrl(path);
      const { error: insErr } = await supabase.from("venue_photos").insert({
        user_id: user.id,
        venue_id: selectedVenue.id,
        photo_url: pub.publicUrl,
        caption: caption.trim() || null,
      });
      if (insErr) throw insErr;
      toast.success("Faza ta e live.");
      qc.invalidateQueries({ queryKey: ["faze"] });
      qc.invalidateQueries({ queryKey: ["app-feed"] });
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? "Eroare la upload");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end" onClick={onClose}>
      <div className="w-full bg-background border-t border-foreground/10 rounded-t-2xl p-4 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="font-display uppercase text-lg">Postează o fază</div>
          <button onClick={onClose} className="text-muted-foreground text-2xl leading-none">×</button>
        </div>

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full aspect-[4/5] rounded-lg border-2 border-dashed border-foreground/20 flex items-center justify-center overflow-hidden bg-foreground/[0.04]"
        >
          {file ? (
            <img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="text-center space-y-1 text-muted-foreground">
              <div className="text-4xl">📸</div>
              <div className="font-mono text-[10px] uppercase tracking-widest">apasă să alegi poza</div>
              <div className="text-[10px]">(din galerie sau cameră)</div>
            </div>
          )}
        </button>

        <div className="space-y-1">
          <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Locația</label>
          {selectedVenue ? (
            <div className="flex items-center justify-between p-3 rounded-lg bg-foreground/[0.06] border border-foreground/10">
              <div className="font-display text-sm">{selectedVenue.name} · {selectedVenue.city?.name ?? ""}</div>
              <button onClick={() => setSelectedVenue(null)} className="text-xs text-neon-crimson font-mono uppercase">schimbă</button>
            </div>
          ) : (
            <>
              <input
                value={venueQuery}
                onChange={(e) => setVenueQuery(e.target.value)}
                placeholder="caută un club, bar, terasă..."
                className="w-full p-3 rounded-lg bg-foreground/[0.04] border border-foreground/10 text-sm"
              />
              <div className="max-h-48 overflow-y-auto space-y-1 mt-1">
                {(venues ?? []).map((v: any) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVenue(v)}
                    className="w-full text-left p-2 rounded-md hover:bg-foreground/[0.06] text-sm"
                  >
                    <div className="font-display">{v.name}</div>
                    <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{v.city?.name ?? ""}</div>
                  </button>
                ))}
                {venues && venues.length === 0 && (
                  <div className="text-xs text-muted-foreground p-2">Nicio locație găsită.</div>
                )}
              </div>
            </>
          )}
        </div>

        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Spune ceva despre fază... (opțional)"
          rows={2}
          className="w-full p-3 rounded-lg bg-foreground/[0.04] border border-foreground/10 text-sm resize-none"
        />

        <button
          onClick={submit}
          disabled={uploading || !file || !selectedVenue}
          className="w-full font-display uppercase text-sm tracking-[0.18em] py-4 rounded-md text-white disabled:opacity-40"
          style={{ background: "var(--gradient-chaos)" }}
        >
          {uploading ? "Se postează..." : "Postează"}
        </button>
      </div>
    </div>
  );
}

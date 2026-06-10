import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ReportDialog } from "@/components/app/ReportDialog";
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

type TabKey = "foryou" | "recent" | "top" | "legendare";

const BADGES = [
  { key: "legendar", label: "ȘPRIȚ LEGENDAR", icon: "🔥", className: "bg-neon-crimson/15 text-neon-crimson border-neon-crimson/40" },
  { key: "murit", label: "AM MURIT DE RÂS", icon: "😂", className: "bg-yellow-400/15 text-yellow-400 border-yellow-400/40" },
  { key: "fail", label: "FAIL", icon: "💀", className: "bg-foreground/10 text-foreground/80 border-foreground/20" },
  { key: "wow", label: "WOW MOMENT", icon: "⚡", className: "bg-cyan-400/15 text-cyan-400 border-cyan-400/40" },
] as const;

function pickBadge(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return BADGES[h % BADGES.length];
}

function pseudoCount(id: string, salt: number, max: number) {
  let h = salt;
  for (let i = 0; i < id.length; i++) h = (h * 33 + id.charCodeAt(i)) >>> 0;
  return (h % max) + 1;
}

function formatCount(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

function FazePage() {
  const { data, isLoading } = useQuery({ queryKey: ["faze"], queryFn: loadMoments, refetchInterval: 60_000 });
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabKey>("foryou");
  const [liked, setLiked] = useState<Record<string, boolean>>({});

  const sortedItems = (() => {
    if (!data) return [];
    const arr = [...data.items];
    if (tab === "recent") arr.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    else if (tab === "top") arr.sort((a, b) => pseudoCount(b.id, 7, 2000) - pseudoCount(a.id, 7, 2000));
    else if (tab === "legendare") return arr.filter((it) => pickBadge(it.id).key === "legendar");
    return arr;
  })();

  return (
    <div className="px-4 pt-5 pb-24 space-y-4">
      <header className="space-y-1 flex items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-neon-crimson">// CELE MAI TARI FAZE</div>
          <h1 className="font-display uppercase text-2xl leading-none tracking-tight">
            Faze <span className="text-gradient-chaos">din teren</span>
          </h1>
          <p className="text-xs text-muted-foreground">Postează ce-ai prins în club, la șpriț, pe stradă. Real, brut, fără filtre.</p>
        </div>
        <Link to="/app/notifications" className="size-9 rounded-full border border-foreground/15 flex items-center justify-center relative shrink-0">
          <span className="text-base">🔔</span>
          <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-neon-crimson animate-pulse" />
        </Link>
      </header>

      {/* Weekend prize — bancnotă / bilet de tombolă */}
      <PrizeBanner />


      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto -mx-4 px-4 pb-1 no-scrollbar">
        {([
          { k: "foryou", label: "Pentru tine", icon: "🔥" },
          { k: "recent", label: "Recent", icon: "🕐" },
          { k: "top", label: "Top faze", icon: "🏆" },
          { k: "legendare", label: "Legendare", icon: "👑" },
        ] as { k: TabKey; label: string; icon: string }[]).map((t) => {
          const active = tab === t.k;
          return (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-mono uppercase tracking-widest border transition ${
                active
                  ? "border-neon-crimson/60 text-neon-crimson bg-neon-crimson/10"
                  : "border-foreground/15 text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[0,1].map(i => <div key={i} className="aspect-[4/5] rounded-2xl bg-foreground/[0.04] animate-pulse" />)}
        </div>
      ) : !data || sortedItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-foreground/15 p-8 text-center space-y-3">
          <div className="text-5xl">🎬</div>
          <div className="font-display uppercase text-lg">Nicio fază încă.</div>
          <p className="text-sm text-muted-foreground">Fii primul care pune o fază reală din teren.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedItems.map((it) => {
            const profile = data.profilesMap.get(it.user_id);
            const venue = data.venuesMap.get(it.venue_id);
            const handle = profile?.display_name ?? profile?.handle ?? "Anonim";
            const badge = pickBadge(it.id);
            const likes = pseudoCount(it.id, 11, 1800);
            const comments = pseudoCount(it.id, 23, 200);
            const reshares = pseudoCount(it.id, 41, 90);
            const confirms = pseudoCount(it.id, 67, 250);
            const isVideo = /\.(mp4|webm|mov)$/i.test(it.photo_url);
            const isLiked = !!liked[it.id];
            return (
              <article key={it.id} className="rounded-2xl border border-foreground/10 bg-card/40 overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-3 p-3">
                  <Link to="/app/user/$id" params={{ id: it.user_id }} className="shrink-0">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt={handle} className="size-10 rounded-full object-cover border border-foreground/10" />
                    ) : (
                      <div className="size-10 rounded-full bg-foreground/10 flex items-center justify-center font-display text-sm">
                        {handle[0]?.toUpperCase()}
                      </div>
                    )}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Link to="/app/user/$id" params={{ id: it.user_id }} className="font-display text-sm truncate">{handle}</Link>
                      {badge.key === "legendar" && <span className="text-neon-crimson">⚡</span>}
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground truncate">
                      📍 {venue?.name ?? "—"} · acum {timeAgo(it.created_at)}
                    </div>
                  </div>
                  <span className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-mono uppercase tracking-widest ${badge.className}`}>
                    <span>{badge.icon}</span>{badge.label}
                  </span>
                </div>

                {/* Media */}
                <div className="relative bg-black">
                  {isVideo ? (
                    <video src={it.photo_url} className="w-full aspect-[4/5] object-cover" playsInline muted loop preload="metadata" />
                  ) : (
                    <img src={it.photo_url} alt={it.caption ?? ""} className="w-full aspect-[4/5] object-cover" loading="lazy" />
                  )}
                  {isVideo && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="size-14 rounded-full bg-white/90 text-black flex items-center justify-center text-xl shadow-xl">▶</div>
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <ReportDialog targetType="photo" targetId={it.id} className="h-8 w-8 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white/90 active:scale-95 transition" />
                  </div>
                </div>

                {/* Caption */}
                {it.caption && (
                  <div className="px-4 pt-3 text-sm leading-snug">{it.caption}</div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-5 px-4 py-3 text-sm">
                  <button
                    onClick={() => setLiked((m) => ({ ...m, [it.id]: !m[it.id] }))}
                    className="inline-flex items-center gap-1.5 active:scale-95 transition"
                  >
                    <span className={isLiked ? "text-neon-crimson" : "text-foreground/80"}>{isLiked ? "❤️" : "🤍"}</span>
                    <span className="font-mono text-xs tabular-nums">{formatCount(likes + (isLiked ? 1 : 0))}</span>
                  </button>
                  <button className="inline-flex items-center gap-1.5 text-foreground/80">
                    <span>💬</span>
                    <span className="font-mono text-xs tabular-nums">{formatCount(comments)}</span>
                  </button>
                  <button className="inline-flex items-center gap-1.5 text-foreground/80">
                    <span>🔁</span>
                    <span className="font-mono text-xs tabular-nums">{formatCount(reshares)}</span>
                  </button>
                  <div className="ml-auto inline-flex items-center gap-1.5 text-neon-crimson">
                    <span>🔥</span>
                    <span className="font-mono text-xs tabular-nums">Confirmări: {formatCount(confirms)}</span>
                  </div>
                </div>
              </article>
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

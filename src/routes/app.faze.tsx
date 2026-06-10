import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
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

async function loadMoments(currentUserId: string | null) {
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
  const photoIds = items.map((i) => i.id);

  const userIds = Array.from(new Set(items.map((i) => i.user_id)));
  const venueIds = Array.from(new Set(items.map((i) => i.venue_id)));
  const [
    { data: profilesData },
    { data: venuesData },
    { data: likesData },
    { data: commentsData },
    { data: repostsData },
    { data: myLikes },
    { data: myReposts },
  ] = await Promise.all([
    userIds.length
      ? supabase.from("profiles").select("id, handle, display_name, avatar_url").in("id", userIds)
      : Promise.resolve({ data: [] as any[] }),
    venueIds.length
      ? supabase.from("venues").select("id, name, slug, city:cities(name)").in("id", venueIds)
      : Promise.resolve({ data: [] as any[] }),
    photoIds.length
      ? supabase.from("photo_likes").select("photo_id").in("photo_id", photoIds)
      : Promise.resolve({ data: [] as any[] }),
    photoIds.length
      ? supabase.from("photo_comments").select("photo_id").in("photo_id", photoIds)
      : Promise.resolve({ data: [] as any[] }),
    photoIds.length
      ? supabase.from("photo_reposts").select("photo_id").in("photo_id", photoIds)
      : Promise.resolve({ data: [] as any[] }),
    currentUserId && photoIds.length
      ? supabase.from("photo_likes").select("photo_id").eq("user_id", currentUserId).in("photo_id", photoIds)
      : Promise.resolve({ data: [] as any[] }),
    currentUserId && photoIds.length
      ? supabase.from("photo_reposts").select("photo_id").eq("user_id", currentUserId).in("photo_id", photoIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);
  const profilesMap = new Map((profilesData ?? []).map((p: any) => [p.id, p]));
  const venuesMap = new Map((venuesData ?? []).map((v: any) => [v.id, v]));

  const tally = (rows: any[] | null) => {
    const m = new Map<string, number>();
    (rows ?? []).forEach((r) => m.set(r.photo_id, (m.get(r.photo_id) ?? 0) + 1));
    return m;
  };
  const likesMap = tally(likesData);
  const commentsMap = tally(commentsData);
  const repostsMap = tally(repostsData);
  const likedSet = new Set((myLikes ?? []).map((r: any) => r.photo_id));
  const repostedSet = new Set((myReposts ?? []).map((r: any) => r.photo_id));

  return { items, profilesMap, venuesMap, likesMap, commentsMap, repostsMap, likedSet, repostedSet };
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
  { key: "legendar", label: "LEGENDAR", className: "bg-neon-crimson/8 text-neon-crimson/80 border-neon-crimson/25" },
  { key: "murit", label: "AM MURIT", className: "bg-amber-400/8 text-amber-300/80 border-amber-400/25" },
  { key: "fail", label: "FAIL", className: "bg-foreground/5 text-foreground/60 border-foreground/10" },
  { key: "wow", label: "WOW", className: "bg-cyan-400/8 text-cyan-300/80 border-cyan-400/25" },
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
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["faze", user?.id ?? null],
    queryFn: () => loadMoments(user?.id ?? null),
    refetchInterval: 60_000,
  });
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabKey>("foryou");
  const [commentsFor, setCommentsFor] = useState<Moment | null>(null);

  async function toggleLike(it: Moment) {
    if (!user) { toast.error("Trebuie să fii logat."); return; }
    const isLiked = data?.likedSet.has(it.id);
    if (isLiked) {
      await supabase.from("photo_likes").delete().eq("photo_id", it.id).eq("user_id", user.id);
    } else {
      await supabase.from("photo_likes").insert({ photo_id: it.id, user_id: user.id });
    }
    qc.invalidateQueries({ queryKey: ["faze"] });
  }

  async function toggleRepost(it: Moment) {
    if (!user) { toast.error("Trebuie să fii logat."); return; }
    const isReposted = data?.repostedSet.has(it.id);
    if (isReposted) {
      await supabase.from("photo_reposts").delete().eq("photo_id", it.id).eq("user_id", user.id);
      toast.success("Repost retras.");
    } else {
      await supabase.from("photo_reposts").insert({ photo_id: it.id, user_id: user.id });
      toast.success("Repostat pe contul tău.");
    }
    qc.invalidateQueries({ queryKey: ["faze"] });
    qc.invalidateQueries({ queryKey: ["user-reposts", user.id] });
  }


  const sortedItems = (() => {
    if (!data) return [];
    const arr = [...data.items];
    if (tab === "recent") arr.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    else if (tab === "top") arr.sort((a, b) => pseudoCount(b.id, 7, 2000) - pseudoCount(a.id, 7, 2000));
    else if (tab === "legendare") return arr.filter((it) => pickBadge(it.id).key === "legendar");
    return arr;
  })();

  return (
    <div className="px-4 pt-5 pb-24 space-y-6 max-w-xl mx-auto">
      <header className="space-y-1 flex items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-neon-crimson/70">// CELE MAI TARI FAZE</div>
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
              className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-mono uppercase tracking-wider border transition ${
                active
                  ? "border-neon-crimson/40 text-neon-crimson bg-neon-crimson/5"
                  : "border-foreground/10 text-muted-foreground hover:text-foreground"
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
        <div className="space-y-6">
          {sortedItems.map((it) => {
            const profile = data.profilesMap.get(it.user_id);
            const venue = data.venuesMap.get(it.venue_id);
            const handle = profile?.display_name ?? profile?.handle ?? "Anonim";
            const badge = pickBadge(it.id);
            const likes = data.likesMap.get(it.id) ?? 0;
            const comments = data.commentsMap.get(it.id) ?? 0;
            const reposts = data.repostsMap.get(it.id) ?? 0;
            const confirms = pseudoCount(it.id, 67, 250);
            const isVideo = /\.(mp4|webm|mov)$/i.test(it.photo_url);
            const isLiked = data.likedSet.has(it.id);
            const isReposted = data.repostedSet.has(it.id);
            return (
              <article key={it.id} className="rounded-3xl border border-foreground/5 bg-card/40 overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-3 p-4">
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
                  <span className={`shrink-0 inline-flex items-center px-2 py-[3px] rounded-md border text-[10px] font-mono uppercase tracking-[0.15em] ${badge.className}`}>
                    {badge.label}
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
                <div className="flex items-center gap-1 px-2 py-2">
                  <button
                    onClick={() => toggleLike(it)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full hover:bg-foreground/[0.05] active:scale-95 transition"
                  >
                    <svg viewBox="0 0 24 24" className={`size-[18px] ${isLiked ? "fill-neon-crimson stroke-neon-crimson" : "fill-none stroke-foreground/80"}`} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z"/></svg>
                    <span className="font-mono text-xs tabular-nums">{formatCount(likes)}</span>
                  </button>
                  <button
                    onClick={() => setCommentsFor(it)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full hover:bg-foreground/[0.05] active:scale-95 transition"
                  >
                    <svg viewBox="0 0 24 24" className="size-[18px] fill-none stroke-foreground/80" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12z"/></svg>
                    <span className="font-mono text-xs tabular-nums">{formatCount(comments)}</span>
                  </button>
                  <button
                    onClick={() => toggleRepost(it)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full hover:bg-foreground/[0.05] active:scale-95 transition ${isReposted ? "text-emerald-400" : ""}`}
                  >
                    <svg viewBox="0 0 24 24" className={`size-[18px] fill-none ${isReposted ? "stroke-emerald-400" : "stroke-foreground/80"}`} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h13l-3-3"/><path d="M20 17H7l3 3"/></svg>
                    <span className="font-mono text-xs tabular-nums">{formatCount(reposts)}</span>
                  </button>
                </div>

              </article>
            );
          })}
        </div>
      )}

      {/* Floating CTA — portaled to body so the page transition transform doesn't trap `fixed` */}
      {typeof document !== "undefined" && createPortal(
        <button
          onClick={() => setOpen(true)}
          aria-label="Postează o fază"
          className="fixed bottom-24 right-4 z-[55] inline-flex items-center gap-2 font-display uppercase text-[11px] tracking-[0.18em] pl-3 pr-4 py-3 rounded-full text-white shadow-[0_10px_30px_-8px_rgba(244,114,82,0.6)] active:scale-95 transition"
          style={{ background: "var(--gradient-chaos)", bottom: "calc(env(safe-area-inset-bottom) + 6rem)" }}
        >
          <span className="grid place-items-center size-6 rounded-full bg-white/20 text-base leading-none">+</span>
          Postează
        </button>,
        document.body
      )}

      <Link to="/app" className="block text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground pt-4">
        ← înapoi la live
      </Link>

      {open && <UploadSheet onClose={() => setOpen(false)} />}
      {commentsFor && <CommentsSheet photo={commentsFor} onClose={() => { setCommentsFor(null); qc.invalidateQueries({ queryKey: ["faze"] }); }} />}
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
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-end" onClick={onClose}>
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

function nextMondayMorning() {
  const now = new Date();
  const d = new Date(now);
  const day = d.getDay(); // 0 Sun ... 6 Sat
  const daysUntilMon = (8 - day) % 7 || 7;
  d.setDate(d.getDate() + daysUntilMon);
  d.setHours(9, 0, 0, 0);
  return d;
}

function useCountdown(target: Date) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  const ms = Math.max(0, +target - now);
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return { d, h, m, s };
}

function PrizeBanner() {
  const target = nextMondayMorning();
  const { d, h, m } = useCountdown(target);
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="relative overflow-hidden rounded-xl border border-amber-400/25 bg-gradient-to-r from-neon-crimson/10 via-orange-500/[0.06] to-amber-400/10">
      <div aria-hidden className="absolute -top-10 -right-10 size-24 rounded-full bg-amber-400/20 blur-2xl" />
      <div aria-hidden className="absolute -bottom-10 -left-10 size-24 rounded-full bg-neon-crimson/20 blur-2xl" />

      <div className="relative flex items-center gap-3 px-3.5 py-3">
        {/* Prize chip */}
        <div className="shrink-0 flex flex-col items-center justify-center rounded-lg bg-gradient-to-br from-amber-300 to-orange-500 px-2.5 py-1.5 text-black shadow-[0_4px_14px_-4px_rgba(245,158,11,0.6)]">
          <div className="font-display text-lg leading-none font-black tabular-nums">100</div>
          <div className="font-mono text-[8px] uppercase tracking-widest leading-none mt-0.5">lei</div>
        </div>

        {/* Copy */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-amber-300">Premiul săptămânii</span>
            <span className="size-1 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="font-display text-[13px] leading-tight mt-0.5 truncate">
            Cea mai tare fază ia <span className="text-amber-300">100 lei pe Revolut</span>
          </div>
          <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mt-0.5 truncate">
            Vineri → Duminică · plată luni
          </div>
        </div>

        {/* Countdown */}
        <div className="shrink-0 text-right">
          <div className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground">Se închide</div>
          <div className="font-mono text-sm tabular-nums text-foreground leading-tight">
            {d}<span className="text-muted-foreground">z</span> {pad(h)}<span className="text-muted-foreground">h</span> {pad(m)}<span className="text-muted-foreground">m</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CommentsSheet({ photo, onClose }: { photo: Moment; onClose: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const { data: comments } = useQuery({
    queryKey: ["photo-comments", photo.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("photo_comments")
        .select("id, body, created_at, user_id")
        .eq("photo_id", photo.id)
        .order("created_at", { ascending: true });
      const ids = Array.from(new Set((data ?? []).map((c) => c.user_id)));
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id, handle, display_name, avatar_url").in("id", ids)
        : { data: [] as any[] };
      const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
      return (data ?? []).map((c) => ({ ...c, profile: map.get(c.user_id) }));
    },
  });

  async function submit() {
    if (!user) { toast.error("Trebuie să fii logat."); return; }
    const text = body.trim();
    if (!text) return;
    setSending(true);
    const { error } = await supabase.from("photo_comments").insert({
      photo_id: photo.id, user_id: user.id, body: text,
    });
    setSending(false);
    if (error) { toast.error(error.message); return; }
    setBody("");
    qc.invalidateQueries({ queryKey: ["photo-comments", photo.id] });
    qc.invalidateQueries({ queryKey: ["faze"] });
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-end" onClick={onClose}>
      <div className="w-full bg-background border-t border-foreground/10 rounded-t-2xl flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-foreground/10">
          <div className="font-display uppercase text-sm tracking-widest">Comentarii</div>
          <button onClick={onClose} className="text-muted-foreground text-2xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {!comments ? (
            <div className="text-xs text-muted-foreground">Se încarcă…</div>
          ) : comments.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              <div className="text-3xl mb-1">💬</div>
              Niciun comentariu. Fii primul.
            </div>
          ) : (
            comments.map((c: any) => (
              <div key={c.id} className="flex items-start gap-3">
                {c.profile?.avatar_url ? (
                  <img src={c.profile.avatar_url} alt="" className="size-8 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="size-8 rounded-full bg-foreground/10 shrink-0 grid place-items-center text-xs font-display">
                    {(c.profile?.display_name ?? "?")[0]?.toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-xs truncate">{c.profile?.display_name ?? c.profile?.handle ?? "Anonim"}</span>
                    <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{timeAgo(c.created_at)}</span>
                  </div>
                  <p className="text-sm leading-snug whitespace-pre-wrap break-words">{c.body}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-foreground/10 p-3 flex items-end gap-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Scrie un comentariu…"
            rows={1}
            maxLength={500}
            className="flex-1 resize-none p-2.5 rounded-lg bg-foreground/[0.05] border border-foreground/10 text-sm"
          />
          <button
            onClick={submit}
            disabled={sending || !body.trim()}
            className="shrink-0 font-display uppercase text-[11px] tracking-widest px-4 py-2.5 rounded-lg text-white disabled:opacity-40"
            style={{ background: "var(--gradient-chaos)" }}
          >
            Trimite
          </button>
        </div>
      </div>
    </div>
  );
}

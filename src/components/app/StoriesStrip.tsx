import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, X, Upload } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { errorMessage } from "@/lib/errors";

type PromoTile = {
  campaignId: string;
  title: string | null;
  brand: string | null;
  cover: string | null;
  theme: string;
};

type CampaignRow = {
  id: string;
  title?: string | null;
  venue_name?: string | null;
  business_brand_name?: string | null;
  image_urls?: string[] | null;
  business_cover_url?: string | null;
  business_logo_url?: string | null;
  theme_color?: string | null;
};

async function loadPromoTiles(): Promise<PromoTile[]> {
  const { data } = await supabase.rpc("get_active_campaigns", { _limit: 20 });
  return ((data ?? []) as CampaignRow[]).map((c) => ({
    campaignId: c.id,
    title: c.title ?? null,
    brand: c.venue_name ?? c.business_brand_name ?? null,
    cover:
      (Array.isArray(c.image_urls) && c.image_urls[0]) ||
      c.business_cover_url ||
      c.business_logo_url ||
      null,
    theme: c.theme_color ?? "#ff3d8b",
  }));
}

type StoryRow = {
  id: string;
  user_id: string;
  media_url: string;
  media_type: "image" | "video";
  caption: string | null;
  expires_at: string;
  created_at: string;
};

type Group = {
  user_id: string;
  handle: string;
  avatar_url: string | null;
  display_name: string | null;
  stories: StoryRow[];
};

async function loadStories(viewerId: string) {
  // Story-uri active (RLS oprește deja expirate; mai filtrăm din precauție)
  const { data: rows } = await supabase
    .from("stories")
    .select("id,user_id,media_url,media_type,caption,expires_at,created_at")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(200);

  const stories = (rows ?? []) as StoryRow[];
  if (stories.length === 0) return { groups: [] as Group[] };

  // Doar prietenii pe care-i urmărim (accepted) + tu
  const { data: follows } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", viewerId)
    .eq("status", "accepted");
  type FollowRow = { following_id: string };
  type ProfileLite = {
    id: string;
    handle: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
  const allowed = new Set<string>([
    viewerId,
    ...((follows ?? []) as FollowRow[]).map((f) => f.following_id),
  ]);

  const filtered = stories.filter((s) => allowed.has(s.user_id));
  if (filtered.length === 0) return { groups: [] as Group[] };

  const userIds = Array.from(new Set(filtered.map((s) => s.user_id)));
  const { data: profs } = await supabase
    .from("profiles")
    .select("id,handle,display_name,avatar_url")
    .in("id", userIds);
  const pm = new Map(((profs ?? []) as ProfileLite[]).map((p) => [p.id, p]));

  const byUser = new Map<string, StoryRow[]>();
  for (const s of filtered) {
    const arr = byUser.get(s.user_id) ?? [];
    arr.push(s);
    byUser.set(s.user_id, arr);
  }

  const groups: Group[] = Array.from(byUser.entries()).map(([uid, arr]) => {
    const p = pm.get(uid);
    return {
      user_id: uid,
      handle: p?.handle ?? p?.display_name ?? "anonim",
      avatar_url: p?.avatar_url ?? null,
      display_name: p?.display_name ?? null,
      stories: arr.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at)),
    };
  });

  // Tu primul, apoi cei cu story mai recent
  groups.sort((a, b) => {
    if (a.user_id === viewerId) return -1;
    if (b.user_id === viewerId) return 1;
    const la = a.stories[a.stories.length - 1].created_at;
    const lb = b.stories[b.stories.length - 1].created_at;
    return +new Date(lb) - +new Date(la);
  });

  return { groups };
}

// ─── helpers ──────────────────────────────────────────────────────────────

const GRADIENTS: { bg: string; glow: string }[] = [
  { bg: "linear-gradient(to top right, #ff3d8b, #ff3d8b)", glow: "rgba(255,49,88,0.3)" },
  { bg: "linear-gradient(to top right, #c724ff, #ff3d8b)", glow: "rgba(138,43,226,0.3)" },
  {
    bg: "linear-gradient(to bottom right, #ff3d8b, #ff3d8b, #ff3d8b)",
    glow: "rgba(237,30,121,0.3)",
  },
  { bg: "linear-gradient(to top right, #ff3d8b, #ff3d8b, #c724ff)", glow: "rgba(249,115,22,0.3)" },
  {
    bg: "linear-gradient(to bottom right, #c724ff, #4f46e5, #ff3d8b)",
    glow: "rgba(79,70,229,0.3)",
  },
];

function pickGradient(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return GRADIENTS[Math.abs(h) % GRADIENTS.length];
}

function Cover({
  cover,
  avatar,
  fallback,
}: {
  cover: string | null;
  avatar: string | null;
  fallback: string;
}) {
  if (cover) return <img src={cover} alt="" className="h-full w-full object-cover" />;
  if (avatar) return <img src={avatar} alt="" className="h-full w-full object-cover" />;
  return (
    <div className="h-full w-full grid place-items-center font-display font-bold text-sm text-white/70">
      {fallback[0]?.toUpperCase()}
    </div>
  );
}

function SponsoredTile({ promo }: { promo: PromoTile }) {
  const navigate = useNavigate();
  const label = promo.brand ?? promo.title ?? "promovat";
  return (
    <button
      onClick={() => navigate({ to: "/app/promo/$id", params: { id: promo.campaignId } })}
      className="shrink-0 flex flex-col items-center gap-2 w-[72px] active:scale-95 transition-transform animate-fade-in"
      aria-label={`Reclamă: ${label}`}
    >
      <div
        className="relative p-[2.5px] rounded-full"
        style={{
          backgroundImage: `linear-gradient(135deg, #ffea00, ${promo.theme}, #ffea00)`,
          boxShadow: `0 0 18px ${promo.theme}80, 0 0 6px rgba(255,209,102,0.6)`,
        }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-1 rounded-full animate-ping"
          style={{ background: promo.theme, opacity: 0.25 }}
        />

        <div className="bg-background p-[2px] rounded-full">
          <div className="w-[60px] h-[60px] rounded-full overflow-hidden bg-[#111]">
            {promo.cover ? (
              <img src={promo.cover} alt="" className="h-full w-full object-cover" />
            ) : (
              <div
                className="h-full w-full grid place-items-center font-display font-black text-base"
                style={{ color: promo.theme }}
              >
                {(label[0] ?? "?").toUpperCase()}
              </div>
            )}
          </div>
        </div>
        <span
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 rounded-full text-[8px] font-black tracking-[0.16em] leading-[12px] border-[1.5px] border-background"
          style={{ background: promo.theme, color: "#06070a" }}
        >
          AD
        </span>
      </div>
      <span className="text-[10px] font-bold tracking-wider uppercase truncate w-full text-center text-white">
        {label}
      </span>
    </button>
  );
}

export function StoriesStrip() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["stories-strip", user?.id],
    enabled: !!user,
    queryFn: () => loadStories(user!.id),
    refetchInterval: 60_000,
  });

  const { data: promoTiles = [] } = useQuery({
    queryKey: ["stories-strip-promos"],
    queryFn: loadPromoTiles,
    refetchInterval: 120_000,
  });

  const [viewerIdx, setViewerIdx] = useState<number | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [seenIds, setSeenIds] = useState<Set<string>>(() => new Set());
  const [promoIdx, setPromoIdx] = useState(0);
  const groups = data?.groups ?? [];
  const myGroup = useMemo(() => groups.find((g) => g.user_id === user?.id) ?? null, [groups, user]);

  // Rotate sponsored tile every 8s when multiple campaigns are active
  useEffect(() => {
    if (promoTiles.length < 2) return;
    const id = window.setInterval(() => {
      setPromoIdx((i) => (i + 1) % promoTiles.length);
    }, 8000);
    return () => window.clearInterval(id);
  }, [promoTiles.length]);

  // Hydrate seen-set from localStorage (client only)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("oxi-stories-seen");
      if (raw) setSeenIds(new Set(JSON.parse(raw)));
    } catch {}
  }, []);

  const markSeen = (ids: string[]) => {
    setSeenIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.add(id);
      try {
        window.localStorage.setItem("oxi-stories-seen", JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  if (!user) return null;

  return (
    <>
      <div className="-mx-4 px-4 pb-2">
        <div className="flex items-start gap-5 overflow-x-auto scrollbar-none py-2 px-1">
          {/* "Adaugă story" tile (mereu primul) */}
          <button
            onClick={() => setUploadOpen(true)}
            className="shrink-0 flex flex-col items-center gap-2 w-[72px] active:scale-95 transition-transform"
            aria-label="Adaugă story"
          >
            <div className="relative w-[68px] h-[68px] rounded-full border-2 border-dashed border-white/20 flex items-center justify-center bg-white/[0.03] hover:bg-white/[0.06] transition-colors">
              <Plus size={22} strokeWidth={2.5} className="text-white/60" />
            </div>
            <span className="text-[10px] font-bold tracking-wider uppercase text-white/50">
              story nou
            </span>
          </button>

          {/* Sponsored tile (rotates) — opens campaign promo page */}
          {promoTiles.length > 0 && (
            <SponsoredTile promo={promoTiles[promoIdx % promoTiles.length]} />
          )}

          {groups.map((g, i) => {
            const last = g.stories[g.stories.length - 1];
            const cover = last.media_type === "image" ? last.media_url : null;
            const allSeen = g.stories.every((s) => seenIds.has(s.id));
            const gradient = pickGradient(g.user_id);
            const label = g.user_id === user.id ? "tu" : g.handle;

            return (
              <button
                key={g.user_id}
                onClick={() => setViewerIdx(i)}
                className="shrink-0 flex flex-col items-center gap-2 w-[72px] active:scale-95 transition-transform"
              >
                {allSeen ? (
                  <div className="relative p-[2px] rounded-full bg-white/10">
                    <div className="bg-background p-[2px] rounded-full">
                      <div className="w-[60px] h-[60px] rounded-full overflow-hidden bg-[#111] opacity-50 grayscale">
                        <Cover cover={cover} avatar={g.avatar_url} fallback={g.handle} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    className="relative p-[2.5px] rounded-full"
                    style={{
                      backgroundImage: gradient.bg,
                      boxShadow: `0 0 15px ${gradient.glow}`,
                    }}
                  >
                    <div className="bg-background p-[2px] rounded-full">
                      <div className="w-[60px] h-[60px] rounded-full overflow-hidden bg-[#111]">
                        <Cover cover={cover} avatar={g.avatar_url} fallback={g.handle} />
                      </div>
                    </div>
                  </div>
                )}
                <span
                  className={`text-[10px] font-bold tracking-wider uppercase truncate w-full text-center ${
                    allSeen ? "text-white/40" : "text-white"
                  }`}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {viewerIdx !== null &&
        groups[viewerIdx] &&
        typeof document !== "undefined" &&
        createPortal(
          <StoryViewer
            groups={groups}
            startIndex={viewerIdx}
            onClose={() => setViewerIdx(null)}
            onDeleted={() => qc.invalidateQueries({ queryKey: ["stories-strip"] })}
            onSeen={markSeen}
            viewerId={user.id}
          />,
          document.body,
        )}

      {uploadOpen && (
        <StoryUploadSheet
          userId={user.id}
          onClose={() => setUploadOpen(false)}
          onUploaded={() => {
            setUploadOpen(false);
            qc.invalidateQueries({ queryKey: ["stories-strip"] });
          }}
        />
      )}
    </>
  );
}

function StoryViewer({
  groups,
  startIndex,
  onClose,
  onDeleted,
  onSeen,
  viewerId,
}: {
  groups: Group[];
  startIndex: number;
  onClose: () => void;
  onDeleted: () => void;
  onSeen: (ids: string[]) => void;
  viewerId: string;
}) {
  const [gi, setGi] = useState(startIndex);
  const [si, setSi] = useState(0);
  const [mediaRatio, setMediaRatio] = useState<number | null>(null);
  const group = groups[gi];
  const story = group?.stories[si];

  // Lock body scroll while open (prevents scrollbar shift on close)
  useEffect(() => {
    const prev = document.body.style.overflow;
    const prevTouch = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    return () => {
      document.body.style.overflow = prev;
      document.body.style.touchAction = prevTouch;
    };
  }, []);

  // Mark each viewed story as seen
  useEffect(() => {
    if (story) onSeen([story.id]);
  }, [story, onSeen]);

  useEffect(() => {
    setMediaRatio(null);
  }, [story?.id]);

  if (!group || !story) return null;

  const next = () => {
    if (si + 1 < group.stories.length) setSi(si + 1);
    else if (gi + 1 < groups.length) {
      setGi(gi + 1);
      setSi(0);
    } else onClose();
  };
  const prev = () => {
    if (si > 0) setSi(si - 1);
    else if (gi > 0) {
      setGi(gi - 1);
      setSi(groups[gi - 1].stories.length - 1);
    }
  };

  const remove = async () => {
    if (!confirm("Ștergi acest story?")) return;
    const { error } = await supabase.from("stories").delete().eq("id", story.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Șters.");
    onDeleted();
    onClose();
  };

  const isMine = story.user_id === viewerId;
  const ageM = Math.max(0, Math.floor((Date.now() - +new Date(story.created_at)) / 60000));
  const ageLabel = ageM < 60 ? `${ageM}m` : `${Math.floor(ageM / 60)}h`;
  const safeRatio = Math.min(1.45, Math.max(0.82, mediaRatio ?? 1));

  return (
    <div
      className="fixed inset-0 z-[80] bg-black flex items-center justify-center animate-in fade-in zoom-in-95 duration-200"
      style={{ animationTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
      onClick={onClose}
    >
      {/* top scrim for legibility */}
      <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-black/80 to-transparent z-10 pointer-events-none" />

      {/* progress bars */}
      <div
        className="absolute inset-x-0 flex gap-1 p-2 z-20"
        style={{ top: "env(safe-area-inset-top, 0px)" }}
      >
        {group.stories.map((_, idx) => (
          <div key={idx} className="flex-1 h-0.5 rounded-full bg-white/20 overflow-hidden">
            <div
              className={`h-full bg-white transition-all ${idx < si ? "w-full" : idx === si ? "w-1/3" : "w-0"}`}
            />
          </div>
        ))}
      </div>

      {/* header */}
      <div
        className="absolute inset-x-0 px-4 z-20 flex items-center gap-2"
        style={{ top: "calc(env(safe-area-inset-top, 0px) + 18px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-8 w-8 rounded-full overflow-hidden bg-foreground/20 shrink-0 ring-2 ring-white/30">
          {group.avatar_url ? (
            <img src={group.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full grid place-items-center font-display font-bold text-xs text-white">
              {group.handle[0]?.toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display text-sm text-white truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
            @{group.handle}
          </div>
          <div className="font-mono text-[9px] uppercase tracking-widest text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
            {ageLabel}
          </div>
        </div>
        {isMine && (
          <button
            onClick={remove}
            className="font-mono text-[10px] uppercase tracking-widest text-white/90 px-2 py-1 rounded hover:bg-white/10"
          >
            șterge
          </button>
        )}
        <button
          onClick={onClose}
          className="h-8 w-8 rounded-full grid place-items-center text-white"
        >
          <X size={20} />
        </button>
      </div>

      {/* media */}
      <div
        className="absolute inset-0 flex items-start justify-center px-5 pt-28 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        {story.media_type === "image" && (
          <img
            src={story.media_url}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover opacity-35 blur-2xl scale-110"
          />
        )}
        <div
          className="relative w-[min(88vw,360px)] max-h-[52dvh] overflow-hidden rounded-[26px] bg-zinc-950 shadow-[0_24px_80px_rgba(0,0,0,0.65)]"
          style={{ aspectRatio: safeRatio }}
        >
          {story.media_type === "video" ? (
            <video
              src={story.media_url}
              className="h-full w-full object-contain bg-black"
              autoPlay
              playsInline
              controls={false}
              onLoadedMetadata={(e) => {
                const video = e.currentTarget;
                if (video.videoWidth && video.videoHeight)
                  setMediaRatio(video.videoWidth / video.videoHeight);
              }}
              onEnded={next}
            />
          ) : (
            <img
              src={story.media_url}
              alt=""
              className="h-full w-full object-contain bg-black"
              onLoad={(e) => {
                const image = e.currentTarget;
                if (image.naturalWidth && image.naturalHeight)
                  setMediaRatio(image.naturalWidth / image.naturalHeight);
              }}
            />
          )}
        </div>
      </div>

      {/* tap zones */}
      <button
        className="absolute left-0 top-0 bottom-0 w-1/3"
        onClick={(e) => {
          e.stopPropagation();
          prev();
        }}
        aria-label="anterior"
      />
      <button
        className="absolute right-0 top-0 bottom-0 w-1/3"
        onClick={(e) => {
          e.stopPropagation();
          next();
        }}
        aria-label="următor"
      />

      {/* caption */}
      {story.caption && (
        <div
          className="absolute bottom-8 inset-x-0 px-6 z-10 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-white text-sm drop-shadow-lg max-w-md mx-auto">{story.caption}</p>
        </div>
      )}
    </div>
  );
}

function StoryUploadSheet({
  userId,
  onClose,
  onUploaded,
}: {
  userId: string;
  onClose: () => void;
  onUploaded: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  const mediaType: "image" | "video" = file?.type.startsWith("video") ? "video" : "image";

  async function submit() {
    if (!file) {
      toast.error("Alege o poză sau un clip.");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? (mediaType === "video" ? "mp4" : "jpg");
      const path = `${userId}/stories/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("venue-photos").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("venue-photos").getPublicUrl(path);
      const { error: insErr } = await supabase.from("stories").insert({
        user_id: userId,
        media_url: pub.publicUrl,
        media_type: mediaType,
        caption: caption.trim() || null,
      });
      if (insErr) throw insErr;
      toast.success("Story-ul tău e live 24h.");
      onUploaded();
    } catch (e) {
      toast.error(errorMessage(e, "Eroare la upload"));
    } finally {
      setUploading(false);
    }
  }

  // Auto-deschide selectorul nativ când nu există fișier
  useEffect(() => {
    if (!file) {
      const t = setTimeout(() => inputRef.current?.click(), 50);
      return () => clearTimeout(t);
    }
  }, [file]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 pb-[calc(8rem+env(safe-area-inset-bottom))] sm:pb-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-zinc-900/70 backdrop-blur-3xl border border-white/10 rounded-t-[32px] sm:rounded-[32px] p-5 space-y-5 max-h-[calc(100dvh-10rem-env(safe-area-inset-bottom))] sm:max-h-[92dvh] overflow-y-auto shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold text-lg tracking-tight">Postează story</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-full transition-colors text-zinc-400"
            aria-label="Închide"
          >
            <X size={18} />
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />

        {previewUrl ? (
          <div className="relative aspect-[4/5] w-full bg-zinc-950 rounded-3xl overflow-hidden border border-white/5">
            {mediaType === "video" ? (
              <video
                src={previewUrl}
                className="w-full h-full object-cover"
                playsInline
                autoPlay
                muted
                loop
              />
            ) : (
              <img src={previewUrl} alt="" className="w-full h-full object-cover" />
            )}

            {/* Caption suprapus */}
            <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value.slice(0, 200))}
                placeholder="Adaugă un mesaj…"
                className="w-full bg-white/10 border border-white/10 rounded-2xl px-5 py-3.5 text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#ff3d8b]/50 backdrop-blur-xl text-sm"
              />
            </div>

            {/* Schimbă media */}
            <button
              onClick={() => inputRef.current?.click()}
              className="absolute top-3 right-3 p-2.5 bg-black/50 backdrop-blur-md rounded-2xl text-white border border-white/10 hover:bg-black/70 transition-all"
              aria-label="Schimbă media"
            >
              <Upload size={16} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => inputRef.current?.click()}
            className="w-full aspect-[4/5] rounded-3xl border-2 border-dashed border-white/15 grid place-items-center gap-3 text-zinc-400 bg-zinc-950/40 hover:bg-zinc-900/40 transition-colors"
          >
            <Upload size={28} />
            <span className="font-bold text-xs uppercase tracking-widest">alege foto / video</span>
          </button>
        )}

        <button
          disabled={!file || uploading}
          onClick={submit}
          className="group relative w-full overflow-hidden rounded-2xl transition-all active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100"
        >
          {file && !uploading && (
            <div className="absolute inset-0 bg-gradient-to-r from-[#ff3d8b] to-[#ff3d8b] opacity-60 blur-xl" />
          )}
          <div className="relative w-full py-4 bg-gradient-to-r from-[#ff3d8b] to-[#ff3d8b] rounded-2xl flex items-center justify-center gap-2">
            <span className="text-white font-bold text-base tracking-wide">
              {uploading ? "se încarcă…" : "Publică acum"}
            </span>
          </div>
        </button>
      </div>
    </div>,
    document.body,
  );
}

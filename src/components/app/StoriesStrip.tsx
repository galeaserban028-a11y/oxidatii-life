import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { Plus, X, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

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
  const allowed = new Set<string>([viewerId, ...((follows ?? []).map((f: any) => f.following_id))]);

  const filtered = stories.filter((s) => allowed.has(s.user_id));
  if (filtered.length === 0) return { groups: [] as Group[] };

  const userIds = Array.from(new Set(filtered.map((s) => s.user_id)));
  const { data: profs } = await supabase
    .from("profiles")
    .select("id,handle,display_name,avatar_url")
    .in("id", userIds);
  const pm = new Map((profs ?? []).map((p: any) => [p.id, p]));

  const byUser = new Map<string, StoryRow[]>();
  for (const s of filtered) {
    const arr = byUser.get(s.user_id) ?? [];
    arr.push(s);
    byUser.set(s.user_id, arr);
  }

  const groups: Group[] = Array.from(byUser.entries()).map(([uid, arr]) => {
    const p: any = pm.get(uid) ?? {};
    return {
      user_id: uid,
      handle: p.handle ?? p.display_name ?? "anonim",
      avatar_url: p.avatar_url ?? null,
      display_name: p.display_name ?? null,
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

export function StoriesStrip() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["stories-strip", user?.id],
    enabled: !!user,
    queryFn: () => loadStories(user!.id),
    refetchInterval: 60_000,
  });

  const [viewerIdx, setViewerIdx] = useState<number | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const groups = data?.groups ?? [];
  const myGroup = useMemo(() => groups.find((g) => g.user_id === user?.id) ?? null, [groups, user]);

  if (!user) return null;

  return (
    <>
      <div className="-mx-4 px-4 pb-2">
        <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
          {/* "Adaugă story" tile (mereu primul) */}
          <button
            onClick={() => setUploadOpen(true)}
            className="shrink-0 flex flex-col items-center gap-1.5 w-[68px]"
            aria-label="Adaugă story"
          >
            <div className="relative h-[60px] w-[60px] rounded-full bg-foreground/[0.05] border-2 border-dashed border-foreground/20 grid place-items-center">
              {myGroup?.avatar_url ? (
                <img src={myGroup.avatar_url} alt="" className="h-full w-full object-cover rounded-full opacity-60" />
              ) : null}
              <div className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-neon-crimson grid place-items-center border-2 border-background">
                <Plus size={11} className="text-white" strokeWidth={3} />
              </div>
            </div>
            <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground truncate w-full text-center">
              {myGroup ? "adaugă" : "story nou"}
            </span>
          </button>

          {groups.map((g, i) => {
            const last = g.stories[g.stories.length - 1];
            const cover = last.media_type === "image" ? last.media_url : null;
            return (
              <button
                key={g.user_id}
                onClick={() => setViewerIdx(i)}
                className="shrink-0 flex flex-col items-center gap-1.5 w-[68px]"
              >
                <div className="relative h-[60px] w-[60px] rounded-full p-[2px] bg-gradient-to-br from-[#ff8a3d] via-neon-crimson to-neon-purple">
                  <div className="h-full w-full rounded-full bg-background p-[2px]">
                    {cover ? (
                      <img src={cover} alt="" className="h-full w-full rounded-full object-cover" />
                    ) : g.avatar_url ? (
                      <img src={g.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                    ) : (
                      <div className="h-full w-full rounded-full bg-foreground/10 grid place-items-center font-display font-bold text-sm">
                        {g.handle[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground truncate w-full text-center">
                  {g.user_id === user.id ? "tu" : g.handle}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {viewerIdx !== null && groups[viewerIdx] && (
        <StoryViewer
          groups={groups}
          startIndex={viewerIdx}
          onClose={() => setViewerIdx(null)}
          onDeleted={() => qc.invalidateQueries({ queryKey: ["stories-strip"] })}
          viewerId={user.id}
        />
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
  viewerId,
}: {
  groups: Group[];
  startIndex: number;
  onClose: () => void;
  onDeleted: () => void;
  viewerId: string;
}) {
  const [gi, setGi] = useState(startIndex);
  const [si, setSi] = useState(0);
  const group = groups[gi];
  const story = group?.stories[si];

  if (!group || !story) return null;

  const next = () => {
    if (si + 1 < group.stories.length) setSi(si + 1);
    else if (gi + 1 < groups.length) { setGi(gi + 1); setSi(0); }
    else onClose();
  };
  const prev = () => {
    if (si > 0) setSi(si - 1);
    else if (gi > 0) { setGi(gi - 1); setSi(groups[gi - 1].stories.length - 1); }
  };

  const remove = async () => {
    if (!confirm("Ștergi acest story?")) return;
    const { error } = await supabase.from("stories").delete().eq("id", story.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Șters.");
    onDeleted();
    onClose();
  };

  const isMine = story.user_id === viewerId;
  const ageM = Math.max(0, Math.floor((Date.now() - +new Date(story.created_at)) / 60000));
  const ageLabel = ageM < 60 ? `${ageM}m` : `${Math.floor(ageM / 60)}h`;

  return (
    <div className="fixed inset-0 z-[80] bg-black flex items-center justify-center" onClick={onClose}>
      {/* progress bars */}
      <div className="absolute top-0 inset-x-0 flex gap-1 p-2 z-10">
        {group.stories.map((_, idx) => (
          <div key={idx} className="flex-1 h-0.5 rounded-full bg-white/20 overflow-hidden">
            <div className={`h-full bg-white transition-all ${idx < si ? "w-full" : idx === si ? "w-1/3" : "w-0"}`} />
          </div>
        ))}
      </div>

      {/* header */}
      <div className="absolute top-4 inset-x-0 px-4 z-10 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <div className="h-8 w-8 rounded-full overflow-hidden bg-foreground/20 shrink-0">
          {group.avatar_url ? (
            <img src={group.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full grid place-items-center font-display font-bold text-xs text-white">
              {group.handle[0]?.toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display text-sm text-white truncate">@{group.handle}</div>
          <div className="font-mono text-[9px] uppercase tracking-widest text-white/60">{ageLabel}</div>
        </div>
        {isMine && (
          <button onClick={remove} className="font-mono text-[10px] uppercase tracking-widest text-white/70 px-2 py-1 rounded hover:bg-white/10">
            șterge
          </button>
        )}
        <button onClick={onClose} className="h-8 w-8 rounded-full grid place-items-center text-white">
          <X size={20} />
        </button>
      </div>

      {/* media */}
      <div className="absolute inset-0 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        {story.media_type === "video" ? (
          <video src={story.media_url} className="max-h-full max-w-full" autoPlay playsInline controls={false} onEnded={next} />
        ) : (
          <img src={story.media_url} alt="" className="max-h-full max-w-full object-contain" />
        )}
      </div>

      {/* tap zones */}
      <button className="absolute left-0 top-0 bottom-0 w-1/3" onClick={(e) => { e.stopPropagation(); prev(); }} aria-label="anterior" />
      <button className="absolute right-0 top-0 bottom-0 w-1/3" onClick={(e) => { e.stopPropagation(); next(); }} aria-label="următor" />

      {/* caption */}
      {story.caption && (
        <div className="absolute bottom-8 inset-x-0 px-6 z-10 text-center" onClick={(e) => e.stopPropagation()}>
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
    if (!file) { toast.error("Alege o poză sau un clip."); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? (mediaType === "video" ? "mp4" : "jpg");
      const path = `stories/${userId}/${Date.now()}.${ext}`;
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
    } catch (e: any) {
      toast.error(e?.message ?? "Eroare la upload");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-end" onClick={onClose}>
      <div className="w-full bg-background border-t border-foreground/10 rounded-t-2xl p-4 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="font-display uppercase text-lg">Story nou · 24h</div>
          <button onClick={onClose} className="text-muted-foreground text-2xl leading-none">×</button>
        </div>

        {previewUrl ? (
          <div className="rounded-xl overflow-hidden border border-foreground/10 bg-black aspect-[9/16] max-h-[50vh] flex items-center justify-center">
            {mediaType === "video" ? (
              <video src={previewUrl} className="max-h-full max-w-full" controls playsInline />
            ) : (
              <img src={previewUrl} alt="" className="max-h-full max-w-full object-contain" />
            )}
          </div>
        ) : (
          <button
            onClick={() => inputRef.current?.click()}
            className="w-full aspect-[9/16] max-h-[50vh] rounded-xl border-2 border-dashed border-foreground/20 grid place-items-center gap-2 text-muted-foreground"
          >
            <Upload size={28} />
            <span className="font-mono text-[10px] uppercase tracking-widest">alege foto / video</span>
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />

        {file && (
          <button
            onClick={() => inputRef.current?.click()}
            className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
          >
            schimbă fișierul
          </button>
        )}

        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value.slice(0, 200))}
          placeholder="Scrie ceva (opțional)…"
          className="w-full rounded-xl bg-foreground/[0.04] border border-foreground/10 px-3 py-2 text-sm resize-none"
          rows={2}
        />

        <button
          disabled={!file || uploading}
          onClick={submit}
          className="w-full py-3 rounded-xl font-display uppercase tracking-widest text-sm text-white disabled:opacity-40"
          style={{ background: "var(--gradient-chaos)" }}
        >
          {uploading ? "se încarcă…" : "postează story"}
        </button>
      </div>
    </div>
  );
}

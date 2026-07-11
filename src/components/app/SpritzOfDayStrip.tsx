import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "@tanstack/react-router";
import { X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { errorMessage } from "@/lib/errors";

type SpritzTile = {
  id: string;
  user_id: string;
  photo_url: string;
  media_type: "image" | "video";
  created_at: string;
  handle: string;
  avatar_url: string | null;
  display_name: string | null;
  venue_name: string | null;
};

async function loadSpritzOfDay(): Promise<SpritzTile[]> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const { data } = await supabase
    .from("sprit_proofs")
    .select(
      "id,user_id,photo_url,media_type,created_at,profile:profiles!sprit_proofs_user_profile_fkey(handle,avatar_url,display_name,is_public),venue:venues(name)",
    )
    .gte("created_at", startOfDay.toISOString())
    .order("created_at", { ascending: false })
    .limit(200);

  const seen = new Set<string>();
  const out: SpritzTile[] = [];
  type ProofRow = {
    id: string; user_id: string; photo_url: string; media_type: "image" | "video"; created_at: string;
    profile?: { handle?: string | null; avatar_url?: string | null; display_name?: string | null; is_public?: boolean | null } | null;
    venue?: { name?: string | null } | null;
  };
  for (const r of (data ?? []) as unknown as ProofRow[]) {
    if (seen.has(r.user_id)) continue;
    if (!r.profile || r.profile.is_public === false) continue;
    seen.add(r.user_id);
    out.push({
      id: r.id,
      user_id: r.user_id,
      photo_url: r.photo_url,
      media_type: r.media_type,
      created_at: r.created_at,
      handle: r.profile.handle ?? "anonim",
      avatar_url: r.profile.avatar_url ?? null,
      display_name: r.profile.display_name ?? null,
      venue_name: r.venue?.name ?? null,
    });
  }
  return out;
}

export function SpritzOfDayStrip() {
  const { data: tiles = [], isLoading } = useQuery({
    queryKey: ["spritz-of-the-day"],
    queryFn: loadSpritzOfDay,
    staleTime: 60_000,
  });
  const [viewIdx, setViewIdx] = useState<number | null>(null);

  if (isLoading || tiles.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.3em] text-white/40">
            șprițul zilei
          </span>
          <span className="h-1 w-1 rounded-full bg-[#ffea00]" />
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/60">
            {tiles.length} azi
          </span>
        </div>
      </div>
      <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-5 px-5 snap-x snap-mandatory">
        {tiles.map((t, i) => (
          <button
            key={t.id}
            onClick={() => setViewIdx(i)}
            className="shrink-0 snap-start w-[88px] aspect-[3/4] rounded-2xl overflow-hidden relative border border-white/10 active:scale-95 transition"
          >
            {t.media_type === "video" ? (
              <video
                src={t.photo_url}
                className="h-full w-full object-cover"
                muted
                playsInline
                preload="metadata"
              />
            ) : (
              <img src={t.photo_url} alt="" className="h-full w-full object-cover" loading="lazy" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/30" />
            <div className="absolute top-1.5 left-1.5 h-7 w-7 rounded-full p-[1.5px] bg-gradient-to-br from-[#ff3d8b] to-[#c724ff]">
              <div className="h-full w-full rounded-full overflow-hidden bg-black">
                {t.avatar_url ? (
                  <img src={t.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-[10px] font-semibold text-white">
                    {t.handle[0]?.toUpperCase()}
                  </div>
                )}
              </div>
            </div>
            <div className="absolute bottom-1.5 left-1.5 right-1.5">
              <div className="text-[10px] font-semibold text-white truncate">@{t.handle}</div>
              {t.venue_name && (
                <div className="text-[8px] text-white/70 truncate">{t.venue_name}</div>
              )}
            </div>
          </button>
        ))}
      </div>

      {viewIdx !== null && (
        <SpritzViewer
          tiles={tiles}
          index={viewIdx}
          onClose={() => setViewIdx(null)}
          onIndex={setViewIdx}
        />
      )}
    </div>
  );
}

function SpritzViewer({
  tiles,
  index,
  onClose,
  onIndex,
}: {
  tiles: SpritzTile[];
  index: number;
  onClose: () => void;
  onIndex: (i: number) => void;
}) {
  const t = tiles[index];
  const progressRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isMine = !!user && !!t && user.id === t.user_id;
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!user || !t || !isMine) return;
    if (!confirm("Sigur vrei să ștergi acest șpriț?")) return;
    setDeleting(true);
    try {
      await supabase.from("sprit_proofs").delete().eq("id", t.id).eq("user_id", user.id);
      await supabase
        .from("venue_photos")
        .delete()
        .eq("user_id", user.id)
        .eq("photo_url", t.photo_url);
      toast.success("Șters");
      queryClient.invalidateQueries({ queryKey: ["spritz-of-the-day"] });
      queryClient.invalidateQueries({ queryKey: ["app-feed"] });
      onClose();
    } catch (e) {
      toast.error(errorMessage(e, "Nu s-a putut șterge"));
    } finally {
      setDeleting(false);
    }
  }
  useEffect(() => {
    if (!progressRef.current) return;
    progressRef.current.style.transition = "none";
    progressRef.current.style.width = "0%";
    requestAnimationFrame(() => {
      if (!progressRef.current) return;
      progressRef.current.style.transition = "width 5s linear";
      progressRef.current.style.width = "100%";
    });
    const timeout = setTimeout(() => {
      if (index + 1 < tiles.length) onIndex(index + 1);
      else onClose();
    }, 5100);
    return () => clearTimeout(timeout);
  }, [index, tiles.length, onClose, onIndex]);

  if (!t) return null;
  return createPortal(
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      <div className="flex gap-1 p-2 pt-3">
        {tiles.map((_, i) => (
          <div key={i} className="flex-1 h-0.5 rounded-full bg-white/20 overflow-hidden">
            {i < index && <div className="h-full w-full bg-white" />}
            {i === index && (
              <div ref={progressRef} className="h-full bg-white" style={{ width: "0%" }} />
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between px-3 pb-2">
        <Link
          to="/app/user/$id"
          params={{ id: t.user_id }}
          onClick={onClose}
          className="flex items-center gap-2.5 min-w-0"
        >
          <div className="h-9 w-9 rounded-full overflow-hidden bg-white/10 shrink-0">
            {t.avatar_url ? (
              <img src={t.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white truncate">@{t.handle}</div>
            {t.venue_name && (
              <div className="text-[10px] text-white/60 truncate">{t.venue_name}</div>
            )}
          </div>
        </Link>
        <div className="flex items-center gap-2">
          {isMine && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="h-9 px-3 rounded-full bg-red-500/15 text-red-300 flex items-center gap-1.5 text-xs font-semibold disabled:opacity-50"
            >
              <Trash2 size={14} />
              {deleting ? "..." : "Șterge"}
            </button>
          )}
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-white"
          >
            <X size={18} />
          </button>
        </div>
      </div>
      <div
        className="flex-1 relative"
        onClick={(e) => {
          const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
          const left = e.clientX - r.left < r.width / 2;
          if (left && index > 0) onIndex(index - 1);
          else if (!left && index + 1 < tiles.length) onIndex(index + 1);
          else onClose();
        }}
      >
        {t.media_type === "video" ? (
          <video
            src={t.photo_url}
            className="h-full w-full object-contain"
            autoPlay
            muted
            playsInline
            loop
          />
        ) : (
          <img src={t.photo_url} alt="" className="h-full w-full object-contain" />
        )}
      </div>
    </div>,
    document.body,
  );
}

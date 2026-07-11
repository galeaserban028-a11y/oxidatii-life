import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Moment, archivo, hind, SHEET_BOTTOM, timeAgo } from "./shared";
import { Heart, X } from "lucide-react";

type RawComment = {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  parent_id: string | null;
  profile?: {
    id: string;
    handle: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
};

type ThreadNode = RawComment & { replies: RawComment[] };

export function CommentsSheet({ photo, onClose }: { photo: Moment; onClose: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; handle: string } | null>(null);

  const { data: comments } = useQuery({
    queryKey: ["photo-comments", photo.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("photo_comments")
        .select("id, body, created_at, user_id, parent_id")
        .eq("photo_id", photo.id)
        .order("created_at", { ascending: true });
      const rows = (data ?? []) as RawComment[];
      const ids = Array.from(new Set(rows.map((c) => c.user_id)));
      type ProfileLite = { id: string; handle: string | null; display_name: string | null; avatar_url: string | null };
      const { data: profs } = ids.length
        ? await supabase
            .from("profiles")
            .select("id, handle, display_name, avatar_url")
            .in("id", ids)
        : { data: [] as ProfileLite[] };
      const map = new Map(((profs ?? []) as ProfileLite[]).map((p) => [p.id, p]));
      return rows.map((c) => ({ ...c, profile: map.get(c.user_id) })) as RawComment[];
    },
  });

  const commentIds = (comments ?? []).map((c) => c.id);

  const { data: likeData } = useQuery({
    queryKey: ["photo-comment-likes", photo.id, commentIds.length],
    enabled: commentIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("photo_comment_likes")
        .select("comment_id, user_id")
        .in("comment_id", commentIds);
      const counts = new Map<string, number>();
      const mine = new Set<string>();
      ((data ?? []) as Array<{ comment_id: string; user_id: string }>).forEach((r) => {
        counts.set(r.comment_id, (counts.get(r.comment_id) ?? 0) + 1);
        if (user && r.user_id === user.id) mine.add(r.comment_id);
      });
      return { counts, mine };
    },
  });

  const threads = useMemo<ThreadNode[]>(() => {
    if (!comments) return [];
    const parents = comments.filter((c) => !c.parent_id);
    const childrenByParent = new Map<string, RawComment[]>();
    comments.forEach((c) => {
      if (c.parent_id) {
        const arr = childrenByParent.get(c.parent_id) ?? [];
        arr.push(c);
        childrenByParent.set(c.parent_id, arr);
      }
    });
    return parents.map((p) => ({ ...p, replies: childrenByParent.get(p.id) ?? [] }));
  }, [comments]);

  async function submit() {
    if (!user) {
      toast.error("Trebuie să fii logat.");
      return;
    }
    const text = body.trim();
    if (!text) return;
    setSending(true);
    const { error } = await supabase.from("photo_comments").insert({
      photo_id: photo.id,
      user_id: user.id,
      body: text,
      parent_id: replyTo?.id ?? null,
    });
    setSending(false);
    if (error) {
      const { prettifyAntiSpamError } = await import("@/lib/antispam");
      toast.error(prettifyAntiSpamError(error));
      return;
    }
    setBody("");
    setReplyTo(null);
    qc.invalidateQueries({ queryKey: ["photo-comments", photo.id] });
    qc.invalidateQueries({ queryKey: ["faze"] });
  }

  async function toggleLike(c: RawComment) {
    if (!user) {
      toast.error("Trebuie să fii logat.");
      return;
    }
    const liked = likeData?.mine.has(c.id);
    if (liked) {
      await supabase
        .from("photo_comment_likes")
        .delete()
        .eq("comment_id", c.id)
        .eq("user_id", user.id);
    } else {
      await supabase.from("photo_comment_likes").insert({ comment_id: c.id, user_id: user.id });
    }
    qc.invalidateQueries({ queryKey: ["photo-comment-likes", photo.id] });
  }

  const total = comments?.length ?? 0;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-end animate-fade-in"
      onClick={onClose}
      style={hind}
    >
      <div
        className="w-full bg-[#0b0a1a] border-t border-white/10 rounded-t-[2rem] flex flex-col shadow-[0_-20px_60px_rgba(199,36,255,0.15)] animate-slide-in-right"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: `calc(88dvh - ${SHEET_BOTTOM})`, marginBottom: SHEET_BOTTOM }}
      >
        {/* Handle */}
        <div className="pt-2 pb-1 grid place-items-center">
          <div className="h-1 w-10 rounded-full bg-white/15" />
        </div>

        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-white/5 sticky top-0 z-20 bg-[#0b0a1a]/90 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[#ff3d8b] shadow-[0_0_10px_#ff3d8b]" />
            <h2
              className="text-white text-[11px] tracking-[0.22em] uppercase font-extrabold"
              style={archivo}
            >
              Comentarii
            </h2>
            {total > 0 && (
              <span className="text-[10px] text-white/40 font-medium">{total}</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/5 rounded-full transition-colors"
            aria-label="Închide"
          >
            <X className="w-5 h-5 text-white/50" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-7">
          {!comments ? (
            <div className="text-xs text-white/40">Se încarcă…</div>
          ) : threads.length === 0 ? (
            <div className="text-center py-14">
              <div className="text-4xl mb-2">💬</div>
              <div className="text-sm text-white/50">Niciun comentariu. Fii primul.</div>
            </div>
          ) : (
            threads.map((c) => (
              <CommentRow
                key={c.id}
                c={c}
                likes={likeData?.counts.get(c.id) ?? 0}
                liked={!!likeData?.mine.has(c.id)}
                onLike={() => toggleLike(c)}
                onReply={() =>
                  setReplyTo({
                    id: c.id,
                    handle: c.profile?.handle ?? c.profile?.display_name ?? "user",
                  })
                }
              >
                {c.replies.length > 0 && (
                  <div className="mt-4 ml-3 pl-6 relative space-y-4">
                    <div className="absolute left-0 top-0 bottom-3 w-[2px] bg-gradient-to-b from-[#c724ff]/30 via-white/10 to-transparent" />
                    {c.replies.map((r) => (
                      <CommentRow
                        key={r.id}
                        c={r}
                        compact
                        likes={likeData?.counts.get(r.id) ?? 0}
                        liked={!!likeData?.mine.has(r.id)}
                        onLike={() => toggleLike(r)}
                        onReply={() =>
                          setReplyTo({
                            id: c.id, // reply-to-thread stays at parent
                            handle: r.profile?.handle ?? r.profile?.display_name ?? "user",
                          })
                        }
                      />
                    ))}
                  </div>
                )}
              </CommentRow>
            ))
          )}
        </div>

        {/* Reply chip */}
        {replyTo && (
          <div className="px-5 pt-2 pb-1 flex items-center justify-between text-[11px] text-white/70">
            <span>
              Răspunzi lui <span className="text-[#c724ff] font-semibold">@{replyTo.handle}</span>
            </span>
            <button
              onClick={() => setReplyTo(null)}
              className="text-white/40 uppercase tracking-widest text-[10px] font-bold hover:text-white"
              style={archivo}
            >
              Anulează
            </button>
          </div>
        )}

        {/* Input */}
        <div
          className="p-4 bg-[#0b0a1a] border-t border-white/5"
          style={{ paddingBottom: `max(1rem, env(safe-area-inset-bottom))` }}
        >
          <div className="relative flex items-center group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-[#ff3d8b] to-[#c724ff] rounded-full blur opacity-0 group-focus-within:opacity-25 transition-opacity" />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder={replyTo ? `Răspunde lui @${replyTo.handle}…` : "Scrie un comentariu…"}
              rows={1}
              maxLength={500}
              className="relative w-full resize-none bg-white/[0.06] border border-white/10 rounded-full py-3.5 pl-5 pr-28 text-[14px] text-white focus:outline-none focus:border-[#c724ff]/50 placeholder:text-white/25 font-medium"
            />
            <button
              onClick={submit}
              disabled={sending || !body.trim()}
              className="absolute right-1.5 px-5 py-2 rounded-full bg-gradient-to-r from-[#ff3d8b] to-[#c724ff] text-white text-[10px] uppercase tracking-[0.15em] font-black shadow-[0_4px_15px_rgba(255,61,139,0.4)] hover:shadow-[0_4px_25px_rgba(255,61,139,0.6)] active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"
              style={archivo}
            >
              Trimite
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CommentRow({
  c,
  likes,
  liked,
  onLike,
  onReply,
  compact,
  children,
}: {
  c: RawComment;
  likes: number;
  liked: boolean;
  onLike: () => void;
  onReply: () => void;
  compact?: boolean;
  children?: React.ReactNode;
}) {
  const name = c.profile?.display_name ?? c.profile?.handle ?? "Anonim";
  const avatarSize = compact ? "w-8 h-8" : "w-11 h-11";
  const nameCls = compact ? "text-xs" : "text-sm";
  const bodyCls = compact ? "text-[13px] text-white/70" : "text-[14px] text-white/90";

  return (
    <div className="group relative">
      <div className="flex gap-3.5">
        <div className="flex-shrink-0">
          <div
            className={`${avatarSize} rounded-full p-[2px] ${
              compact
                ? "bg-white/10"
                : "bg-gradient-to-tr from-[#ff3d8b] via-[#c724ff] to-[#ff3d8b] shadow-[0_0_12px_rgba(255,61,139,0.25)]"
            }`}
          >
            {c.profile?.avatar_url ? (
              <img
                src={c.profile.avatar_url}
                alt=""
                className="w-full h-full rounded-full object-cover bg-[#0b0a1a]"
              />
            ) : (
              <div
                className="w-full h-full rounded-full bg-[#0b0a1a] grid place-items-center text-[11px] uppercase text-white/70 font-bold"
                style={archivo}
              >
                {name[0]?.toUpperCase()}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className={`text-white font-semibold ${nameCls} truncate`}>{name}</span>
            <span
              className="text-white/25 text-[10px] font-medium uppercase tracking-wider"
              style={archivo}
            >
              {timeAgo(c.created_at)}
            </span>
          </div>
          <p className={`${bodyCls} leading-relaxed whitespace-pre-wrap break-words`}>{c.body}</p>
          <div className="flex items-center gap-5 pt-0.5">
            <button
              onClick={onLike}
              className={`flex items-center gap-1.5 transition-all active:scale-90 ${
                liked ? "text-[#ff3d8b]" : "text-white/35 hover:text-[#ff3d8b]"
              }`}
              aria-label="like"
            >
              <Heart
                className={`${compact ? "w-3.5 h-3.5" : "w-4 h-4"} transition-transform ${
                  liked ? "fill-[#ff3d8b] scale-110" : ""
                }`}
              />
              {likes > 0 && (
                <span className={`${compact ? "text-[10px]" : "text-[11px]"} font-bold`}>
                  {likes}
                </span>
              )}
            </button>
            <button
              onClick={onReply}
              className={`${
                compact ? "text-[10px]" : "text-[11px]"
              } uppercase tracking-widest font-bold text-white/40 hover:text-white transition-colors`}
              style={archivo}
            >
              Răspunde
            </button>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

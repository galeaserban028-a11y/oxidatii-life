import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import PhotoZoom from "@/components/app/PhotoZoom";

export const Route = createFileRoute("/app/photo/$id")({
  head: () => ({ meta: [{ title: "Fază · OXIDAȚII" }] }),
  component: PhotoPage,
});

const archivo = { letterSpacing: "-0.01em" } as const;
const hind = {} as const;

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - +new Date(iso)) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}z`;
}

function formatCount(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

function PhotoPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["photo-detail", id, user?.id ?? null],
    queryFn: async () => {
      const { data: photo } = await supabase
        .from("venue_photos")
        .select("id, photo_url, caption, taken_at, user_id, venue_id")
        .eq("id", id)
        .maybeSingle();
      if (!photo) return null;
      const [{ data: profile }, { data: venue }, { count: likesCount }, { count: commentsCount }, { count: repostsCount }, { data: myLike }, { data: myRepost }] = await Promise.all([
        supabase.from("profiles").select("id, handle, display_name, avatar_url").eq("id", photo.user_id).maybeSingle(),
        photo.venue_id
          ? supabase.from("venues").select("id, name, city:cities(name)").eq("id", photo.venue_id).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from("photo_likes").select("*", { count: "exact", head: true }).eq("photo_id", id),
        supabase.from("photo_comments").select("*", { count: "exact", head: true }).eq("photo_id", id),
        supabase.from("photo_reposts").select("*", { count: "exact", head: true }).eq("photo_id", id),
        user?.id
          ? supabase.from("photo_likes").select("photo_id").eq("photo_id", id).eq("user_id", user.id).maybeSingle()
          : Promise.resolve({ data: null }),
        user?.id
          ? supabase.from("photo_reposts").select("photo_id").eq("photo_id", id).eq("user_id", user.id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      return {
        photo,
        profile,
        venue,
        likes: likesCount ?? 0,
        comments: commentsCount ?? 0,
        reposts: repostsCount ?? 0,
        isLiked: !!myLike,
        isReposted: !!myRepost,
      };
    },
  });

  const { data: comments } = useQuery({
    queryKey: ["photo-comments-list", id],
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("photo_comments")
        .select("id, body, created_at, user_id")
        .eq("photo_id", id)
        .order("created_at", { ascending: true });
      const ids = Array.from(new Set((rows ?? []).map((c) => c.user_id)));
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id, handle, display_name, avatar_url").in("id", ids)
        : { data: [] as any[] };
      const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
      return (rows ?? []).map((c) => ({ ...c, profile: map.get(c.user_id) }));
    },
  });

  async function toggleLike() {
    if (!user || !data) { toast.error("Trebuie să fii logat."); return; }
    if (data.isLiked) {
      await supabase.from("photo_likes").delete().eq("photo_id", id).eq("user_id", user.id);
    } else {
      await supabase.from("photo_likes").insert({ photo_id: id, user_id: user.id });
    }
    qc.invalidateQueries({ queryKey: ["photo-detail", id] });
    qc.invalidateQueries({ queryKey: ["faze"] });
  }

  async function toggleRepost() {
    if (!user || !data) { toast.error("Trebuie să fii logat."); return; }
    if (data.isReposted) {
      await supabase.from("photo_reposts").delete().eq("photo_id", id).eq("user_id", user.id);
      toast.success("Repost retras.");
    } else {
      await supabase.from("photo_reposts").insert({ photo_id: id, user_id: user.id });
      toast.success("Repostat pe contul tău.");
    }
    qc.invalidateQueries({ queryKey: ["photo-detail", id] });
    qc.invalidateQueries({ queryKey: ["my-reposts", user.id] });
    qc.invalidateQueries({ queryKey: ["faze"] });
  }

  async function submitComment() {
    if (!user) { toast.error("Trebuie să fii logat."); return; }
    const text = body.trim();
    if (!text) return;
    setSending(true);
    const { error } = await supabase.from("photo_comments").insert({ photo_id: id, user_id: user.id, body: text });
    setSending(false);
    if (error) { toast.error(error.message); return; }
    setBody("");
    qc.invalidateQueries({ queryKey: ["photo-comments-list", id] });
    qc.invalidateQueries({ queryKey: ["photo-detail", id] });
  }

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground" style={hind}>Se încarcă…</div>;
  }
  if (!data) {
    return (
      <div className="p-8 text-center space-y-3" style={hind}>
        <div className="text-4xl">🫥</div>
        <div className="uppercase" style={archivo}>Faza nu există sau a fost ștearsă.</div>
        <button onClick={() => nav({ to: "/app/faze" })} className="text-sm underline text-muted-foreground">vezi fazele</button>
      </div>
    );
  }

  const { photo, profile, venue, likes, comments: commentsCount, reposts, isLiked, isReposted } = data;
  const handle = profile?.handle ?? profile?.display_name ?? "anonim";
  const isVideo = /\.(mp4|webm|mov)$/i.test(photo.photo_url);

  return (
    <div className="pb-32 max-w-[480px] mx-auto" style={hind}>
      <header className="flex items-center gap-3 px-4 pt-5 pb-3">
        <button onClick={() => window.history.back()} className="size-10 -ml-2 flex items-center justify-center rounded-full hover:bg-foreground/5 active:scale-95 transition">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-[20px] leading-none uppercase" style={archivo}>
          Postare<span className="text-gradient-sunset">.</span>
        </h1>
      </header>

      <article className="mx-3 rounded-3xl border border-foreground/10 bg-card/40 overflow-hidden shadow-[0_4px_24px_-12px_rgba(0,0,0,0.6)]">
        {/* Author row */}
        <div className="flex items-center gap-3 px-3.5 py-3">
          <Link to="/app/user/$id" params={{ id: photo.user_id }} className="shrink-0">
            <div className="p-[2px] rounded-full" style={{ background: "var(--gradient-sunset)" }}>
              <div className="p-[2px] rounded-full bg-background">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={handle} className="size-9 rounded-full object-cover" />
                ) : (
                  <div className="size-9 rounded-full bg-foreground/10 flex items-center justify-center text-xs uppercase" style={archivo}>
                    {handle[0]?.toUpperCase()}
                  </div>
                )}
              </div>
            </div>
          </Link>
          <div className="flex-1 min-w-0 leading-tight">
            <Link to="/app/user/$id" params={{ id: photo.user_id }} className="text-[14px] font-semibold truncate block">{handle}</Link>
            {venue?.name && (
              <Link to="/app/venue/$id" params={{ id: venue.id }} className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                <span className="text-sunset-orange">📍</span>{venue.name}
              </Link>
            )}
          </div>
        </div>

        {/* Media */}
        <div className="relative bg-black">
          {isVideo ? (
            <video src={photo.photo_url} className="w-full aspect-square object-cover" playsInline controls preload="metadata" />
          ) : (
            <button type="button" onClick={() => setZoomOpen(true)} className="block w-full" aria-label="Mărește poza">
              <img src={photo.photo_url} alt={photo.caption ?? ""} className="w-full aspect-square object-cover" />
            </button>
          )}
        </div>
        {zoomOpen && !isVideo ? <PhotoZoom src={photo.photo_url} alt={photo.caption ?? ""} onClose={() => setZoomOpen(false)} /> : null}

        {/* Actions */}
        <div className="flex items-center gap-1 px-2 pt-2.5">
          <button onClick={toggleLike} aria-label="Apreciază" className="size-10 flex items-center justify-center active:scale-90 transition">
            <svg viewBox="0 0 24 24" className={`size-7 ${isLiked ? "fill-sunset-orange stroke-sunset-orange" : "fill-none stroke-foreground"}`} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z"/></svg>
          </button>
          <button aria-label="Comentează" className="size-10 flex items-center justify-center" onClick={() => {
            const el = document.getElementById("comment-input");
            el?.focus();
          }}>
            <svg viewBox="0 0 24 24" className="size-7 fill-none stroke-foreground" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12z"/></svg>
          </button>
          <button onClick={toggleRepost} aria-label="Repost" className={`ml-auto size-10 flex items-center justify-center active:scale-90 transition ${isReposted ? "text-sunset-amber" : "text-foreground"}`}>
            <svg viewBox="0 0 24 24" className="size-6 fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
          </button>
        </div>

        {/* Counters row */}
        <div className="px-4 pt-1.5 flex items-center gap-4 text-[12px] text-muted-foreground" style={archivo}>
          <span className="uppercase tracking-[0.14em]"><span className="text-foreground">{formatCount(likes)}</span> aprecieri</span>
          <span className="uppercase tracking-[0.14em]"><span className="text-foreground">{formatCount(commentsCount)}</span> coment.</span>
          <span className="uppercase tracking-[0.14em]"><span className="text-foreground">{formatCount(reposts)}</span> reposturi</span>
        </div>

        {/* Caption */}
        {photo.caption && (
          <div className="px-4 pt-2 text-[14px] leading-snug">
            <Link to="/app/user/$id" params={{ id: photo.user_id }} className="font-semibold mr-1.5">{handle}</Link>
            <span className="text-foreground/90">{photo.caption}</span>
          </div>
        )}

        <div className="px-4 pt-1 pb-3.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground" style={archivo}>
          acum {timeAgo(photo.taken_at)}
        </div>
      </article>

      {/* Comments */}
      <section className="px-4 pt-6">
        <h2 className="uppercase text-[12px] tracking-[0.18em] text-muted-foreground pb-3" style={archivo}>
          Comentarii ({commentsCount})
        </h2>
        {!comments ? (
          <div className="text-xs text-muted-foreground">Se încarcă…</div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <div className="text-3xl mb-1">💬</div>
            Niciun comentariu. Fii primul.
          </div>
        ) : (
          <div className="space-y-3">
            {comments.map((c: any) => (
              <div key={c.id} className="flex items-start gap-3">
                {c.profile?.avatar_url ? (
                  <img src={c.profile.avatar_url} alt="" className="size-9 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="size-9 rounded-full bg-foreground/10 shrink-0 grid place-items-center text-xs uppercase" style={archivo}>
                    {(c.profile?.display_name ?? "?")[0]?.toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[13px] font-semibold truncate">{c.profile?.display_name ?? c.profile?.handle ?? "Anonim"}</span>
                    <span className="text-[9px] uppercase tracking-widest text-muted-foreground" style={archivo}>{timeAgo(c.created_at)}</span>
                  </div>
                  <p className="text-[14px] leading-snug whitespace-pre-wrap break-words">{c.body}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Comment input */}
      <div className="sticky bottom-0 mt-6 px-3 pb-3 bg-background/90 backdrop-blur-xl border-t border-foreground/10 pt-3 flex items-end gap-2"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 5.5rem)" }}
      >
        <textarea
          id="comment-input"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Scrie un comentariu…"
          rows={1}
          maxLength={500}
          className="flex-1 resize-none p-2.5 rounded-xl bg-foreground/[0.05] border border-foreground/10 text-[14px]"
        />
        <button
          onClick={submitComment}
          disabled={sending || !body.trim()}
          className="shrink-0 uppercase text-[11px] tracking-widest px-4 py-2.5 rounded-xl text-white disabled:opacity-40"
          style={{ ...archivo, background: "var(--gradient-sunset)" }}
        >
          Trimite
        </button>
      </div>
    </div>
  );
}

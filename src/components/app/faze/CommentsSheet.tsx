import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Moment, archivo, hind, SHEET_BOTTOM, timeAgo } from "./shared";

export function CommentsSheet({ photo, onClose }: { photo: Moment; onClose: () => void }) {
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
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-end" onClick={onClose} style={hind}>
      <div
        className="w-full bg-background border-t border-foreground/10 rounded-t-3xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: `calc(85dvh - ${SHEET_BOTTOM})`, marginBottom: SHEET_BOTTOM }}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-foreground/10">
          <div className="uppercase text-sm tracking-[0.16em]" style={archivo}>Comentarii</div>
          <button onClick={onClose} className="text-muted-foreground text-2xl leading-none w-8 h-8 grid place-items-center">×</button>
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
            className="flex-1 resize-none p-2.5 rounded-xl bg-foreground/[0.05] border border-foreground/10 text-[14px]"
          />
          <button
            onClick={submit}
            disabled={sending || !body.trim()}
            className="shrink-0 uppercase text-[11px] tracking-widest px-4 py-2.5 rounded-xl text-white disabled:opacity-40"
            style={{ ...archivo, background: "var(--gradient-sunset)" }}
          >
            Trimite
          </button>
        </div>
      </div>
    </div>
  );
}

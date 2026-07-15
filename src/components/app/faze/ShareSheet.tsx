import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { openOrCreateDM } from "@/lib/chat";
import { Moment, archivo, hind, SHEET_BOTTOM } from "./shared";

export function ShareSheet({ photo, onClose }: { photo: Moment; onClose: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sending, setSending] = useState<string | null>(null);

  const { data: friends, isLoading } = useQuery({
    queryKey: ["mutual-friends", user?.id ?? null],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      const [{ data: iFollow }, { data: followMe }] = await Promise.all([
        supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id)
          .eq("status", "accepted"),
        supabase
          .from("follows")
          .select("follower_id")
          .eq("following_id", user.id)
          .eq("status", "accepted"),
      ]);
      const iFollowSet = new Set(
        ((iFollow ?? []) as { following_id: string }[]).map((r) => r.following_id),
      );
      const mutualIds = ((followMe ?? []) as { follower_id: string }[])
        .map((r) => r.follower_id)
        .filter((id) => iFollowSet.has(id));
      if (!mutualIds.length) return [];
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, handle, display_name, avatar_url")
        .in("id", mutualIds);
      return profs ?? [];
    },
  });

  async function send(friendId: string) {
    if (!user) return;
    setSending(friendId);
    try {
      const { guardRateLimit } = await import("@/lib/rateLimit");
      if (!(await guardRateLimit("message")))
        throw new Error("Trimiți prea repede. Așteaptă puțin.");
      const convId = await openOrCreateDM(user.id, friendId);
      const body = `📸 Fază OXI: ${photo.photo_url}${photo.caption ? `\n${photo.caption}` : ""}`;
      const { error } = await supabase.from("messages").insert({
        conversation_id: convId,
        sender_id: user.id,
        body,
      });
      if (error) throw error;
      toast.success("Trimis!");
      onClose();
      setTimeout(() => navigate({ to: "/app/chat/$id", params: { id: convId } }), 200);
    } catch (e) {
      const { prettifyAntiSpamError } = await import("@/lib/antispam");
      toast.error(prettifyAntiSpamError(e) || "Eroare la trimitere");
    } finally {
      setSending(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/80 flex items-end"
      onClick={onClose}
      style={hind}
    >
      <div
        className="w-full bg-background border-t border-foreground/10 rounded-t-3xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: `calc(85dvh - ${SHEET_BOTTOM})`, paddingBottom: SHEET_BOTTOM }}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-foreground/10">
          <div className="uppercase text-sm tracking-[0.16em]" style={archivo}>
            Trimite la prieteni
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground text-2xl leading-none w-8 h-8 grid place-items-center"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          {isLoading ? (
            <div className="px-4 py-6 text-sm text-muted-foreground">Se încarcă prietenii…</div>
          ) : !friends || friends.length === 0 ? (
            <div className="text-center py-10 px-6 space-y-2">
              <div className="text-4xl">🤝</div>
              <div className="uppercase text-sm" style={archivo}>
                Niciun prieten reciproc
              </div>
              <p className="text-xs text-muted-foreground">
                Urmărește pe cineva care te urmărește și pe tine ca să poți trimite faze.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-foreground/5">
              {(
                friends as Array<{
                  id: string;
                  handle: string | null;
                  display_name: string | null;
                  avatar_url: string | null;
                }>
              ).map((f) => {
                const name = f.display_name ?? f.handle ?? "anonim";
                const initial = (name[0] ?? "?").toUpperCase();
                const isSending = sending === f.id;
                return (
                  <li key={f.id} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="shrink-0">
                      {f.avatar_url ? (
                        <img
                          src={f.avatar_url}
                          alt={name}
                          className="size-11 rounded-full object-cover"
                        />
                      ) : (
                        <div
                          className="size-11 rounded-full bg-foreground/10 grid place-items-center text-sm uppercase"
                          style={archivo}
                        >
                          {initial}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-semibold truncate">{name}</div>
                      {f.handle && (
                        <div className="text-[11px] text-muted-foreground truncate">
                          @{f.handle}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => send(f.id)}
                      disabled={isSending}
                      className="shrink-0 uppercase text-[11px] tracking-[0.14em] px-4 py-2 rounded-full text-white disabled:opacity-50 active:scale-95 transition"
                      style={{ ...archivo, background: "var(--gradient-sunset)" }}
                    >
                      {isSending ? "..." : "Trimite"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

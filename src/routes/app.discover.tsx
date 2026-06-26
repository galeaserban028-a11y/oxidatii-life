import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/app/discover")({
  head: () => ({ meta: [{ title: "Caută oameni · OXIDAȚII" }] }),
  component: DiscoverPage,
});

type Profile = {
  id: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
  rank: string | null;
  aura: number | null;
};

function DiscoverPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  const { data: following } = useQuery({
    queryKey: ["my-following-ids", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("follows")
        .select("following_id,status")
        .eq("follower_id", user!.id);
      return new Map((data ?? []).map((r: any) => [r.following_id as string, r.status as string]));
    },
  });

  const { data: results, isFetching } = useQuery({
    queryKey: ["discover-search", q],
    enabled: !!user && q.trim().length >= 2,
    queryFn: async (): Promise<Profile[]> => {
      const term = q.trim().toLowerCase().replace(/^@/, "");
      const { data } = await supabase
        .from("profiles")
        .select("id, handle, display_name, avatar_url, rank, aura")
        .or(`handle.ilike.%${term}%,display_name.ilike.%${term}%`)
        .neq("id", user!.id)
        .limit(20);
      return (data ?? []) as Profile[];
    },
  });

  const { data: suggestions } = useQuery({
    queryKey: ["discover-suggestions", user?.id],
    enabled: !!user && q.trim().length < 2,
    queryFn: async (): Promise<Profile[]> => {
      // Premium/boost state is private to each user now (no longer readable
      // cross-user), so suggestions sort purely by public aura.
      const { data } = await supabase
        .from("profiles")
        .select("id, handle, display_name, avatar_url, rank, aura")
        .eq("is_public", true)
        .neq("id", user!.id)
        .order("aura", { ascending: false })
        .limit(30);
      return (data ?? []) as Profile[];
    },
  });

  async function doFollow(id: string) {
    if (!user) return;
    const { error } = await supabase
      .from("follows")
      .insert({ follower_id: user.id, following_id: id });
    if (error) {
      toast.error(error.code === "23505" ? "Deja urmărești." : error.message);
      return;
    }
    toast.success("Urmărit.");
    qc.invalidateQueries({ queryKey: ["my-following-ids", user.id] });
    qc.invalidateQueries({ queryKey: ["follow-stats"] });
  }

  async function doUnfollow(id: string) {
    if (!user) return;
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("following_id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["my-following-ids", user.id] });
    qc.invalidateQueries({ queryKey: ["follow-stats"] });
  }

  if (!user) {
    return (
      <div className="px-4 pt-6 pb-4 text-center space-y-3">
        <p className="text-sm text-muted-foreground">Fă-ți cont ca să cauți oameni.</p>
        <Link
          to="/signup"
          className="inline-block font-display uppercase text-sm tracking-widest px-5 py-3 rounded-md text-white"
          style={{ background: "var(--gradient-chaos)" }}
        >
          Cont nou
        </Link>
      </div>
    );
  }

  const list = q.trim().length >= 2 ? (results ?? []) : (suggestions ?? []);

  return (
    <div className="px-5 pt-8 pb-8 space-y-7">
      <header className="space-y-3">
        <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">caută oameni</div>
        <h1 className="font-display uppercase text-3xl leading-[0.95]">Găsește lumea.</h1>
        <p className="text-xs text-zinc-500">Caută după @handle sau nume și dă-le follow.</p>
      </header>

      <div className="relative">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="@handle sau nume..."
          className="w-full p-3.5 pl-11 rounded-2xl bg-zinc-900/30 border border-white/5 text-sm focus:outline-none focus:border-neon-purple/40 transition-colors backdrop-blur"
        />
        <svg
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </div>

      {q.trim().length < 2 && (
        <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 pt-2">
          sugestii populare
        </div>
      )}

      {isFetching && q.trim().length >= 2 ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-foreground/[0.04] animate-pulse" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground py-8">
          {q.trim().length >= 2 ? `Niciun rezultat pentru "${q.trim()}"` : "Nimeni încă."}
        </div>
      ) : (
        <div className="space-y-1 rounded-xl border border-foreground/10 overflow-hidden">
          {list.map((p) => {
            const status = following?.get(p.id);
            const isFollowing = status === "accepted";
            const isPending = status === "pending";
            return (
              <div key={p.id} className="flex items-center gap-3 p-3 bg-foreground/[0.03]">
                <Link to="/app/user/$id" params={{ id: p.id }} className="shrink-0">
                  {p.avatar_url ? (
                    <img
                      src={p.avatar_url}
                      alt=""
                      className="w-11 h-11 rounded-full object-cover border border-foreground/15"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-neon-crimson to-neon-purple flex items-center justify-center text-white font-display">
                      {(p.handle ?? p.display_name ?? "?")[0]?.toUpperCase()}
                    </div>
                  )}
                </Link>
                <Link to="/app/user/$id" params={{ id: p.id }} className="flex-1 min-w-0">
                  <div className="font-display text-sm truncate flex items-center gap-1.5">
                    {p.display_name ?? `@${p.handle ?? "—"}`}
                  </div>

                  {p.display_name && p.handle && (
                    <div className="font-mono text-[10px] text-muted-foreground truncate">
                      @{p.handle}
                    </div>
                  )}
                  <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mt-0.5">
                    {p.rank} · aură {p.aura ?? 0}
                  </div>
                </Link>
                {isFollowing ? (
                  <button
                    onClick={() => doUnfollow(p.id)}
                    className="font-display uppercase text-[10px] tracking-widest px-3 py-2 rounded-lg border border-foreground/20 text-foreground/70 active:scale-95 transition-transform"
                  >
                    urmărești
                  </button>
                ) : isPending ? (
                  <span className="font-mono text-[9px] uppercase text-muted-foreground px-2">
                    cerere trimisă
                  </span>
                ) : (
                  <button
                    onClick={() => doFollow(p.id)}
                    className="font-display uppercase text-[10px] tracking-widest px-4 py-2 rounded-lg text-white active:scale-95 transition-transform"
                    style={{ background: "var(--gradient-chaos)" }}
                  >
                    + follow
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

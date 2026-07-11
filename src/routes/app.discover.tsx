import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { MapPin, RefreshCw, UserPlus, X, Sparkles } from "lucide-react";

const PYMK_DISMISS_KEY = "oxi:pymk:dismissed";
function loadDismissed(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(PYMK_DISMISS_KEY) || "[]"));
  } catch {
    return new Set();
  }
}
function saveDismissed(s: Set<string>) {
  try { localStorage.setItem(PYMK_DISMISS_KEY, JSON.stringify([...s])); } catch {}
}


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
      const rows = (data ?? []) as Array<{ following_id: string; status: string }>;
      return new Map(rows.map((r) => [r.following_id, r.status]));
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

  const [dismissed, setDismissed] = useState<Set<string>>(() => loadDismissed());
  useEffect(() => { saveDismissed(dismissed); }, [dismissed]);

  const { data: pymk, refetch: refetchPymk, isFetching: pymkLoading } = useQuery({
    queryKey: ["pymk", user?.id],
    enabled: !!user && q.trim().length < 2,
    queryFn: async (): Promise<(Profile & { common_venues: number; city_name: string | null; last_seen_at: string | null })[]> => {
      const { data } = await supabase.rpc("get_people_you_may_know", { p_limit: 16 });
      return (data ?? []) as (Profile & { common_venues: number; city_name: string | null; last_seen_at: string | null })[];
    },
    staleTime: 5 * 60_000,
  });

  function dismissPymk(id: string) {
    setDismissed((s) => new Set(s).add(id));
  }


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

      {q.trim().length < 2 && (() => {
        const visible = (pymk ?? []).filter((p) => !dismissed.has(p.id));
        if (visible.length === 0) return null;
        return (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 flex items-center gap-1.5">
                <Sparkles size={11} className="text-amber-400/70" />
                persoane pe care le-ai putea cunoaște
              </div>
              <button
                onClick={() => refetchPymk()}
                className="text-zinc-500 hover:text-zinc-300 active:scale-90 transition p-1"
                aria-label="reîmprospătează"
              >
                <RefreshCw size={13} className={pymkLoading ? "animate-spin" : ""} />
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto -mx-5 px-5 pb-2 snap-x scrollbar-none">
              {visible.map((p) => {
                const status = following?.get(p.id);
                const isFollowing = status === "accepted" || status === "pending";
                return (
                  <div
                    key={p.id}
                    className="snap-start shrink-0 w-36 relative rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900/70 to-zinc-950/40 p-3 backdrop-blur-md overflow-hidden group"
                  >
                    {/* Subtle aura */}
                    <div className="absolute -top-8 -right-8 size-20 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

                    {/* Dismiss */}
                    <button
                      onClick={(e) => { e.stopPropagation(); dismissPymk(p.id); }}
                      className="absolute top-1.5 right-1.5 size-6 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-black/60 z-10"
                      aria-label="ascunde sugestia"
                    >
                      <X size={11} />
                    </button>

                    <Link
                      to="/app/user/$id"
                      params={{ id: p.id }}
                      className="block text-center"
                    >
                      <div className="relative mx-auto w-fit">
                        {p.avatar_url ? (
                          <img src={p.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-white/15" />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-neon-crimson to-neon-purple flex items-center justify-center text-white font-display text-xl">
                            {(p.handle ?? p.display_name ?? "?")[0]?.toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="font-display text-xs mt-2 truncate">
                        {p.display_name ?? `@${p.handle ?? "—"}`}
                      </div>
                      {p.handle && p.display_name && (
                        <div className="font-mono text-[9px] text-zinc-500 truncate">@{p.handle}</div>
                      )}
                      {p.city_name && (
                        <div className="flex items-center justify-center gap-0.5 text-[9px] text-zinc-400 mt-1">
                          <MapPin size={8} /> {p.city_name}
                        </div>
                      )}
                      <div className="mt-1.5 font-mono text-[9px] uppercase tracking-widest text-amber-300/90">
                        {p.common_venues} loc{p.common_venues === 1 ? "" : "uri"} comun{p.common_venues === 1 ? "" : "e"}
                      </div>
                    </Link>

                    <button
                      onClick={() => isFollowing ? doUnfollow(p.id) : doFollow(p.id)}
                      disabled={isFollowing}
                      className={`mt-2.5 w-full py-1.5 rounded-lg font-display uppercase text-[10px] tracking-widest flex items-center justify-center gap-1 transition ${
                        isFollowing
                          ? "bg-zinc-800 text-zinc-400 border border-white/5"
                          : "bg-gradient-to-r from-neon-crimson to-neon-purple text-white active:scale-[0.97] shadow-[0_4px_14px_-4px_rgba(255,61,139,0.5)]"
                      }`}
                    >
                      {!isFollowing && <UserPlus size={10} strokeWidth={2.6} />}
                      {status === "pending" ? "trimis" : isFollowing ? "urmărești" : "follow"}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })()}


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

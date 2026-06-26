import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

const searchSchema = z.object({
  tab: z.enum(["followers", "following"]).catch("followers"),
});

export const Route = createFileRoute("/app/followers")({
  head: () => ({ meta: [{ title: "Urmăritori · OXIDAȚII" }] }),
  validateSearch: searchSchema,
  component: FollowersPage,
});

type Row = {
  id: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
  rank: string | null;
};

async function loadList(userId: string, tab: "followers" | "following"): Promise<Row[]> {
  const col = tab === "followers" ? "following_id" : "follower_id";
  const pickCol = tab === "followers" ? "follower_id" : "following_id";
  const { data: rows } = await supabase
    .from("follows")
    .select(`id, ${pickCol}, created_at`)
    .eq(col, userId)
    .eq("status", "accepted")
    .order("created_at", { ascending: false });
  const ids = (rows ?? []).map((r: any) => r[pickCol]);
  if (ids.length === 0) return [];
  const { data: profs } = await supabase
    .from("profiles")
    .select("id, handle, display_name, avatar_url, rank")
    .in("id", ids);
  const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
  return ids.map((id) => map.get(id)).filter(Boolean) as Row[];
}

function FollowersPage() {
  const { user } = useAuth();
  const { tab } = useSearch({ from: "/app/followers" });

  const { data, isLoading } = useQuery({
    queryKey: ["follow-list", user?.id, tab],
    enabled: !!user,
    queryFn: () => loadList(user!.id, tab),
  });

  if (!user) {
    return (
      <div className="px-4 pt-6 text-center text-sm text-muted-foreground">
        Fă-ți cont ca să vezi lista.
      </div>
    );
  }

  return (
    <div className="px-5 pt-8 pb-24 space-y-7">
      <header className="space-y-3">
        <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">conexiuni</div>
        <h1 className="font-display uppercase text-3xl leading-[0.95]">
          {tab === "followers" ? "Urmăritorii tăi." : "Urmărești."}
        </h1>
      </header>

      <div className="grid grid-cols-2 gap-2 text-[11px] font-bold uppercase tracking-wider">
        <Link
          to="/app/followers"
          search={{ tab: "followers" }}
          className={`text-center py-2.5 rounded-2xl border transition ${
            tab === "followers"
              ? "bg-neon-crimson text-background border-neon-crimson"
              : "bg-zinc-900/30 border-white/5 text-zinc-400 hover:bg-zinc-800/40"
          }`}
        >
          Followers
        </Link>
        <Link
          to="/app/followers"
          search={{ tab: "following" }}
          className={`text-center py-2.5 rounded-2xl border transition ${
            tab === "following"
              ? "bg-neon-purple text-background border-neon-purple"
              : "bg-zinc-900/30 border-white/5 text-zinc-400 hover:bg-zinc-800/40"
          }`}
        >
          Urmărești
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-foreground/[0.04] animate-pulse" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-foreground/15 p-8 text-center space-y-2">
          <div className="text-4xl opacity-40">👥</div>
          <p className="text-sm text-muted-foreground">
            {tab === "followers" ? "Nimeni nu te urmărește încă." : "Nu urmărești pe nimeni încă."}
          </p>
          <Link
            to="/app/friends"
            className="inline-block font-mono text-[10px] uppercase tracking-widest px-4 py-2 rounded-md border border-foreground/20 hover:border-neon-crimson mt-2"
          >
            caută oameni →
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {data.map((p) => (
            <li key={p.id}>
              <Link
                to="/app/user/$id"
                params={{ id: p.id }}
                className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-900/30 border border-white/5 backdrop-blur hover:bg-zinc-800/40 active:scale-[0.99] transition"
              >
                <div className="h-11 w-11 rounded-full bg-foreground/10 overflow-hidden flex items-center justify-center shrink-0">
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="font-display text-sm text-zinc-400">
                      {(p.handle ?? p.display_name ?? "?").slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-sm truncate">
                    @{p.handle ?? p.display_name ?? "anonim"}
                  </div>
                  <div className="text-[9px] uppercase tracking-[0.2em] text-zinc-500 mt-0.5">
                    {p.rank ?? "MDS"}
                  </div>
                </div>
                <span className="text-[10px] uppercase tracking-wider text-zinc-500">→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

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
    <div className="px-4 pt-5 pb-24 space-y-4">
      <header>
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-neon-green">
          // CONEXIUNI
        </div>
        <h1 className="font-display uppercase text-2xl mt-1 leading-none">
          {tab === "followers" ? "Urmăritorii tăi" : "Urmărești"}
        </h1>
      </header>

      <div className="grid grid-cols-2 gap-2">
        <Link
          to="/app/followers"
          search={{ tab: "followers" }}
          className={`text-center py-2.5 rounded-xl border font-display uppercase text-xs tracking-widest ${
            tab === "followers"
              ? "border-neon-crimson/50 bg-neon-crimson/10 text-neon-crimson"
              : "border-foreground/10 text-muted-foreground"
          }`}
        >
          Followers
        </Link>
        <Link
          to="/app/followers"
          search={{ tab: "following" }}
          className={`text-center py-2.5 rounded-xl border font-display uppercase text-xs tracking-widest ${
            tab === "following"
              ? "border-neon-purple/50 bg-neon-purple/10 text-neon-purple"
              : "border-foreground/10 text-muted-foreground"
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
            {tab === "followers"
              ? "Nimeni nu te urmărește încă."
              : "Nu urmărești pe nimeni încă."}
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
                className="flex items-center gap-3 p-3 rounded-xl bg-foreground/[0.04] border border-foreground/10 hover:border-neon-crimson/40 transition"
              >
                <div className="h-11 w-11 rounded-full bg-foreground/10 overflow-hidden flex items-center justify-center shrink-0">
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="font-display text-sm text-muted-foreground">
                      {(p.handle ?? p.display_name ?? "?").slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-sm truncate">
                    @{p.handle ?? p.display_name ?? "anonim"}
                  </div>
                  <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                    {p.rank ?? "MDS"}
                  </div>
                </div>
                <span className="font-mono text-[10px] uppercase text-muted-foreground">→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

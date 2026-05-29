import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, X, UserPlus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useIncomingFollowRequests, useRequestActions } from "@/lib/follows";

export const Route = createFileRoute("/app/requests")({
  head: () => ({ meta: [{ title: "Cereri · OXIDAȚII" }] }),
  component: RequestsPage,
});

function RequestsPage() {
  const { user } = useAuth();
  const { data: reqs, isLoading } = useIncomingFollowRequests(user?.id);
  const { accept, reject } = useRequestActions(user?.id);

  if (!user) {
    return (
      <div className="px-4 pt-6 text-center text-sm text-muted-foreground">
        Fă-ți cont ca să vezi cererile.
      </div>
    );
  }

  return (
    <div className="px-5 pt-5 pb-10 max-w-xl mx-auto space-y-4">
      <div>
        <h1 className="font-display uppercase text-2xl leading-none">Cereri de urmărire</h1>
        <p className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mt-1">
          oameni care vor să-ți vadă șprițurile
        </p>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Se încarcă...</div>
      ) : !reqs || reqs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-foreground/15 p-8 text-center space-y-2">
          <UserPlus className="mx-auto opacity-50" />
          <div className="font-display uppercase">Nicio cerere.</div>
          <p className="text-xs text-muted-foreground">Când cineva îți trimite request, apare aici.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {reqs.map((r) => {
            const handle = r.follower?.handle ?? r.follower?.display_name ?? "anonim";
            return (
              <li
                key={r.id}
                className="flex items-center gap-3 p-3 rounded-2xl border border-border bg-card"
              >
                <Link
                  to="/app/user/$id"
                  params={{ id: r.follower?.id ?? r.follower_id }}
                  className="h-11 w-11 rounded-full overflow-hidden bg-gradient-to-br from-neon-crimson to-neon-purple flex items-center justify-center text-white font-display font-bold shrink-0"
                >
                  {r.follower?.avatar_url ? (
                    <img src={r.follower.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    handle[0]?.toUpperCase()
                  )}
                </Link>
                <Link
                  to="/app/user/$id"
                  params={{ id: r.follower?.id ?? r.follower_id }}
                  className="flex-1 min-w-0"
                >
                  <div className="font-display font-semibold truncate">@{handle}</div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                    vrea să te urmărească
                  </div>
                </Link>
                <button
                  onClick={() => accept.mutate(r.id)}
                  disabled={accept.isPending}
                  className="h-9 w-9 rounded-full bg-neon-green text-background flex items-center justify-center active:scale-95 transition disabled:opacity-40"
                  aria-label="Acceptă"
                >
                  <Check size={18} strokeWidth={3} />
                </button>
                <button
                  onClick={() => reject.mutate(r.id)}
                  disabled={reject.isPending}
                  className="h-9 w-9 rounded-full border border-foreground/20 text-foreground flex items-center justify-center active:scale-95 transition disabled:opacity-40"
                  aria-label="Respinge"
                >
                  <X size={18} strokeWidth={2.6} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

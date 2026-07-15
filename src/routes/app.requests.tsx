import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, X, UserPlus, Search, ArrowDownUp } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useIncomingFollowRequests, useRequestActions } from "@/lib/follows";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/app/requests")({
  head: () => ({ meta: [{ title: "Cereri · OXIDAȚII" }] }),
  component: RequestsPage,
});

type SortOrder = "newest" | "oldest";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "acum";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}z`;
}

function RequestsPage() {
  const { user } = useAuth();
  const { data: reqs, isLoading } = useIncomingFollowRequests(user?.id);
  const { accept, reject } = useRequestActions(user?.id);

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOrder>("newest");
  const [confirm, setConfirm] = useState<{
    id: string;
    action: "accept" | "reject";
    name: string;
  } | null>(null);

  const filtered = useMemo(() => {
    if (!reqs) return [];
    const q = query.trim().toLowerCase();
    const list = q
      ? reqs.filter((r) => {
          const h = (r.follower?.handle ?? "").toLowerCase();
          const n = (r.follower?.display_name ?? "").toLowerCase();
          return h.includes(q) || n.includes(q);
        })
      : reqs.slice();
    list.sort((a, b) => {
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      return sort === "newest" ? tb - ta : ta - tb;
    });
    return list;
  }, [reqs, query, sort]);

  if (!user) {
    return (
      <div className="px-4 pt-6 text-center text-sm text-muted-foreground">
        Fă-ți cont ca să vezi cererile.
      </div>
    );
  }

  return (
    <div className="px-5 pt-8 pb-12 max-w-xl mx-auto space-y-7">
      <header className="space-y-3">
        <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">activitate</div>
        <h1 className="font-display uppercase text-3xl leading-[0.95]">Cereri de urmărire.</h1>
        <p className="text-xs text-zinc-500">
          {reqs?.length ?? 0} {reqs?.length === 1 ? "cerere" : "cereri"} în așteptare
        </p>
      </header>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="caută după @handle sau nume"
            className="w-full h-11 pl-10 pr-3 rounded-2xl bg-zinc-900/30 border border-white/5 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-neon-crimson/40"
          />
        </div>
        <button
          onClick={() => setSort((s) => (s === "newest" ? "oldest" : "newest"))}
          className="h-11 px-3 rounded-2xl bg-zinc-900/30 border border-white/5 flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold active:scale-95 transition"
          aria-label="Schimbă sortarea"
        >
          <ArrowDownUp size={13} />
          {sort === "newest" ? "noi" : "vechi"}
        </button>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Se încarcă...</div>
      ) : !reqs || reqs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-foreground/15 p-8 text-center space-y-2">
          <UserPlus className="mx-auto opacity-50" />
          <div className="font-display uppercase">Nicio cerere.</div>
          <p className="text-xs text-muted-foreground">
            Când cineva îți trimite request, apare aici.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-foreground/15 p-6 text-center text-sm text-muted-foreground">
          Niciun rezultat pentru „{query}".
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((r) => {
            const handle = r.follower?.handle ?? r.follower?.display_name ?? "anonim";
            return (
              <li
                key={r.id}
                className="flex items-center gap-3 p-3 rounded-2xl border border-white/5 bg-zinc-900/30"
              >
                <Link
                  to="/app/user/$id"
                  params={{ id: r.follower?.id ?? r.follower_id }}
                  className="h-11 w-11 rounded-full overflow-hidden bg-gradient-to-br from-neon-crimson to-neon-purple flex items-center justify-center text-white font-display font-bold shrink-0"
                >
                  {r.follower?.avatar_url ? (
                    <img
                      src={r.follower.avatar_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
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
                    vrea să te urmărească · {timeAgo(r.created_at)}
                  </div>
                </Link>
                <button
                  onClick={() => setConfirm({ id: r.id, action: "accept", name: handle })}
                  disabled={accept.isPending || reject.isPending}
                  className="h-9 w-9 rounded-full bg-neon-green text-background flex items-center justify-center active:scale-95 transition disabled:opacity-40"
                  aria-label="Acceptă"
                >
                  <Check size={18} strokeWidth={3} />
                </button>
                <button
                  onClick={() => setConfirm({ id: r.id, action: "reject", name: handle })}
                  disabled={accept.isPending || reject.isPending}
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

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.action === "accept" ? "Acceptă cererea?" : "Respinge cererea?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.action === "accept"
                ? `@${confirm?.name} va putea să-ți vadă șprițurile și profilul.`
                : `@${confirm?.name} nu va fi notificat că ai respins, dar va trebui să trimită cerere din nou.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!confirm) return;
                if (confirm.action === "accept") accept.mutate(confirm.id);
                else reject.mutate(confirm.id);
                setConfirm(null);
              }}
              className={
                confirm?.action === "accept"
                  ? "bg-neon-green text-background hover:bg-neon-green/90"
                  : "bg-neon-crimson text-white hover:bg-neon-crimson/90"
              }
            >
              {confirm?.action === "accept" ? "Acceptă" : "Respinge"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

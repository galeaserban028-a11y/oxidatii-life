import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Lock, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useEntitlements } from "@/lib/entitlements";

export const Route = createFileRoute("/app/me_/raters")({
  head: () => ({ meta: [{ title: "Cine ți-a dat rating · OXIDAȚII" }] }),
  component: RatersPage,
});

function RatersPage() {
  const { user } = useAuth();
  const { isVipPlus: allowed } = useEntitlements();

  type RaterProfile = { id: string; handle: string | null; display_name: string | null; avatar_url: string | null };
  type RatingRow = { id: string; value: number; category: string; created_at: string; rater_id: string };

  const { data, isLoading } = useQuery({
    queryKey: ["my-raters", user?.id],
    enabled: !!user && allowed,
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("user_ratings")
        .select("id, value, category, created_at, rater_id")
        .eq("rated_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(200);
      const rowsTyped = (rows ?? []) as RatingRow[];
      const ids = Array.from(new Set(rowsTyped.map((r) => r.rater_id)));
      if (!ids.length) return [] as Array<RatingRow & { rater: RaterProfile | undefined }>;
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, handle, display_name, avatar_url")
        .in("id", ids);
      const profsTyped = (profs ?? []) as RaterProfile[];
      const map = new Map(profsTyped.map((p) => [p.id, p]));
      return rowsTyped.map((r) => ({ ...r, rater: map.get(r.rater_id) }));
    },
  });

  return (
    <div className="pb-24 min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-xl border-b border-white/5 px-5 h-14 flex items-center gap-3">
        <Link
          to="/app/me"
          className="h-9 w-9 -ml-1.5 rounded-xl bg-zinc-900/30 border border-white/5 flex items-center justify-center active:scale-95 transition"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">
          Cine ți-a dat rating
        </div>
      </header>

      {!allowed ? (
        <div className="px-6 pt-16 text-center">
          <Lock className="mx-auto mb-4 text-muted-foreground" size={40} />
          <h2 className="font-display text-2xl mb-2">Doar pentru VIP+</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Vezi cine ți-a dat rating cu un abonament VIP+ sau mai sus.
          </p>
          <Link
            to="/app/premium"
            className="inline-block px-5 py-3 rounded-full bg-foreground text-background text-sm font-medium"
          >
            Vezi membership
          </Link>
        </div>
      ) : isLoading ? (
        <div className="p-6 text-center text-muted-foreground text-sm">Se încarcă…</div>
      ) : !data || data.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground text-sm">
          Nimeni nu te-a evaluat încă.
        </div>
      ) : (
        <ul className="divide-y divide-foreground/10">
          {data.map((r) => {
            const p = r.rater;
            if (!p) return null;
            return (
              <li key={r.id}>
                <Link
                  to="/app/user/$id"
                  params={{ id: p.id }}
                  className="flex items-center gap-3 px-4 py-3 active:bg-foreground/5"
                >
                  {p?.avatar_url ? (
                    <img
                      src={p.avatar_url}
                      alt=""
                      className="w-11 h-11 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-foreground/10" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {p?.display_name ?? p?.handle ?? "anonim"}
                    </div>
                    <div className="text-xs text-muted-foreground capitalize">{r.category}</div>
                  </div>
                  <div className="flex items-center gap-1 text-amber-400">
                    <Star size={14} className="fill-current" />
                    <span className="font-mono text-sm">{r.value}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

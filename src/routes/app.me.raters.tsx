import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Lock, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/me/raters")({
  head: () => ({ meta: [{ title: "Cine ți-a dat rating · OXIDAȚII" }] }),
  component: RatersPage,
});

const TIER_OK = new Set(["vip_plus", "pro", "elite"]);

function RatersPage() {
  const { user, profile } = useAuth();
  const tier = (profile as any)?.premium_tier as string | null;
  const allowed = !!tier && TIER_OK.has(tier);

  const { data, isLoading } = useQuery({
    queryKey: ["my-raters", user?.id],
    enabled: !!user && allowed,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_ratings")
        .select("id, value, category, created_at, rater:profiles!user_ratings_rater_id_fkey(id, handle, display_name, avatar_url)")
        .eq("rated_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(200);
      return data ?? [];
    },
  });

  return (
    <div className="pb-24 min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-xl border-b border-foreground/10 px-3 h-12 flex items-center gap-2">
        <Link to="/app/me" className="p-1.5 -ml-1.5"><ArrowLeft size={22} /></Link>
        <div className="font-mono uppercase text-[10px] tracking-[0.3em] text-muted-foreground">Cine ți-a dat rating</div>
      </header>

      {!allowed ? (
        <div className="px-6 pt-16 text-center">
          <Lock className="mx-auto mb-4 text-muted-foreground" size={40} />
          <h2 className="font-display text-2xl mb-2">Doar pentru VIP+</h2>
          <p className="text-sm text-muted-foreground mb-6">Vezi cine ți-a dat rating cu un abonament VIP+ sau mai sus.</p>
          <Link to="/app/premium" className="inline-block px-5 py-3 rounded-full bg-foreground text-background text-sm font-medium">
            Vezi membership
          </Link>
        </div>
      ) : isLoading ? (
        <div className="p-6 text-center text-muted-foreground text-sm">Se încarcă…</div>
      ) : !data || data.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground text-sm">Nimeni nu te-a evaluat încă.</div>
      ) : (
        <ul className="divide-y divide-foreground/10">
          {data.map((r: any) => {
            const p = r.rater;
            return (
              <li key={r.id}>
                <Link to="/app/user/$id" params={{ id: p?.id }} className="flex items-center gap-3 px-4 py-3 active:bg-foreground/5">
                  {p?.avatar_url ? (
                    <img src={p.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover" />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-foreground/10" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{p?.display_name ?? p?.handle ?? "anonim"}</div>
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

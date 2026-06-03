import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, BarChart3, Lock } from "lucide-react";

export const Route = createFileRoute("/app/me/reputation")({
  head: () => ({ meta: [{ title: "Reputation analytics · OXIDAȚII" }] }),
  component: ReputationAnalyticsPage,
});

const CAT_LABELS: Record<string, string> = {
  respect: "Respect",
  reliability: "Reliability",
  energy: "Energy",
  friendliness: "Friendliness",
  contribution: "Contribution",
  trust: "Trust",
};

const CATS = ["respect", "reliability", "energy", "friendliness", "contribution", "trust"];

function ReputationAnalyticsPage() {
  const { user, profile } = useAuth();
  const tier = profile?.premium_tier;
  const isPro = tier === "pro" || tier === "elite";

  const { data, isLoading } = useQuery({
    queryKey: ["my-reputation", user?.id],
    enabled: !!user && isPro,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_ratings")
        .select("category, value, created_at")
        .eq("rated_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  if (!user) return null;
  if (!isPro) {
    return (
      <div className="px-5 pt-8 pb-12 max-w-md mx-auto space-y-5 text-center">
        <Lock size={32} className="mx-auto text-muted-foreground" />
        <h1 className="font-display uppercase text-2xl">Reputation Analytics</h1>
        <p className="text-sm text-muted-foreground">Disponibil doar pentru Pro și Elite.</p>
        <Link to="/app/premium" className="inline-block px-6 h-11 leading-[44px] rounded-full bg-neon-purple text-white font-display uppercase text-xs tracking-widest">
          Vezi planurile
        </Link>
      </div>
    );
  }

  const ratings = data ?? [];
  const total = ratings.length;
  const avg = total === 0 ? 0 : ratings.reduce((s, r: any) => s + r.value, 0) / total;
  const byCategory = CATS.map((c) => {
    const list = ratings.filter((r: any) => r.category === c);
    const a = list.length === 0 ? 0 : list.reduce((s, r: any) => s + r.value, 0) / list.length;
    return { cat: c, count: list.length, avg: a };
  });

  const last30 = ratings.filter((r: any) => new Date(r.created_at) > new Date(Date.now() - 30 * 86400000));

  return (
    <div className="px-5 pt-5 pb-10 max-w-xl mx-auto space-y-5">
      <Link to="/app/me" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <ArrowLeft size={14} /> înapoi
      </Link>
      <header className="flex items-center gap-2">
        <BarChart3 size={20} className="text-neon-purple" />
        <h1 className="font-display uppercase text-2xl">Reputation</h1>
      </header>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Se încarcă...</div>
      ) : total === 0 ? (
        <div className="rounded-2xl border border-foreground/15 p-6 text-center text-sm text-muted-foreground">
          Nimeni nu te-a evaluat încă.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <Stat label="rating-uri" value={total} />
            <Stat label="medie" value={avg.toFixed(2)} />
            <Stat label="ultimele 30z" value={last30.length} />
          </div>

          <div className="rounded-2xl border border-foreground/15 overflow-hidden">
            {byCategory.map((c) => (
              <div key={c.cat} className="p-4 border-b border-foreground/10 last:border-b-0">
                <div className="flex items-baseline justify-between mb-1.5">
                  <div className="font-display uppercase text-sm">{CAT_LABELS[c.cat]}</div>
                  <div className="font-mono text-xs tabular-nums text-muted-foreground">
                    {c.count} · {c.avg.toFixed(2)}/5
                  </div>
                </div>
                <div className="h-2 rounded-full bg-foreground/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-neon-purple to-neon-crimson"
                    style={{ width: `${(c.avg / 5) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-foreground/5 p-3 text-center">
      <div className="font-display text-2xl tabular-nums">{value}</div>
      <div className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const RANK_LABELS: Record<string, string> = {
  ZEU_BALCANIC: "ZEU' BALCANIC 👑",
  REGELE_CENTRULUI: "REGELE CENTRULUI",
  BOIERUL_NOPTII: "BOIERUL NOPȚII",
  CAMATARU_DE_PAHAR: "CĂMĂTARU' DE PAHAR",
  SPRITARUL: "ȘPRIȚARUL",
  CRAI_DE_CARTIER: "CRAI DE CARTIER",
  MDS: "MDS",
};

const RANK_COLORS: Record<string, string> = {
  ZEU_BALCANIC: "var(--neon-crimson)",
  REGELE_CENTRULUI: "var(--neon-purple)",
  BOIERUL_NOPTII: "var(--neon-purple)",
  CAMATARU_DE_PAHAR: "var(--neon-green)",
  SPRITARUL: "var(--neon-blue)",
  CRAI_DE_CARTIER: "var(--neon-chrome)",
  MDS: "oklch(0.6 0.05 280)",
};

export const Route = createFileRoute("/app/top")({
  head: () => ({ meta: [{ title: "Top · OXIDAȚII" }] }),
  component: TopPage,
});

function TopPage() {
  const { data: top = [] } = useQuery({
    queryKey: ["top-today"],
    queryFn: async () => {
      // count verified proofs today, per user
      const since = new Date(); since.setHours(6, 0, 0, 0);
      const { data, error } = await supabase
        .from("sprit_proofs")
        .select("user_id, profiles:profiles!sprit_proofs_user_id_fkey(handle,display_name,rank,city:cities(name))")
        .eq("ai_verified", true)
        .gte("created_at", since.toISOString());
      if (error) throw error;
      const counts = new Map<string, { user_id: string; profile: any; count: number }>();
      for (const r of data ?? []) {
        const entry = counts.get(r.user_id) ?? { user_id: r.user_id, profile: r.profiles, count: 0 };
        entry.count += 1;
        counts.set(r.user_id, entry);
      }
      return Array.from(counts.values()).sort((a, b) => b.count - a.count).slice(0, 50);
    },
  });

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <header>
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-neon-crimson">// TOP NAȚIONAL · AZI</div>
        <h1 className="font-display font-black text-2xl mt-1">Cine bea mai mult, ăla-i ZEU'.</h1>
        <p className="text-xs text-muted-foreground mt-1">Reset zilnic la 06:00. Doar proof-uri verificate de AI.</p>
      </header>

      {top.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-foreground/15 p-8 text-center space-y-2">
          <div className="text-4xl">🍷</div>
          <div className="font-display font-bold">Topul e gol astăzi.</div>
          <div className="text-xs text-muted-foreground">Fii primul. Scanează un șpriț și ești ZEU' de azi.</div>
        </div>
      ) : (
        <div className="space-y-2">
          {top.map((row, i) => {
            const rank = row.profile?.rank ?? "MDS";
            const isZeu = i === 0;
            return (
              <div key={row.user_id}
                className={`grid grid-cols-[36px_1fr_auto] items-center gap-3 p-3 rounded-2xl ${
                  isZeu ? "bg-gradient-to-r from-neon-crimson/20 to-neon-purple/20 border border-neon-crimson/40" : "bg-foreground/5 border border-foreground/10"
                }`}>
                <div className="font-display font-black text-2xl text-center"
                  style={{ color: isZeu ? "var(--neon-crimson)" : "var(--muted-foreground)" }}>
                  {isZeu ? "👑" : i + 1}
                </div>
                <div className="min-w-0">
                  <div className="font-display font-bold truncate">@{row.profile?.handle ?? "anonim"}</div>
                  <div className="text-[10px] font-mono uppercase tracking-widest" style={{ color: RANK_COLORS[rank] }}>
                    {isZeu ? "ZEU' BALCANIC 👑" : RANK_LABELS[rank]} · {row.profile?.city?.name ?? "—"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display font-black text-2xl" style={{ color: isZeu ? "var(--neon-crimson)" : "var(--foreground)" }}>{row.count}</div>
                  <div className="text-[9px] font-mono text-muted-foreground uppercase">șprițuri</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

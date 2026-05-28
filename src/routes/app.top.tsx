import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useState } from "react";

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
  const { user, profile } = useAuth();
  const [tab, setTab] = useState<"national" | "city">(profile?.city_id ? "city" : "national");

  // National: today's verified proofs per user
  const { data: nat = [] } = useQuery({
    queryKey: ["top-today"],
    queryFn: async () => {
      const since = new Date(); since.setHours(6, 0, 0, 0);
      const { data, error } = await supabase
        .from("sprit_proofs")
        .select("user_id, profiles:profiles!sprit_proofs_user_id_fkey(handle,display_name,avatar_url,rank,is_public,city:cities(name))")
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

  // City: top șprițari from same city by streak + lifetime
  const cityId = profile?.city_id;
  const { data: cityData } = useQuery({
    queryKey: ["top-city", cityId],
    enabled: !!cityId,
    queryFn: async () => {
      const [cityRes, peopleRes] = await Promise.all([
        supabase.from("cities").select("name,slug").eq("id", cityId!).maybeSingle(),
        supabase
          .from("profiles")
          .select("id,handle,display_name,avatar_url,rank,current_streak,longest_streak,lifetime_sprits,aura,is_public")
          .eq("city_id", cityId!)
          .eq("is_public", true)
          .order("current_streak", { ascending: false })
          .order("longest_streak", { ascending: false })
          .order("lifetime_sprits", { ascending: false })
          .order("aura", { ascending: false })
          .limit(50),
      ]);
      return { city: cityRes.data, people: peopleRes.data ?? [] };
    },
  });

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <header>
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-neon-crimson">// LEADERBOARD</div>
        <h1 className="font-display font-black text-2xl mt-1">
          {tab === "city" && cityData?.city
            ? <>Cei mai înflăcărați șprițari din <span className="text-neon-crimson">{cityData.city.name}</span>.</>
            : <>Cine bea mai mult, ăla-i <span className="text-neon-crimson">ZEU'</span>.</>}
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          {tab === "city" ? "Sortat după streak de weekend-uri și șprițuri lifetime. Doar conturi publice." : "Reset zilnic la 06:00. Doar proof-uri verificate de AI."}
        </p>
      </header>

      {/* Tabs */}
      <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-foreground/5 border border-foreground/10">
        <button
          onClick={() => setTab("city")}
          disabled={!cityId}
          className={`py-2 rounded-lg font-mono text-[10px] uppercase tracking-widest transition disabled:opacity-40 ${
            tab === "city" ? "bg-neon-crimson/20 text-neon-crimson border border-neon-crimson/40" : "text-muted-foreground"
          }`}
        >
          📍 orașul meu
        </button>
        <button
          onClick={() => setTab("national")}
          className={`py-2 rounded-lg font-mono text-[10px] uppercase tracking-widest transition ${
            tab === "national" ? "bg-neon-purple/20 text-neon-purple border border-neon-purple/40" : "text-muted-foreground"
          }`}
        >
          🇷🇴 național · azi
        </button>
      </div>

      {tab === "city" ? (
        !cityId ? (
          <EmptyHint icon="📍" title="Nu ai oraș setat." sub="Mergi pe Profil și setează orașul ca să vezi topul local." />
        ) : (cityData?.people.length ?? 0) === 0 ? (
          <EmptyHint icon="🥃" title="Niciun șprițar public încă." sub={`Fii primul din ${cityData?.city?.name ?? "oraș"} cu streak activ.`} />
        ) : (
          <div className="space-y-2">
            {(cityData?.people ?? []).map((p: any, i) => {
              const isMe = p.id === user?.id;
              const isKing = i === 0;
              const rank = p.rank ?? "MDS";
              return (
                <div key={p.id}
                  className={`grid grid-cols-[36px_40px_1fr_auto] items-center gap-3 p-3 rounded-2xl ${
                    isKing ? "bg-gradient-to-r from-neon-crimson/20 to-neon-purple/20 border border-neon-crimson/40"
                    : isMe ? "bg-neon-purple/10 border border-neon-purple/40"
                    : "bg-foreground/5 border border-foreground/10"
                  }`}>
                  <div className="font-display font-black text-2xl text-center"
                    style={{ color: isKing ? "var(--neon-crimson)" : "var(--muted-foreground)" }}>
                    {isKing ? "👑" : i + 1}
                  </div>
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-neon-crimson to-neon-purple overflow-hidden flex items-center justify-center font-display">
                    {p.avatar_url
                      ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                      : (p.handle ?? "?")[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-display font-bold truncate">
                      @{p.handle ?? "anonim"} {isMe && <span className="text-[9px] font-mono text-neon-purple">· tu</span>}
                    </div>
                    <div className="text-[10px] font-mono uppercase tracking-widest" style={{ color: RANK_COLORS[rank] }}>
                      {RANK_LABELS[rank]} · {p.lifetime_sprits ?? 0} șprițuri
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display font-black text-2xl flex items-center gap-1 justify-end" style={{ color: isKing ? "var(--neon-crimson)" : "var(--foreground)" }}>
                      🔥 {p.current_streak ?? 0}
                    </div>
                    <div className="text-[9px] font-mono text-muted-foreground uppercase">record {p.longest_streak ?? 0}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        nat.length === 0 ? (
          <EmptyHint icon="🍷" title="Topul e gol astăzi." sub="Fii primul. Scanează un șpriț și ești ZEU' de azi." />
        ) : (
          <div className="space-y-2">
            {nat.map((row, i) => {
              const rank = row.profile?.rank ?? "MDS";
              const isZeu = i === 0;
              const isMe = row.user_id === user?.id;
              return (
                <div key={row.user_id}
                  className={`grid grid-cols-[36px_1fr_auto] items-center gap-3 p-3 rounded-2xl ${
                    isZeu ? "bg-gradient-to-r from-neon-crimson/20 to-neon-purple/20 border border-neon-crimson/40"
                    : isMe ? "bg-neon-purple/10 border border-neon-purple/40"
                    : "bg-foreground/5 border border-foreground/10"
                  }`}>
                  <div className="font-display font-black text-2xl text-center"
                    style={{ color: isZeu ? "var(--neon-crimson)" : "var(--muted-foreground)" }}>
                    {isZeu ? "👑" : i + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="font-display font-bold truncate">@{row.profile?.handle ?? "anonim"} {isMe && <span className="text-[9px] font-mono text-neon-purple">· tu</span>}</div>
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
        )
      )}
    </div>
  );
}

function EmptyHint({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-foreground/15 p-8 text-center space-y-2">
      <div className="text-4xl">{icon}</div>
      <div className="font-display font-bold">{title}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

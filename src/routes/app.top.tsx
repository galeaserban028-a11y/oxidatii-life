import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useState } from "react";

export const Route = createFileRoute("/app/top")({
  head: () => ({ meta: [{ title: "Top · OXIDAȚII" }] }),
  component: TopPage,
});

type Tab = "ro" | "city";

function TopPage() {
  const { user, profile } = useAuth();
  const [tab, setTab] = useState<Tab>("ro");

  // Top România — most spritz photos posted (all-time)
  const { data: roData = [] } = useQuery({
    queryKey: ["top-ro"],
    queryFn: async () => {
      const { data: photos, error } = await supabase
        .from("venue_photos")
        .select("user_id")
        .limit(5000);
      if (error) throw error;
      const counts = new Map<string, number>();
      for (const r of photos ?? []) counts.set(r.user_id, (counts.get(r.user_id) ?? 0) + 1);
      const top = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 100);
      if (top.length === 0) return [];
      const ids = top.map(([id]) => id);
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,handle,display_name,avatar_url,city:cities(name)")
        .in("id", ids);
      const pmap = new Map((profs ?? []).map((p: any) => [p.id, p]));
      return top.map(([user_id, count]) => ({ user_id, count, profile: pmap.get(user_id) }));
    },
  });

  // City — top by spritz photos in user's city
  const cityId = profile?.city_id;
  const { data: cityData } = useQuery({
    queryKey: ["top-city", cityId],
    enabled: !!cityId,
    queryFn: async () => {
      const [cityRes, peopleRes] = await Promise.all([
        supabase.from("cities").select("name").eq("id", cityId!).maybeSingle(),
        supabase
          .from("profiles")
          .select("id,handle,display_name,avatar_url,city:cities(name)")
          .eq("city_id", cityId!)
          .eq("is_public", true),
      ]);
      const ids = (peopleRes.data ?? []).map((p: any) => p.id);
      let photoCounts = new Map<string, number>();
      if (ids.length) {
        const { data: photos } = await supabase
          .from("venue_photos").select("user_id").in("user_id", ids);
        for (const p of photos ?? []) {
          photoCounts.set(p.user_id, (photoCounts.get(p.user_id) ?? 0) + 1);
        }
      }
      const ranked = (peopleRes.data ?? [])
        .map((p: any) => ({ ...p, count: photoCounts.get(p.id) ?? 0 }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 100);
      return { city: cityRes.data, people: ranked };
    },
  });

  const list = tab === "ro" ? roData : (cityData?.people ?? []);

  return (
    <div className="px-5 pt-6 pb-8 max-w-xl mx-auto space-y-5">
      <header className="space-y-1.5">
        <div className="text-[11px] uppercase tracking-[0.2em] text-primary font-medium">Leaderboard</div>
        <h1 className="font-display font-bold text-3xl leading-tight">
          {tab === "city" && cityData?.city
            ? <>Cei mai tari din <span className="text-gradient-sunset">{cityData.city.name}</span></>
            : <>Top <span className="text-gradient-sunset">România</span></>}
        </h1>
        <p className="text-sm text-muted-foreground">
          {tab === "city" ? "Sortat după numărul de șprițuri postate." : "Cine pune cele mai multe poze de la șpriț. All-time."}
        </p>
      </header>

      {/* Tabs */}
      <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-secondary border border-border">
        <button
          onClick={() => setTab("ro")}
          className={`py-2.5 rounded-xl text-xs font-semibold transition ${
            tab === "ro" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
          }`}
        >
          🇷🇴 România
        </button>
        <button
          onClick={() => setTab("city")}
          disabled={!cityId}
          className={`py-2.5 rounded-xl text-xs font-semibold transition disabled:opacity-40 ${
            tab === "city" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
          }`}
        >
          📍 {cityData?.city?.name ?? "orașul meu"}
        </button>
      </div>

      {/* Leaderboard list */}
      {list.length === 0 ? (
        <EmptyHint
          title={tab === "ro" ? "Topul e gol." : "Niciun șprițar încă."}
          sub={tab === "ro" ? "Fii primul. Pune un șpriț acum." : "Fii primul din oraș cu o poză."}
        />
      ) : (
        <div className="space-y-2">
          {list.map((row: any, i) => {
            const p = tab === "ro" ? row.profile : row;
            const uid = tab === "ro" ? row.user_id : row.id;
            const isMe = uid === user?.id;
            const isKing = i === 0;
            const handle = p?.handle ?? p?.display_name ?? "anonim";
            return (
              <div key={uid}
                className={`grid grid-cols-[36px_44px_1fr_auto] items-center gap-3 p-3 rounded-2xl border transition ${
                  isKing ? "bg-card border-primary/40 shadow-md"
                  : isMe ? "bg-primary/5 border-primary/30"
                  : "bg-card border-border"
                }`}>
                <div className={`font-display font-bold text-xl text-center ${isKing ? "text-primary" : "text-muted-foreground"}`}>
                  {isKing ? "👑" : i + 1}
                </div>
                <div className="h-11 w-11 rounded-full overflow-hidden bg-gradient-to-br from-sunset-orange to-sunset-magenta flex items-center justify-center text-white font-display font-bold">
                  {p?.avatar_url
                    ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                    : handle[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-display font-semibold truncate">
                    @{handle} {isMe && <span className="text-[10px] text-primary font-medium">· tu</span>}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {p?.city?.name ?? "—"}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-display font-bold text-2xl leading-none ${isKing ? "text-primary" : "text-foreground"}`}>
                    {row.count}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">șprițuri</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyHint({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center space-y-2">
      <div className="text-4xl">🥃</div>
      <div className="font-display font-semibold">{title}</div>
      <div className="text-sm text-muted-foreground">{sub}</div>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useMemo, useState } from "react";
import { Flame, Camera, MapPin, Trophy, Globe2, ChevronDown } from "lucide-react";

export const Route = createFileRoute("/app/top")({
  head: () => ({ meta: [{ title: "Top · OXIDAȚII" }] }),
  component: TopPage,
});

type Metric = "sprits" | "checkins" | "streak" | "score";
type Scope = "world" | "country" | "city";

const COUNTRY_LABEL: Record<string, string> = {
  RO: "🇷🇴 România", GB: "🇬🇧 UK", ES: "🇪🇸 Spania", DE: "🇩🇪 Germania",
  FR: "🇫🇷 Franța", IT: "🇮🇹 Italia", NL: "🇳🇱 Olanda", PL: "🇵🇱 Polonia",
  GR: "🇬🇷 Grecia", TR: "🇹🇷 Turcia", BG: "🇧🇬 Bulgaria", HR: "🇭🇷 Croația",
  CH: "🇨🇭 Elveția", IE: "🇮🇪 Irlanda", AT: "🇦🇹 Austria", BE: "🇧🇪 Belgia",
  HU: "🇭🇺 Ungaria", PT: "🇵🇹 Portugalia", SE: "🇸🇪 Suedia", CZ: "🇨🇿 Cehia",
  DK: "🇩🇰 Danemarca", FI: "🇫🇮 Finlanda", NO: "🇳🇴 Norvegia", RS: "🇷🇸 Serbia",
};

const METRIC_META: Record<Metric, { label: string; unit: string; icon: any }> = {
  sprits:   { label: "Șprițuri",      unit: "șprițuri",  icon: Camera },
  checkins: { label: "Check-in-uri",  unit: "check-in",  icon: MapPin },
  streak:   { label: "Streak",        unit: "săptămâni", icon: Flame },
  score:    { label: "Scor Oxidare",  unit: "puncte",    icon: Trophy },
};

function TopPage() {
  const { user, profile } = useAuth();
  const metric = "sprits" as Metric;
  const [scope, setScope] = useState<Scope>("country");
  const [country, setCountry] = useState<string>("RO");
  const [countryOpen, setCountryOpen] = useState(false);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const monthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
  const monthLabel = now.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
  const daysLeft = Math.max(1, Math.ceil((nextMonth.getTime() - now.getTime()) / 86400000));

  const cityId = profile?.city_id;

  // Country list (from DB, distinct)
  const { data: countries = [] } = useQuery({
    queryKey: ["countries-with-cities"],
    queryFn: async () => {
      const { data } = await supabase.from("cities").select("country");
      const set = new Set<string>();
      for (const c of data ?? []) if ((c as any).country) set.add((c as any).country);
      return Array.from(set).sort();
    },
  });

  const { data: list = [], isLoading } = useQuery({
    queryKey: ["leaderboard", metric, scope, country, cityId, monthKey],
    enabled: scope !== "city" || !!cityId,
    queryFn: async () => {
      // 1. Build candidate profile pool by geographic scope
      let profQuery = supabase
        .from("profiles")
        .select("id,handle,display_name,avatar_url,current_streak,longest_streak,lifetime_sprits,aura,city:cities!inner(name,country)")
        .eq("is_public", true)
        .limit(5000);

      if (scope === "country") profQuery = profQuery.eq("cities.country", country);
      if (scope === "city" && cityId) profQuery = profQuery.eq("city_id", cityId);

      const { data: profs } = await profQuery;
      const candidates = profs ?? [];
      if (candidates.length === 0) return [];
      const ids = candidates.map((p: any) => p.id);

      // 2. Pull metric data
      let scoreMap = new Map<string, number>();

      if (metric === "streak") {
        for (const p of candidates) scoreMap.set(p.id, (p as any).current_streak ?? 0);
      } else {
        // Fetch photos + checkins for this month (used by sprits / checkins / score)
        const needPhotos = metric === "sprits" || metric === "score";
        const needCheckins = metric === "checkins" || metric === "score";

        const [photoRes, checkinRes] = await Promise.all([
          needPhotos
            ? supabase.from("venue_photos").select("user_id").in("user_id", ids).gte("taken_at", monthStart)
            : Promise.resolve({ data: [] as any[] }),
          needCheckins
            ? supabase.from("check_ins").select("user_id").in("user_id", ids).gte("created_at", monthStart)
            : Promise.resolve({ data: [] as any[] }),
        ]);

        const photoCounts = new Map<string, number>();
        for (const r of photoRes.data ?? []) photoCounts.set((r as any).user_id, (photoCounts.get((r as any).user_id) ?? 0) + 1);
        const checkinCounts = new Map<string, number>();
        for (const r of checkinRes.data ?? []) checkinCounts.set((r as any).user_id, (checkinCounts.get((r as any).user_id) ?? 0) + 1);

        for (const p of candidates) {
          const s = photoCounts.get(p.id) ?? 0;
          const c = checkinCounts.get(p.id) ?? 0;
          const streak = (p as any).current_streak ?? 0;
          const aura = (p as any).aura ?? 0;
          let v = 0;
          if (metric === "sprits") v = s;
          else if (metric === "checkins") v = c;
          else v = s * 3 + c * 2 + streak * 5 + Math.min(aura, 200); // Scor Oxidare
          scoreMap.set(p.id, v);
        }
      }

      return candidates
        .map((p: any) => ({ ...p, value: scoreMap.get(p.id) ?? 0 }))
        .filter((p) => p.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 100);
    },
  });

  const scopeLabel = useMemo(() => {
    if (scope === "world") return "din toată lumea";
    if (scope === "city") return "din orașul tău";
    return `din ${COUNTRY_LABEL[country] ?? country}`;
  }, [scope, country]);

  const Icon = METRIC_META[metric].icon;

  return (
    <div className="px-5 pt-8 pb-10 max-w-xl mx-auto space-y-7">
      <header className="space-y-3">
        <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">
          leaderboard · {monthLabel}
        </div>
        <h1 className="font-display uppercase text-3xl leading-[0.95]">
          Top <span className="text-gradient-sunset">{METRIC_META[metric].label}</span>
        </h1>
        <p className="text-xs text-zinc-500">
          Cei mai tari {scopeLabel}. Se resetează în {daysLeft} {daysLeft === 1 ? "zi" : "zile"}.
        </p>
      </header>


      {/* Scope selector */}
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2 text-[11px] font-bold uppercase tracking-wider">
          <button
            onClick={() => setScope("world")}
            className={`py-2.5 rounded-2xl border transition flex items-center justify-center gap-1.5 ${
              scope === "world" ? "bg-neon-crimson text-background border-neon-crimson" : "bg-zinc-900/30 border-white/5 text-zinc-400 hover:bg-zinc-800/40"
            }`}
          >
            <Globe2 size={12} /> Lume
          </button>
          <button
            onClick={() => setScope("country")}
            className={`py-2.5 rounded-2xl border transition ${
              scope === "country" ? "bg-neon-crimson text-background border-neon-crimson" : "bg-zinc-900/30 border-white/5 text-zinc-400 hover:bg-zinc-800/40"
            }`}
          >
            Țară
          </button>
          <button
            onClick={() => setScope("city")}
            disabled={!cityId}
            className={`py-2.5 rounded-2xl border transition disabled:opacity-40 ${
              scope === "city" ? "bg-neon-crimson text-background border-neon-crimson" : "bg-zinc-900/30 border-white/5 text-zinc-400 hover:bg-zinc-800/40"
            }`}
          >
            Oraș
          </button>
        </div>

        {/* Country picker */}
        {scope === "country" && (
          <div className="relative">
            <button
              onClick={() => setCountryOpen((o) => !o)}
              className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-2xl border border-white/5 bg-zinc-900/30 backdrop-blur text-sm font-semibold"
            >
              <span>{COUNTRY_LABEL[country] ?? country}</span>
              <ChevronDown size={16} className={`transition ${countryOpen ? "rotate-180" : ""}`} />
            </button>
            {countryOpen && (
              <div className="absolute z-20 mt-1 w-full max-h-72 overflow-y-auto rounded-xl border border-border bg-card shadow-xl">
                {countries.map((c) => (
                  <button
                    key={c}
                    onClick={() => { setCountry(c); setCountryOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-secondary transition ${
                      c === country ? "bg-secondary font-semibold" : ""
                    }`}
                  >
                    {COUNTRY_LABEL[c] ?? c}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Leaderboard list */}
      {isLoading ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Se încarcă…
        </div>
      ) : list.length === 0 ? (
        <EmptyHint
          title="Topul e gol."
          sub={metric === "streak"
            ? "Postează în fiecare săptămână ca să-ți crești streak-ul."
            : metric === "checkins"
            ? "Fă check-in la cel mai apropiat bar ca să apari aici."
            : "Postează un șpriț acum și intri direct în top."}
        />
      ) : (
        <div className="space-y-2">
          {list.map((p: any, i: number) => {
            const uid = p.id;
            const isMe = uid === user?.id;
            const isKing = i === 0;
            const handle = p?.handle ?? p?.display_name ?? "anonim";
            return (
              <Link
                key={uid}
                to="/app/user/$id"
                params={{ id: uid }}
                className={`grid grid-cols-[36px_44px_1fr_auto] items-center gap-3 p-3 rounded-2xl border transition active:scale-[0.99] ${
                  isKing ? "bg-card border-primary/40 shadow-md"
                    : isMe ? "bg-primary/5 border-primary/30"
                    : "bg-card border-border"
                }`}
              >
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
                    {p?.city?.name ?? "—"}{p?.city?.country ? ` · ${p.city.country}` : ""}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-display font-bold text-2xl leading-none flex items-center justify-end gap-1 ${isKing ? "text-primary" : "text-foreground"}`}>
                    {p.value}
                    <Icon size={14} className="text-muted-foreground" />
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                    {METRIC_META[metric].unit}
                  </div>
                </div>
              </Link>
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

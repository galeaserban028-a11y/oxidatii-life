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

  const instrument = { fontFamily: '"Instrument Serif", "Work Sans", serif' };
  const top3 = list.slice(0, 3);
  const rest = list.slice(3);
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Sticky header with sunset glow */}
      <header className="sticky top-0 z-30 bg-[#050505]/85 backdrop-blur-xl border-b border-white/5">
        <div className="px-5 pt-5 pb-4 max-w-xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.3em] text-white/40">leaderboard</span>
              <span className="h-1 w-1 rounded-full bg-[#f7931e]" />
              <span className="text-[10px] uppercase tracking-[0.2em] text-amber-500/90">{monthLabel}</span>
            </div>
            <div className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
              <span className="text-[10px] font-mono uppercase tracking-wider text-white/60">{daysLeft}{daysLeft === 1 ? "z" : "z"} rămase</span>
            </div>
          </div>
          <h1 style={instrument} className="text-5xl leading-[0.9] tracking-tight">
            Top<span className="text-[#f7931e]">.</span>{" "}
            <em className="bg-gradient-to-r from-[#ff6b35] via-[#f7931e] to-[#e84393] bg-clip-text text-transparent not-italic font-normal">{METRIC_META[metric].label}</em>
          </h1>
          <p className="text-[12px] text-white/50 mt-2">Cei mai tari {scopeLabel}.</p>
        </div>

        {/* Scope tabs */}
        <div className="px-5 pb-3 max-w-xl mx-auto">
          <div className="grid grid-cols-3 gap-2 text-[11px] font-bold uppercase tracking-wider">
            {([
              { k: "world", label: "Lume", icon: <Globe2 size={12} /> },
              { k: "country", label: "Țară", icon: null },
              { k: "city", label: "Oraș", icon: null, disabled: !cityId },
            ] as const).map((opt) => {
              const active = scope === opt.k;
              return (
                <button
                  key={opt.k}
                  onClick={() => setScope(opt.k as Scope)}
                  disabled={(opt as any).disabled}
                  className={`relative py-2.5 rounded-2xl transition flex items-center justify-center gap-1.5 disabled:opacity-30 ${
                    active
                      ? "bg-gradient-to-r from-[#ff6b35] to-[#e84393] text-white shadow-[0_8px_24px_-8px_rgba(232,67,147,0.6)]"
                      : "bg-white/5 border border-white/10 text-white/60 hover:bg-white/10"
                  }`}
                >
                  {opt.icon}{opt.label}
                </button>
              );
            })}
          </div>

          {/* Country picker */}
          {scope === "country" && (
            <div className="relative mt-2">
              <button
                onClick={() => setCountryOpen((o) => !o)}
                className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur text-sm font-semibold"
              >
                <span>{COUNTRY_LABEL[country] ?? country}</span>
                <ChevronDown size={16} className={`transition ${countryOpen ? "rotate-180" : ""}`} />
              </button>
              {countryOpen && (
                <div className="absolute z-20 mt-1 w-full max-h-72 overflow-y-auto rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-2xl">
                  {countries.map((c) => (
                    <button
                      key={c}
                      onClick={() => { setCountry(c); setCountryOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 transition ${
                        c === country ? "bg-white/5 font-semibold text-[#f7931e]" : ""
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
      </header>

      <div className="px-5 pt-6 pb-10 max-w-xl mx-auto space-y-6">
        {isLoading ? (
          <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-10 text-center text-sm text-white/40">
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
          <>
            {/* Cinema podium bento */}
            {top3.length > 0 && (
              <div className="relative rounded-3xl overflow-hidden border border-white/5 bg-gradient-to-br from-[#1a0a0e] via-[#0a0a0a] to-[#1a0f05] p-5">
                <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-[#e84393]/20 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-[#ff6b35]/20 blur-3xl pointer-events-none" />
                <div className="relative grid grid-cols-3 gap-3 items-end">
                  {podiumOrder.map((p: any, idx) => {
                    const realRank = p === top3[0] ? 1 : p === top3[1] ? 2 : 3;
                    const isKing = realRank === 1;
                    const handle = p?.handle ?? p?.display_name ?? "anonim";
                    const isMe = p.id === user?.id;
                    const podiumH = isKing ? "h-32" : realRank === 2 ? "h-24" : "h-20";
                    return (
                      <Link
                        key={p.id}
                        to="/app/user/$id"
                        params={{ id: p.id }}
                        className="flex flex-col items-center gap-2"
                      >
                        <div className={`relative ${isKing ? "h-20 w-20" : "h-16 w-16"} rounded-full p-[2px] bg-gradient-to-br ${
                          isKing ? "from-[#ff6b35] to-[#e84393]" : "from-white/20 to-white/5"
                        } ${isKing ? "shadow-[0_0_30px_rgba(232,67,147,0.5)]" : ""}`}>
                          <div className="h-full w-full rounded-full overflow-hidden bg-[#0a0a0a]">
                            {p?.avatar_url
                              ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                              : <div className="h-full w-full flex items-center justify-center text-xl font-semibold">{handle[0]?.toUpperCase()}</div>
                            }
                          </div>
                          {isKing && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-2xl">👑</div>
                          )}
                        </div>
                        <div className="text-center min-w-0 w-full">
                          <div className={`text-[12px] font-semibold truncate ${isKing ? "text-white" : "text-white/80"}`}>
                            @{handle}{isMe && <span className="text-[#f7931e]"> ·tu</span>}
                          </div>
                          <div style={instrument} className={`leading-none mt-1 ${isKing ? "text-3xl text-[#f7931e]" : "text-2xl text-white/70"}`}>
                            {p.value}
                          </div>
                        </div>
                        <div className={`${podiumH} w-full rounded-t-2xl backdrop-blur-xl border-t border-white/10 ${
                          isKing
                            ? "bg-gradient-to-t from-[#e84393]/30 to-transparent"
                            : "bg-white/[0.03]"
                        } flex items-start justify-center pt-2`}>
                          <span className={`text-[11px] font-mono font-bold ${isKing ? "text-[#f7931e]" : "text-white/40"}`}>
                            #{realRank}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Rest of list */}
            {rest.length > 0 && (
              <div className="space-y-2">
                {rest.map((p: any, i: number) => {
                  const rank = i + 4;
                  const uid = p.id;
                  const isMe = uid === user?.id;
                  const handle = p?.handle ?? p?.display_name ?? "anonim";
                  return (
                    <Link
                      key={uid}
                      to="/app/user/$id"
                      params={{ id: uid }}
                      className={`grid grid-cols-[32px_44px_1fr_auto] items-center gap-3 p-3 rounded-2xl border transition active:scale-[0.99] ${
                        isMe
                          ? "bg-gradient-to-r from-[#ff6b35]/10 to-[#e84393]/10 border-[#e84393]/40"
                          : "bg-[#0d0d0d] border-white/5 hover:bg-[#111]"
                      }`}
                    >
                      <div className="font-mono font-bold text-sm text-center text-white/40">
                        {rank}
                      </div>
                      <div className="h-11 w-11 rounded-full overflow-hidden bg-gradient-to-br from-[#ff6b35] to-[#e84393] flex items-center justify-center text-white font-semibold">
                        {p?.avatar_url
                          ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                          : handle[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate text-white">
                          @{handle} {isMe && <span className="text-[10px] text-[#f7931e]">· tu</span>}
                        </div>
                        <div className="text-[11px] text-white/40 truncate">
                          {p?.city?.name ?? "—"}{p?.city?.country ? ` · ${p.city.country}` : ""}
                        </div>
                      </div>
                      <div className="text-right">
                        <div style={instrument} className="text-2xl leading-none text-white flex items-center justify-end gap-1.5">
                          {p.value}
                          <Icon size={13} className="text-white/40" />
                        </div>
                        <div className="text-[9px] text-white/30 uppercase tracking-wider mt-1">
                          {METRIC_META[metric].unit}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
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

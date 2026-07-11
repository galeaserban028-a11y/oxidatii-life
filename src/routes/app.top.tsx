import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Globe2, ChevronDown, Compass, Users, Moon, TrendingUp, Sparkles, Info, Share2 } from "lucide-react";
import { SpritzOfDayStrip } from "@/components/app/SpritzOfDayStrip";
import { FadeIn } from "@/components/app/FadeIn";
import { LeaderboardExportSheet } from "@/components/app/LeaderboardExportSheet";

export const Route = createFileRoute("/app/top")({
  head: () => ({ meta: [{ title: "Top · OXIDAȚII" }] }),
  component: TopPage,
});

type Scope = "world" | "country" | "city";

const COUNTRY_LABEL: Record<string, string> = {
  RO: "🇷🇴 România",
  GB: "🇬🇧 UK",
  ES: "🇪🇸 Spania",
  DE: "🇩🇪 Germania",
  FR: "🇫🇷 Franța",
  IT: "🇮🇹 Italia",
  NL: "🇳🇱 Olanda",
  PL: "🇵🇱 Polonia",
  GR: "🇬🇷 Grecia",
  TR: "🇹🇷 Turcia",
  BG: "🇧🇬 Bulgaria",
  HR: "🇭🇷 Croația",
  CH: "🇨🇭 Elveția",
  IE: "🇮🇪 Irlanda",
  AT: "🇦🇹 Austria",
  BE: "🇧🇪 Belgia",
  HU: "🇭🇺 Ungaria",
  PT: "🇵🇹 Portugalia",
  SE: "🇸🇪 Suedia",
  CZ: "🇨🇿 Cehia",
  DK: "🇩🇰 Danemarca",
  FI: "🇫🇮 Finlanda",
  NO: "🇳🇴 Norvegia",
  RS: "🇷🇸 Serbia",
};

type Row = {
  user_id: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
  city_name: string | null;
  country: string | null;
  base_sprits: number;
  explorer_score: number;
  unique_venues: number;
  unique_cities: number;
  squad_maker: number;
  sunrise_index: number;
  trendsetter: number;
  spritz_score: number;
  rank: number;
};

function TopPage() {
  const { user, profile } = useAuth();
  const [scope, setScope] = useState<Scope>("country");
  const [country, setCountry] = useState<string>("RO");
  const [countryOpen, setCountryOpen] = useState(false);
  const [showFormula, setShowFormula] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  
type MyRank = { in_top?: boolean; rank?: number; spritz_score?: number; base_sprits?: number; explorer_score?: number; squad_maker?: number; sunrise_index?: number; trendsetter?: number } | null;
type CityCountryRow = { country: string | null };

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const monthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
  const monthLabel = now.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
  const daysLeft = Math.max(1, Math.ceil((nextMonth.getTime() - now.getTime()) / 86400000));

  const cityId = profile?.city_id;

  // Country list
  const { data: countries = [] } = useQuery({
    queryKey: ["countries-with-cities"],
    queryFn: async () => {
      const { data } = await supabase.from("cities").select("country");
      const set = new Set<string>();
      for (const c of (data ?? []) as CityCountryRow[]) if (c.country) set.add(c.country);
      return Array.from(set).sort();
    },
  });

  // Leaderboard via new RPC
  const { data: list = [], isLoading } = useQuery({
    queryKey: ["spritz-score-leaderboard", scope, country, cityId, monthKey],
    enabled: scope !== "city" || !!cityId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_spritz_score_leaderboard", {
        _scope: scope,
        _country: scope === "country" ? country : undefined,
        _city_id: scope === "city" ? (cityId ?? undefined) : undefined,
        _month_start: monthStart,
        _limit: 100,
      });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  // My rank
  const { data: myRank } = useQuery({
    queryKey: ["my-spritz-score", scope, country, cityId, monthKey],
    enabled: !!user && (scope !== "city" || !!cityId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_spritz_score", {
        _scope: scope,
        _country: scope === "country" ? country : undefined,
        _city_id: scope === "city" ? (cityId ?? undefined) : undefined,
        _month_start: monthStart,
      });
      if (error) throw error;
      return data as MyRank;
    },
  });

  const scopeLabel = useMemo(() => {
    if (scope === "world") return "din toată lumea";
    if (scope === "city") return "din orașul tău";
    return `din ${COUNTRY_LABEL[country] ?? country}`;
  }, [scope, country]);

  const instrument = { fontFamily: '"Instrument Serif", "Work Sans", serif' };
  const top3 = list.slice(0, 3);
  const rest = list.slice(3);
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);

  return (
    <div className="min-h-[100dvh] bg-[#050505] text-white">
      {/* Sticky header */}
      <header
        className="sticky z-30 bg-[#050505]/85 backdrop-blur-xl border-b border-white/5"
        style={{ top: "env(safe-area-inset-top)" }}
      >
        <div className="px-5 pt-4 pb-3 max-w-xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.3em] text-white/40">
                spritz score
              </span>
              <span className="h-1 w-1 rounded-full bg-[#ffea00]" />
              <span className="text-[10px] uppercase tracking-[0.2em] text-amber-500/90">
                {monthLabel}
              </span>
            </div>
            <div className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
              <span className="text-[10px] font-mono uppercase tracking-wider text-white/60">
                {daysLeft}z rămase
              </span>
            </div>
          </div>
          <h1 style={instrument} className="text-4xl sm:text-5xl leading-[0.9] tracking-tight">
            Spritz<span className="text-[#ffea00]">.</span>{" "}
            <em className="bg-gradient-to-r from-[#ff3d8b] via-[#ffea00] to-[#c724ff] bg-clip-text text-transparent not-italic font-normal">
              Score
            </em>
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowFormula(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/10 bg-white/[0.04] text-[11px] text-white/70 hover:text-white hover:bg-white/10 transition"
            >
              <Info size={11} />
              Reguli & cum se calculează
            </button>
            <button
              onClick={() => setExportOpen(true)}
              disabled={top3.length === 0}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#ffea00]/30 bg-[#ffea00]/10 text-[11px] text-[#ffea00] hover:bg-[#ffea00]/15 transition disabled:opacity-40"
            >
              <Share2 size={11} />
              Export 9:16
            </button>
          </div>

          <AnimatePresence>
            {showFormula && (
              <RulesModal onClose={() => setShowFormula(false)} />
            )}
          </AnimatePresence>

        </div>

        {/* Scope tabs */}
        <div className="px-5 pb-3 max-w-xl mx-auto">
          <div className="grid grid-cols-3 gap-2 text-[11px] font-bold uppercase tracking-wider">
            {(
              [
                { k: "world", label: "Lume", icon: <Globe2 size={12} /> },
                { k: "country", label: "Țară", icon: null },
                { k: "city", label: "Oraș", icon: null, disabled: !cityId },
              ] as const
            ).map((opt) => {
              const active = scope === opt.k;
              return (
                <button
                  key={opt.k}
                  onClick={() => setScope(opt.k as Scope)}
                  disabled={"disabled" in opt ? opt.disabled : false}
                  className={`relative py-2.5 rounded-2xl transition flex items-center justify-center gap-1.5 disabled:opacity-30 ${
                    active
                      ? "bg-gradient-to-r from-[#ff3d8b] to-[#c724ff] text-white shadow-[0_8px_24px_-8px_rgba(199,36,255,0.6)]"
                      : "bg-white/5 border border-white/10 text-white/60 hover:bg-white/10"
                  }`}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              );
            })}
          </div>

          {scope === "country" && (
            <div className="relative mt-2">
              <button
                onClick={() => setCountryOpen((o) => !o)}
                className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur text-sm font-semibold active:scale-[0.99] transition-all"
              >
                <span>{COUNTRY_LABEL[country] ?? country}</span>
                <ChevronDown size={16} className={`transition-transform duration-200 ${countryOpen ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {countryOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute z-20 mt-1 w-full max-h-72 overflow-y-auto rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-2xl"
                  >
                    {countries.map((c) => (
                      <button
                        key={c}
                        onClick={() => {
                          setCountry(c);
                          setCountryOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 transition-colors ${
                          c === country ? "bg-white/5 font-semibold text-[#ffea00]" : ""
                        }`}
                      >
                        {COUNTRY_LABEL[c] ?? c}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </header>

      <div className="px-5 pt-4 pb-[calc(10rem+env(safe-area-inset-bottom))] max-w-xl mx-auto space-y-4">
        <SpritzOfDayStrip />

        {/* My rank (sticky info card) */}
        {myRank && user && (
          <FadeIn y={6}>
            <div className="rounded-2xl border border-[#c724ff]/30 bg-gradient-to-r from-[#c724ff]/10 to-[#ff3d8b]/10 p-4 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-white/50">Tu</div>
                <div style={instrument} className="text-2xl leading-none mt-1">
                  {myRank.in_top ? (
                    <>#{myRank.rank} · <span className="text-[#ffea00]">{myRank.spritz_score}</span> pct</>
                  ) : (
                    <>Nu ești în top încă</>
                  )}
                </div>
              </div>
              {myRank.in_top && (
                <MiniBreakdown
                  base={myRank.base_sprits}
                  explorer={myRank.explorer_score}
                  squad={myRank.squad_maker}
                  sunrise={myRank.sunrise_index}
                  trend={myRank.trendsetter}
                />
              )}
            </div>
          </FadeIn>
        )}

        {isLoading ? (
          <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-10 text-center text-sm text-white/40">
            Se încarcă…
          </div>
        ) : list.length === 0 ? (
          <EmptyHint
            title="Topul e gol."
            sub="Fă primul check-in al lunii și intri direct pe primul loc."
          />
        ) : (
          <>
            {top3.length > 0 && (
              <FadeIn y={12}>
                <div className="relative rounded-3xl overflow-hidden border border-white/5 bg-gradient-to-br from-[#0a0a14] via-[#0a0a0a] to-[#0a0a14] p-4 sm:p-5">
                  <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-[#c724ff]/20 blur-3xl pointer-events-none" />
                  <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-[#ff3d8b]/20 blur-3xl pointer-events-none" />
                  <div className="relative grid grid-cols-3 gap-2 sm:gap-3 items-end">
                    {podiumOrder.map((p: Row) => {
                      const realRank = p === top3[0] ? 1 : p === top3[1] ? 2 : 3;
                      const isKing = realRank === 1;
                      const handle = p?.handle ?? p?.display_name ?? "anonim";
                      const isMe = p.user_id === user?.id;
                      const podiumH = isKing ? "h-24 sm:h-32" : realRank === 2 ? "h-20 sm:h-24" : "h-16 sm:h-20";
                      return (
                        <Link
                          key={p.user_id}
                          to="/app/user/$id"
                          params={{ id: p.user_id }}
                          className="flex flex-col items-center gap-1.5 sm:gap-2"
                        >
                          <div
                            className={`relative ${isKing ? "h-16 w-16 sm:h-20 sm:w-20" : "h-14 w-14 sm:h-16 sm:w-16"} rounded-full p-[2px] bg-gradient-to-br ${
                              isKing ? "from-[#ff3d8b] to-[#c724ff]" : "from-white/20 to-white/5"
                            } ${isKing ? "shadow-[0_0_30px_rgba(199,36,255,0.5)]" : ""}`}
                          >
                            <div className="h-full w-full rounded-full overflow-hidden bg-[#0a0a0a]">
                              {p?.avatar_url ? (
                                <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center text-xl font-semibold">
                                  {handle[0]?.toUpperCase()}
                                </div>
                              )}
                            </div>
                            {isKing && (
                              <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-2xl">👑</div>
                            )}
                          </div>
                          <div className="text-center min-w-0 w-full">
                            <div className={`text-[12px] font-semibold truncate ${isKing ? "text-white" : "text-white/80"}`}>
                              @{handle}
                              {isMe && <span className="text-[#ffea00]"> ·tu</span>}
                            </div>
                            <div
                              style={instrument}
                              className={`leading-none mt-1 ${isKing ? "text-2xl sm:text-3xl text-[#ffea00]" : "text-xl sm:text-2xl text-white/70"}`}
                            >
                              {p.spritz_score}
                            </div>
                          </div>
                          <div
                            className={`${podiumH} w-full rounded-t-2xl backdrop-blur-xl border-t border-white/10 ${
                              isKing ? "bg-gradient-to-t from-[#c724ff]/30 to-transparent" : "bg-white/[0.03]"
                            } flex items-start justify-center pt-2`}
                          >
                            <span className={`text-[11px] font-mono font-bold ${isKing ? "text-[#ffea00]" : "text-white/40"}`}>
                              #{realRank}
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </FadeIn>
            )}

            {rest.length > 0 && (
              <div className="space-y-2">
                {rest.map((p: Row, i: number) => {
                  const rank = i + 4;
                  const uid = p.user_id;
                  const isMe = uid === user?.id;
                  const handle = p?.handle ?? p?.display_name ?? "anonim";
                  return (
                    <FadeIn key={uid} y={8} delay={Math.min(i * 0.03, 0.4)}>
                      <Link
                        to="/app/user/$id"
                        params={{ id: uid }}
                        className={`grid grid-cols-[32px_44px_1fr_auto] items-center gap-3 p-3 rounded-2xl border transition active:scale-[0.99] ${
                          isMe
                            ? "bg-gradient-to-r from-[#ff3d8b]/10 to-[#c724ff]/10 border-[#c724ff]/40"
                            : "bg-[#0d0d0d] border-white/5 hover:bg-[#111]"
                        }`}
                      >
                        <div className="font-mono font-bold text-sm text-center text-white/40">{rank}</div>
                        <div className="h-11 w-11 rounded-full overflow-hidden bg-gradient-to-br from-[#ff3d8b] to-[#c724ff] flex items-center justify-center text-white font-semibold">
                          {p?.avatar_url ? (
                            <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            handle[0]?.toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-sm truncate text-white">
                            @{handle} {isMe && <span className="text-[10px] text-[#ffea00]">· tu</span>}
                          </div>
                          <div className="text-[11px] text-white/40 truncate flex items-center gap-2">
                            <span>{p?.city_name ?? "—"}</span>
                            <MiniBreakdown
                              base={p.base_sprits}
                              explorer={p.explorer_score}
                              squad={p.squad_maker}
                              sunrise={p.sunrise_index}
                              trend={p.trendsetter}
                              compact
                            />
                          </div>
                        </div>
                        <div className="text-right">
                          <div
                            style={instrument}
                            className="text-2xl leading-none text-white flex items-center justify-end gap-1.5"
                          >
                            {p.spritz_score}
                          </div>
                          <div className="text-[9px] text-white/30 uppercase tracking-wider mt-1">
                            pct
                          </div>
                        </div>
                      </Link>
                    </FadeIn>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {exportOpen && top3.length > 0 && (
        <LeaderboardExportSheet
          top3={top3.map((r) => ({
            user_id: r.user_id,
            handle: r.handle,
            display_name: r.display_name,
            avatar_url: r.avatar_url,
            spritz_score: r.spritz_score,
          }))}
          me={
            myRank && myRank.in_top
              ? {
                  rank: myRank.rank ?? 0,
                  spritz_score: myRank.spritz_score ?? 0,
                  handle: profile?.handle ?? null,
                }
              : null
          }
          scopeLabel={scope === "world" ? "lume" : scope === "city" ? "oraș" : (COUNTRY_LABEL[country] ?? country).replace(/^.+?\s/, "")}
          monthLabel={monthLabel}
          onClose={() => setExportOpen(false)}
        />
      )}
    </div>
  );
}

function FormulaRow({ icon, label, weight }: { icon: React.ReactNode; label: string; weight: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        {icon}
        <span>{label}</span>
      </div>
      {weight && <span className="font-mono text-white/40">{weight}</span>}
    </div>
  );
}

function MiniBreakdown({
  base,
  explorer,
  squad,
  sunrise,
  trend,
  compact = false,
}: {
  base: number;
  explorer: number;
  squad: number;
  sunrise: number;
  trend: number;
  compact?: boolean;
}) {
  const items: Array<[React.ReactNode, number, string]> = [
    [<Sparkles size={compact ? 9 : 11} key="s" />, base, "#ffea00"],
    [<Compass size={compact ? 9 : 11} key="e" />, explorer, "#3ec5ff"],
    [<Users size={compact ? 9 : 11} key="sq" />, squad, "#ff3d8b"],
    [<Moon size={compact ? 9 : 11} key="m" />, sunrise, "#c724ff"],
    [<TrendingUp size={compact ? 9 : 11} key="t" />, trend, "#00ff9d"],
  ];
  return (
    <div className={`flex items-center ${compact ? "gap-1.5" : "gap-2"}`}>
      {items.map(([icon, val, color], i) =>
        val > 0 ? (
          <span
            key={i}
            className={`inline-flex items-center gap-0.5 ${compact ? "text-[9px]" : "text-[10px]"} font-mono`}
            style={{ color }}
          >
            {icon}
            {val}
          </span>
        ) : null,
      )}
    </div>
  );
}

function EmptyHint({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#0d0d0d] p-10 text-center space-y-2">
      <div className="text-4xl">🥃</div>
      <div style={{ fontFamily: '"Instrument Serif", serif' }} className="text-2xl">
        {title}
      </div>
      <div className="text-sm text-white/50">{sub}</div>
    </div>
  );
}

function RulesModal({ onClose }: { onClose: () => void }) {
  const instrument = { fontFamily: '"Instrument Serif", serif' };
  const articles: Array<{ n: string; title: string; body: string; tag?: string; weight?: string }> = [
    { n: "01", title: "Eligibilitate", body: "Doar profilurile publice apar în clasament. Profilurile private participă, dar nu sunt afișate." },
    { n: "02", title: "Perioadă", body: "Clasamentul se calculează strict pentru luna curentă și se resetează în prima zi a lunii următoare, ora 00:00 (Europe/Bucharest)." },
    { n: "03", title: "Șprițuri", body: "Fiecare check-in valid la un venue îți aduce punctaj de bază.", tag: "Bază", weight: "×10" },
    { n: "04", title: "Explorer", body: "Primești bonus pentru fiecare venue nou (×5) și pentru fiecare oraș nou (×15) vizitat în luna curentă.", tag: "Descoperă", weight: "×5 / ×15" },
    { n: "05", title: "Squad Maker", body: "Oameni cu care NU ești prieten și care s-au check-in la același loc ±2h față de tine. Se numără o singură dată per persoană.", tag: "Conexiuni", weight: "×8" },
    { n: "06", title: "Sunrise Index", body: "Scor pentru check-in-uri între 00:00 și 05:59. Cu cât e mai târziu (mai aproape de 00:00), cu atât bonusul e mai mare.", tag: "Noctambul", weight: "×4" },
    { n: "07", title: "Trendsetter", body: "Persoane distincte care se check-in la același venue la cel mult 2h DUPĂ tine. Tu ai setat trendul.", tag: "Influență", weight: "×6" },
    { n: "08", title: "Fair play", body: "Check-in-urile false, conturile duplicate sau orice formă de fraudă duc la descalificare și pierderea punctajului lunii." },
  ];
  if (typeof document === "undefined") return null;

  const topClearance = "calc(env(safe-area-inset-top, 0px) + 96px)";
  const bottomClearance = "calc(env(safe-area-inset-bottom, 0px) + 18px)";

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed left-0 right-0 flex items-start justify-center overflow-y-auto bg-black/95 backdrop-blur-md isolate"
      style={{
        zIndex: 2147483647,
        top: topClearance,
        bottom: bottomClearance,
        paddingLeft: 12,
        paddingRight: 12,
      }}
      onClick={onClose}
    >

      <motion.div
        initial={{ y: 20, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 20, opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="relative my-3 w-full max-w-lg flex flex-col rounded-2xl border border-white/15 bg-[#0b0b0c] shadow-[0_30px_80px_-20px_rgba(199,36,255,0.35)] overflow-hidden"
        style={{
          maxHeight: "calc(100% - 24px)",
        }}
      >
        {/* Document header */}
        <div className="relative border-b border-white/10 px-6 pt-6 pb-5 bg-gradient-to-b from-white/[0.04] to-transparent">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-lg leading-none flex items-center justify-center transition"
            aria-label="Închide"
          >
            ×
          </button>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.32em] text-white/40">
            <span className="h-px w-6 bg-white/30" />
            Regulament oficial
          </div>
          <h2 style={instrument} className="text-3xl sm:text-4xl leading-[1] mt-3">
            Spritz<span className="text-[#ffea00]">.</span>{" "}
            <em className="not-italic font-normal bg-gradient-to-r from-[#ff3d8b] via-[#ffea00] to-[#c724ff] bg-clip-text text-transparent">
              Score
            </em>
          </h2>
          <div className="mt-2 flex items-center gap-3 text-[11px] text-white/45 font-mono uppercase tracking-wider">
            <span>v1.0</span>
            <span className="h-1 w-1 rounded-full bg-white/30" />
            <span>{new Date().toLocaleDateString("ro-RO", { month: "long", year: "numeric" })}</span>
            <span className="h-1 w-1 rounded-full bg-white/30" />
            <span>8 articole</span>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <p className="text-sm text-white/75 leading-relaxed border-l-2 border-[#ffea00]/70 pl-3 italic">
            Spritz Score recompensează șprițuri, descoperire, conexiuni noi și nopți lungi. Punctele se acumulează lunar și se resetează la final de lună.
          </p>

          <div className="space-y-4">
            {articles.map((a) => (
              <article key={a.n} className="group">
                <div className="flex items-baseline gap-3">
                  <span style={instrument} className="text-[#ffea00] text-xl leading-none w-8 shrink-0">
                    {a.n}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                        {a.title}
                      </h3>
                      {a.weight && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/70">
                          {a.weight}
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-[13px] text-white/65 leading-relaxed">{a.body}</p>
                  </div>
                </div>
                <div className="ml-11 mt-3 border-b border-dashed border-white/5" />
              </article>
            ))}
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-[11px] text-white/50 leading-relaxed">
            <span className="text-white/70 font-bold uppercase tracking-wider text-[10px]">Notă · </span>
            Echipa OXIDAȚII poate ajusta ponderile pentru a păstra echilibrul clasamentului. Modificările se anunță înainte de luna în care intră în vigoare.
          </div>
        </div>

        {/* Sticky footer */}
        <div className="border-t border-white/10 px-6 py-4 bg-[#080808]">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#ff3d8b] to-[#c724ff] text-white font-bold text-sm uppercase tracking-wider active:scale-[0.98] transition shadow-[0_8px_24px_-8px_rgba(199,36,255,0.7)]"
          >
            Am citit & am înțeles
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}



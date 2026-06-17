import { Shield, Clock, Zap, Smile, GlassWater, Lock, Star, Sparkles, TrendingUp } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

// ---------- Categorii & metadate ----------
type CatKey = "respect" | "reliability" | "energy" | "friendliness" | "contribution" | "trust";

const CATS: { key: CatKey; label: string; short: string; icon: any; color: string }[] = [
  { key: "respect",      label: "Respect",       short: "respect",  icon: Shield,     color: "#c724ff" },
  { key: "reliability",  label: "Fiabilitate",   short: "fiabil",   icon: Clock,      color: "#00e5ff" },
  { key: "energy",       label: "Energie",       short: "energie",  icon: Zap,        color: "#ffea00" },
  { key: "friendliness", label: "Prietenie",     short: "prieten",  icon: Smile,      color: "#ff3d8b" },
  { key: "contribution", label: "Aport la fază", short: "aport",    icon: GlassWater, color: "#c724ff" },
  { key: "trust",        label: "Încredere",     short: "trust",    icon: Lock,       color: "#00e5ff" },
];


// ---------- Calcul ----------
type SelfInputs = {
  sprits: number; streak: number; longestStreak: number;
  followers: number; following: number; aura: number;
  hasAvatar: boolean; hasBio: boolean; accountAgeDays: number;
};
type PeerAgg = Partial<Record<CatKey, { avg: number; n: number }>>;

const sat = (v: number, k: number) => 1 - Math.exp(-Math.max(0, v) / k);

function selfMetrics(i: SelfInputs): Record<CatKey, number> {
  return {
    respect:      Math.round(100 * (0.4 + 0.6 * sat(i.longestStreak, 14))),
    reliability:  Math.round(100 * (0.3 + 0.7 * sat(i.streak, 10))),
    energy:       Math.round(100 * sat(i.sprits, 40)),
    friendliness: Math.round(100 * sat(i.followers + i.following * 0.5, 60)),
    contribution: Math.round(100 * sat(i.aura, 200)),
    trust: Math.round(100 * (0.2
      + 0.25 * sat(i.accountAgeDays, 60)
      + 0.25 * (i.hasAvatar ? 1 : 0)
      + 0.15 * (i.hasBio ? 1 : 0)
      + 0.35 * sat(i.sprits, 20))),
  };
}

export function computeReputation(self: SelfInputs, peers: PeerAgg = {}) {
  const baseline = selfMetrics(self);
  const metrics = {} as Record<CatKey, number>;
  let totalPeerN = 0;

  for (const { key } of CATS) {
    const peer = peers[key];
    if (peer && peer.n > 0) {
      // peer 1..5 → 0..100; bayesian shrinkage către self-score (prior = 4 voturi)
      const peerScore = ((peer.avg - 1) / 4) * 100;
      const prior = 4;
      metrics[key] = Math.round((peer.n * peerScore + prior * baseline[key]) / (peer.n + prior));
      totalPeerN += peer.n;
    } else {
      metrics[key] = baseline[key];
    }
  }

  const score = Math.round(
    0.10 * metrics.respect +
    0.20 * metrics.reliability +
    0.25 * metrics.energy +
    0.15 * metrics.friendliness +
    0.15 * metrics.contribution +
    0.15 * metrics.trust
  );

  const tier =
    score >= 90 ? { name: "LEGEND",   color: "#ffea00", glow: "#ffea00" } :
    score >= 75 ? { name: "PLATINUM", color: "#00e5ff", glow: "#00e5ff" } :
    score >= 60 ? { name: "GOLD",     color: "#ff3d8b", glow: "#ff3d8b" } :
    score >= 40 ? { name: "SILVER",   color: "#c724ff", glow: "#c724ff" } :
    score >= 20 ? { name: "BRONZE",   color: "#ff8c42", glow: "#ff8c42" } :
                  { name: "STARTER",  color: "#9aa0b4", glow: "#9aa0b4" };


  return { score, tier, metrics, totalPeerN };
}

// ---------- Hooks: agregat & ratingurile mele ----------
function usePeerAgg(userId?: string | null) {
  return useQuery({
    queryKey: ["rep-agg", userId],
    enabled: !!userId,
    queryFn: async (): Promise<PeerAgg> => {
      const { data } = await supabase
        .from("user_ratings" as any)
        .select("category, value")
        .eq("rated_id", userId!);
      const out: PeerAgg = {};
      for (const r of ((data ?? []) as unknown) as Array<{ category: CatKey; value: number }>) {
        const cur = out[r.category] ?? { avg: 0, n: 0 };
        const n = cur.n + 1;
        out[r.category] = { avg: (cur.avg * cur.n + r.value) / n, n };
      }
      return out;
    },
  });
}

function useMyRatingsFor(raterId?: string | null, ratedId?: string | null) {
  return useQuery({
    queryKey: ["my-ratings", raterId, ratedId],
    enabled: !!raterId && !!ratedId && raterId !== ratedId,
    queryFn: async (): Promise<Partial<Record<CatKey, number>>> => {
      const { data } = await supabase
        .from("user_ratings" as any)
        .select("category, value")
        .eq("rater_id", raterId!)
        .eq("rated_id", ratedId!);
      const out: Partial<Record<CatKey, number>> = {};
      for (const r of ((data ?? []) as unknown) as Array<{ category: CatKey; value: number }>) {
        out[r.category] = r.value;
      }
      return out;
    },
  });
}

// ---------- Public Props ----------
type Props = {
  userId: string;
  sprits: number;
  streak: number;
  longestStreak: number;
  followers: number;
  following: number;
  aura: number;
  hasAvatar: boolean;
  hasBio: boolean;
  createdAt?: string | null;
  /** dacă cardul e pe profilul altcuiva, permite rating */
  allowRating?: boolean;
  /** stil compact (chip mic) — default true */
  compact?: boolean;
};

export function ReputationCard(props: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const { data: peers } = usePeerAgg(props.userId);

  const days = props.createdAt
    ? Math.max(0, Math.floor((Date.now() - +new Date(props.createdAt)) / 86_400_000))
    : 0;

  const rep = computeReputation({
    sprits: props.sprits,
    streak: props.streak,
    longestStreak: props.longestStreak,
    followers: props.followers,
    following: props.following,
    aura: props.aura,
    hasAvatar: props.hasAvatar,
    hasBio: props.hasBio,
    accountAgeDays: days,
  }, peers ?? {});

  const canRate = !!props.allowRating && !!user && user.id !== props.userId;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="group relative w-full rounded-2xl active:scale-[0.985] transition overflow-hidden p-[1px]"
          aria-label="Vezi reputația"
          style={{
            background: `linear-gradient(135deg, ${rep.tier.color}66, transparent 50%, ${rep.tier.color}33)`,
          }}
        >
          <div
            className="relative rounded-2xl px-3.5 py-2.5 flex items-center gap-3 backdrop-blur-xl"
            style={{ background: "rgba(10,10,21,0.92)" }}
          >
            {/* radial neon wash behind progress (clipped) */}
            <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
              <div
                aria-hidden
                className="absolute inset-y-0 left-0"
                style={{
                  width: `${rep.score}%`,
                  background: `linear-gradient(90deg, ${rep.tier.color}26, transparent)`,
                }}
              />
            </div>

            {/* circular score badge */}
            <div className="relative shrink-0 w-11 h-11">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center"
                style={{
                  background: `radial-gradient(circle at 30% 30%, ${rep.tier.color}33, transparent 70%), #050510`,
                  border: `1.5px solid ${rep.tier.color}`,
                  boxShadow: `0 0 10px ${rep.tier.color}66`,
                }}
              >
                <span
                  className="font-display font-black leading-none text-[16px] tabular-nums tracking-tight"
                  style={{ color: rep.tier.color, textShadow: `0 0 6px ${rep.tier.color}99` }}
                >
                  {rep.score}
                </span>
              </div>
            </div>


            {/* tier + bar */}
            <div className="relative flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1.5 gap-2">
                <span
                  className="text-[10px] font-mono font-black uppercase tracking-[0.22em] px-1.5 py-0.5 rounded-sm truncate"
                  style={{
                    color: rep.tier.color,
                    background: `${rep.tier.color}1a`,
                    textShadow: `0 0 6px ${rep.tier.color}66`,
                  }}
                >
                  {rep.tier.name}
                </span>
                <span className="text-[9px] font-mono uppercase text-white/45 flex items-center gap-1 shrink-0">
                  {rep.totalPeerN > 0 ? (
                    <>
                      <Star size={9} className="fill-current" style={{ color: rep.tier.color }} />
                      {rep.totalPeerN} voturi
                    </>
                  ) : (
                    <>reputație</>
                  )}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${rep.score}%`,
                    background: `linear-gradient(90deg, ${rep.tier.color}, ${rep.tier.color}cc)`,
                    boxShadow: `0 0 8px ${rep.tier.color}`,
                  }}
                />
              </div>
            </div>

            {canRate && (
              <div
                className="relative shrink-0 ml-1 h-7 px-2.5 rounded-full text-[10px] font-mono font-black uppercase tracking-wider flex items-center gap-1"
                style={{
                  background: "#ff3d8b",
                  color: "#050510",
                  boxShadow: "0 0 14px #ff3d8b99",
                }}
              >
                <Star size={11} className="fill-current" /> votează
              </div>
            )}
          </div>
        </button>
      </SheetTrigger>

      <SheetContent
        side="bottom"
        className="rounded-t-3xl max-h-[90vh] overflow-y-auto px-0 border-t"
        style={{
          background: "#050510",
          borderColor: `${rep.tier.color}55`,
        }}
      >
        <ReputationDetail
          rep={rep}
          peers={peers ?? {}}
          targetUserId={props.userId}
          canRate={canRate}
          onClose={() => setOpen(false)}
        />
      </SheetContent>
    </Sheet>
  );
}


// ---------- Sheet conținut ----------
function ReputationDetail({
  rep, peers, targetUserId, canRate, onClose,
}: {
  rep: ReturnType<typeof computeReputation>;
  peers: PeerAgg;
  targetUserId: string;
  canRate: boolean;
  onClose: () => void;
}) {
  // Circular ring config
  const RING = 120;
  const STROKE = 8;
  const R = (RING - STROKE) / 2;
  const C = 2 * Math.PI * R;
  const dash = (rep.score / 100) * C;

  return (
    <div className="text-white">
      <SheetHeader className="px-5 pt-4 pb-4 text-left">
        <SheetTitle className="sr-only">Reputație</SheetTitle>

        {/* Hero — circular gauge */}
        <div
          className="relative rounded-3xl overflow-hidden p-5"
          style={{
            background: "rgba(10,10,21,0.85)",
            border: `1px solid ${rep.tier.color}55`,
            boxShadow: `inset 0 0 40px ${rep.tier.color}1f`,
          }}
        >
          {/* corner glows */}
          <div
            aria-hidden
            className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl pointer-events-none"
            style={{ background: rep.tier.color, opacity: 0.2 }}
          />
          <div
            aria-hidden
            className="absolute -bottom-20 -left-12 w-44 h-44 rounded-full blur-3xl pointer-events-none"
            style={{ background: rep.tier.color, opacity: 0.12 }}
          />

          <div className="relative flex items-center gap-5">
            {/* Ring */}
            <div className="relative shrink-0" style={{ width: RING, height: RING }}>
              <svg width={RING} height={RING} className="-rotate-90">
                <circle
                  cx={RING / 2}
                  cy={RING / 2}
                  r={R}
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth={STROKE}
                />
                <circle
                  cx={RING / 2}
                  cy={RING / 2}
                  r={R}
                  fill="none"
                  stroke={rep.tier.color}
                  strokeWidth={STROKE}
                  strokeLinecap="round"
                  strokeDasharray={`${dash} ${C}`}
                  style={{
                    filter: `drop-shadow(0 0 6px ${rep.tier.color})`,
                    transition: "stroke-dasharray 0.6s ease",
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span
                  className="font-display font-black leading-none text-[40px] tabular-nums tracking-tighter"
                  style={{ color: rep.tier.color, textShadow: `0 0 18px ${rep.tier.color}aa` }}
                >
                  {rep.score}
                </span>
                <span className="text-[9px] font-mono uppercase tracking-[0.25em] text-white/40 mt-0.5">
                  / 100
                </span>
              </div>
            </div>

            {/* Tier + meta */}
            <div className="flex-1 min-w-0 flex flex-col gap-2">
              <div className="flex items-center gap-1.5">
                <Sparkles size={11} style={{ color: rep.tier.color }} />
                <span className="text-[9px] font-mono uppercase tracking-[0.25em] text-white/50">
                  Reputație globală
                </span>
              </div>
              <div
                className="inline-flex w-fit items-center px-2.5 py-1 rounded-md font-mono text-[11px] font-black uppercase tracking-widest"
                style={{
                  color: rep.tier.color,
                  background: `${rep.tier.color}1a`,
                  border: `1px solid ${rep.tier.color}66`,
                  textShadow: `0 0 8px ${rep.tier.color}88`,
                }}
              >
                {rep.tier.name}
              </div>
              <div className="flex items-start gap-2 text-[10px] font-mono uppercase tracking-wider text-white/55 leading-snug">
                <TrendingUp size={11} className="shrink-0 mt-px" style={{ color: rep.tier.color }} />
                <span>
                  {rep.totalPeerN > 0
                    ? <>{rep.totalPeerN} voturi din comunitate + activitatea ta</>
                    : <>doar activitatea ta — nimeni nu te-a votat încă</>}
                </span>
              </div>
            </div>
          </div>
        </div>
      </SheetHeader>

      {/* Metrici */}
      <div className="px-5 pb-2">
        <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/45 mb-3 flex items-center gap-2">
          <span className="h-px flex-1 bg-white/10" />
          Categorii
          <span className="h-px flex-1 bg-white/10" />
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {CATS.map(({ key, label, icon: Icon, color }) => {
            const v = rep.metrics[key];
            const p = peers[key];
            return (
              <div
                key={key}
                className="relative rounded-2xl p-3 overflow-hidden min-w-0"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: `1px solid ${color}33`,
                }}
              >
                <div
                  aria-hidden
                  className="absolute -top-6 -right-6 w-16 h-16 rounded-full blur-2xl pointer-events-none"
                  style={{ background: color, opacity: 0.18 }}
                />
                <div className="relative flex items-center justify-between mb-2 gap-2">
                  <div
                    className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: `${color}1f`,
                      color,
                      boxShadow: `0 0 10px ${color}55, inset 0 0 6px ${color}22`,
                    }}
                  >
                    <Icon size={13} />
                  </div>
                  <span
                    className="text-base font-display font-black tabular-nums leading-none"
                    style={{ color, textShadow: `0 0 8px ${color}88` }}
                  >
                    {v}
                  </span>
                </div>
                <div className="relative text-[11px] font-bold text-white/85 truncate mb-1.5">
                  {label}
                </div>
                <div className="relative h-1 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${v}%`,
                      background: color,
                      boxShadow: `0 0 6px ${color}`,
                    }}
                  />
                </div>
                {p && p.n > 0 && (
                  <div className="relative text-[9px] font-mono uppercase text-white/40 mt-1.5 flex items-center gap-1">
                    <Star size={8} className="fill-current" style={{ color }} />
                    {p.avg.toFixed(1)} · {p.n} {p.n === 1 ? "vot" : "voturi"}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {canRate && (
        <div className="mt-5 px-5 pb-6">
          <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/45 mb-3 flex items-center gap-2">
            <span className="h-px flex-1 bg-white/10" />
            Acordă rating
            <span className="h-px flex-1 bg-white/10" />
          </div>
          <RatingEditor targetUserId={targetUserId} onSaved={onClose} />
        </div>
      )}

      {!canRate && (
        <div className="px-5 pb-6 pt-3">
          <div
            className="rounded-2xl p-4 text-[11px] text-white/60 text-center italic"
            style={{
              fontFamily: "'Instrument Serif', serif",
              background: "rgba(255,255,255,0.03)",
              border: "1px dashed rgba(255,255,255,0.12)",
            }}
          >
            Nu te poți auto-vota. Mergi pe profilul cuiva și acordă-i stele.
          </div>
        </div>
      )}
    </div>
  );
}


// ---------- Editor rating (stele 1..5 pe 6 categorii) ----------
function RatingEditor({ targetUserId, onSaved }: { targetUserId: string; onSaved: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: existing } = useMyRatingsFor(user?.id, targetUserId);
  const [draft, setDraft] = useState<Partial<Record<CatKey, number>>>({});
  const values: Partial<Record<CatKey, number>> = { ...existing, ...draft };

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Nu ești autentificat");
      const rows = (Object.entries(draft) as [CatKey, number][])
        .filter(([, v]) => v >= 1 && v <= 5)
        .map(([category, value]) => ({
          rater_id: user.id, rated_id: targetUserId, category, value,
        }));
      if (rows.length === 0) return;
      const { error } = await supabase
        .from("user_ratings" as any)
        .upsert(rows, { onConflict: "rater_id,rated_id,category" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rating salvat");
      qc.invalidateQueries({ queryKey: ["rep-agg", targetUserId] });
      qc.invalidateQueries({ queryKey: ["my-ratings", user?.id, targetUserId] });
      onSaved();
    },
    onError: (e: any) => toast.error(e.message ?? "Eroare"),
  });

  const hasChanges = Object.keys(draft).length > 0;

  return (
    <div className="space-y-3">
      {CATS.map(({ key, label, icon: Icon, color }) => {
        const v = values[key] ?? 0;
        return (
          <div key={key} className="flex items-center gap-3">
            <div
              className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${color}18`, color }}
            >
              <Icon size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-semibold mb-1">{label}</div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, [key]: n }))}
                    className="p-1 active:scale-90 transition"
                    aria-label={`${n} stele`}
                  >
                    <Star
                      size={20}
                      className={n <= v ? "fill-current" : ""}
                      style={{ color: n <= v ? color : "var(--muted-foreground)" }}
                    />
                  </button>
                ))}
                {v > 0 && (
                  <button
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, [key]: 0 }))}
                    className="ml-1 text-[9px] font-mono uppercase text-muted-foreground hover:text-foreground"
                  >
                    șterge
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        disabled={!hasChanges || save.isPending}
        onClick={() => save.mutate()}
        className="w-full mt-2 h-11 rounded-xl bg-neon-crimson text-white font-display font-black uppercase tracking-wider text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-40"
      >
        <Star size={15} className="fill-current" />
        {save.isPending ? "Se salvează..." : "Trimite ratingul"}
      </button>
      <p className="text-[10px] text-muted-foreground text-center font-mono">
        Poți modifica oricând. 0 stele = șters.
      </p>
    </div>
  );
}

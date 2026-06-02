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
  { key: "respect",      label: "Respect",       short: "respect",  icon: Shield,     color: "var(--neon-purple)" },
  { key: "reliability",  label: "Fiabilitate",   short: "fiabil",   icon: Clock,      color: "var(--neon-green)" },
  { key: "energy",       label: "Energie",       short: "energie",  icon: Zap,        color: "var(--sunset-orange)" },
  { key: "friendliness", label: "Prietenie",     short: "prieten",  icon: Smile,      color: "var(--sunset-magenta)" },
  { key: "contribution", label: "Aport la fază", short: "aport",    icon: GlassWater, color: "var(--neon-crimson)" },
  { key: "trust",        label: "Încredere",     short: "trust",    icon: Lock,       color: "var(--neon-green)" },
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
    score >= 90 ? { name: "LEGEND",   color: "var(--sunset-orange)",   glow: "var(--sunset-orange)" } :
    score >= 75 ? { name: "PLATINUM", color: "var(--sunset-magenta)",  glow: "var(--sunset-magenta)" } :
    score >= 60 ? { name: "GOLD",     color: "var(--neon-purple)",     glow: "var(--neon-purple)" } :
    score >= 40 ? { name: "SILVER",   color: "var(--neon-green)",      glow: "var(--neon-green)" } :
    score >= 20 ? { name: "BRONZE",   color: "var(--muted-foreground)",glow: "var(--muted-foreground)" } :
                  { name: "STARTER",  color: "var(--muted-foreground)",glow: "var(--muted-foreground)" };

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
      for (const r of (data ?? []) as Array<{ category: CatKey; value: number }>) {
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
      for (const r of (data ?? []) as Array<{ category: CatKey; value: number }>) {
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
          className="group relative w-full rounded-full bg-foreground/[0.04] hover:bg-foreground/[0.07] active:scale-[0.985] transition border border-foreground/10 px-3 py-2 flex items-center gap-3 overflow-hidden"
          aria-label="Vezi reputația"
        >
          {/* glow în spate */}
          <div
            className="absolute inset-y-0 left-0 w-[var(--w)] opacity-[0.18] blur-[18px] pointer-events-none"
            style={{ background: rep.tier.color, ['--w' as any]: `${rep.score}%` }}
          />
          {/* scor */}
          <div className="relative flex items-baseline gap-1 shrink-0">
            <div
              className="font-display font-black leading-none text-[22px] tabular-nums tracking-tight"
              style={{ color: rep.tier.color }}
            >
              {rep.score}
            </div>
            <div className="text-[9px] font-mono uppercase text-muted-foreground">/100</div>
          </div>

          {/* tier + bar */}
          <div className="relative flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span
                className="text-[9px] font-mono font-bold uppercase tracking-[0.18em]"
                style={{ color: rep.tier.color }}
              >
                {rep.tier.name}
              </span>
              <span className="text-[9px] font-mono uppercase text-muted-foreground flex items-center gap-1">
                {rep.totalPeerN > 0 ? (
                  <><Star size={9} className="fill-current" /> {rep.totalPeerN} voturi</>
                ) : (
                  <>reputație</>
                )}
              </span>
            </div>
            <div className="h-1 rounded-full bg-foreground/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${rep.score}%`, background: rep.tier.color }}
              />
            </div>
          </div>

          {canRate && (
            <div className="relative shrink-0 ml-1 h-7 px-2.5 rounded-full bg-neon-crimson text-white text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
              <Star size={11} className="fill-current" /> votează
            </div>
          )}
        </button>
      </SheetTrigger>

      <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] overflow-y-auto px-0">
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
  return (
    <div>
      <SheetHeader className="px-5 pt-2 pb-4 text-left">
        <SheetTitle className="sr-only">Reputație</SheetTitle>

        {/* Hero score */}
        <div className="relative rounded-3xl border border-foreground/10 overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.18]"
            style={{ background: `radial-gradient(120% 80% at 0% 0%, ${rep.tier.color}, transparent 60%)` }}
          />
          <div className="relative p-5">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={12} style={{ color: rep.tier.color }} />
              <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground">
                Reputație globală
              </span>
            </div>
            <div className="flex items-end gap-3">
              <div
                className="font-display font-black leading-none text-[72px] tracking-tighter tabular-nums"
                style={{ color: rep.tier.color, textShadow: `0 0 28px ${rep.tier.color}55` }}
              >
                {rep.score}
              </div>
              <div className="pb-3 text-xs text-muted-foreground">/ 100</div>
              <div className="ml-auto pb-2">
                <div
                  className="px-2.5 py-1 rounded-md border text-[10px] font-mono uppercase tracking-widest"
                  style={{ color: rep.tier.color, borderColor: `${rep.tier.color}55`, background: `${rep.tier.color}10` }}
                >
                  {rep.tier.name}
                </div>
              </div>
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-foreground/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${rep.score}%`, background: rep.tier.color }}
              />
            </div>
            <div className="mt-3 flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              <TrendingUp size={11} />
              {rep.totalPeerN > 0
                ? <>{rep.totalPeerN} voturi din comunitate + activitatea ta</>
                : <>doar activitatea ta — nimeni nu te-a votat încă</>}
            </div>
          </div>
        </div>
      </SheetHeader>

      {/* Metrici */}
      <div className="px-5 pb-2">
        <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground mb-2.5">
          Categorii
        </div>
        <div className="space-y-2.5">
          {CATS.map(({ key, label, icon: Icon, color }) => {
            const v = rep.metrics[key];
            const p = peers[key];
            return (
              <div key={key} className="flex items-center gap-3">
                <div
                  className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${color}18`, color }}
                >
                  <Icon size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] font-semibold">{label}</span>
                    <span className="text-[11px] font-mono tabular-nums" style={{ color }}>{v}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-foreground/10 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${v}%`, background: color }} />
                  </div>
                  {p && p.n > 0 && (
                    <div className="text-[9px] font-mono uppercase text-muted-foreground mt-0.5">
                      ★ {p.avg.toFixed(1)} · {p.n} {p.n === 1 ? "vot" : "voturi"}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {canRate && (
        <div className="mt-4 px-5 pb-6">
          <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground mb-2.5">
            Acordă rating
          </div>
          <RatingEditor targetUserId={targetUserId} onSaved={onClose} />
        </div>
      )}

      {!canRate && (
        <div className="px-5 pb-6 pt-2">
          <div className="rounded-2xl border border-dashed border-foreground/15 p-4 text-[11px] text-muted-foreground text-center">
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

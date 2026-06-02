import { Shield, Clock, Zap, Smile, GlassWater, Lock } from "lucide-react";

type Inputs = {
  sprits: number;
  streak: number;
  longestStreak: number;
  followers: number;
  following: number;
  aura: number;
  hasAvatar: boolean;
  hasBio: boolean;
  accountAgeDays: number;
};

// Pure, deterministic. No AI. No server call.
export function computeReputation(i: Inputs) {
  const sat = (v: number, k: number) => 1 - Math.exp(-v / k); // saturating 0..1

  const respect      = Math.round(100 * (0.4 + 0.6 * sat(i.longestStreak, 14)));
  const reliability  = Math.round(100 * (0.3 + 0.7 * sat(i.streak, 10)));
  const energy       = Math.round(100 * sat(i.sprits, 40));
  const friendliness = Math.round(100 * sat(i.followers + i.following * 0.5, 60));
  const contribution = Math.round(100 * sat(i.aura, 200));
  const trust = Math.round(
    100 * (0.2
      + 0.25 * sat(i.accountAgeDays, 60)
      + 0.25 * (i.hasAvatar ? 1 : 0)
      + 0.15 * (i.hasBio ? 1 : 0)
      + 0.35 * sat(i.sprits, 20))
  );

  const score = Math.round(
    0.10 * respect +
    0.20 * reliability +
    0.25 * energy +
    0.15 * friendliness +
    0.15 * contribution +
    0.15 * trust
  );

  const tier =
    score >= 90 ? { name: "LEGEND",   color: "var(--sunset-orange)" } :
    score >= 75 ? { name: "PLATINUM", color: "var(--sunset-magenta)" } :
    score >= 60 ? { name: "GOLD",     color: "var(--neon-purple)" } :
    score >= 40 ? { name: "SILVER",   color: "var(--neon-green)" } :
    score >= 20 ? { name: "BRONZE",   color: "var(--muted-foreground)" } :
                  { name: "STARTER",  color: "var(--muted-foreground)" };

  return {
    score,
    tier,
    metrics: { respect, reliability, energy, friendliness, contribution, trust },
  };
}

type Props = {
  sprits: number;
  streak: number;
  longestStreak: number;
  followers: number;
  following: number;
  aura: number;
  hasAvatar: boolean;
  hasBio: boolean;
  createdAt?: string | null;
};

export function ReputationCard(props: Props) {
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
  });

  const m = rep.metrics;
  const bars: Array<{ key: keyof typeof m; label: string; icon: any }> = [
    { key: "respect",      label: "respect",   icon: Shield },
    { key: "reliability",  label: "fiabil",    icon: Clock },
    { key: "energy",       label: "energie",   icon: Zap },
    { key: "friendliness", label: "prieten",   icon: Smile },
    { key: "contribution", label: "aport",     icon: GlassWater },
    { key: "trust",        label: "încredere", icon: Lock },
  ];

  return (
    <div className="mt-4 rounded-2xl border border-foreground/10 bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          Reputație
        </div>
        <div
          className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-md border"
          style={{ color: rep.tier.color, borderColor: `${rep.tier.color}55`, background: `${rep.tier.color}10` }}
        >
          {rep.tier.name}
        </div>
      </div>

      <div className="flex items-end gap-3">
        <div
          className="font-display font-black leading-none text-[56px] tracking-tighter"
          style={{ color: rep.tier.color }}
        >
          {rep.score}
        </div>
        <div className="pb-2 text-[11px] text-muted-foreground">/ 100</div>
        <div className="ml-auto pb-1 text-[10px] font-mono uppercase text-muted-foreground text-right leading-tight">
          calculat din<br />activitatea ta
        </div>
      </div>

      <div className="mt-3 h-1.5 rounded-full bg-foreground/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${rep.score}%`, background: rep.tier.color }}
        />
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-2 mt-4">
        {bars.map(({ key, label, icon: Icon }) => (
          <div key={key} className="flex items-center gap-2">
            <Icon size={12} className="text-muted-foreground shrink-0" />
            <div className="text-[11px] uppercase font-mono tracking-wider w-16 shrink-0 text-muted-foreground">
              {label}
            </div>
            <div className="flex-1 h-1 rounded-full bg-foreground/10 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${m[key]}%`, background: rep.tier.color }}
              />
            </div>
            <div className="text-[10px] font-mono w-7 text-right tabular-nums">{m[key]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

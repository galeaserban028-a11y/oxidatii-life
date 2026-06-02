import { Link } from "@tanstack/react-router";
import { Crown, Sparkles, Gem, Star } from "lucide-react";

export type PremiumTier = "vip" | "vip_plus" | "pro" | "elite" | null | undefined;

const TIER_META: Record<string, { label: string; icon: typeof Crown; cls: string; glow: string }> = {
  vip:      { label: "VIP",   icon: Star,     cls: "from-amber-300 to-amber-500 text-black",        glow: "shadow-[0_0_12px_rgba(251,191,36,0.55)]" },
  vip_plus: { label: "VIP+",  icon: Sparkles, cls: "from-pink-400 to-fuchsia-500 text-white",       glow: "shadow-[0_0_14px_rgba(236,72,153,0.6)]" },
  pro:      { label: "PRO",   icon: Crown,    cls: "from-violet-500 to-indigo-600 text-white",      glow: "shadow-[0_0_16px_rgba(139,92,246,0.7)]" },
  elite:    { label: "ELITE", icon: Gem,      cls: "from-cyan-300 via-fuchsia-400 to-amber-300 text-black", glow: "shadow-[0_0_22px_rgba(244,114,182,0.8)]" },
};

export function PremiumBadge({ tier, size = "sm", asLink = true }: { tier: PremiumTier; size?: "xs" | "sm" | "md"; asLink?: boolean }) {
  if (!tier) {
    if (!asLink) return null;
    return (
      <Link
        to="/app/premium"
        className="inline-flex items-center gap-1 rounded-full bg-foreground/10 border border-foreground/15 px-2 py-[2px] text-[10px] font-mono uppercase tracking-wider text-foreground/80 hover:bg-foreground/15 active:scale-95 transition"
      >
        <Sparkles size={10} className="text-amber-400" />
        Devino VIP
      </Link>
    );
  }
  const meta = TIER_META[tier] ?? TIER_META.vip;
  const Icon = meta.icon;
  const px = size === "xs" ? "px-1.5 py-[1px] text-[9px]" : size === "md" ? "px-2.5 py-[3px] text-[12px]" : "px-2 py-[2px] text-[10px]";
  const iconSize = size === "xs" ? 9 : size === "md" ? 13 : 11;
  const Inner = (
    <span className={`inline-flex items-center gap-1 rounded-full font-mono font-bold uppercase tracking-wider bg-gradient-to-r ${meta.cls} ${meta.glow} ${px}`}>
      <Icon size={iconSize} strokeWidth={2.6} />
      {meta.label}
    </span>
  );
  return asLink ? <Link to="/app/premium" className="active:scale-95 transition">{Inner}</Link> : Inner;
}

import { tierConfig, type BusinessTier } from "@/lib/biz/tiers";

export function TierBadge({
  tier,
  size = "sm",
  withName = true,
}: {
  tier: string | null | undefined;
  size?: "xs" | "sm" | "md";
  withName?: boolean;
}) {
  const t = tierConfig(tier);
  const padding =
    size === "xs"
      ? "px-1.5 py-0.5 text-[10px]"
      : size === "md"
        ? "px-3 py-1.5 text-sm"
        : "px-2 py-0.5 text-xs";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-bold uppercase tracking-wider ${padding}`}
      style={{
        background: `color-mix(in oklab, ${t.color} 18%, transparent)`,
        color: t.color,
        border: `1px solid color-mix(in oklab, ${t.color} 45%, transparent)`,
      }}
    >
      <span>{t.badgeEmoji}</span>
      {withName && <span>{t.name}</span>}
    </span>
  );
}

export function TierDot({ tier }: { tier: BusinessTier | string | null | undefined }) {
  const t = tierConfig(tier);
  return (
    <span
      aria-hidden
      className="inline-block size-2 rounded-full"
      style={{ background: t.color, boxShadow: `0 0 8px ${t.color}` }}
    />
  );
}

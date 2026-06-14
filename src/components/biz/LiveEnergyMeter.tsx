import { Flame } from "lucide-react";

export function LiveEnergyMeter({ value, max = 50 }: { value: number; max?: number }) {
  const pct = Math.max(0, Math.min(1, value / max));
  const flames = pct > 0.66 ? 3 : pct > 0.33 ? 2 : pct > 0.05 ? 1 : 0;
  const color = pct > 0.66 ? "var(--tier-elite)" : pct > 0.33 ? "var(--tier-popular)" : "var(--muted-foreground)";
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-background/60 px-2 py-0.5 text-xs font-semibold" style={{ color }}>
      {Array.from({ length: 3 }).map((_, i) => (
        <Flame
          key={i}
          className="size-3"
          style={{ opacity: i < flames ? 1 : 0.25, fill: i < flames ? color : "none" }}
        />
      ))}
      <span className="tabular-nums">{value}</span>
    </span>
  );
}

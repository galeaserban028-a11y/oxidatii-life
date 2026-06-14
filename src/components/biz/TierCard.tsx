import { Check, X } from "lucide-react";
import type { TierConfig } from "@/lib/biz/tiers";

interface Props {
  tier: TierConfig;
  current?: boolean;
  highlight?: boolean;
  onSelect?: () => void;
  busy?: boolean;
}

export function TierCard({ tier, current, highlight, onSelect, busy }: Props) {
  const features = tier.features;
  const lines: { label: string; ok: boolean | string }[] = [
    {
      label:
        features.feedSponsoredPerWeek === "unlimited"
          ? "Posturi sponsorizate nelimitate"
          : `${features.feedSponsoredPerWeek} post sponsorizat / săpt.`,
      ok: true,
    },
    { label: "Stories în top app", ok: features.stories },
    {
      label:
        features.eventsActive === "unlimited"
          ? "Evenimente nelimitate"
          : `${features.eventsActive} eveniment activ`,
      ok: true,
    },
    {
      label: `Marker hartă: ${
        { standard: "standard", pulse: "pulsatoriu", animated: "animat 3D", signature: "signature 👑" }[
          features.mapMarker
        ]
      }`,
      ok: true,
    },
    { label: "🔥 Featured Tonight eligibil", ok: features.featuredTonight },
    { label: "Push notifications către utilizatori", ok: features.pushNotifications },
    { label: "Slot pe homepage", ok: features.homepageHero },
    { label: "Co-branded city events", ok: features.coBrandedCityEvents },
    {
      label: `Analytics: ${
        { basic: "basic", demographics: "+demografice", advanced: "+conversii & A/B", exports: "+exporturi CSV" }[
          features.analytics
        ]
      }`,
      ok: true,
    },
    {
      label: `Branding: ${
        { logo: "logo + culoare", gallery: "+galerie & link", theme: "temă custom", full: "full creative" }[
          features.branding
        ]
      }`,
      ok: true,
    },
    { label: `Boost ranking: ×${tier.promotionWeight}`, ok: true },
  ];

  return (
    <div
      className={`relative rounded-3xl border bg-card/60 p-6 transition ${
        highlight ? tier.glowClass : ""
      } ${current ? "ring-2" : ""}`}
      style={{
        borderColor: highlight
          ? `color-mix(in oklab, ${tier.color} 60%, transparent)`
          : "color-mix(in oklab, var(--foreground) 12%, transparent)",
        ...(current ? { ["--tw-ring-color" as never]: tier.color } : {}),
      }}
    >
      {highlight && (
        <span
          className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest"
          style={{ background: tier.color, color: "oklch(0.15 0.02 30)" }}
        >
          Recomandat
        </span>
      )}
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-2xl font-black tracking-tight" style={{ color: tier.color }}>
          {tier.badgeEmoji} {tier.name}
        </h3>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{tier.tagline}</p>
      <div className="mt-5 flex items-baseline gap-2">
        <span className="text-4xl font-black">{tier.priceRonPerMonth.toLocaleString("ro-RO")}</span>
        <span className="text-sm text-muted-foreground">RON / lună</span>
      </div>
      <p className="text-xs text-muted-foreground">≈ €{tier.priceEur} · fără TVA</p>

      <ul className="mt-6 space-y-2 text-sm">
        {lines.map((l, i) => (
          <li key={i} className="flex items-start gap-2">
            {l.ok ? (
              <Check className="mt-0.5 size-4 shrink-0" style={{ color: tier.color }} />
            ) : (
              <X className="mt-0.5 size-4 shrink-0 text-muted-foreground/50" />
            )}
            <span className={l.ok ? "text-foreground" : "text-muted-foreground/60 line-through"}>{l.label}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onSelect}
        disabled={busy || current}
        className="mt-6 w-full rounded-2xl px-4 py-3 text-sm font-bold uppercase tracking-wider transition disabled:opacity-60"
        style={{
          background: current ? "transparent" : tier.color,
          color: current ? tier.color : "oklch(0.15 0.02 30)",
          border: current ? `1px solid ${tier.color}` : "none",
        }}
      >
        {current ? "Plan curent" : busy ? "Se procesează…" : `Activează ${tier.name}`}
      </button>
    </div>
  );
}

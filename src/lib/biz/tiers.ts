// Business tier configuration — single source of truth for the
// Starter / Popular / Elite / Exclusive promotion system.

export type BusinessTier = "starter" | "popular" | "elite" | "exclusive";

export interface TierConfig {
  id: BusinessTier;
  name: string;
  tagline: string;
  priceRonPerMonth: number;
  priceEur: number;
  promotionWeight: number; // multiplier in ranking algorithm
  features: {
    feedSponsoredPerWeek: number | "unlimited";
    stories: boolean;
    eventsActive: number | "unlimited";
    mapMarker: "standard" | "pulse" | "animated" | "signature";
    featuredTonight: boolean;
    pushNotifications: boolean;
    homepageHero: boolean;
    coBrandedCityEvents: boolean;
    analytics: "basic" | "demographics" | "advanced" | "exports";
    branding: "logo" | "gallery" | "theme" | "full";
    moderation: "pre" | "post";
  };
  color: string; // CSS var key
  glowClass: string; // tailwind utility from styles.css
  badgeEmoji: string;
}

export const TIERS: Record<BusinessTier, TierConfig> = {
  starter: {
    id: "starter",
    name: "Starter",
    tagline: "Apari pe radar. Punct.",
    priceRonPerMonth: 500,
    priceEur: 100,
    promotionWeight: 1.3,
    features: {
      feedSponsoredPerWeek: 1,
      stories: false,
      eventsActive: 1,
      mapMarker: "standard",
      featuredTonight: false,
      pushNotifications: false,
      homepageHero: false,
      coBrandedCityEvents: false,
      analytics: "basic",
      branding: "logo",
      moderation: "pre",
    },
    color: "var(--tier-starter)",
    glowClass: "tier-glow-starter",
    badgeEmoji: "✦",
  },
  popular: {
    id: "popular",
    name: "Popular",
    tagline: "Lumea te vede. Și revine.",
    priceRonPerMonth: 1000,
    priceEur: 200,
    promotionWeight: 2.0,
    features: {
      feedSponsoredPerWeek: 3,
      stories: true,
      eventsActive: 3,
      mapMarker: "pulse",
      featuredTonight: false,
      pushNotifications: false,
      homepageHero: false,
      coBrandedCityEvents: false,
      analytics: "demographics",
      branding: "gallery",
      moderation: "post",
    },
    color: "var(--tier-popular)",
    glowClass: "tier-glow-popular",
    badgeEmoji: "★",
  },
  elite: {
    id: "elite",
    name: "Elite",
    tagline: "Featured Tonight. În fiecare seară.",
    priceRonPerMonth: 2000,
    priceEur: 400,
    promotionWeight: 3.5,
    features: {
      feedSponsoredPerWeek: "unlimited",
      stories: true,
      eventsActive: "unlimited",
      mapMarker: "animated",
      featuredTonight: true,
      pushNotifications: true,
      homepageHero: false,
      coBrandedCityEvents: false,
      analytics: "advanced",
      branding: "theme",
      moderation: "post",
    },
    color: "var(--tier-elite)",
    glowClass: "tier-glow-elite",
    badgeEmoji: "⭐",
  },
  exclusive: {
    id: "exclusive",
    name: "Exclusive Partner",
    tagline: "Maxim 3 / oraș. Restul așteaptă la rând.",
    priceRonPerMonth: 5000,
    priceEur: 1000,
    promotionWeight: 5.0,
    features: {
      feedSponsoredPerWeek: "unlimited",
      stories: true,
      eventsActive: "unlimited",
      mapMarker: "signature",
      featuredTonight: true,
      pushNotifications: true,
      homepageHero: true,
      coBrandedCityEvents: true,
      analytics: "exports",
      branding: "full",
      moderation: "post",
    },
    color: "var(--tier-exclusive)",
    glowClass: "tier-glow-exclusive",
    badgeEmoji: "👑",
  },
};

export const TIER_ORDER: BusinessTier[] = ["starter", "popular", "elite", "exclusive"];

export function tierConfig(tier: string | null | undefined): TierConfig {
  if (tier && tier in TIERS) return TIERS[tier as BusinessTier];
  return TIERS.starter;
}

export function isTierAtLeast(tier: string | null | undefined, min: BusinessTier): boolean {
  const a = TIER_ORDER.indexOf((tier ?? "starter") as BusinessTier);
  const b = TIER_ORDER.indexOf(min);
  return a >= 0 && b >= 0 && a >= b;
}

export function priceLabel(t: TierConfig): string {
  return `${t.priceRonPerMonth.toLocaleString("ro-RO")} RON / lună`;
}

/**
 * Premium entitlements — single source of truth for "is this user actually
 * entitled to premium feature X right now?"
 *
 * Reads from `profiles.premium_tier` + `profiles.premium_until` (kept in sync
 * by the Stripe webhook at /api/public/payments/webhook). A row counts as
 * "active" only when `premium_until` is null (legacy/lifetime) OR strictly
 * in the future. Expired rows behave as no tier, even if `premium_tier` is
 * still set in the DB (e.g. webhook lag, cancellation grace window past).
 *
 * Use `useEntitlements()` in components. Never gate on `profile.premium_tier`
 * alone — it ignores expiry.
 */
import { useMemo } from "react";
import { useAuth } from "@/lib/auth";

export type PremiumTier = "vip" | "vip_plus" | "pro" | "elite";

const TIER_RANK: Record<PremiumTier, number> = {
  vip: 1,
  vip_plus: 2,
  pro: 3,
  elite: 4,
};

export type Entitlements = {
  /** Effective tier — null when subscription expired or never subscribed. */
  tier: PremiumTier | null;
  /** True when the user has any active premium tier right now. */
  isActive: boolean;
  /** When the current entitlement expires (ISO). null = lifetime / none. */
  expiresAt: string | null;
  /** Tier ≥ vip (any paid tier). */
  isVip: boolean;
  /** Tier ≥ vip+. Unlocks profile themes, "who rated you", etc. */
  isVipPlus: boolean;
  /** Tier ≥ pro. Unlocks reputation analytics, music clip, animated bg, boost. */
  isPro: boolean;
  /** Tier === elite. Featured on Discover, founder perks. */
  isElite: boolean;
  /** True iff effective tier is ≥ `min`. */
  hasTier: (min: PremiumTier) => boolean;
};

export function computeEntitlements(
  rawTier: string | null | undefined,
  premiumUntil: string | null | undefined,
): Entitlements {
  const isKnownTier = (rawTier ?? "") in TIER_RANK;
  const expiresAt = premiumUntil ?? null;
  const notExpired = !expiresAt || new Date(expiresAt).getTime() > Date.now();
  const active = isKnownTier && notExpired;
  const tier = active ? (rawTier as PremiumTier) : null;
  const rank = tier ? TIER_RANK[tier] : 0;

  return {
    tier,
    isActive: active,
    expiresAt,
    isVip: rank >= TIER_RANK.vip,
    isVipPlus: rank >= TIER_RANK.vip_plus,
    isPro: rank >= TIER_RANK.pro,
    isElite: rank >= TIER_RANK.elite,
    hasTier: (min) => rank >= TIER_RANK[min],
  };
}

export function useEntitlements(): Entitlements {
  const { profile } = useAuth();
  const p = profile as { premium_tier?: string | null; premium_until?: string | null } | null;
  return useMemo(
    () => computeEntitlements(p?.premium_tier ?? null, p?.premium_until ?? null),
    [p?.premium_tier, p?.premium_until],
  );
}

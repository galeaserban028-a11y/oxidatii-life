import { supabase } from "@/integrations/supabase/client";

/**
 * Client helper: check whether the current user is allowed to perform `action`.
 * Returns true if allowed; false if rate-limited.
 *
 * Default limits (override per call):
 *  - check_in: 10 / minute
 *  - vote: 30 / minute
 *  - message: 60 / minute
 *  - party_join: 10 / minute
 *  - story_post: 10 / 5 min
 */
export async function checkRateLimit(
  action: string,
  maxPerWindow: number,
  windowSeconds: number = 60,
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("check_rate_limit", {
      _action: action,
      _max_per_window: maxPerWindow,
      _window_seconds: windowSeconds,
    });
    if (error) {
      // Fail-open on infra error so a broken RPC doesn't lock users out.
      console.warn("[rate-limit] rpc error, allowing:", error.message);
      return true;
    }
    return data === true;
  } catch (e) {
    console.warn("[rate-limit] threw, allowing:", e);
    return true;
  }
}

export const RATE_LIMITS = {
  check_in: { max: 10, window: 60 },
  vote: { max: 30, window: 60 },
  message: { max: 60, window: 60 },
  party_join: { max: 10, window: 60 },
  story_post: { max: 10, window: 300 },
} as const;

export type RateLimitedAction = keyof typeof RATE_LIMITS;

export async function guardRateLimit(action: RateLimitedAction): Promise<boolean> {
  const cfg = RATE_LIMITS[action];
  return checkRateLimit(action, cfg.max, cfg.window);
}

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendPushToUsers, type PushPayload } from "./push-send.server";

/**
 * Smart push wrapper with context awareness:
 *   - Quiet hours (Europe/Bucharest 02:00–09:00) unless `important`
 *   - Per-user per-kind frequency cap via public.rate_limits
 *   - Skips users blocked by their notification_prefs (handled upstream via filterByPref)
 */
export type SmartPushOptions = {
  /** Logical kind, e.g. "heat_now", "party_join". Used for rate limiting. */
  kind: string;
  /** Max sends per user within `windowMinutes`. Default 1. */
  maxPerWindow?: number;
  /** Window length in minutes. Default 60. */
  windowMinutes?: number;
  /** If true, bypass quiet hours (use sparingly: direct DM, accepted invite). */
  important?: boolean;
};

const TZ = "Europe/Bucharest";

function isQuietHourBucharest(now = new Date()): boolean {
  // 02:00 – 09:00 local
  const h = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ,
      hour: "2-digit",
      hour12: false,
    }).format(now),
  );
  return h >= 2 && h < 9;
}

async function filterByFreqCap(
  userIds: string[],
  kind: string,
  maxPerWindow: number,
  windowMinutes: number,
): Promise<string[]> {
  if (!userIds.length) return [];
  const action = `push:${kind}`;
  const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();
  const { data } = await supabaseAdmin
    .from("rate_limits")
    .select("user_id, count, window_start")
    .eq("action", action)
    .in("user_id", userIds)
    .gte("window_start", since);

  const blocked = new Set(
    (data ?? [])
      .filter((r) => (r.count ?? 0) >= maxPerWindow)
      .map((r) => r.user_id as string),
  );
  return userIds.filter((id) => !blocked.has(id));
}

async function recordSends(userIds: string[], kind: string): Promise<void> {
  if (!userIds.length) return;
  const action = `push:${kind}`;
  const nowIso = new Date().toISOString();
  // Best-effort upsert (one row per user+action; bump count + window_start)
  await Promise.all(
    userIds.map(async (uid) => {
      const { data: existing } = await supabaseAdmin
        .from("rate_limits")
        .select("count")
        .eq("user_id", uid)
        .eq("action", action)
        .maybeSingle();
      if (existing) {
        await supabaseAdmin
          .from("rate_limits")
          .update({ count: (existing.count ?? 0) + 1, window_start: nowIso })
          .eq("user_id", uid)
          .eq("action", action);
      } else {
        await supabaseAdmin
          .from("rate_limits")
          .insert({ user_id: uid, action, count: 1, window_start: nowIso });
      }
    }),
  );
}

export async function smartPushToUsers(
  userIds: string[],
  payload: PushPayload,
  opts: SmartPushOptions,
): Promise<{ sent: number; failed: number; skipped: number }> {
  if (!userIds.length) return { sent: 0, failed: 0, skipped: 0 };

  const { kind, maxPerWindow = 1, windowMinutes = 60, important = false } = opts;

  // Quiet hours: drop non-important pushes
  if (!important && isQuietHourBucharest()) {
    return { sent: 0, failed: 0, skipped: userIds.length };
  }

  const allowed = await filterByFreqCap(userIds, kind, maxPerWindow, windowMinutes);
  const skipped = userIds.length - allowed.length;
  if (!allowed.length) return { sent: 0, failed: 0, skipped };

  const res = await sendPushToUsers(allowed, payload);
  if (res.sent > 0) {
    // Only count users we actually attempted; recording for `allowed` is fine
    await recordSends(allowed, kind).catch(() => {});
  }
  return { ...res, skipped };
}

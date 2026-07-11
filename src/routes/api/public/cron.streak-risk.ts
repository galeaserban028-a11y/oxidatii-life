import { createFileRoute } from "@tanstack/react-router";

/**
 * Streak-at-risk reminder. Schedule via pg_cron Sunday 18:00 Europe/Bucharest.
 * Sends to users with current_streak >= 2 whose last_streak_week is NOT this week.
 */
export const Route = createFileRoute("/api/public/cron/streak-risk")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { smartPushToUsers } = await import("@/lib/smart-push.server");

        // Compute this week's Monday in UTC
        const now = new Date();
        const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        const day = d.getUTCDay() || 7;
        if (day !== 1) d.setUTCDate(d.getUTCDate() - (day - 1));
        const thisMon = d.toISOString().slice(0, 10);

        const { data, error } = await supabaseAdmin
          .from("profiles")
          .select("id, current_streak, last_streak_week")
          .gte("current_streak", 2)
          .or(`last_streak_week.is.null,last_streak_week.lt.${thisMon}`)
          .limit(2000);
        if (error) {
          return new Response(JSON.stringify({ ok: false, error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        const ids = (data ?? []).map((r) => r.id as string);
        const res = await smartPushToUsers(
          ids,
          {
            title: "🔥 Nu-ți pierde streak-ul!",
            body: "Mai ai puțin până se închide săptămâna. Un check-in și e salvat.",
            url: "/app/map",
            tag: "streak-risk",
          },
          { kind: "streak_risk", maxPerWindow: 1, windowMinutes: 60 * 24 },
        );

        return new Response(JSON.stringify({ ok: true, candidates: ids.length, ...res }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});

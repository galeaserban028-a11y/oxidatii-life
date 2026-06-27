import { createFileRoute } from "@tanstack/react-router";
import { filterByPref } from "@/lib/push-send.server";
import { smartPushToUsers } from "@/lib/smart-push.server";

type HotCell = {
  cell_id: string;
  city_id: string | null;
  lat: number;
  lng: number;
  heat_score: number;
  recent_count: number;
  top_venue_id: string | null;
  top_venue_name: string | null;
};

async function handle(request: Request) {
  const secret = process.env.CRON_SECRET;
  const provided =
    request.headers.get("x-cron-secret") ?? new URL(request.url).searchParams.get("secret");
  if (!secret || provided !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const threshold = Math.max(40, Math.min(100, Number(url.searchParams.get("threshold") ?? 75)));
  const cooldown = Math.max(15, Math.min(360, Number(url.searchParams.get("cooldown") ?? 60)));

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Find new hot cells (also records them as alerted)
  const { data: cells, error } = await supabaseAdmin.rpc("find_new_hot_cells", {
    _threshold: threshold,
    _cooldown_minutes: cooldown,
  });
  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
  const hot = (cells ?? []) as HotCell[];
  if (!hot.length) return Response.json({ ok: true, cells: 0, sent: 0 });

  let totalSent = 0;
  let totalFailed = 0;

  for (const cell of hot) {
    if (!cell.city_id) continue;

    // Users in that city
    const { data: users } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("city_id", cell.city_id)
      .limit(2000);
    const ids = (users ?? []).map((u) => u.id as string);
    if (!ids.length) continue;

    const opted = await filterByPref(ids, "heat_now" as never);
    if (!opted.length) continue;

    const venue = cell.top_venue_name?.trim() || "zonă activă";
    const res = await smartPushToUsers(opted, {
      title: `🔥 Hotspot: ${venue}`,
      body: `Heat ${cell.heat_score} • ${cell.recent_count} mișcări în ultimele 90min`,
      url: "/app/map",
      tag: `heat-${cell.cell_id}`,
      data: { kind: "heat_now", cellId: cell.cell_id, lat: cell.lat, lng: cell.lng },
    }, { kind: "heat_now", maxPerWindow: 1, windowMinutes: 120 });
    totalSent += res.sent;
    totalFailed += res.failed;
  }

  return Response.json({ ok: true, cells: hot.length, sent: totalSent, failed: totalFailed });
}

export const Route = createFileRoute("/api/public/cron/heat-alerts")({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
    },
  },
});

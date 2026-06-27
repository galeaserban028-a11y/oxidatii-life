import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { filterByPref } from "./push-send.server";
import { smartPushToUsers } from "./smart-push.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const uuid = z.string().uuid();

// 1) Petrecere nouă în orașul tău
export const notifyNewPartyInCity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ partyId: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: party } = await supabaseAdmin
      .from("parties")
      .select("id, title, location_text, host_id, venue_id")
      .eq("id", data.partyId)
      .maybeSingle();
    if (!party) return { sent: 0 };
    if (party.host_id !== userId) return { sent: 0 };

    // Determine city: prefer venue.city_id, else host.city_id
    let cityId: string | null = null;
    if (party.venue_id) {
      const { data: v } = await supabaseAdmin
        .from("venues")
        .select("city_id")
        .eq("id", party.venue_id)
        .maybeSingle();
      cityId = v?.city_id ?? null;
    }
    if (!cityId) {
      const { data: h } = await supabaseAdmin
        .from("profiles")
        .select("city_id")
        .eq("id", party.host_id)
        .maybeSingle();
      cityId = h?.city_id ?? null;
    }
    if (!cityId) return { sent: 0 };

    const { data: targets } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("city_id", cityId)
      .neq("id", userId);

    const ids = (targets ?? []).map((t) => t.id);
    const opted = await filterByPref(ids, "new_party_in_city");
    const res = await smartPushToUsers(opted, {
      title: "🎉 Petrecere nouă în oraș",
      body: party.title + (party.location_text ? ` · ${party.location_text}` : ""),
      url: `/app/party/${party.id}`,
      tag: `party-${party.id}`,
    }, { kind: "new_party_in_city", maxPerWindow: 1, windowMinutes: 180 });
    return res;
  });

// 2) Cineva s-a alăturat petrecerii tale
export const notifyPartyJoin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ partyId: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: party } = await supabaseAdmin
      .from("parties")
      .select("id, title, host_id")
      .eq("id", data.partyId)
      .maybeSingle();
    if (!party || party.host_id === userId) return { sent: 0 };
    // Verify caller actually joined the party
    const { data: join } = await supabaseAdmin
      .from("party_joins")
      .select("user_id")
      .eq("party_id", data.partyId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!join) return { sent: 0 };

    const { data: joiner } = await supabaseAdmin
      .from("profiles")
      .select("display_name, handle")
      .eq("id", userId)
      .maybeSingle();
    const name = joiner?.handle ?? joiner?.display_name ?? "Cineva";

    const opted = await filterByPref([party.host_id], "party_join");
    const res = await smartPushToUsers(opted, {
      title: "🤝 Spot ocupat",
      body: `@${name} s-a alăturat la „${party.title}"`,
      url: `/app/party/${party.id}`,
      tag: `join-${party.id}`,
    }, { kind: "party_join", important: true, maxPerWindow: 3, windowMinutes: 60 });
    return res;
  });

// 3) Prieten live pe hartă
export const notifyFriendsLive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ checkInId: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: c } = await supabaseAdmin
      .from("check_ins")
      .select("id, venue_id, user_id")
      .eq("id", data.checkInId)
      .maybeSingle();
    if (!c || c.user_id !== userId) return { sent: 0 };

    const { data: friends } = await supabaseAdmin
      .from("friendships")
      .select("requester_id, addressee_id")
      .eq("status", "accepted")
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

    const ids = Array.from(
      new Set(
        (friends ?? [])
          .map((f) => (f.requester_id === userId ? f.addressee_id : f.requester_id))
          .filter(Boolean),
      ),
    );
    if (!ids.length) return { sent: 0 };

    const { data: me } = await supabaseAdmin
      .from("profiles")
      .select("display_name, handle")
      .eq("id", userId)
      .maybeSingle();
    const name = me?.handle ?? me?.display_name ?? "Un prieten";

    let venueName = "";
    if (c.venue_id) {
      const { data: v } = await supabaseAdmin
        .from("venues")
        .select("name")
        .eq("id", c.venue_id)
        .maybeSingle();
      venueName = v?.name ? ` la ${v.name}` : "";
    }

    const opted = await filterByPref(ids, "friend_live");
    const res = await smartPushToUsers(opted, {
      title: "📍 Prieten live",
      body: `@${name} e live${venueName}`,
      url: `/app/map`,
      tag: `live-${userId}`,
    }, { kind: `friend_live:${userId}`, maxPerWindow: 1, windowMinutes: 120 });
    return res;
  });

// 4) Provocare nouă
export const notifyChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ challengeId: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: ch } = await supabaseAdmin
      .from("challenges")
      .select("id, challenger_id, challenged_id, status, message")
      .eq("id", data.challengeId)
      .maybeSingle();
    if (!ch) return { sent: 0 };

    // Determine recipient based on who triggered & current status
    let targetId: string | null = null;
    let title = "";
    let body = "";
    if (ch.status === "pending" && userId === ch.challenger_id) {
      targetId = ch.challenged_id;
      title = "⚔️ Provocare nouă";
      body = ch.message ? `Ai fost provocat: „${ch.message}"` : "Cineva te-a provocat la șpriț";
    } else if (
      (ch.status === "accepted" || ch.status === "declined") &&
      userId === ch.challenged_id
    ) {
      targetId = ch.challenger_id;
      title = ch.status === "accepted" ? "✅ Provocare acceptată" : "❌ Provocare refuzată";
      body =
        ch.status === "accepted"
          ? "Provocarea ta a fost acceptată"
          : "Provocarea ta a fost refuzată";
    } else {
      return { sent: 0 };
    }

    const opted = await filterByPref([targetId], "challenge");
    const res = await smartPushToUsers(opted, {
      title,
      body,
      url: `/app/notifications`,
      tag: `challenge-${ch.id}`,
    }, { kind: "challenge", important: true, maxPerWindow: 5, windowMinutes: 60 });
    return res;
  });

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { smartPushToUsers } from "./smart-push.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const uuid = z.string().uuid();

/** Push when current user starts following someone (request or auto-accept). */
export const notifyFollow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ targetId: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    if (userId === data.targetId) return { sent: 0 };

    const { data: me } = await supabaseAdmin
      .from("profiles")
      .select("handle, display_name")
      .eq("id", userId)
      .maybeSingle();
    const name = me?.handle ?? me?.display_name ?? "Cineva";

    // Distinguish request vs auto-accept based on current follow status
    const { data: f } = await supabaseAdmin
      .from("follows")
      .select("status")
      .eq("follower_id", userId)
      .eq("following_id", data.targetId)
      .maybeSingle();

    const pending = f?.status === "pending";
    return smartPushToUsers(
      [data.targetId],
      {
        title: pending ? "👋 Cerere de follow" : "🎉 Follower nou",
        body: pending ? `@${name} vrea să te urmărească` : `@${name} te urmărește`,
        url: pending ? `/app/requests` : `/app/user/${userId}`,
        tag: `follow-${userId}`,
      },
      { kind: "follow", important: true, maxPerWindow: 5, windowMinutes: 60 },
    );
  });

/** Push when sending a chat message — notifies the other members. */
export const notifyChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        conversationId: uuid,
        preview: z.string().max(120).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: members } = await supabaseAdmin
      .from("conversation_members")
      .select("user_id")
      .eq("conversation_id", data.conversationId);

    const memberIds = (members ?? []).map((m) => m.user_id);
    if (!memberIds.includes(userId)) return { sent: 0 };
    const targets = memberIds.filter((id) => id && id !== userId);
    if (!targets.length) return { sent: 0 };

    const { data: me } = await supabaseAdmin
      .from("profiles")
      .select("handle, display_name")
      .eq("id", userId)
      .maybeSingle();
    const name = me?.handle ?? me?.display_name ?? "Mesaj nou";

    const body = (data.preview ?? "").trim();
    return smartPushToUsers(
      targets,
      {
        title: `💬 @${name}`,
        body: body.length ? body.slice(0, 120) : "Ai un mesaj nou",
        url: `/app/chat/${data.conversationId}`,
        tag: `chat-${data.conversationId}`,
      },
      { kind: `chat:${data.conversationId}`, important: true, maxPerWindow: 8, windowMinutes: 15 },
    );
  });

/** Push when someone requests to join your spritz/party (party_joins insert). */
export const notifyPartyJoinRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ partyId: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: party } = await supabaseAdmin
      .from("parties")
      .select("title, host_id")
      .eq("id", data.partyId)
      .maybeSingle();
    if (!party || party.host_id === userId) return { sent: 0 };
    // Verify caller actually submitted a join request
    const { data: req } = await supabaseAdmin
      .from("party_joins")
      .select("user_id")
      .eq("party_id", data.partyId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!req) return { sent: 0 };

    const { data: me } = await supabaseAdmin
      .from("profiles")
      .select("handle, display_name")
      .eq("id", userId)
      .maybeSingle();
    const name = me?.handle ?? me?.display_name ?? "Cineva";

    return smartPushToUsers(
      [party.host_id],
      {
        title: "🙋 Cerere la spritz",
        body: `@${name} vrea să intre la „${party.title}"`,
        url: `/app/parties`,
        tag: `party-req-${data.partyId}`,
      },
      { kind: "party_req", important: true, maxPerWindow: 6, windowMinutes: 60 },
    );
  });

import webpush from "web-push";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { VAPID_PUBLIC_KEY, VAPID_SUBJECT } from "./push-config";
import { sendFcmToTokens } from "./fcm.server";

let configured = false;
function configure() {
  if (configured) return;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!privateKey) throw new Error("VAPID_PRIVATE_KEY missing");
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, privateKey);
  configured = true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
  data?: Record<string, unknown>;
};

export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload,
): Promise<{ sent: number; failed: number }> {
  if (!userIds.length) return { sent: 0, failed: 0 };
  configure();

  const { data: subs, error } = await supabaseAdmin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .in("user_id", userIds);
  if (error) throw new Error(error.message);
  const webSubs = (subs ?? []).filter((s) => !s.endpoint.startsWith("native:"));
  if (!webSubs.length) return { sent: 0, failed: 0 };

  const body = JSON.stringify(payload);
  const deadIds: string[] = [];
  let sent = 0;
  let failed = 0;

  await Promise.all(
    webSubs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
        );
        sent++;
      } catch (err) {
        failed++;
        const code = (err as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) deadIds.push(s.id);
      }
    }),
  );

  if (deadIds.length) {
    await supabaseAdmin.from("push_subscriptions").delete().in("id", deadIds);
  }
  return { sent, failed };
}

type PrefKey = "new_party_in_city" | "party_join" | "friend_live" | "challenge" | "heat_now";

export async function filterByPref(userIds: string[], pref: PrefKey): Promise<string[]> {
  if (!userIds.length) return [];
  const { data, error } = await supabaseAdmin
    .from("notification_prefs")
    .select("user_id, " + pref)
    .in("user_id", userIds);
  if (error) return userIds; // default: send if we can't read prefs
  type PrefRow = { user_id: string } & Partial<Record<PrefKey, boolean>>;
  const rows = (data ?? []) as unknown as PrefRow[];
  const opted = new Set(rows.filter((r) => r[pref] !== false).map((r) => r.user_id));
  // Users without a row default to opted-in (DB default true)
  const hasRow = new Set(rows.map((r) => r.user_id));
  return userIds.filter((id) => !hasRow.has(id) || opted.has(id));
}

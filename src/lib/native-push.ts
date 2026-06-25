/**
 * Native push notification registration via Capacitor.
 * Stores APNs/FCM tokens into `push_subscriptions` with channel = 'apns' | 'fcm'
 * so the backend can deliver pushes natively when available.
 *
 * Web push (web-push lib + VAPID) continues to work in browser & PWA via
 * `src/lib/push.ts`. This module is a no-op on web.
 *
 * NOTE: requires APNs key (iOS) + google-services.json (Android) on the
 * native side. See docs/native-publishing.md.
 */
import { supabase } from "@/integrations/supabase/client";
import { isNative, getNativePlatform } from "./native";

let registered = false;

export async function registerNativePush(): Promise<{ ok: boolean; reason?: string }> {
  if (!isNative()) return { ok: false, reason: "Not native" };
  if (registered) return { ok: true };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "Not authenticated" };

  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");

    const perm = await PushNotifications.checkPermissions();
    let granted = perm.receive === "granted";
    if (!granted) {
      const req = await PushNotifications.requestPermissions();
      granted = req.receive === "granted";
    }
    if (!granted) return { ok: false, reason: "Permission denied" };

    await PushNotifications.register();

    PushNotifications.addListener("registration", async (token) => {
      const channel = getNativePlatform() === "ios" ? "apns" : "fcm";
      try {
        await supabase.from("push_subscriptions").upsert(
          {
            user_id: user.id,
            endpoint: `native:${channel}:${token.value}`,
            p256dh: token.value,
            auth: channel,
            user_agent: `native-${channel}`,
          },
          { onConflict: "endpoint" },
        );
      } catch (err) {
        console.warn("[native-push] upsert failed", err);
      }
    });

    PushNotifications.addListener("registrationError", (err) => {
      console.warn("[native-push] registration error", err);
    });

    PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      const url = (action.notification.data as any)?.url;
      if (url && typeof window !== "undefined") {
        try { window.location.assign(url); } catch {}
      }
    });

    registered = true;
    return { ok: true };
  } catch (err: any) {
    return { ok: false, reason: err?.message ?? String(err) };
  }
}

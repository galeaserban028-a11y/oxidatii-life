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

// Native push is ENABLED. Requires the installed AAB to contain
// android/app/google-services.json (Firebase) so PushNotifications.register()
// doesn't crash on Android. iOS also needs GoogleService-Info.plist + APNs.
const NATIVE_PUSH_ENABLED = true;

let registered = false;

export async function registerNativePush(): Promise<{ ok: boolean; reason?: string }> {
  if (!NATIVE_PUSH_ENABLED) return { ok: false, reason: "Native push not configured" };
  if (!isNative()) return { ok: false, reason: "Not native" };
  if (registered) return { ok: true };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "Not authenticated" };

  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isPluginAvailable("PushNotifications")) {
      return { ok: false, reason: "PushNotifications plugin not available" };
    }

    const { PushNotifications } = await import("@capacitor/push-notifications");

    // IMPORTANT: attach listeners BEFORE calling register(). On Android without
    // a valid Firebase setup, register() emits `registrationError` synchronously
    // and any listener added after that point never fires — the app appears to
    // "crash silently" when the user grants permission.
    await PushNotifications.addListener("registration", async (token) => {
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

    await PushNotifications.addListener("registrationError", (err) => {
      console.warn("[native-push] registration error", err);
    });

    await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      const url = (action.notification.data as { url?: string } | null)?.url;
      if (url && typeof window !== "undefined") {
        try {
          const target = new URL(url, window.location.origin);
          const internalHosts = new Set([
            "oxidatii.life",
            "www.oxidatii.life",
            "oxidatii-life.lovable.app",
            window.location.hostname,
          ]);
          if (internalHosts.has(target.hostname)) {
            const path = `${target.pathname}${target.search}${target.hash}` || "/";
            window.history.pushState({}, "", path);
            window.dispatchEvent(new PopStateEvent("popstate"));
          } else {
            window.location.assign(target.toString());
          }
        } catch { /* noop */ }
      }
    });

    const perm = await PushNotifications.checkPermissions();
    let granted = perm.receive === "granted";
    if (!granted) {
      const req = await PushNotifications.requestPermissions();
      granted = req.receive === "granted";
    }
    if (!granted) return { ok: false, reason: "Permission denied" };

    // Wrap register() so any native-side exception bubbles as a JS error
    // instead of tearing down the WebView.
    try {
      await PushNotifications.register();
    } catch (regErr) {
      console.warn("[native-push] register() threw", regErr);
      return {
        ok: false,
        reason: regErr instanceof Error ? regErr.message : String(regErr),
      };
    }

    registered = true;
    return { ok: true };
  } catch (err) {
    console.warn("[native-push] init failed", err);
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

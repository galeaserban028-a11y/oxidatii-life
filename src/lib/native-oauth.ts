/**
 * Native OAuth flow (Capacitor).
 *
 * On the web we let @lovable.dev/cloud-auth-js do a top-level redirect —
 * safe because the browser is a browser. Inside the Capacitor WebView the
 * same top-level redirect works technically, BUT Google's OAuth pages
 * detect embedded WebViews and can refuse with "disallowed_useragent".
 *
 * Google explicitly recommends Chrome Custom Tabs (Android) /
 * SFSafariViewController (iOS) for OAuth in mobile apps — that's what
 * `@capacitor/browser` gives us. The flow:
 *
 *   1. We construct the same broker URL that the SDK would navigate to
 *      (https://oauth.lovable.dev/?provider=...&redirect_uri=<site>&state=...).
 *   2. `Browser.open()` opens it in a Custom Tab / Safari view — a real
 *      Chromium instance, so Google is happy.
 *   3. User signs in; the broker redirects to our `redirect_uri`
 *      (https://oxidatii.life/…#access_token=…). That URL is an Android
 *      App Link, so the OS launches our app with the URL.
 *   4. The global `App.addListener("appUrlOpen")` in src/lib/native.ts
 *      navigates the WebView to that path. Supabase's `detectSessionInUrl`
 *      picks up the token fragment and hydrates the session.
 *   5. We close the Custom Tab.
 */

import { isNative } from "./native";

const OAUTH_BROKER_URL = "https://oauth.lovable.dev/";
const NATIVE_REDIRECT_URI = "oxidatii://oauth";

function generateState(): string {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    return [...crypto.getRandomValues(new Uint8Array(16))]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function signInWithOAuthNative(
  provider: "google" | "apple",
): Promise<{ error: Error | null; started: boolean }> {
  if (!isNative()) return { error: null, started: false };

  try {
    const { Browser } = await import("@capacitor/browser");
    const state = generateState();
    try {
      sessionStorage.setItem("lovable_oauth_state", state);
    } catch {
      /* noop */
    }

    const url = new URL(OAUTH_BROKER_URL);
    url.searchParams.set("provider", provider);
    url.searchParams.set("redirect_uri", NATIVE_REDIRECT_URI);
    url.searchParams.set("state", state);

    await Browser.open({
      url: url.toString(),
      presentationStyle: "popover",
      windowName: "_self",
    });
    return { error: null, started: true };
  } catch (e) {
    return {
      error: e instanceof Error ? e : new Error(String(e)),
      started: false,
    };
  }
}

/** Close the Custom Tab if it's still open (called on deep-link return). */
export async function closeNativeOAuthBrowser(): Promise<void> {
  if (!isNative()) return;
  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.close();
  } catch {
    /* noop */
  }
}

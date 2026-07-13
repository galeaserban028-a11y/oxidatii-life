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
 *   1. We construct the same broker URL that the SDK uses:
 *      https://oxidatii.life/~oauth/initiate.
 *   2. `Browser.open()` opens it in a Custom Tab / Safari view — a real
 *      Chromium instance, so Google is happy.
 *   3. The broker returns to /auth/callback. That HTTPS page forwards the
 *      response to `oxidatii://oauth`, which launches the native app without
 *      relying on Android App Links or iOS Universal Links.
 *   4. The global `App.addListener("appUrlOpen")` in src/lib/native.ts
 *      validates the OAuth response and hydrates the Supabase session.
 *   5. We close the Custom Tab.
 */

import { isNative } from "./native";

const OAUTH_BROKER_URL = "https://oxidatii.life/~oauth/initiate";
const NATIVE_REDIRECT_URI = "https://oxidatii.life/auth/callback";

export const NATIVE_OAUTH_FINISHED_EVENT = "native-oauth-finished";

let removeBrowserFinishedListener: (() => Promise<void>) | null = null;

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
      // localStorage survives a WebView process restart while the user is in
      // the system browser; sessionStorage may not.
      localStorage.setItem("lovable_oauth_state", state);
    } catch {
      /* noop */
    }

    const url = new URL(OAUTH_BROKER_URL);
    url.searchParams.set("provider", provider);
    url.searchParams.set("redirect_uri", NATIVE_REDIRECT_URI);
    url.searchParams.set("state", state);

    if (removeBrowserFinishedListener) {
      await removeBrowserFinishedListener().catch(() => {});
      removeBrowserFinishedListener = null;
    }
    const listener = await Browser.addListener("browserFinished", () => {
      window.dispatchEvent(new Event(NATIVE_OAUTH_FINISHED_EVENT));
    });
    removeBrowserFinishedListener = () => listener.remove();

    await Browser.open({
      url: url.toString(),
      presentationStyle: "fullscreen",
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
  if (removeBrowserFinishedListener) {
    await removeBrowserFinishedListener().catch(() => {});
    removeBrowserFinishedListener = null;
  }
  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.close();
  } catch {
    /* noop */
  }
}

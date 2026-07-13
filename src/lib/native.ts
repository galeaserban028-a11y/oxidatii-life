/**
 * Native (Capacitor) helpers — safe to import from the web app.
 * All functions are no-ops when running in a browser, so the same code
 * works in PWA and native builds.
 */

type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
};

let _isNative: boolean | null = null;

export function isNative(): boolean {
  if (_isNative !== null) return _isNative;
  if (typeof window === "undefined") return false;
  try {
    const cap = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
    _isNative = !!(cap && typeof cap.isNativePlatform === "function" && cap.isNativePlatform());
  } catch {
    _isNative = false;
  }
  return _isNative;
}

export function getNativePlatform(): "ios" | "android" | "web" {
  if (typeof window === "undefined") return "web";
  try {
    const cap = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
    const p = cap?.getPlatform?.();
    if (p === "ios" || p === "android") return p;
  } catch { /* noop */ }
  return "web";
}

/** Hide splash, lock status bar, wire back button, register push if native. */
export async function bootstrapNative(): Promise<void> {
  if (!isNative()) return;
  try {
    const [{ SplashScreen }, { StatusBar, Style }, { App }] = await Promise.all([
      import("@capacitor/splash-screen"),
      import("@capacitor/status-bar"),
      import("@capacitor/app"),
    ]);

    try {
      await StatusBar.setStyle({ style: Style.Dark });
      if (getNativePlatform() === "android") {
        await StatusBar.setBackgroundColor({ color: "#1a120c" });
      }
    } catch { /* noop */ }

    try {
      await SplashScreen.hide({ fadeOutDuration: 300 });
    } catch { /* noop */ }

    // Android hardware back: navigate history, exit on root.
    try {
      App.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack) {
          window.history.back();
        } else {
          App.exitApp().catch(() => {});
        }
      });
    } catch { /* noop */ }

    // Deep linking: oxidatii.life/<path>  ->  navigate to /<path> in app.
    try {
      App.addListener("appUrlOpen", async ({ url }) => {
        try {
          const u = new URL(url);
          // Acceptăm host-urile noastre https + schema custom oxidatii://
          const okHost =
            u.protocol === "oxidatii:" ||
            u.host === "oxidatii.life" ||
            u.host === "www.oxidatii.life" ||
            u.host.endsWith(".lovable.app");
          if (!okHost) return;

          // Parse OAuth return BEFORE pushState — detectSessionInUrl only
          // runs at client init, so we must hand tokens to Supabase manually.
          const hash = u.hash.startsWith("#") ? u.hash.slice(1) : u.hash;
          const hashParams = new URLSearchParams(hash);
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");
          const code = u.searchParams.get("code");
          const isOAuthReturn = !!accessToken || !!code;

          if (isOAuthReturn) {
            try {
              const { supabase } = await import("@/integrations/supabase/client");
              if (accessToken && refreshToken) {
                await supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken,
                });
              } else if (code) {
                await supabase.auth.exchangeCodeForSession(code);
              }
            } catch (e) {
              console.error("[native] OAuth session hydration failed", e);
            }
            // Close the Custom Tab overlay now that we're back in the WebView.
            import("./native-oauth")
              .then((m) => m.closeNativeOAuthBrowser())
              .catch(() => {});
            // Strip tokens from the URL and land on a safe path — the auth
            // gate will route the user to onboarding / app based on profile.
            window.history.replaceState({}, "", "/");
            window.dispatchEvent(new PopStateEvent("popstate"));
            return;
          }

          const path = `${u.pathname}${u.search}${u.hash}` || "/";
          window.history.pushState({}, "", path);
          window.dispatchEvent(new PopStateEvent("popstate"));
        } catch { /* noop */ }
      });

    } catch { /* noop */ }

    // Try to register native push (no-op if not yet authenticated; can be
    // called again later from app boot after sign-in).
    try {
      const { registerNativePush } = await import("./native-push");
      registerNativePush().catch(() => {});
    } catch { /* noop */ }
  } catch (err) {
    console.warn("[native] bootstrap failed", err);
  }
}

/** Light haptic tap (safe everywhere). */
export async function haptic(style: "light" | "medium" | "heavy" = "light") {
  if (!isNative()) return;
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    const map = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy,
    } as const;
    await Haptics.impact({ style: map[style] });
  } catch { /* noop */ }
}

/** Native share if available, otherwise falls back to navigator.share / clipboard. */
export async function nativeShare(opts: { title?: string; text?: string; url?: string }) {
  if (isNative()) {
    try {
      const { Share } = await import("@capacitor/share");
      await Share.share(opts);
      return true;
    } catch { /* noop */ }
  }
  const nav =
    typeof navigator !== "undefined"
      ? (navigator as Navigator & { share?: (data: ShareData) => Promise<void> })
      : null;
  if (nav?.share) {
    try {
      await nav.share(opts);
      return true;
    } catch { /* noop */ }
  }
  if (opts.url && typeof navigator !== "undefined" && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(opts.url);
    } catch { /* noop */ }
  }
  return false;
}

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

    // Deep linking + OAuth return. The same handler is used for warm resumes
    // (`appUrlOpen`) and cold starts (`getLaunchUrl`).
    try {
      const { oauthDebug } = await import("./oauth-debug");
      let lastHandledUrl: string | null = null;
      const handleNativeUrl = async (url: string) => {
        if (url === lastHandledUrl) return;
        lastHandledUrl = url;
        oauthDebug("info", "deep-link.received", { url });
        try {
          const u = new URL(url);
          const isOAuthScheme =
            u.protocol === "oxidatii:" && (u.host === "oauth" || u.host === "oauth-callback");
          const isKnownWebHost =
            u.protocol === "https:" &&
            (u.host === "oxidatii.life" ||
            u.host === "www.oxidatii.life" ||
            u.host === "oxidatii-life.lovable.app");
          if (!isOAuthScheme && !isKnownWebHost) return;

          const hashParams = new URLSearchParams(u.hash.replace(/^#/, ""));
          const getOAuthParam = (key: string) =>
            u.searchParams.get(key) ?? hashParams.get(key);
          const accessToken = getOAuthParam("access_token");
          const refreshToken = getOAuthParam("refresh_token");
          const codeParam = getOAuthParam("code");
          const oauthError = getOAuthParam("error");
          const isOAuthReturn =
            isOAuthScheme || !!accessToken || !!codeParam || !!oauthError;

          if (isOAuthReturn) {
            let error: Error | null = null;
            try {
              const returnedState = getOAuthParam("state");
              const expectedState = localStorage.getItem("lovable_oauth_state");
              if (!expectedState || returnedState !== expectedState) {
                throw new Error("Răspuns OAuth invalid (state diferit). Încearcă din nou.");
              }
              localStorage.removeItem("lovable_oauth_state");

              if (oauthError) {
                throw new Error(
                  getOAuthParam("error_description") ?? "Autentificarea a fost anulată.",
                );
              }

              const { supabase } = await import("@/integrations/supabase/client");
              if (accessToken && refreshToken) {
                const { error: sessionError } = await supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken,
                });
                if (sessionError) throw sessionError;
              } else if (codeParam) {
                const { error: exchangeError } =
                  await supabase.auth.exchangeCodeForSession(codeParam);
                if (exchangeError) throw exchangeError;
              } else {
                throw new Error("Brokerul OAuth nu a returnat tokenurile sesiunii.");
              }
              oauthDebug("info", "session.hydrated", {
                via: accessToken && refreshToken ? "tokens" : "code",
              });
            } catch (e) {
              error = e instanceof Error ? e : new Error(String(e));
              oauthDebug("error", "session.hydrate.failed", error);
              console.warn("[native] OAuth session hydration failed", e);
            }

            const oauth = await import("./native-oauth");
            await oauth.closeNativeOAuthBrowser().catch(() => {});
            window.dispatchEvent(
              new CustomEvent(oauth.NATIVE_OAUTH_FINISHED_EVENT, {
                detail: { error: error?.message ?? null },
              }),
            );

            if (!error) {
              window.history.replaceState({}, "", "/signup");
              window.dispatchEvent(new PopStateEvent("popstate"));
            }
            return;
          }

          const path = `${u.pathname}${u.search}${u.hash}` || "/";
          oauthDebug("info", "deep-link.route", { path });
          window.history.pushState({}, "", path);
          window.dispatchEvent(new PopStateEvent("popstate"));
        } catch (e) { oauthDebug("warn", "deep-link.handler.error", e); }
      };

      await App.addListener("appUrlOpen", ({ url }) => {
        void handleNativeUrl(url);
      });

      const launch = await App.getLaunchUrl();
      if (launch?.url) {
        oauthDebug("info", "deep-link.launch", { url: launch.url });
        await handleNativeUrl(launch.url);
      }

      // Kick off deep-link config validation (async, non-blocking).
      import("./deep-link-validator")
        .then((m) => m.validateDeepLinkConfig())
        .catch(() => {});
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

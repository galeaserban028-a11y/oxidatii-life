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
      App.addListener("appUrlOpen", ({ url }) => {
        try {
          const u = new URL(url);
          // Acceptăm doar host-urile noastre (custom URL schemes ar avea alt host).
          const okHost =
            u.host === "oxidatii.life" ||
            u.host === "www.oxidatii.life" ||
            u.host.endsWith(".lovable.app");
          if (!okHost) return;
          const path = `${u.pathname}${u.search}${u.hash}` || "/";
          // Folosim history.pushState + popstate ca TanStack Router să preia ruta.
          window.history.pushState({}, "", path);
          window.dispatchEvent(new PopStateEvent("popstate"));
          // Dacă venim dintr-un flux OAuth (Custom Tab / Safari view), închidem
          // overlay-ul acum că am ajuns înapoi în WebView-ul aplicației.
          if (u.hash.includes("access_token") || u.searchParams.has("code")) {
            import("./native-oauth")
              .then((m) => m.closeNativeOAuthBrowser())
              .catch(() => {});
          }
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

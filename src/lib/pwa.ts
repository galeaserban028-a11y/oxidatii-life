// Guarded registration wrapper for the app-shell service worker (/sw.js).
// Refuses registration in dev, inside iframes, on Lovable preview hosts, and
// when the URL has ?sw=off. In any refused context, unregisters matching SWs.
// The Firebase/push service worker (/push-sw.js) is handled separately.

const APP_SW_URL = "/sw.js";
const RELOAD_ON_SW_UPDATE_KEY = "oxi-pwa-reloaded-for-update-v1";

function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function isPreviewHost(host: string): boolean {
  return (
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host === "lovableproject.com" ||
    host.endsWith(".lovableproject.com") ||
    host === "lovableproject-dev.com" ||
    host.endsWith(".lovableproject-dev.com") ||
    host === "beta.lovable.dev" ||
    host.endsWith(".beta.lovable.dev")
  );
}

async function unregisterAppSw(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.allSettled(
      regs.map(async (reg) => {
        const url =
          reg.active?.scriptURL ?? reg.waiting?.scriptURL ?? reg.installing?.scriptURL ?? "";
        if (url.endsWith(APP_SW_URL)) {
          await reg.unregister();
        }
      }),
    );
  } catch {
    // ignore
  }
}

export async function registerAppServiceWorker(): Promise<void> {
  if (typeof window === "undefined" || typeof navigator === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  const url = new URL(window.location.href);
  const host = window.location.hostname;
  const refuse =
    !import.meta.env.PROD ||
    isInIframe() ||
    isPreviewHost(host) ||
    url.searchParams.get("sw") === "off";

  if (refuse) {
    await unregisterAppSw();
    return;
  }

  try {
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      try {
        if (sessionStorage.getItem(RELOAD_ON_SW_UPDATE_KEY) === "1") return;
        sessionStorage.setItem(RELOAD_ON_SW_UPDATE_KEY, "1");
      } catch {}
      window.location.reload();
    });

    const reg = await navigator.serviceWorker.register(APP_SW_URL, {
      scope: "/",
      updateViaCache: "none",
    });
    await reg.update().catch(() => {});
  } catch (err) {
    console.warn("[pwa] sw registration failed", err);
  }
}

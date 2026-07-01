// PWA repair helper.
// We keep installability via the manifest, but remove the old app-shell/offline
// worker because stale cached chunks can block auth/profile pages in installed apps.
// The push worker (/push-sw.js) is handled separately and is intentionally untouched.

const APP_SW_PATHS = new Set(["/sw.js", "/service-worker.js"]);
const APP_CACHE_NAMES = new Set(["html-nav", "static-assets", "images"]);

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

function isAppShellCache(name: string): boolean {
  return (
    APP_CACHE_NAMES.has(name) ||
    name.startsWith("workbox-precache-") ||
    /(^|-)precache-v\d+-/.test(name) ||
    /(^|-)runtime-/.test(name)
  );
}

async function deleteAppShellCaches(): Promise<boolean> {
  if (typeof caches === "undefined") return false;
  try {
    const names = await caches.keys();
    const appCaches = names.filter(isAppShellCache);
    await Promise.allSettled(appCaches.map((name) => caches.delete(name)));
    return appCaches.length > 0;
  } catch {
    // ignore
    return false;
  }
}

async function unregisterAppShellWorkers(): Promise<boolean> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return false;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    let found = false;
    await Promise.allSettled(
      regs.map(async (reg) => {
        const url =
          reg.active?.scriptURL ?? reg.waiting?.scriptURL ?? reg.installing?.scriptURL ?? "";
        const path = url ? new URL(url).pathname : "";
        if (APP_SW_PATHS.has(path)) {
          found = true;
          await reg.unregister();
        }
      }),
    );
    return found;
  } catch {
    // ignore
    return false;
  }
}

export async function repairInstalledPwa(options: { reload?: boolean } = {}): Promise<void> {
  if (typeof window === "undefined" || typeof navigator === "undefined") return;
  const hadWorker = await unregisterAppShellWorkers();
  const hadCaches = await deleteAppShellCaches();
  const shouldReload = options.reload || hadWorker || hadCaches;
  if (!shouldReload) return;
  const reloadKey = "oxi_pwa_repair_reloaded_v2";
  if (sessionStorage.getItem(reloadKey) === "1") return;
  sessionStorage.setItem(reloadKey, "1");
  window.location.reload();
}

export async function registerAppServiceWorker(): Promise<void> {
  if (typeof window === "undefined" || typeof navigator === "undefined") return;
  const url = new URL(window.location.href);
  const host = window.location.hostname;
  // In dev/preview this cleans any old SW left by previous experiments.
  // On the published app it removes the old offline shell while keeping PWA install metadata.
  await repairInstalledPwa({ reload: url.searchParams.get("sw") === "off" });
}

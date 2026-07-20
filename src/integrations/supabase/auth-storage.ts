/**
 * Auth session storage for Supabase.
 *
 * On Capacitor / Android WebView, localStorage can be wiped when the process dies.
 * Always dual-write to @capacitor/preferences and warm that store BEFORE the
 * first getSession / onAuthStateChange, otherwise cold start looks "logged out".
 */

import type { SupportedStorage } from "@supabase/supabase-js";

const AUTH_KEY_PREFIX = "sb-";
const LAST_PATH_KEY = "oxi_last_path";

function webGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function webSet(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* noop */
  }
}

function webRemove(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* noop */
  }
}

/** Prefer Preferences whenever we might be inside Capacitor — don't wait for bridge. */
export function shouldUsePreferences(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const cap = (
      window as unknown as {
        Capacitor?: { isNativePlatform?: () => boolean };
      }
    ).Capacitor;
    if (cap?.isNativePlatform?.()) return true;
    if (cap) return true;
    if (/; wv\)/.test(navigator.userAgent)) return true;
    if (document.documentElement.classList.contains("oxi-native-android")) return true;
  } catch {
    /* noop */
  }
  return false;
}

let preferencesReady: Promise<typeof import("@capacitor/preferences")> | null = null;

function loadPreferences() {
  if (!preferencesReady) {
    preferencesReady = import("@capacitor/preferences");
  }
  return preferencesReady;
}

async function waitForCapacitorBridge(timeoutMs = 2500): Promise<void> {
  if (typeof window === "undefined") return;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
        .Capacitor;
      if (cap?.isNativePlatform?.()) return;
    } catch {
      /* noop */
    }
    await new Promise((r) => setTimeout(r, 50));
  }
}

/**
 * Wait until Preferences round-trips (or timeout). MUST run before first
 * supabase.auth.getSession / onAuthStateChange on native.
 */
export async function warmAuthStorage(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!shouldUsePreferences() && !/; wv\)/.test(navigator.userAgent ?? "")) return;
  try {
    await waitForCapacitorBridge();
    const { Preferences } = await loadPreferences();
    await Preferences.get({ key: "__oxi_auth_warm__" });
    await migrateLegacyAuthKeys();
    // Pull any Preferences auth keys back into localStorage so Supabase sync
    // paths that peek at localStorage still see the session.
    await hydrateLocalStorageFromPreferences();
  } catch {
    /* noop */
  }
}

let readyPromise: Promise<void> | null = null;

/** Single-flight warm used by AuthProvider before touching supabase.auth. */
export function ensureAuthStorageReady(): Promise<void> {
  if (!readyPromise) {
    readyPromise = warmAuthStorage().catch(() => undefined);
  }
  return readyPromise;
}

async function hydrateLocalStorageFromPreferences(): Promise<void> {
  try {
    const { Preferences } = await loadPreferences();
    const { keys } = await Preferences.keys();
    for (const key of keys) {
      if (!key.startsWith(AUTH_KEY_PREFIX)) continue;
      const { value } = await Preferences.get({ key });
      if (value != null) webSet(key, value);
    }
  } catch {
    /* noop */
  }
}

/** Copy all supabase auth keys from localStorage → Preferences (best-effort). */
export async function migrateLegacyAuthKeys(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const { Preferences } = await loadPreferences();
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key || !key.startsWith(AUTH_KEY_PREFIX)) continue;
      const value = window.localStorage.getItem(key);
      if (!value) continue;
      await Preferences.set({ key, value });
    }
  } catch {
    /* noop */
  }
}

/** Force dual-write after login / token refresh. */
export async function flushAuthSessionToPreferences(): Promise<void> {
  await migrateLegacyAuthKeys();
  await hydrateLocalStorageFromPreferences();
}

export async function saveLastAppPath(path: string): Promise<void> {
  if (!path.startsWith("/app")) return;
  webSet(LAST_PATH_KEY, path);
  try {
    if (!shouldUsePreferences() && !/; wv\)/.test(navigator.userAgent ?? "")) return;
    const { Preferences } = await loadPreferences();
    await Preferences.set({ key: LAST_PATH_KEY, value: path });
  } catch {
    /* noop */
  }
}

export async function readLastAppPath(): Promise<string | null> {
  const legacy = webGet(LAST_PATH_KEY);
  try {
    if (!shouldUsePreferences() && !/; wv\)/.test(navigator.userAgent ?? "")) {
      return legacy && legacy.startsWith("/app") ? legacy : null;
    }
    const { Preferences } = await loadPreferences();
    const { value } = await Preferences.get({ key: LAST_PATH_KEY });
    const path = value ?? legacy;
    return path && path.startsWith("/app") ? path : null;
  } catch {
    return legacy && legacy.startsWith("/app") ? legacy : null;
  }
}

export function getAuthStorage(): SupportedStorage | undefined {
  if (typeof window === "undefined") return undefined;

  return {
    async getItem(key: string) {
      const preferNative = shouldUsePreferences() || /; wv\)/.test(navigator.userAgent ?? "");
      if (!preferNative) return webGet(key);

      try {
        await waitForCapacitorBridge(800);
        const { Preferences } = await loadPreferences();
        const [{ value }, legacy] = await Promise.all([
          Preferences.get({ key }),
          Promise.resolve(webGet(key)),
        ]);
        if (value != null) {
          webSet(key, value);
          return value;
        }
        if (legacy) {
          await Preferences.set({ key, value: legacy }).catch(() => {});
          return legacy;
        }
        return null;
      } catch {
        return webGet(key);
      }
    },
    async setItem(key: string, value: string) {
      webSet(key, value);
      // Always attempt Preferences on native / WebView — never rely on a single write.
      try {
        if (!shouldUsePreferences() && !/; wv\)/.test(navigator.userAgent ?? "")) return;
        const { Preferences } = await loadPreferences();
        await Preferences.set({ key, value });
        // Verify write (some OEMs drop silent failures).
        const check = await Preferences.get({ key });
        if (check.value !== value) {
          await Preferences.set({ key, value });
        }
      } catch {
        /* localStorage already set */
      }
    },
    async removeItem(key: string) {
      webRemove(key);
      try {
        if (!shouldUsePreferences() && !/; wv\)/.test(navigator.userAgent ?? "")) return;
        const { Preferences } = await loadPreferences();
        await Preferences.remove({ key });
      } catch {
        /* noop */
      }
    },
  };
}

export function shouldDetectSessionInUrl(): boolean {
  if (typeof window === "undefined") return false;
  return !shouldUsePreferences() && !/; wv\)/.test(navigator.userAgent ?? "");
}

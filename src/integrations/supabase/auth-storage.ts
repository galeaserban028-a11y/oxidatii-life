/**
 * Auth session storage for Supabase.
 *
 * On Capacitor / Android WebView, localStorage can be wiped under pressure.
 * Always prefer @capacitor/preferences when the native bridge (or WebView UA)
 * is present — dual-write so either path recovers the session.
 */

import type { SupportedStorage } from "@supabase/supabase-js";

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
    // Capacitor object present but not ready yet, or Android WebView UA
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

/**
 * Wait until Preferences round-trips (or timeout). Call before first getSession
 * so we don't race an empty localStorage against a late Preferences read.
 */
export async function warmAuthStorage(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!shouldUsePreferences()) return;
  try {
    const { Preferences } = await loadPreferences();
    await Preferences.get({ key: "__oxi_auth_warm__" });
    // Migrate any sb-* keys still only in localStorage into Preferences.
    await migrateLegacyAuthKeys();
  } catch {
    /* noop */
  }
}

/** Copy all supabase auth keys from localStorage → Preferences (best-effort). */
export async function migrateLegacyAuthKeys(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!shouldUsePreferences()) return;
  try {
    const { Preferences } = await loadPreferences();
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key || !key.startsWith("sb-")) continue;
      const value = window.localStorage.getItem(key);
      if (!value) continue;
      const existing = await Preferences.get({ key });
      if (existing.value == null) {
        await Preferences.set({ key, value });
      }
    }
  } catch {
    /* noop */
  }
}

export function getAuthStorage(): SupportedStorage | undefined {
  if (typeof window === "undefined") return undefined;

  return {
    async getItem(key: string) {
      const preferNative = shouldUsePreferences();
      if (!preferNative) return webGet(key);

      // Always check Preferences first; also race a localStorage read so a
      // slow bridge doesn't look like "logged out".
      try {
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
      // Always attempt Preferences on native-ish environments — even if the
      // first check missed Capacitor injection.
      try {
        if (!shouldUsePreferences() && !/; wv\)/.test(navigator.userAgent)) return;
        const { Preferences } = await loadPreferences();
        await Preferences.set({ key, value });
      } catch {
        /* localStorage already set */
      }
    },
    async removeItem(key: string) {
      webRemove(key);
      try {
        if (!shouldUsePreferences()) return;
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
  return !shouldUsePreferences();
}

/** Compat shims for callers that expect these helpers. */
export async function ensureAuthStorageReady(): Promise<void> {
  await warmAuthStorage();
}

export async function flushAuthSessionToPreferences(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!shouldUsePreferences()) return;
  try {
    const { Preferences } = await loadPreferences();
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key || !key.startsWith("sb-")) continue;
      const value = window.localStorage.getItem(key);
      if (value != null) await Preferences.set({ key, value });
    }
  } catch {
    /* noop */
  }
}

export async function readLastAppPath(): Promise<string | null> {
  try {
    if (shouldUsePreferences()) {
      const { Preferences } = await loadPreferences();
      const { value } = await Preferences.get({ key: "oxi:last_app_path" });
      if (value) return value;
    }
    return webGet("oxi:last_app_path");
  } catch {
    return null;
  }
}

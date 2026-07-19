/**
 * Unified GPS for web + Capacitor.
 * Android APK must go through @capacitor/geolocation or the map
 * silently falls back to the profile city center after "Accept".
 */
import { isNative } from "./native";

export type OxiCoords = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  heading: number | null;
};

export type OxiPosition = {
  coords: OxiCoords;
  timestamp: number;
};

function toOxiPosition(pos: {
  coords: {
    latitude: number;
    longitude: number;
    accuracy?: number | null;
    heading?: number | null;
  };
  timestamp?: number;
}): OxiPosition {
  return {
    coords: {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy ?? null,
      heading: pos.coords.heading ?? null,
    },
    timestamp: pos.timestamp ?? Date.now(),
  };
}

export function asGeolocationPosition(pos: OxiPosition): GeolocationPosition {
  return {
    coords: {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy ?? 9999,
      altitude: null,
      altitudeAccuracy: null,
      heading: pos.coords.heading,
      speed: null,
      toJSON() {
        return this;
      },
    },
    timestamp: pos.timestamp,
    toJSON() {
      return this;
    },
  } as GeolocationPosition;
}

export type LocationPermissionState = "granted" | "prompt" | "denied";

export async function checkLocationPermission(): Promise<LocationPermissionState> {
  if (isNative() || typeof (window as unknown as { Capacitor?: unknown }).Capacitor !== "undefined") {
    try {
      const { Geolocation } = await import("@capacitor/geolocation");
      const cur = await Geolocation.checkPermissions();
      if (cur.location === "granted" || cur.coarseLocation === "granted") return "granted";
      if (cur.location === "denied" && cur.coarseLocation === "denied") return "denied";
      return "prompt";
    } catch {
      return "prompt";
    }
  }
  try {
    const perms = (
      navigator as Navigator & {
        permissions?: { query?: (d: PermissionDescriptor) => Promise<PermissionStatus> };
      }
    ).permissions;
    if (!perms?.query) return "prompt";
    const status = await perms.query({ name: "geolocation" as PermissionName }).catch(() => null);
    if (!status) return "prompt";
    if (status.state === "granted") return "granted";
    if (status.state === "denied") return "denied";
    return "prompt";
  } catch {
    return "prompt";
  }
}

export async function ensureLocationPermission(prompt = true): Promise<boolean> {
  const state = await checkLocationPermission();
  if (state === "granted") return true;
  if (!prompt) return false;


  if (isNative() || typeof (window as unknown as { Capacitor?: unknown }).Capacitor !== "undefined") {
    try {
      const { Geolocation } = await import("@capacitor/geolocation");
      const req = await Geolocation.requestPermissions({ permissions: ["location"] });
      if (req.location === "granted" || req.coarseLocation === "granted") return true;

      // Android often reports "denied" until a live fix proves otherwise —
      // try reading GPS once before giving up.
      try {
        await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 12_000,
          maximumAge: 60_000,
        });
        return true;
      } catch {
        return false;
      }
    } catch {
      return false;
    }
  }

  return true;
}

/** Open the OS screen for this app's permissions (Android) or app settings (iOS). */
export async function openAppLocationSettings(): Promise<void> {
  const pkg = "com.oxidatii.app";
  try {
    if (isNative() || !!(window as unknown as { Capacitor?: unknown }).Capacitor) {
      const AppMod = (await import("@capacitor/app")) as unknown as {
        App: { openUrl?: (opts: { url: string }) => Promise<unknown> };
      };
      const openUrl = AppMod.App.openUrl?.bind(AppMod.App);
      const tryOpen = async (url: string) => {
        if (openUrl) {
          await openUrl({ url });
          return true;
        }
        if (typeof window !== "undefined") {
          window.open(url, "_system");
          return true;
        }
        return false;
      };
      try {
        if (await tryOpen(`intent:#Intent;action=android.settings.APPLICATION_DETAILS_SETTINGS;data=package:${pkg};end`)) return;
      } catch { /* fall through */ }
      try {
        if (await tryOpen(`package:${pkg}`)) return;
      } catch { /* fall through */ }
      try {
        if (await tryOpen("app-settings:")) return;
      } catch { /* fall through */ }
    }

  } catch {
    /* fall through */
  }
  throw new Error(
    "Deschide Setări → Aplicații → OXIDAȚII → Permisiuni → Locație → Permite. Apoi revino și apasă din nou.",
  );
}

export async function getCurrentPosition(options?: {
  enableHighAccuracy?: boolean;
  maximumAge?: number;
  timeout?: number;
}): Promise<OxiPosition> {
  const enableHighAccuracy = options?.enableHighAccuracy ?? true;
  const maximumAge = options?.maximumAge ?? 8_000;
  const timeout = options?.timeout ?? 25_000;

  // Always prompt when needed — never silently skip.
  const ok = await ensureLocationPermission(true);
  if (!ok) {
    void openAppLocationSettings().catch(() => {});
    throw new Error(
      "Locația e oprită pentru OXIDAȚII. Am deschis Setările — activează Locația (Permite), apoi revino și apasă din nou.",
    );
  }

  const tryNative = isNative() || !!(window as unknown as { Capacitor?: unknown }).Capacitor;
  let lastErr: unknown = null;

  if (tryNative) {
    try {
      const { Geolocation } = await import("@capacitor/geolocation");
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy,
        maximumAge,
        timeout,
      });
      return toOxiPosition(pos);
    } catch (err) {
      lastErr = err;
      console.warn("native geo failed, trying web", err);
      // Second try: lower accuracy / longer timeout (indoor / cold GPS)
      try {
        const { Geolocation } = await import("@capacitor/geolocation");
        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: false,
          maximumAge: 120_000,
          timeout: 20_000,
        });
        return toOxiPosition(pos);
      } catch (err2) {
        lastErr = err2;
        console.warn("native geo coarse failed", err2);
      }
    }
  }

  // Web / WebView fallback
  try {
    return await new Promise<OxiPosition>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Telefonul nu oferă GPS acestui browser."));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(toOxiPosition(pos)),
        (err) =>
          reject(
            new Error(
              err.code === 1
                ? "Locația e oprită pentru OXIDAȚII. Activeaz-o din Setări → Permisiuni → Locație."
                : "Nu am putut citi locația. Pornește GPS-ul din bara de pe telefon și încearcă din nou.",
            ),
          ),
        { enableHighAccuracy, maximumAge, timeout },
      );
    });
  } catch (webErr) {
    throw webErr instanceof Error
      ? webErr
      : lastErr instanceof Error
        ? lastErr
        : new Error("Nu am putut citi locația.");
  }
}

export type WatchHandle = { clear: () => void };

export async function watchPosition(
  onPos: (pos: OxiPosition) => void,
  onErr?: (err: unknown) => void,
  options?: {
    enableHighAccuracy?: boolean;
    maximumAge?: number;
    timeout?: number;
    promptPermission?: boolean;
  },
): Promise<WatchHandle> {
  const enableHighAccuracy = options?.enableHighAccuracy ?? true;
  const maximumAge = options?.maximumAge ?? 8_000;
  const timeout = options?.timeout ?? 30_000;

  const ok = await ensureLocationPermission(options?.promptPermission ?? true);
  if (!ok) {
    onErr?.(new Error("location-denied"));
    return { clear: () => {} };
  }

  const tryNative = isNative() || !!(window as unknown as { Capacitor?: unknown }).Capacitor;
  if (tryNative) {
    try {
      const { Geolocation } = await import("@capacitor/geolocation");
      const id = await Geolocation.watchPosition(
        { enableHighAccuracy, maximumAge, timeout },
        (pos, err) => {
          if (err || !pos) {
            onErr?.(err ?? new Error("watch-failed"));
            return;
          }
          onPos(toOxiPosition(pos));
        },
      );
      return {
        clear: () => {
          Geolocation.clearWatch({ id }).catch(() => {});
        },
      };
    } catch {
      /* fall through */
    }
  }

  const id = navigator.geolocation.watchPosition(
    (pos) => onPos(toOxiPosition(pos)),
    (err) => onErr?.(err),
    { enableHighAccuracy, maximumAge, timeout },
  );
  return {
    clear: () => navigator.geolocation.clearWatch(id),
  };
}

export async function getPrecisePosition(maxAccuracyM = 120): Promise<GeolocationPosition> {
  const ok = await ensureLocationPermission(true);
  if (!ok) {
    void openAppLocationSettings().catch(() => {});
    throw new Error(
      "Locația e oprită pentru OXIDAȚII. Am deschis Setările — activează Locația, apoi revino.",
    );
  }

  const native = isNative();
  const targetAcc = native ? Math.max(maxAccuracyM, 100) : Math.min(maxAccuracyM, 80);
  const hardFailAcc = native ? 2500 : 80;

  try {
    const quick = await getCurrentPosition({
      enableHighAccuracy: true,
      maximumAge: 5_000,
      timeout: 18_000,
    });
    if ((quick.coords.accuracy ?? 9999) <= hardFailAcc) {
      return asGeolocationPosition(quick);
    }
  } catch {
    /* continue to watch */
  }

  return new Promise((resolve, reject) => {
    let best: OxiPosition | null = null;
    let settled = false;
    let handle: WatchHandle | null = null;
    let timeoutId: number | null = null;

    const cleanup = () => {
      handle?.clear();
      if (timeoutId != null) window.clearTimeout(timeoutId);
    };

    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error instanceof Error ? error : new Error("Nu am putut citi locația."));
    };

    const finish = (pos?: OxiPosition) => {
      if (settled) return;
      const candidate = pos ?? best;
      if (!candidate) {
        fail(new Error("Nu am putut citi locația."));
        return;
      }
      const acc = candidate.coords.accuracy ?? 9999;
      if (acc > hardFailAcc) {
        fail(new Error("GPS-ul încă e prea aproximativ. Ieși lângă geam și încearcă din nou."));
        return;
      }
      settled = true;
      cleanup();
      resolve(asGeolocationPosition(candidate));
    };

    watchPosition(
      (pos) => {
        if (!best || (pos.coords.accuracy ?? 9999) < (best.coords.accuracy ?? 9999)) {
          best = pos;
        }
        const acc = pos.coords.accuracy ?? 9999;
        if (acc <= Math.min(35, targetAcc)) finish(pos);
        else if (acc <= targetAcc) {
          if (timeoutId != null) window.clearTimeout(timeoutId);
          timeoutId = window.setTimeout(() => finish(best ?? pos), native ? 800 : 400);
        }
      },
      (err) => {
        if (best) finish(best);
        else fail(err);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 30_000, promptPermission: true },
    ).then((h) => {
      handle = h;
    });

    timeoutId = window.setTimeout(() => finish(), native ? 20_000 : 25_000);
  });
}

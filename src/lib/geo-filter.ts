/**
 * Shared GPS sanity checks — reject cell-tower / cached jumps that teleport
 * the user pin across the city.
 */

export function haversineMeters(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const R = 6371000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const lat1 = (aLat * Math.PI) / 180;
  const lat2 = (bLat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export type GeoSample = {
  lat: number;
  lng: number;
  accuracy: number | null;
  at?: number;
};

/** Max horizontal accuracy (meters) we'll treat as a usable "you are here" fix. */
export const MAX_MAP_ACCURACY_M = 200;
/** First fix can be loose while GPS warms up — Android coarse is often 200–1500m. */
export const MAX_FIRST_FIX_ACCURACY_M = 2000;
/** Reject teleports larger than this unless the new fix is clearly better. */
export const MAX_JUMP_M = 450;

/**
 * Decide whether to accept a new GPS sample given the previous accepted one.
 * Returns the reason string when rejected (for debug), or null when accepted.
 */
export function rejectGeoSample(
  next: GeoSample,
  prev: GeoSample | null,
): string | null {
  const acc = next.accuracy;
  if (acc != null && !Number.isFinite(acc)) return "accuracy-nan";
  if (!Number.isFinite(next.lat) || !Number.isFinite(next.lng)) return "coords-nan";
  if (Math.abs(next.lat) > 90 || Math.abs(next.lng) > 180) return "coords-range";

  if (!prev) {
    if (acc != null && acc > MAX_FIRST_FIX_ACCURACY_M) return "first-fix";
    return null;
  }

  if (acc != null && acc > MAX_MAP_ACCURACY_M) {
    // Allow only if it clearly improves a still-worse previous fix.
    if (prev.accuracy == null || acc >= prev.accuracy - 15) return "accuracy";
  }

  const jump = haversineMeters(prev.lat, prev.lng, next.lat, next.lng);
  if (jump > MAX_JUMP_M) {
    // Accept only an excellent new fix replacing a poor previous one.
    const prevBad = prev.accuracy != null && prev.accuracy > 80;
    const nextGood = acc != null && acc <= 40;
    if (!(prevBad && nextGood)) return "jump";
  }

  return null;
}

/** Stable ~150m privacy offset (no Math.random → no pin jitter each publish). */
export function stableApproxOffset(
  lat: number,
  lng: number,
  meters = 150,
): { lat: number; lng: number } {
  const s1 = Math.sin(lat * 12.9898 + lng * 78.233) * 43758.5453;
  const s2 = Math.sin(lat * 78.233 + lng * 12.9898) * 24634.918;
  const a = s1 - Math.floor(s1);
  const b = s2 - Math.floor(s2);
  const j = meters / 111_000;
  const lngScale = Math.max(0.2, Math.cos((lat * Math.PI) / 180));
  return {
    lat: lat + (a * 2 - 1) * j,
    lng: lng + (b * 2 - 1) * (j / lngScale),
  };
}

/** Map zoom level from GPS accuracy — coarse fixes stay pulled back. */
export function zoomForAccuracy(accuracy: number | null | undefined): number {
  const acc = accuracy ?? 400;
  if (acc > 500) return 13.2;
  if (acc > 200) return 13.8;
  if (acc > 80) return 14.4;
  if (acc > 40) return 15;
  return 15.4;
}

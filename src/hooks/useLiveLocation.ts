import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Broadcasts the current user's GPS position to public.live_locations every
 * ~10 seconds while the tab is visible. Only runs if the profile has
 * location_consent = true. Other users (friends) see this via realtime.
 */
export function useLiveLocation(userId: string | null | undefined, enabled: boolean) {
  const lastSentRef = useRef(0);
  const lastCoordsRef = useRef<{ lat: number; lng: number; accuracy: number | null } | null>(null);

  useEffect(() => {
    if (!userId || !enabled) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    let cancelled = false;
    let watchId: number | null = null;

    const push = async (
      lat: number,
      lng: number,
      heading: number | null,
      accuracy: number | null,
    ) => {
      if (cancelled) return;
      const now = Date.now();
      // Ignore very rough browser fixes once we already have a better live pin.
      // Mobile browsers often emit a cached/cell-tower position first, then GPS.
      if (accuracy != null && accuracy > 250 && lastCoordsRef.current) return;

      // throttle: at most one upsert every 10s, OR if moved > ~12m, OR if accuracy improved clearly
      const prev = lastCoordsRef.current;
      const moved = prev
        ? Math.hypot(
            (lat - prev.lat) * 111000,
            (lng - prev.lng) * 111000 * Math.cos((lat * Math.PI) / 180),
          )
        : Infinity;
      const improvedAccuracy =
        prev?.accuracy != null && accuracy != null ? prev.accuracy - accuracy : 0;
      if (now - lastSentRef.current < 10_000 && moved < 12 && improvedAccuracy < 10) return;
      lastSentRef.current = now;
      lastCoordsRef.current = { lat, lng, accuracy };

      await supabase.from("live_locations").upsert(
        {
          user_id: userId,
          lat,
          lng,
          heading: Number.isFinite(heading) ? heading : null,
          accuracy: Number.isFinite(accuracy) ? accuracy : null,
          updated_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
        },
        { onConflict: "user_id" },
      );
    };

    const start = () => {
      if (watchId != null) return;
      watchId = navigator.geolocation.watchPosition(
        (pos) =>
          push(
            pos.coords.latitude,
            pos.coords.longitude,
            pos.coords.heading ?? null,
            pos.coords.accuracy ?? null,
          ),
        () => {
          /* silent */
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 30_000 },
      );
    };

    const stop = () => {
      if (watchId != null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") start();
      else stop();
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      stop();
      // Don't delete the live row on cleanup — the row expires naturally
      // after 15 minutes and deleting it on every effect re-run causes the
      // user's pin to flicker off the map for friends.
    };
  }, [userId, enabled]);
}

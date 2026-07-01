import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ArrowLeft, Compass, Loader2, MapPin, Sparkles, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/app/radar")({
  head: () => ({
    meta: [
      { title: "Spritz Radar Live — OXIDAȚII" },
      {
        name: "description",
        content:
          "Deschide camera și vezi în AR localurile din jur, prietenii activi și heat-ul serii, plutind peste realitate.",
      },
    ],
  }),
  component: RadarPage,
});

// ---------- Geo helpers ----------
const R_EARTH = 6371000;
function toRad(d: number) {
  return (d * Math.PI) / 180;
}
function toDeg(r: number) {
  return (r * 180) / Math.PI;
}
function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.sqrt(a));
}
function bearing(lat1: number, lng1: number, lat2: number, lng2: number) {
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const λ1 = toRad(lng1);
  const λ2 = toRad(lng2);
  const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// ---------- Types ----------
type RadarVenue = {
  id: string;
  name: string;
  type: string | null;
  lat: number;
  lng: number;
  cover_url: string | null;
  heat: number; // check-ins last 3h
  distance: number;
  bearing: number;
};

type RadarFriend = {
  user_id: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
  lat: number;
  lng: number;
  distance: number;
  bearing: number;
};

const RADAR_RANGE_M = 800;

function RadarPage() {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [pos, setPos] = useState<{ lat: number; lng: number; acc: number } | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [needsOrient, setNeedsOrient] = useState(false);
  const [camReady, setCamReady] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [starting, setStarting] = useState(false);
  const [compassLimited, setCompassLimited] = useState(false);
  const [venues, setVenues] = useState<RadarVenue[]>([]);
  const [friends, setFriends] = useState<RadarFriend[]>([]);
  const [selected, setSelected] = useState<RadarVenue | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  function onOrient(ev: DeviceOrientationEvent) {
    const wk = (ev as any).webkitCompassHeading as number | undefined;
    if (typeof wk === "number") {
      setHeading(wk);
      return;
    }
    if (typeof ev.alpha === "number") {
      setHeading((360 - ev.alpha) % 360);
    }
  }

  // Attach orientation listeners once permission is granted (or not needed)
  useEffect(() => {
    if (!started || needsOrient) return;
    window.addEventListener("deviceorientationabsolute" as any, onOrient as any, true);
    window.addEventListener("deviceorientation", onOrient, true);
    return () => {
      window.removeEventListener("deviceorientationabsolute" as any, onOrient as any, true);
      window.removeEventListener("deviceorientation", onOrient, true);
    };
  }, [started, needsOrient]);

  // Geolocation watch after start
  useEffect(() => {
    if (!started) return;
    if (!("geolocation" in navigator)) return;
    const id = navigator.geolocation.watchPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }),
      () => toast.error("Activează locația pentru radar"),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [started]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  // MUST be triggered by a user gesture — iOS Safari blocks camera otherwise.
  // Important: iOS Safari is unreliable when camera + motion permission prompts
  // are launched at the exact same time. Start the camera from this tap, then ask
  // for compass from a second direct tap only if iOS requires it. This prevents
  // the "permission accepted, then infinite loading" state.
  function startRadar() {
    if (starting || started) return;
    setStarting(true);
    setCamError(null);
    setCompassLimited(false);

    if (!navigator.mediaDevices?.getUserMedia) {
      setCamError("Safari nu oferă acces la cameră aici. Deschide aplicația pe HTTPS/Safari și încearcă din nou.");
      setStarting(false);
      return;
    }

    // Camera is kicked off immediately inside the gesture.
    const camPromise = navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });

    // Kick off geolocation prompt inside the gesture too (helps on iOS PWA)
    if ("geolocation" in navigator) {
      try {
        navigator.geolocation.getCurrentPosition(
          (p) =>
            setPos({
              lat: p.coords.latitude,
              lng: p.coords.longitude,
              acc: p.coords.accuracy,
            }),
          () => {},
          { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
        );
      } catch {}
    }

    (async () => {
      try {
        const stream = await Promise.race([
          camPromise,
          new Promise<never>((_, reject) =>
            window.setTimeout(() => reject(new Error("Camera a rămas blocată la permisiune.")), 15000),
          ),
        ]);
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
          setCamReady(true);
        }

        setStarted(true);

        const iosPerm = (DeviceOrientationEvent as any)?.requestPermission;
        if (typeof iosPerm === "function") {
          setNeedsOrient(true);
        }
      } catch (e: any) {
        const name = e?.name;
        if (name === "NotAllowedError") {
          setCamError("Permisiune refuzată. Activează camera din setările Safari (aA → Website Settings → Camera → Allow).");
        } else if (name === "NotFoundError") {
          setCamError("Nicio cameră găsită pe acest dispozitiv.");
        } else if (name === "NotReadableError") {
          setCamError("Camera e folosită de altă aplicație. Închide-o și încearcă din nou.");
        } else {
          setCamError(e?.message || "Nu am putut porni camera");
        }
      } finally {
        setStarting(false);
      }
    })();
  }

  async function enableCompass() {
    try {
      const r = await (DeviceOrientationEvent as any).requestPermission();
      if (r === "granted") {
        setNeedsOrient(false);
        setCompassLimited(false);
      } else {
        setNeedsOrient(false);
        setCompassLimited(true);
        setHeading(0);
        toast.error("Busola nu e activă, dar radar-ul pornește fără blocaj.");
      }
    } catch {
      setNeedsOrient(false);
      setCompassLimited(true);
      setHeading(0);
    }
  }

  useEffect(() => {
    if (!started || needsOrient || heading !== null) return;
    const id = window.setTimeout(() => {
      setCompassLimited(true);
      setHeading(0);
    }, 4500);
    return () => window.clearTimeout(id);
  }, [started, needsOrient, heading]);


  // 4. Load venues + friends around user
  useEffect(() => {
    if (!pos) return;
    let cancelled = false;
    async function load() {
      setLoadingData(true);
      // Bounding box ~1km
      const dLat = 0.009; // ~1km
      const dLng = 0.014;
      const [{ data: vs }, { data: lls }, threeHoursAgo] = await Promise.all([
        supabase
          .from("venues")
          .select("id, name, type, lat, lng, cover_url")
          .gte("lat", pos!.lat - dLat)
          .lte("lat", pos!.lat + dLat)
          .gte("lng", pos!.lng - dLng)
          .lte("lng", pos!.lng + dLng)
          .limit(60),
        user
          ? supabase
              .from("live_locations")
              .select("user_id, lat, lng, updated_at")
              .gte("lat", pos!.lat - dLat)
              .lte("lat", pos!.lat + dLat)
              .gte("lng", pos!.lng - dLng)
              .lte("lng", pos!.lng + dLng)
              .gte("updated_at", new Date(Date.now() - 30 * 60 * 1000).toISOString())
              .neq("user_id", user.id)
              .limit(30)
          : Promise.resolve({ data: [] as any[] }),
        new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      ]);
      const venueList = (vs || []).filter((v: any) => v.lat != null && v.lng != null);
      const venueIds = venueList.map((v: any) => v.id);
      let heatMap = new Map<string, number>();
      if (venueIds.length) {
        const { data: chks } = await supabase
          .from("check_ins")
          .select("venue_id")
          .in("venue_id", venueIds)
          .gte("created_at", threeHoursAgo);
        (chks || []).forEach((c: any) => {
          heatMap.set(c.venue_id, (heatMap.get(c.venue_id) || 0) + 1);
        });
      }

      const withGeo: RadarVenue[] = venueList
        .map((v: any) => {
          const d = haversine(pos!.lat, pos!.lng, v.lat, v.lng);
          return {
            id: v.id,
            name: v.name,
            type: v.type,
            lat: v.lat,
            lng: v.lng,
            cover_url: v.cover_url,
            heat: heatMap.get(v.id) || 0,
            distance: d,
            bearing: bearing(pos!.lat, pos!.lng, v.lat, v.lng),
          };
        })
        .filter((v) => v.distance <= RADAR_RANGE_M)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 20);

      // Friend profiles
      const friendIds = (lls || []).map((l: any) => l.user_id);
      let profMap = new Map<string, any>();
      if (friendIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, handle, display_name, avatar_url")
          .in("id", friendIds);
        (profs || []).forEach((p: any) => profMap.set(p.id, p));
      }
      const friendList: RadarFriend[] = (lls || [])
        .map((l: any) => {
          const p = profMap.get(l.user_id) || {};
          const d = haversine(pos!.lat, pos!.lng, l.lat, l.lng);
          return {
            user_id: l.user_id,
            handle: p.handle ?? null,
            display_name: p.display_name ?? null,
            avatar_url: p.avatar_url ?? null,
            lat: l.lat,
            lng: l.lng,
            distance: d,
            bearing: bearing(pos!.lat, pos!.lng, l.lat, l.lng),
          };
        })
        .filter((f) => f.distance <= RADAR_RANGE_M);

      if (!cancelled) {
        setVenues(withGeo);
        setFriends(friendList);
        setLoadingData(false);
      }
    }
    load();
    const iv = window.setInterval(load, 25000);
    return () => {
      cancelled = true;
      window.clearInterval(iv);
    };
  }, [pos?.lat, pos?.lng, user?.id]);

  const fovDeg = 60; // roughly what a phone rear cam sees
  const hasHeading = heading !== null;

  return (
    <div
      className="fixed inset-0 z-0 overflow-hidden bg-black text-white"
      data-header-bg="#000000"
    >
      {/* Camera video background */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* Dark scanline vignette */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/70" />
      <div
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{
          background:
            "repeating-linear-gradient(180deg, transparent 0 3px, rgba(0,255,255,0.06) 3px 4px)",
        }}
      />

      {/* HUD Top bar */}
      <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between p-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        <Link
          to="/app/map"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/50 backdrop-blur-md"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="rounded-full border border-cyan-400/40 bg-black/50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest backdrop-blur-md">
          <span className="text-cyan-300">Spritz Radar</span> · LIVE
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/50 backdrop-blur-md">
          <Compass
            className="h-5 w-5 text-cyan-300 transition-transform duration-200"
            style={{ transform: `rotate(${-(heading ?? 0)}deg)` }}
          />
        </div>
      </div>

      {/* Center crosshair */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
        <div className="h-16 w-16 rounded-full border border-cyan-300/40" />
        <div className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300" />
      </div>

      {/* AR pins */}
      {hasHeading && pos && (
        <div className="pointer-events-none absolute inset-0 z-20">
          {venues.map((v) => {
            const diff = shortestAngle(v.bearing - (heading || 0));
            const inView = Math.abs(diff) <= fovDeg;
            if (!inView) return null;
            const xPct = 50 + (diff / fovDeg) * 45; // -45..+45 of screen
            // vertical: closer = lower, further = higher
            const yPct = 30 + Math.min(50, (v.distance / RADAR_RANGE_M) * 50);
            const scale = 1 - Math.min(0.4, v.distance / RADAR_RANGE_M / 1.5);
            const heatColor = v.heat >= 5 ? "#ff2d95" : v.heat >= 2 ? "#ffb703" : "#22d3ee";
            return (
              <button
                key={v.id}
                onClick={() => setSelected(v)}
                className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-200"
                style={{
                  left: `${xPct}%`,
                  top: `${yPct}%`,
                  transform: `translate(-50%, -50%) scale(${scale})`,
                }}
              >
                <div
                  className="flex flex-col items-center gap-1"
                  style={{ filter: `drop-shadow(0 0 10px ${heatColor})` }}
                >
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-full border-2 bg-black/70 backdrop-blur-md"
                    style={{ borderColor: heatColor }}
                  >
                    {v.heat >= 5 ? (
                      <Zap className="h-5 w-5" style={{ color: heatColor }} />
                    ) : (
                      <MapPin className="h-5 w-5" style={{ color: heatColor }} />
                    )}
                  </div>
                  <div className="max-w-[110px] truncate rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-semibold backdrop-blur-md">
                    {v.name}
                  </div>
                  <div className="text-[10px] font-medium text-white/70">
                    {formatDistance(v.distance)}
                    {v.heat > 0 && (
                      <span className="ml-1" style={{ color: heatColor }}>
                        · 🔥{v.heat}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}

          {friends.map((f) => {
            const diff = shortestAngle(f.bearing - (heading || 0));
            const inView = Math.abs(diff) <= fovDeg;
            if (!inView) return null;
            const xPct = 50 + (diff / fovDeg) * 45;
            const yPct = 30 + Math.min(50, (f.distance / RADAR_RANGE_M) * 50);
            return (
              <div
                key={f.user_id}
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${xPct}%`, top: `${yPct}%` }}
              >
                <div
                  className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-2 border-emerald-300 bg-black"
                  style={{ boxShadow: "0 0 18px rgba(52,211,153,0.6)" }}
                >
                  {f.avatar_url ? (
                    <img src={f.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold">
                      {(f.display_name || f.handle || "?")[0]?.toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="mt-1 truncate rounded-full bg-emerald-500/90 px-2 py-0.5 text-center text-[10px] font-semibold">
                  @{f.handle || "prieten"}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom sonar strip */}
      <div className="absolute inset-x-0 bottom-0 z-30 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        <div className="rounded-2xl border border-white/10 bg-black/60 p-3 backdrop-blur-xl">
          <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-widest text-white/60">
            <span>Detectate · rază {Math.round(RADAR_RANGE_M)}m</span>
            {loadingData && <Loader2 className="h-3 w-3 animate-spin" />}
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {venues.length === 0 ? (
              <div className="text-xs text-white/50">
                Niciun local activ în jurul tău acum. Mișcă-te ~ 100m.
              </div>
            ) : (
              venues.slice(0, 10).map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelected(v)}
                  className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left"
                >
                  <div className="text-[13px] font-semibold">{v.name}</div>
                  <div className="text-[11px] text-white/60">
                    {formatDistance(v.distance)}
                    {v.heat > 0 && <span className="text-fuchsia-300"> · 🔥{v.heat}</span>}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Compass permission overlay */}
      {needsOrient && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 p-6 text-center">
          <div className="max-w-sm space-y-4">
            <Compass className="mx-auto h-12 w-12 text-cyan-300" />
            <h2 className="text-xl font-bold">Activează busola</h2>
            <p className="text-sm text-white/70">
              Pentru ca AR-ul să știe în ce direcție privești, avem nevoie de acces la senzorul de
              orientare al telefonului.
            </p>
            <Button onClick={enableCompass} className="w-full">
              Permite busola
            </Button>
          </div>
        </div>
      )}

      {/* Camera error */}
      {camError && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/85 p-6 text-center">
          <div className="max-w-sm space-y-4">
            <Sparkles className="mx-auto h-10 w-10 text-fuchsia-300" />
            <h2 className="text-lg font-bold">Radar-ul are nevoie de camera</h2>
            <p className="text-sm text-white/70">{camError}</p>
            <Link to="/app/map" className="inline-block text-sm text-cyan-300 underline">
              Înapoi la hartă
            </Link>
          </div>
        </div>
      )}

      {/* Start gate — camera + compass need a user gesture on mobile */}
      {!started && !camError && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/90 p-6 text-center">
          <div className="max-w-sm space-y-5">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-cyan-400/40 bg-black">
              <Sparkles className="h-8 w-8 text-cyan-300" />
            </div>
            <h2 className="text-2xl font-bold">Pornește Spritz Radar</h2>
            <p className="text-sm text-white/70">
              Îndreaptă telefonul spre stradă și vezi în AR localurile din jur, prietenii activi și heat-ul serii.
              Avem nevoie de <b>camera</b>, <b>locație</b> și <b>busolă</b>.
            </p>
            <Button
              onClick={startRadar}
              disabled={starting}
              className="w-full bg-cyan-400 text-black hover:bg-cyan-300"
            >
              {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Activează AR"}
            </Button>
            <Link to="/app/map" className="inline-block text-xs text-white/50 underline">
              Înapoi la hartă
            </Link>
          </div>
        </div>
      )}


      {/* Waiting for GPS/heading */}
      {!camError && (!pos || !hasHeading) && camReady && !needsOrient && (
        <div className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-black/70 px-4 py-3 text-center text-sm backdrop-blur-md">
          <Loader2 className="mx-auto mb-1 h-4 w-4 animate-spin text-cyan-300" />
          {!pos
            ? "Caut locația ta…"
            : compassLimited
              ? "Radar pornit fără busolă"
              : "Calibrez busola… mișcă telefonul în opt"}
        </div>
      )}

      {/* Detail sheet */}
      {selected && (
        <div
          className="absolute inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full rounded-t-3xl border-t border-white/10 bg-neutral-950 p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-bold">{selected.name}</div>
                <div className="text-xs text-white/60">
                  {formatDistance(selected.distance)} ·{" "}
                  {compassPoint(selected.bearing)} · {selected.type ?? "local"}
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="rounded-full p-1 text-white/60 hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {selected.heat > 0 && (
              <div className="mt-3 rounded-xl border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 py-2 text-sm">
                🔥 <b>{selected.heat}</b> check-in-uri în ultimele 3 ore
              </div>
            )}
            <div className="mt-4 flex gap-2">
              <Link
                to="/app/map"
                search={{ venue: selected.id }}
                className="flex-1 rounded-xl bg-white py-2.5 text-center text-sm font-semibold text-black"
              >
                Vezi pe hartă
              </Link>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lng}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 rounded-xl border border-white/20 py-2.5 text-center text-sm font-semibold"
              >
                Navighează
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function shortestAngle(a: number) {
  let x = ((a + 180) % 360) - 180;
  if (x < -180) x += 360;
  return x;
}
function formatDistance(m: number) {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}
function compassPoint(b: number) {
  const dirs = ["N", "NE", "E", "SE", "S", "SV", "V", "NV"];
  return dirs[Math.round(b / 45) % 8];
}

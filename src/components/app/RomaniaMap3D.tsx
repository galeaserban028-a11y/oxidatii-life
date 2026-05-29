import { useEffect, useMemo, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import maplibregl, { Map as MlMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

type City = { id: string; slug: string; name: string; lat: number; lng: number; chaos_level: number };
type Venue = { id: string; name: string; lat: number | null; lng: number | null };
export type FriendPin = {
  user_id: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
  lat: number;
  lng: number;
  venue_name?: string | null;
};

const towerSourceId = "oxidatii-3d-towers";
const towerLayerId = "oxidatii-3d-towers-layer";
const livePulseSourceId = "oxidatii-live-pulse";
const livePulseLayerId = "oxidatii-live-pulse-layer";

function makeTowerFeature(lng: number, lat: number, height: number, size: number, kind: "city" | "venue") {
  return {
    type: "Feature" as const,
    properties: { height, kind },
    geometry: {
      type: "Polygon" as const,
      coordinates: [[
        [lng - size, lat - size],
        [lng + size, lat - size],
        [lng + size, lat + size],
        [lng - size, lat + size],
        [lng - size, lat - size],
      ]],
    },
  };
}

export function RomaniaMap3D({
  cities,
  venues = [],
  friends = [],
}: {
  cities: City[];
  venues?: Venue[];
  friends?: FriendPin[];
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MlMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const nav = useNavigate();
  const towerData = useMemo(() => ({
    type: "FeatureCollection" as const,
    features: [
      ...cities.map((c) => makeTowerFeature(c.lng, c.lat, 18000 + c.chaos_level * 4200, 0.055, "city" as const)),
      ...venues
        .filter((v) => v.lat != null && v.lng != null)
        .slice(0, 900)
        .map((v, index) => makeTowerFeature(Number(v.lng), Number(v.lat), 4500 + (index % 9) * 1200, 0.018, "venue" as const)),
    ],
  }), [cities, venues]);
  const liveData = useMemo(() => ({
    type: "FeatureCollection" as const,
    features: friends.map((f) => ({
      type: "Feature" as const,
      properties: {},
      geometry: { type: "Point" as const, coordinates: [f.lng, f.lat] },
    })),
  }), [friends]);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
      center: [25.0, 45.9],
      zoom: 5.65,
      pitch: 62,
      bearing: -18,
      attributionControl: { compact: true },
      antialias: true,
    });
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    map.touchZoomRotate.enableRotation();
    map.dragRotate.enable();
    map.on("load", () => {
      map.addSource(towerSourceId, { type: "geojson", data: towerData });
      map.addLayer({
        id: towerLayerId,
        type: "fill-extrusion",
        source: towerSourceId,
        paint: {
          "fill-extrusion-color": ["match", ["get", "kind"], "city", "#ff3158", "#ffb000"],
          "fill-extrusion-height": ["get", "height"],
          "fill-extrusion-base": 0,
          "fill-extrusion-opacity": 0.82,
        },
      });
      map.addSource(livePulseSourceId, { type: "geojson", data: liveData });
      map.addLayer({
        id: livePulseLayerId,
        type: "circle",
        source: livePulseSourceId,
        paint: {
          "circle-radius": 18,
          "circle-color": "#39ff88",
          "circle-opacity": 0.22,
          "circle-stroke-color": "#39ff88",
          "circle-stroke-width": 2,
        },
      });
      map.resize();
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const towerSource = map.getSource(towerSourceId) as maplibregl.GeoJSONSource | undefined;
    towerSource?.setData(towerData);
  }, [towerData]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const liveSource = map.getSource(livePulseSourceId) as maplibregl.GeoJSONSource | undefined;
    liveSource?.setData(liveData);
  }, [liveData]);

  // Re-render markers when data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // City pins (always visible)
    for (const c of cities) {
      const el = document.createElement("button");
      const big = c.chaos_level >= 8;
      el.className = "block";
      el.style.cssText = `width:${big ? 14 : 9}px;height:${big ? 14 : 9}px;border-radius:9999px;background:${big ? "var(--neon-crimson)" : "var(--neon-purple)"};box-shadow:0 0 14px ${big ? "var(--neon-crimson)" : "var(--neon-purple)"},0 0 28px ${big ? "var(--neon-crimson)" : "var(--neon-purple)"};cursor:pointer;`;
      el.title = c.name;
      el.onclick = (e) => { e.stopPropagation(); nav({ to: "/app/city/$slug", params: { slug: c.slug } }); };
      const m = new maplibregl.Marker({ element: el }).setLngLat([c.lng, c.lat]).addTo(map);
      markersRef.current.push(m);
    }

    // Venue pins (small dots)
    for (const v of venues) {
      if (v.lat == null || v.lng == null) continue;
      const el = document.createElement("button");
      el.style.cssText = "width:6px;height:6px;border-radius:9999px;background:oklch(0.85 0.20 60);box-shadow:0 0 6px oklch(0.85 0.20 60);cursor:pointer;";
      el.title = v.name;
      el.onclick = (e) => { e.stopPropagation(); nav({ to: "/app/venue/$id", params: { id: v.id } }); };
      const m = new maplibregl.Marker({ element: el }).setLngLat([Number(v.lng), Number(v.lat)]).addTo(map);
      markersRef.current.push(m);
    }

    // Friend pins (avatars, big & green)
    for (const f of friends) {
      const wrap = document.createElement("div");
      wrap.style.cssText = "position:relative;transform:translateY(-50%);cursor:pointer;";
      const ring = document.createElement("div");
      ring.style.cssText = "width:36px;height:36px;border-radius:9999px;border:2px solid var(--neon-green);overflow:hidden;background:#000;box-shadow:0 0 14px var(--neon-green);";
      if (f.avatar_url) {
        const img = document.createElement("img");
        img.src = f.avatar_url; img.style.cssText = "width:100%;height:100%;object-fit:cover;";
        ring.appendChild(img);
      } else {
        ring.innerHTML = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-family:'Space Grotesk',sans-serif;">${((f.handle ?? f.display_name ?? "?")[0] ?? "?").toUpperCase()}</div>`;
      }
      wrap.appendChild(ring);
      wrap.onclick = (e) => { e.stopPropagation(); nav({ to: "/app/user/$id", params: { id: f.user_id } }); };
      const m = new maplibregl.Marker({ element: wrap, anchor: "bottom" }).setLngLat([f.lng, f.lat]).addTo(map);
      markersRef.current.push(m);
    }
  }, [cities, venues, friends, nav]);

  return (
    <div className="relative w-full h-[58vh] min-h-[420px] max-h-[620px] rounded-2xl overflow-hidden border border-foreground/10 bg-foreground/5">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="absolute top-2 left-2 z-10 px-2 py-1 rounded-md bg-background/75 backdrop-blur font-mono text-[9px] uppercase tracking-widest text-neon-green pointer-events-none shadow-[0_0_24px_-8px_var(--neon-green)]">
        ● hartă live 3D
      </div>
      <div className="absolute bottom-2 left-2 right-2 z-10 rounded-xl bg-background/78 backdrop-blur border border-foreground/10 px-3 py-2 pointer-events-none">
        <div className="font-display font-black text-sm leading-none">{venues.length} cluburi pe mapă</div>
        <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mt-1">turnurile = locuri de șpriț · verde = prieteni live</div>
      </div>
    </div>
  );
}

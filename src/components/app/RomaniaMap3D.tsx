import { useEffect, useRef } from "react";
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

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      // Free, no-API-key vector style with 3D building extrusions
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: [25.0, 45.9], // RO center
      zoom: 5.4,
      pitch: 55,
      bearing: -12,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    map.touchZoomRotate.enableRotation();

    map.on("style.load", () => {
      // Boost 3D building extrusions if present in the style
      const layers = map.getStyle().layers ?? [];
      for (const l of layers) {
        if (l.type === "fill-extrusion") {
          try {
            map.setPaintProperty(l.id, "fill-extrusion-opacity", 0.85);
            map.setPaintProperty(l.id, "fill-extrusion-color", "#3a2150");
          } catch {/* ignore */}
        }
      }
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

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
    <div className="relative w-full aspect-[5/4] rounded-2xl overflow-hidden border border-foreground/10 bg-black">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="absolute top-2 left-2 z-10 px-2 py-1 rounded-md bg-background/70 backdrop-blur font-mono text-[9px] uppercase tracking-widest text-neon-green pointer-events-none">
        ● 3D live
      </div>
    </div>
  );
}

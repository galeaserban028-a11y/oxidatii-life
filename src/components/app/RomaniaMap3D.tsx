import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import maplibregl, { Map as MlMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

type City = { id: string; slug: string; name: string; lat: number; lng: number; chaos_level: number };
type Venue = {
  id: string; name: string; type?: string;
  lat: number | null; lng: number | null;
};
export type FriendPin = {
  user_id: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
  lat: number;
  lng: number;
  venue_name?: string | null;
};

const TYPE_COLOR: Record<string, string> = {
  club: "#c66bff",
  bar: "#ffb000",
  pub: "#ff8a3d",
  terasa: "#39ff88",
  "terasă": "#39ff88",
  after: "#ff3158",
};

const VOYAGER_STYLE = {
  version: 8,
  sources: {
    "carto-voyager": {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "© CARTO, © OpenStreetMap contributors",
      maxzoom: 19,
    },
  },
  layers: [
    { id: "background", type: "background", paint: { "background-color": "#0a0e1a" } },
    { id: "carto-voyager", type: "raster", source: "carto-voyager", paint: { "raster-opacity": 1, "raster-saturation": 0.35, "raster-contrast": 0.05 } },
  ],
  sky: {
    "sky-color": "#0a0e1a",
    "horizon-color": "#1a2440",
    "fog-color": "#06070a",
    "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 6, 0.5, 10, 0],
  },
} as unknown as maplibregl.StyleSpecification;


const VENUES_SRC = "venues-src";

function isValidLngLat(lng: unknown, lat: unknown) {
  const x = Number(lng);
  const y = Number(lat);
  return Number.isFinite(x) && Number.isFinite(y) && x >= -180 && x <= 180 && y >= -85 && y <= 85;
}

export function RomaniaMap3D({
  cities,
  venues = [],
  friends = [],
  onCityClick,
  focusCity,
}: {
  cities: City[];
  venues?: Venue[];
  friends?: FriendPin[];
  onCityClick?: (city: City) => void;
  focusCity?: { lat: number; lng: number; zoom?: number } | null;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MlMap | null>(null);
  const cityMarkers = useRef<Marker[]>([]);
  const friendMarkers = useRef<Map<string, Marker>>(new Map());
  const loadedRef = useRef(false);
  const onCityClickRef = useRef<typeof onCityClick>(onCityClick);
  const nav = useNavigate();
  const navRef = useRef(nav);
  const [mapFailed, setMapFailed] = useState(false);

  useEffect(() => { navRef.current = nav; }, [nav]);
  useEffect(() => { onCityClickRef.current = onCityClick; }, [onCityClick]);

  // INIT map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    setMapFailed(false);
    let map: MlMap;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: VOYAGER_STYLE,
        center: [25.0, 45.9],
        zoom: 5.2,
        pitch: 0,
        bearing: 0,
        attributionControl: { compact: true },
        cooperativeGestures: false,
        renderWorldCopies: false,
        fadeDuration: 80,
        refreshExpiredTiles: false,
        maxPitch: 60,
      });
    } catch (error) {
      console.warn("Map init failed", error);
      setMapFailed(true);
      return;
    }

    // Globe projection — small interactive "globuleț"
    try { (map as any).setProjection({ type: "globe" }); } catch {}


    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true, showCompass: true }), "top-right");
    map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserLocation: true,
      }),
      "top-right"
    );
    map.touchZoomRotate.enableRotation();
    map.dragRotate.enable();

    map.on("load", () => {
      loadedRef.current = true;
      // GPU-rendered venue layer + clustering — handles thousands of points at 60fps
      map.addSource(VENUES_SRC, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterRadius: 38,
        clusterMaxZoom: 12,
      });

      // cluster bubbles
      map.addLayer({
        id: "venues-clusters",
        type: "circle",
        source: VENUES_SRC,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step", ["get", "point_count"],
            "#ffb000", 10,
            "#ff8a3d", 50,
            "#ff3158",
          ],
          "circle-radius": ["step", ["get", "point_count"], 14, 10, 18, 50, 24],
          "circle-opacity": 0.85,
          "circle-stroke-width": 2,
          "circle-stroke-color": "rgba(0,0,0,0.6)",
        },
      });
      map.addLayer({
        id: "venues-cluster-count",
        type: "symbol",
        source: VENUES_SRC,
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-size": 11,
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
        },
        paint: { "text-color": "#0a0a0a" },
      });

      // unclustered points
      map.addLayer({
        id: "venues-points",
        type: "circle",
        source: VENUES_SRC,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 3, 10, 5, 14, 8],
          "circle-color": [
            "match", ["get", "type"],
            "club", TYPE_COLOR.club,
            "bar", TYPE_COLOR.bar,
            "pub", TYPE_COLOR.pub,
            "terasa", TYPE_COLOR.terasa,
            "terasă", TYPE_COLOR.terasa,
            "after", TYPE_COLOR.after,
            "#ffb000",
          ],
          "circle-opacity": 0.9,
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "rgba(0,0,0,0.7)",
        },
      });

      // click → zoom into cluster / navigate to venue
      map.on("click", "venues-clusters", (e) => {
        const f = e.features?.[0]; if (!f) return;
        const id = (f.properties as any).cluster_id;
        (map.getSource(VENUES_SRC) as maplibregl.GeoJSONSource).getClusterExpansionZoom(id).then((zoom) => {
          map.easeTo({ center: (f.geometry as any).coordinates, zoom: zoom + 0.2, duration: 500 });
        }).catch(() => {});
      });
      map.on("click", "venues-points", (e) => {
        const f = e.features?.[0]; if (!f) return;
        const id = (f.properties as any).id;
        navRef.current({ to: "/app/venue/$id", params: { id } });
      });
      for (const layer of ["venues-clusters", "venues-points"]) {
        map.on("mouseenter", layer, () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; });
      }

      requestAnimationFrame(() => map.resize());
    });

    map.on("error", (event) => { console.warn("Map tile error", event.error); });
    map.getCanvas().addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      setMapFailed(true);
    }, { once: true });
    mapRef.current = map;
    return () => {
      cityMarkers.current.forEach(m => m.remove()); cityMarkers.current = [];
      friendMarkers.current.forEach(m => m.remove()); friendMarkers.current.clear();
      try { map.remove(); } catch {}
      mapRef.current = null; loadedRef.current = false;
    };
  }, []);

  // VENUES → GeoJSON (GPU layer)
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    const apply = () => {
      const src = map.getSource(VENUES_SRC) as maplibregl.GeoJSONSource | undefined;
      if (!src) return;
      src.setData({
        type: "FeatureCollection",
        features: venues
          .filter(v => isValidLngLat(v.lng, v.lat))
          .map(v => ({
            type: "Feature",
            geometry: { type: "Point", coordinates: [Number(v.lng), Number(v.lat)] },
            properties: { id: v.id, name: v.name, type: v.type ?? "club" },
          })),
      });
    };
    if (loadedRef.current) apply(); else map.once("load", apply);
  }, [venues]);

  // CITIES → DOM markers (small count, re-render OK)
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    cityMarkers.current.forEach(m => m.remove());
    cityMarkers.current = [];
    for (const c of cities) {
      if (!isValidLngLat(c.lng, c.lat)) continue;
      const big = c.chaos_level >= 8;
      const wrap = document.createElement("button");
      wrap.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer;background:none;border:0;padding:0;transform:translateY(-50%);";
      wrap.title = c.name;
      const dot = document.createElement("div");
      const color = big ? "#ff3158" : "#c66bff";
      dot.style.cssText = `width:${big ? 14 : 10}px;height:${big ? 14 : 10}px;border-radius:9999px;background:${color};border:2px solid rgba(255,255,255,0.85);box-shadow:0 0 12px ${color};`;
      wrap.appendChild(dot);
      const label = document.createElement("div");
      label.textContent = c.name.toUpperCase();
      label.style.cssText = `font-family:'Space Grotesk',sans-serif;font-weight:900;font-size:${big ? 11 : 9}px;letter-spacing:0.08em;color:#fff;text-shadow:0 0 6px #000,0 1px 3px #000;white-space:nowrap;`;
      wrap.appendChild(label);
      let pressTimer: number | null = null;
      let longPressed = false;
      wrap.onpointerdown = () => {
        longPressed = false;
        pressTimer = window.setTimeout(() => {
          longPressed = true;
          navRef.current({ to: "/app/city/$slug", params: { slug: c.slug } });
        }, 550);
      };
      const clear = () => { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } };
      wrap.onpointerup = wrap.onpointerleave = wrap.onpointercancel = clear;
      wrap.onclick = (e) => {
        e.stopPropagation();
        clear();
        if (longPressed) return;
        if (onCityClickRef.current) onCityClickRef.current(c);
        else navRef.current({ to: "/app/city/$slug", params: { slug: c.slug } });
      };
      cityMarkers.current.push(new maplibregl.Marker({ element: wrap, anchor: "bottom" }).setLngLat([c.lng, c.lat]).addTo(map));
    }
  }, [cities]);

  // FOCUS city programmatically (flyTo) when parent selects one
  useEffect(() => {
    const map = mapRef.current; if (!map || !focusCity) return;
    map.flyTo({ center: [focusCity.lng, focusCity.lat], zoom: focusCity.zoom ?? 12.4, pitch: 45, bearing: 0, duration: 1100, essential: true });
  }, [focusCity]);

  // FRIENDS → diff-only DOM markers (keep refs by user_id, no full rebuild)
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    const seen = new Set<string>();
    for (const f of friends) {
      seen.add(f.user_id);
      const existing = friendMarkers.current.get(f.user_id);
      if (existing) { existing.setLngLat([f.lng, f.lat]); continue; }

      const wrap = document.createElement("div");
      wrap.style.cssText = "position:relative;display:flex;flex-direction:column;align-items:center;cursor:pointer;transform:translateY(-50%);z-index:10;";

      const pulse = document.createElement("div");
      pulse.style.cssText = "position:absolute;top:-4px;left:50%;transform:translateX(-50%);width:54px;height:54px;border-radius:9999px;background:#39ff88;opacity:0.35;animation:oxi-pulse-strong 1.8s ease-out infinite;pointer-events:none;";
      wrap.appendChild(pulse);

      const ring = document.createElement("div");
      ring.style.cssText = "position:relative;width:44px;height:44px;border-radius:9999px;border:3px solid #39ff88;overflow:hidden;background:linear-gradient(135deg,#ff3158,#c66bff);box-shadow:0 0 18px #39ff88,0 4px 14px rgba(0,0,0,0.6);";
      if (f.avatar_url) {
        const img = document.createElement("img");
        img.src = f.avatar_url; img.alt = "";
        img.style.cssText = "width:100%;height:100%;object-fit:cover;";
        ring.appendChild(img);
      } else {
        const ini = document.createElement("div");
        ini.textContent = ((f.handle ?? f.display_name ?? "?")[0] ?? "?").toUpperCase();
        ini.style.cssText = "width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-family:'Space Grotesk',sans-serif;font-size:18px;";
        ring.appendChild(ini);
      }
      wrap.appendChild(ring);

      const live = document.createElement("div");
      live.style.cssText = "position:absolute;top:-2px;right:-2px;width:12px;height:12px;border-radius:9999px;background:#39ff88;border:2px solid #06070a;box-shadow:0 0 8px #39ff88;";
      ring.appendChild(live);

      const pill = document.createElement("div");
      pill.textContent = `@${f.handle ?? f.display_name ?? "live"}`;
      pill.style.cssText = "margin-top:4px;padding:2px 6px;border-radius:9999px;background:rgba(6,7,10,0.92);color:#39ff88;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:9px;letter-spacing:0.08em;text-transform:uppercase;white-space:nowrap;border:1px solid rgba(57,255,136,0.5);";
      wrap.appendChild(pill);

      wrap.onclick = (e) => { e.stopPropagation(); nav({ to: "/app/user/$id", params: { id: f.user_id } }); };
      const marker = new maplibregl.Marker({ element: wrap, anchor: "bottom" }).setLngLat([f.lng, f.lat]).addTo(map);
      friendMarkers.current.set(f.user_id, marker);
    }
    // remove markers for friends no longer present
    for (const [id, marker] of friendMarkers.current) {
      if (!seen.has(id)) { marker.remove(); friendMarkers.current.delete(id); }
    }
  }, [friends, nav]);

  return (
    <div className="relative w-full h-[62vh] min-h-[460px] max-h-[640px] rounded-3xl overflow-hidden border border-neon-purple/30 bg-[#06070a] shadow-[0_0_60px_-20px_var(--neon-purple)]">
      <style>{`
        @keyframes oxi-pulse-strong { 0% { transform: translateX(-50%) scale(0.6); opacity: 0.7; } 80% { transform: translateX(-50%) scale(1.5); opacity: 0; } 100% { opacity: 0; } }
        .maplibregl-map { position:absolute !important; inset:0 !important; overflow:hidden !important; width:100% !important; height:100% !important; }
        .maplibregl-canvas-container, .maplibregl-canvas { position:absolute !important; inset:0 !important; width:100% !important; height:100% !important; }
        .maplibregl-canvas { outline:none !important; }
        .maplibregl-marker { position:absolute !important; top:0; left:0; will-change:transform; z-index:2; }
        .maplibregl-ctrl-top-right { position:absolute; top:10px; right:10px; z-index:3; display:flex; flex-direction:column; gap:8px; }
        .maplibregl-ctrl-group { background: rgba(6,7,10,0.85) !important; border: 1px solid rgba(255,255,255,0.1) !important; }
        .maplibregl-ctrl-group button { background-color: transparent !important; }
        .maplibregl-ctrl-group button span { filter: invert(1) brightness(1.2); }
      `}</style>
      <div ref={containerRef} className="absolute inset-0" />

      {/* Neon vignette + atmospheric halo (over the globe) */}
      <div className="pointer-events-none absolute inset-0 z-[1]"
           style={{ background: "radial-gradient(ellipse at 50% 45%, transparent 35%, rgba(198,107,255,0.10) 65%, rgba(6,7,10,0.7) 100%)" }} />
      <div className="pointer-events-none absolute -inset-10 z-[1] opacity-60 blur-3xl"
           style={{ background: "radial-gradient(circle at 30% 30%, rgba(57,255,136,0.25), transparent 50%), radial-gradient(circle at 75% 70%, rgba(255,49,88,0.22), transparent 55%)" }} />


      <div className="absolute top-2 left-2 z-10 px-2.5 py-1 rounded-md bg-black/80 backdrop-blur font-mono text-[9px] uppercase tracking-widest text-neon-green pointer-events-none border border-neon-green/30">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-neon-green animate-pulse mr-1.5 align-middle" />
        live · {friends.length} oxidați activi
      </div>

      <div className="absolute bottom-2 left-2 right-2 z-10 rounded-xl bg-black/80 backdrop-blur border border-foreground/10 px-3 py-2 pointer-events-none flex items-center justify-between gap-2">
        <div className="font-display font-black text-xs leading-none">{venues.length} locuri · {cities.length} orașe</div>
        <div className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          <span style={{color:"#c66bff"}}>● club</span>
          <span style={{color:"#ffb000"}}>● bar</span>
          <span style={{color:"#39ff88"}}>● terasă</span>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import maplibregl, { Map as MlMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Crosshair, Plus, Minus } from "lucide-react";

type City = { id: string; slug: string; name: string; lat: number; lng: number; chaos_level: number };
type Venue = {
  id: string; name: string; type?: string;
  lat: number | null; lng: number | null;
  address?: string | null; cover_url?: string | null;
};
export type FriendPin = {
  user_id: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
  lat: number;
  lng: number;
  venue_name?: string | null;
  is_me?: boolean;
};

const TYPE_COLOR: Record<string, string> = {
  club: "#c724ff",
  bar: "#ffea00",
  pub: "#ff3d8b",
  terasa: "#00e5ff",
  "terasă": "#00e5ff",
  after: "#ff3d8b",
};

// Compact vector wine bottle. Kept non-circular so it reads as a bottle,
// not as the old glowing dots/clusters.
function makePinImage(color: string, lowEnd = false): ImageData {
  const W = lowEnd ? 80 : 112, H = W;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const cx = W / 2, cy = H / 2;
  const s = W / 96;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.shadowColor = color;
  ctx.shadowBlur = (lowEnd ? 5 : 9) * s;

  const u = s;
  ctx.fillStyle = "#170711";
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3.2 * u;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(-6 * u, -31 * u);
  ctx.lineTo(6 * u, -31 * u);
  ctx.lineTo(6 * u, -18 * u);
  ctx.bezierCurveTo(6 * u, -13 * u, 17 * u, -10 * u, 17 * u, 2 * u);
  ctx.lineTo(17 * u, 27 * u);
  ctx.quadraticCurveTo(17 * u, 33 * u, 11 * u, 33 * u);
  ctx.lineTo(-11 * u, 33 * u);
  ctx.quadraticCurveTo(-17 * u, 33 * u, -17 * u, 27 * u);
  ctx.lineTo(-17 * u, 2 * u);
  ctx.bezierCurveTo(-17 * u, -10 * u, -6 * u, -13 * u, -6 * u, -18 * u);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // cap + colored wine body make the silhouette readable at small sizes.
  ctx.shadowBlur = 0;
  ctx.fillStyle = color;
  ctx.fillRect(-7 * u, -37 * u, 14 * u, 7 * u);
  ctx.fillRect(-13 * u, 12 * u, 26 * u, 16 * u);

  // label band
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(-12 * u, -1 * u, 24 * u, 10 * u);
  ctx.fillStyle = color;
  ctx.fillRect(-6 * u, 3 * u, 12 * u, 2.4 * u);

  // glass highlight
  ctx.strokeStyle = "rgba(255,255,255,0.72)";
  ctx.lineWidth = 2 * u;
  ctx.beginPath();
  ctx.moveTo(-8 * u, -22 * u);
  ctx.lineTo(-8 * u, 25 * u);
  ctx.stroke();

  ctx.restore();

  return ctx.getImageData(0, 0, W, H);
}





// Custom "Nightlife Neon" vector basemap: deep purple background, dark purple
// water, glowing gold roads, dashed purple admin boundaries. Uses OpenFreeMap's
// free vector tiles (OpenMapTiles schema, no API key required).
const VOYAGER_STYLE = {
  version: 8,
  glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
  sources: {
    omt: {
      type: "vector",
      url: "https://tiles.openfreemap.org/planet",
      attribution: "© OpenFreeMap © OpenMapTiles © OpenStreetMap contributors",
    },
  },
  layers: [
    { id: "background", type: "background", paint: { "background-color": "#0d0b1e" } },
    {
      id: "water",
      type: "fill",
      source: "omt",
      "source-layer": "water",
      paint: { "fill-color": "#070514" },
    },
    {
      id: "landcover",
      type: "fill",
      source: "omt",
      "source-layer": "landcover",
      filter: ["==", ["get", "class"], "wood"],
      paint: { "fill-color": "rgba(40,20,70,0.35)", "fill-opacity": 0.5 },
    },
    // Soft glow under roads
    {
      id: "roads-glow",
      type: "line",
      source: "omt",
      "source-layer": "transportation",
      filter: ["!", ["in", ["get", "class"], ["literal", ["ferry", "rail"]]]],
      paint: {
        "line-color": "rgba(212,175,55,0.22)",
        "line-width": ["interpolate", ["linear"], ["zoom"], 4, 1.2, 8, 3, 12, 6, 16, 14],
        "line-blur": 3,
      },
    },
    {
      id: "roads",
      type: "line",
      source: "omt",
      "source-layer": "transportation",
      filter: ["!", ["in", ["get", "class"], ["literal", ["ferry", "rail"]]]],
      paint: {
        "line-color": "rgba(232,196,90,0.55)",
        "line-width": ["interpolate", ["linear"], ["zoom"], 4, 0.4, 8, 0.8, 12, 1.4, 16, 2.4],
      },
    },
    {
      id: "admin-boundaries",
      type: "line",
      source: "omt",
      "source-layer": "boundary",
      filter: ["<=", ["get", "admin_level"], 4],
      paint: {
        "line-color": "rgba(168,85,247,0.55)",
        "line-width": ["interpolate", ["linear"], ["zoom"], 2, 0.6, 6, 1.1, 10, 1.6],
        "line-dasharray": [2, 2],
      },
    },
    {
      id: "place-country",
      type: "symbol",
      source: "omt",
      "source-layer": "place",
      filter: ["==", ["get", "class"], "country"],
      minzoom: 2,
      maxzoom: 7,
      layout: {
        "text-field": ["get", "name:latin"],
        "text-font": ["Noto Sans Bold"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 2, 10, 6, 16],
        "text-letter-spacing": 0.12,
        "text-transform": "uppercase",
      },
      paint: {
        "text-color": "rgba(230,220,255,0.85)",
        "text-halo-color": "rgba(13,11,30,0.9)",
        "text-halo-width": 1.4,
      },
    },
    {
      id: "place-city",
      type: "symbol",
      source: "omt",
      "source-layer": "place",
      filter: ["in", ["get", "class"], ["literal", ["city", "town"]]],
      minzoom: 3,
      layout: {
        "text-field": ["get", "name:latin"],
        "text-font": ["Noto Sans Regular"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 3, 10, 8, 14, 12, 18],
      },
      paint: {
        "text-color": "rgba(255,255,255,0.88)",
        "text-halo-color": "rgba(13,11,30,0.95)",
        "text-halo-width": 1.2,
      },
    },
  ],
  sky: {
    "sky-color": "#0d0b1e",
    "horizon-color": "#1a0b3a",
    "fog-color": "#070514",
    "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 6, 0.5, 10, 0],
  },
} as unknown as maplibregl.StyleSpecification;




const VENUES_SRC = "venues-src";
const HEAT_SRC = "venues-heat-src";
const SMALL_CITY_LIMIT = 18;
const DESKTOP_CITY_LIMIT = 42;

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
  fitBounds,
  promotedMeta = {},
}: {
  cities: City[];
  venues?: Venue[];
  friends?: FriendPin[];
  onCityClick?: (city: City) => void;
  focusCity?: { lat: number; lng: number; zoom?: number } | null;
  fitBounds?: [[number, number], [number, number]] | null;
  promotedMeta?: Record<string, { theme: string; cover: string | null; campaignId?: string }>;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MlMap | null>(null);
  const cityMarkers = useRef<Map<string, Marker>>(new Map());
  const friendMarkers = useRef<Map<string, Marker>>(new Map());
  const promotedMarkers = useRef<Map<string, Marker>>(new Map());
  const loadedRef = useRef(false);
  const compactMapRef = useRef(false);
  const onCityClickRef = useRef<typeof onCityClick>(onCityClick);
  const nav = useNavigate();
  const navRef = useRef(nav);
  const [mapFailed, setMapFailed] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => { navRef.current = nav; }, [nav]);
  useEffect(() => { onCityClickRef.current = onCityClick; }, [onCityClick]);

  // INIT map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    setMapFailed(false);
    let map: MlMap;
    const isSmall = typeof window !== "undefined" && window.innerWidth < 720;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: VOYAGER_STYLE,
        center: [25.0, 45.9],
        zoom: isSmall ? 3.2 : 3.8,
        minZoom: 2.5,
        pitch: 0,
        bearing: 0,
        attributionControl: { compact: true },
        cooperativeGestures: false,
        renderWorldCopies: false,
        fadeDuration: isSmall ? 0 : 80,
        refreshExpiredTiles: false,
        maxPitch: isSmall ? 45 : 60,
        pixelRatio: isSmall ? Math.min(window.devicePixelRatio || 1, 1.25) : undefined,
        antialias: !isSmall,
      } as any);
    } catch (error) {
      console.warn("Map init failed", error);
      setMapFailed(true);
      return;
    }

    map.touchZoomRotate.disableRotation();
    map.dragRotate.disable();
    compactMapRef.current = isSmall;
    // dragPan + scrollZoom rămân activate ca să se poată naviga și da zoom

    map.on("load", () => {
      loadedRef.current = true;
      setMapFailed(false);
      if (isSmall) {
        for (const layerId of ["roads-glow", "landcover", "admin-boundaries", "place-city"] as const) {
          try { if (map.getLayer(layerId)) map.removeLayer(layerId); } catch {}
        }
      }
      // GPU-rendered venue layer + clustering — handles thousands of points at 60fps
      // Enable real clustering so the cluster layers below actually render
      // (previously cluster:false meant clusters were declared but never used,
      // forcing thousands of individual symbols → frame drops).
      map.addSource(VENUES_SRC, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterRadius: 48,
        clusterMaxZoom: 12,
      });

      if (!isSmall) {
        // Desktop-only heat layer. On mobile GPUs the heatmap blur competes
        // with pan/zoom frames, so small screens use clustered pins only.
        map.addSource(HEAT_SRC, {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        map.addLayer({
          id: "venues-heat",
          type: "heatmap",
          source: HEAT_SRC,
          maxzoom: 13,
          paint: {
            "heatmap-weight": ["interpolate", ["linear"], ["get", "w"], 0, 0.08, 5, 0.55],
            "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 0.18, 9, 0.45, 13, 0.75],
            "heatmap-color": [
              "interpolate", ["linear"], ["heatmap-density"],
              0, "rgba(3,4,10,0)",
              0.18, "rgba(57,255,210,0.16)",
              0.45, "rgba(198,107,255,0.22)",
              0.75, "rgba(255,176,0,0.24)",
              1, "rgba(255,49,134,0.28)",
            ],
            "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 8, 6, 18, 11, 34, 13, 48],
            "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 4, 0.22, 10, 0.16, 13, 0.05],
          },
        });
      }

      // Register one clear vector wine-bottle icon per venue type.
      const pinTypes: Array<[string, string]> = [
        ["pin-bottle-v3-club", TYPE_COLOR.club],
        ["pin-bottle-v3-bar", TYPE_COLOR.bar],
        ["pin-bottle-v3-pub", TYPE_COLOR.pub],
        ["pin-bottle-v3-terasa", TYPE_COLOR.terasa],
        ["pin-bottle-v3-after", TYPE_COLOR.after],
      ];
      for (const [name, color] of pinTypes) {
        try {
          if (map.hasImage(name)) map.removeImage(name);
          map.addImage(name, makePinImage(color, isSmall), { pixelRatio: 2 });
        } catch {}
      }

      // Outer wide aura behind clusters — desktop only (expensive blur on mobile GPUs)
      if (!isSmall) {
        map.addLayer({
          id: "venues-clusters-aura",
          type: "circle",
          source: VENUES_SRC,
          filter: ["has", "point_count"],
          paint: {
            "circle-color": [
              "step", ["get", "point_count"],
              "rgba(255,43,214,0.42)", 80,
              "rgba(255,255,255,0.28)", 240,
              "rgba(255,140,90,0.42)",
            ],
            "circle-radius": ["step", ["get", "point_count"], 18, 80, 22, 240, 26],
            "circle-blur": 0.65,
            "circle-opacity": 0.32,
          },
        });
      }

      map.addLayer({
        id: "venues-clusters-glow",
        type: "circle",
        source: VENUES_SRC,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step", ["get", "point_count"],
            "rgba(255,43,214,0.55)", 80,
            "rgba(255,255,255,0.38)", 240,
            "rgba(255,140,90,0.55)",
          ],
          "circle-radius": ["step", ["get", "point_count"], 14, 80, 17, 240, 20],
          "circle-blur": 0.45,
        },
      });

      map.addLayer({
        id: "venues-clusters",
        type: "circle",
        source: VENUES_SRC,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step", ["get", "point_count"],
            "rgba(10,6,18,0.92)", 80,
            "rgba(20,14,26,0.92)", 240,
            "rgba(48,28,22,0.92)",
          ],
          "circle-radius": ["step", ["get", "point_count"], 10, 80, 12, 240, 14],
          "circle-stroke-width": 1.6,
          "circle-stroke-color": [
            "step", ["get", "point_count"],
            "#c724ff", 80,
            "#ffffff", 240,
            "#ff3d8b",
          ],
        },
      });

      map.addLayer({
        id: "venues-cluster-count",
        type: "symbol",
        source: VENUES_SRC,
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-size": ["step", ["get", "point_count"], 10, 80, 11, 240, 12],
          "text-font": ["Noto Sans Bold"],
          "text-allow-overlap": true,
        },
        paint: { "text-color": "#ffffff", "text-halo-color": "rgba(0,0,0,0.85)", "text-halo-width": 1.2 },
      });

      // unclustered points → clear wine-bottle pins
      map.addLayer({
        id: "venues-points",
        type: "symbol",
        source: VENUES_SRC,
        filter: ["!", ["has", "point_count"]],
        layout: {
          "icon-image": [
            "match", ["get", "type"],
            "club", "pin-bottle-v3-club",
            "bar", "pin-bottle-v3-bar",
            "pub", "pin-bottle-v3-pub",
            "terasa", "pin-bottle-v3-terasa",
            "terasă", "pin-bottle-v3-terasa",
            "after", "pin-bottle-v3-after",
            "pin-bottle-v3-bar",
          ],
          "icon-size": ["interpolate", ["linear"], ["zoom"], 3, 0.5, 6, 0.7, 10, 0.95, 14, 1.2, 17, 1.5],
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
          "icon-anchor": "center",
          "symbol-sort-key": ["case", ["==", ["get", "type"], "club"], 1, 5],
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
        const p = f.properties as any;
        const coords = (f.geometry as any).coordinates.slice();
        const cover = p.cover_url ? `<img src="${p.cover_url}" alt="" style="width:100%;height:120px;object-fit:cover;display:block;" loading="lazy"/>` : "";
        const addr = p.address ? `<div style="font-family:'DM Sans',sans-serif;font-size:10px;color:#aaa;margin-top:2px;">${p.address}</div>` : "";
        const typeColor = TYPE_COLOR[p.type] ?? "#ffea00";
        const html = `<div style="width:220px;background:#06070a;color:#fff;border-radius:12px;overflow:hidden;border:1px solid ${typeColor}55;">
          ${cover}
          <div style="padding:10px 12px;">
            <div style="display:inline-block;padding:1px 6px;border-radius:9999px;background:${typeColor}22;color:${typeColor};border:1px solid ${typeColor}55;font-family:'DM Sans',sans-serif;font-size:8px;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:4px;">${p.type ?? "loc"}</div>
            <div style="font-family:'DM Sans',sans-serif;font-weight:900;font-size:14px;line-height:1.15;">${p.name}</div>
            ${addr}
            <a href="/app/venue/${p.id}" data-oxi-venue="${p.id}" style="margin-top:8px;display:block;text-align:center;padding:6px 10px;border-radius:8px;background:${typeColor};color:#06070a;font-family:'DM Sans',sans-serif;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;font-weight:700;text-decoration:none;">detalii →</a>
          </div>
        </div>`;
        const popup = new maplibregl.Popup({ closeButton: true, closeOnClick: true, offset: 14, maxWidth: "240px", className: "oxi-popup" })
          .setLngLat(coords).setHTML(html).addTo(map);
        const root = popup.getElement();
        const link = root?.querySelector<HTMLAnchorElement>("a[data-oxi-venue]");
        if (link) link.addEventListener("click", (ev) => {
          ev.preventDefault();
          popup.remove();
          navRef.current({ to: "/app/venue/$id", params: { id: p.id } });
        });
      });
      for (const layer of ["venues-clusters", "venues-points"]) {
        map.on("mouseenter", layer, () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; });
      }

      requestAnimationFrame(() => map.resize());
    });

    map.on("error", (event) => { console.warn("Map tile error", event.error); });
    if (isSmall) {
      const movingOn = () => containerRef.current?.classList.add("oxi-map-moving");
      const movingOff = () => containerRef.current?.classList.remove("oxi-map-moving");
      map.on("movestart", movingOn);
      map.on("zoomstart", movingOn);
      map.on("moveend", movingOff);
      map.on("zoomend", movingOff);
    }
    const canvas = map.getCanvas();
    const onLost = (event: Event) => {
      event.preventDefault();
      canvas.addEventListener("webglcontextrestored", () => {
        setMapFailed(false);
        try { map.triggerRepaint(); } catch {}
      }, { once: true });
    };
    canvas.addEventListener("webglcontextlost", onLost as any);

    mapRef.current = map;
    return () => {
      cityMarkers.current.forEach(m => m.remove()); cityMarkers.current.clear();
      friendMarkers.current.forEach(m => m.remove()); friendMarkers.current.clear();
      promotedMarkers.current.forEach(m => m.remove()); promotedMarkers.current.clear();
      try { map.remove(); } catch {}
      mapRef.current = null; loadedRef.current = false;
    };
  }, [retryKey]);

  // VENUES → GeoJSON (GPU layer)
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    const apply = () => {
      const src = map.getSource(VENUES_SRC) as maplibregl.GeoJSONSource | undefined;
      if (!src) return;
      const visibleVenues = venues.filter(v => isValidLngLat(v.lng, v.lat) && !promotedMeta[v.id]);
      src.setData({
        type: "FeatureCollection",
        features: visibleVenues.map(v => ({
            type: "Feature",
            geometry: { type: "Point", coordinates: [Number(v.lng), Number(v.lat)] },
            properties: { id: v.id, name: v.name, type: v.type ?? "club", address: v.address ?? "", cover_url: v.cover_url ?? "" },
          })),
      });
      if (compactMapRef.current) return;
      const heat = map.getSource(HEAT_SRC) as maplibregl.GeoJSONSource | undefined;
      if (heat) {
        heat.setData({
          type: "FeatureCollection",
          features: venues
            .filter(v => isValidLngLat(v.lng, v.lat))
            .map(v => {
              const promoted = !!promotedMeta[v.id];
              const t = v.type ?? "club";
              const baseWeight = t === "club" ? 3 : t === "after" ? 3.2 : t === "bar" ? 2 : 1.4;
              return {
                type: "Feature" as const,
                geometry: { type: "Point" as const, coordinates: [Number(v.lng), Number(v.lat)] },
                properties: { w: promoted ? baseWeight + 2 : baseWeight },
              };
            }),
        });
      }
    };
    if (loadedRef.current) apply(); else map.once("load", apply);
  }, [venues, promotedMeta, retryKey]);

  // Heatmap pulse intentionally removed — it called setPaintProperty every
  // 120ms which forced a full WebGL repaint and dropped the whole map below
  // 60fps even when nothing else was happening. The base heatmap layer
  // already looks alive thanks to the cluster glow + DOM pulse animations.



  // PROMOTED VENUES → DOM markers with the brand cover/logo inside a glowing
  // halo. Replaces the bottle silhouette so paying businesses are instantly
  // recognizable on the map. Diff-only: only re-creates markers when the set
  // of promoted venues or their coordinates change.
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    const build = () => {
      if (compactMapRef.current && promotedMarkers.current.size === 0 && Object.keys(promotedMeta).length === 0) return;
      // Read dismissed promo ids from sessionStorage so an X dismissal sticks
      // for the current browsing session without nuking the database.
      let dismissed = new Set<string>();
      try {
        dismissed = new Set(JSON.parse(sessionStorage.getItem("oxi_dismissed_promos") || "[]"));
      } catch {}
      const seen = new Set<string>();
      for (const v of venues) {
        const meta = promotedMeta[v.id];
        if (!meta) continue;
        if (!isValidLngLat(v.lng, v.lat)) continue;
        if (meta.campaignId && dismissed.has(meta.campaignId)) continue;
        seen.add(v.id);
        const existing = promotedMarkers.current.get(v.id);
        if (existing) {
          existing.setLngLat([Number(v.lng), Number(v.lat)]);
          continue;
        }
        const theme = meta.theme || "#ff3d8b";
        const wrap = document.createElement("div");
        wrap.style.cssText = "position:relative;width:58px;height:58px;cursor:pointer;transform:translateY(-50%);z-index:5;";

        const pulse = document.createElement("div");
        pulse.style.cssText = `position:absolute;inset:-4px;border-radius:9999px;background:${theme};opacity:0.18;animation:oxi-pulse-strong 2.4s ease-out infinite;pointer-events:none;`;
        wrap.appendChild(pulse);

        const ring = document.createElement("div");
        ring.style.cssText = `position:relative;width:58px;height:58px;border-radius:18px;border:2px solid ${theme};overflow:hidden;background:#06070a;box-shadow:0 0 14px ${theme}88,0 8px 16px rgba(0,0,0,0.58);`;
        if (meta.cover) {
          const imgFrame = document.createElement("div");
          imgFrame.style.cssText = "position:absolute;inset:3px;border-radius:14px;overflow:hidden;background:linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02));display:flex;align-items:center;justify-content:center;aspect-ratio:1/1;";
          const img = document.createElement("img");
          img.src = meta.cover; img.alt = "";
          img.loading = "lazy";
          img.style.cssText = "width:100%;height:100%;object-fit:cover;object-position:center center;display:block;aspect-ratio:1/1;background:transparent;";
          imgFrame.appendChild(img);
          ring.appendChild(imgFrame);
        } else {
          const ini = document.createElement("div");
          ini.textContent = (v.name?.[0] ?? "?").toUpperCase();
          ini.style.cssText = `width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:${theme};font-weight:900;font-family:'DM Sans',sans-serif;font-size:20px;`;
          ring.appendChild(ini);
        }
        wrap.appendChild(ring);

        const badge = document.createElement("div");
        badge.textContent = "";
        badge.style.cssText = `position:absolute;bottom:3px;right:3px;width:10px;height:10px;border-radius:9999px;background:${theme};border:1.5px solid #06070a;box-shadow:0 0 8px ${theme};`;
        wrap.appendChild(badge);

        // X dismiss button (top-right). Stops propagation so click doesn't
        // open the campaign; persists in sessionStorage and removes marker.
        const close = document.createElement("button");
        close.type = "button";
        close.setAttribute("aria-label", "Ascunde reclama");
        close.textContent = "×";
        close.style.cssText = `position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:9999px;background:#06070a;color:#fff;border:1px solid ${theme};font-family:'DM Sans',sans-serif;font-weight:900;font-size:12px;line-height:1;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;z-index:6;opacity:.78;`;
        close.onclick = (e) => {
          e.stopPropagation();
          e.preventDefault();
          if (meta.campaignId) {
            try {
              const cur = new Set<string>(JSON.parse(sessionStorage.getItem("oxi_dismissed_promos") || "[]"));
              cur.add(meta.campaignId);
              sessionStorage.setItem("oxi_dismissed_promos", JSON.stringify([...cur]));
            } catch {}
          }
          const m = promotedMarkers.current.get(v.id);
          if (m) { m.remove(); promotedMarkers.current.delete(v.id); }
        };
        wrap.appendChild(close);

        wrap.onclick = (e) => {
          e.stopPropagation();
          if (meta.campaignId) {
            navRef.current({ to: "/app/promo/$id", params: { id: meta.campaignId } });
          } else {
            navRef.current({ to: "/app/venue/$id", params: { id: v.id } });
          }
        };

        const marker = new maplibregl.Marker({ element: wrap, anchor: "bottom" })
          .setLngLat([Number(v.lng), Number(v.lat)])
          .addTo(map);
        promotedMarkers.current.set(v.id, marker);
      }
      for (const [id, marker] of promotedMarkers.current) {
        if (!seen.has(id)) { marker.remove(); promotedMarkers.current.delete(id); }
      }
    };
    if (loadedRef.current) build(); else map.once("load", build);
  }, [venues, promotedMeta, retryKey]);


  // CITIES → only the hottest cities get a tiny label; the basemap provides
  // the clean city/country typography, avoiding the previous label pile-up.
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    const markerCities = [...cities]
      .sort((a, b) => b.chaos_level - a.chaos_level)
      .slice(0, compactMapRef.current ? SMALL_CITY_LIMIT : DESKTOP_CITY_LIMIT);
    const bottleSVG = (size: number, color: string) => `
      <svg width="${size}" height="${size * 2.2}" viewBox="0 0 20 44" xmlns="http://www.w3.org/2000/svg" style="display:block;${compactMapRef.current ? "" : `filter:drop-shadow(0 0 6px ${color}) drop-shadow(0 2px 3px rgba(0,0,0,0.7));`}">
        <rect x="8.5" y="0" width="3" height="6" rx="1" fill="#1a0f05"/>
        <rect x="7.5" y="5" width="5" height="3" fill="#d4a857"/>
        <path d="M8 8 L8 16 Q5 18 5 24 L5 40 Q5 43 8 43 L12 43 Q15 43 15 40 L15 24 Q15 18 12 16 L12 8 Z" fill="${color}" stroke="rgba(255,255,255,0.4)" stroke-width="0.6"/>
        <rect x="6" y="26" width="8" height="6" fill="rgba(255,255,255,0.92)"/>
        <text x="10" y="30.6" text-anchor="middle" font-family="DM Sans,sans-serif" font-weight="900" font-size="3.4" fill="#7a1e1e">OXI</text>
        <ellipse cx="7" cy="22" rx="1" ry="6" fill="rgba(255,255,255,0.28)"/>
      </svg>`;
    const seen = new Set<string>();
    for (const c of markerCities) {
      if (!isValidLngLat(c.lng, c.lat)) continue;
      seen.add(c.id);
      const existing = cityMarkers.current.get(c.id);
      if (existing) {
        // Diff-only: same city already rendered, just refresh position if it
        // moved. Avoids tearing down DOM + SVGs on every parent re-render,
        // which was the main map-jank culprit when cities reloaded.
        const cur = existing.getLngLat();
        if (cur.lng !== c.lng || cur.lat !== c.lat) existing.setLngLat([c.lng, c.lat]);
        continue;
      }
      const big = c.chaos_level >= 9;
      const color = big ? "#ff3d8b" : "#a855f7";
      const bottleSize = compactMapRef.current ? (big ? 17 : 14) : (big ? 20 : 16);
      const wrap = document.createElement("button");
      wrap.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer;background:none;border:0;padding:0;transform:translate(-50%,-100%);position:relative;";
      wrap.title = c.name;

      const bottleStage = document.createElement("div");
      bottleStage.style.cssText = "position:relative;display:block;transition:transform 160ms ease;";
      bottleStage.innerHTML = bottleSVG(bottleSize, color);
      wrap.appendChild(bottleStage);

      const label = document.createElement("div");
      label.textContent = c.name;
      label.className = "oxi-city-label";
      label.style.cssText = `font-family:'Plus Jakarta Sans','DM Sans',sans-serif;font-weight:800;font-size:${compactMapRef.current ? 10 : 11}px;letter-spacing:0.02em;color:#ffffff;text-shadow:0 1px 2px rgba(0,0,0,0.95),0 0 6px rgba(0,0,0,0.7);white-space:nowrap;margin-top:3px;padding:1px 5px;background:rgba(0,0,0,0.35);border-radius:6px;backdrop-filter:blur(2px);`;
      wrap.appendChild(label);

      let shattering = false;
      const shatter = () => {
        if (shattering) return; shattering = true;
        const original = bottleStage.firstElementChild as HTMLElement | null;
        if (original) { original.style.transition = "opacity 100ms, transform 100ms"; original.style.opacity = "0"; original.style.transform = "scale(0.6)"; }
        const burstCount = compactMapRef.current ? 4 : 7;
        for (let i = 0; i < burstCount; i++) {
          const frag = document.createElement("div");
          const angle = (i / burstCount) * Math.PI * 2 + Math.random() * 0.5;
          const dist = 30 + Math.random() * 22;
          const dx = Math.cos(angle) * dist;
          const dy = Math.sin(angle) * dist - 12;
          const rot = (Math.random() * 720 - 360).toFixed(0);
          const miniSize = 7 + Math.random() * 5;
          frag.style.cssText = `position:absolute;left:50%;top:50%;pointer-events:none;animation:oxi-bottle-shatter 780ms cubic-bezier(0.22,1,0.36,1) forwards;--dx:${dx.toFixed(1)}px;--dy:${dy.toFixed(1)}px;--rot:${rot}deg;`;
          frag.innerHTML = bottleSVG(miniSize, color);
          bottleStage.appendChild(frag);
        }
        window.setTimeout(() => {
          if (onCityClickRef.current) onCityClickRef.current(c);
          else navRef.current({ to: "/app/city/$slug", params: { slug: c.slug } });
        }, 540);
      };

      let pressTimer: number | null = null;
      let longPressed = false;
      wrap.onpointerdown = () => {
        longPressed = false;
        pressTimer = window.setTimeout(() => {
          longPressed = true;
          navRef.current({ to: "/app/city/$slug", params: { slug: c.slug } });
        }, 600);
      };
      const clear = () => { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } };
      wrap.onpointerup = wrap.onpointerleave = wrap.onpointercancel = clear;
      wrap.onclick = (e) => {
        e.stopPropagation();
        clear();
        if (longPressed) return;
        shatter();
      };
      cityMarkers.current.set(c.id, new maplibregl.Marker({ element: wrap, anchor: "bottom" }).setLngLat([c.lng, c.lat]).addTo(map));
    }
    // Remove markers for cities that disappeared from the list.
    for (const [id, marker] of cityMarkers.current) {
      if (!seen.has(id)) { marker.remove(); cityMarkers.current.delete(id); }
    }
  }, [cities, retryKey]);

  // FOCUS city programmatically. easeTo is lighter than flyTo on mobile GPUs.
  useEffect(() => {
    const map = mapRef.current; if (!map || !focusCity) return;
    map.easeTo({
      center: [focusCity.lng, focusCity.lat],
      zoom: focusCity.zoom ?? 12.4,
      pitch: compactMapRef.current ? 0 : 35,
      bearing: 0,
      duration: compactMapRef.current ? 500 : 850,
      essential: true,
    });
  }, [focusCity]);

  // FIT BOUNDS — used for country/region zoom
  useEffect(() => {
    const map = mapRef.current; if (!map || !fitBounds) return;
    const fit = () => {
      try {
        map.fitBounds(fitBounds, { padding: 60, duration: compactMapRef.current ? 450 : 800, pitch: 0, bearing: 0, maxZoom: 9 });
      } catch {}
    };
    if (loadedRef.current) fit(); else map.once("load", fit);
  }, [fitBounds]);

  // FRIENDS → diff-only DOM markers. When a friend's coords change, smoothly
  // tween the marker between the old and new positions so it looks like they
  // are walking, not teleporting.
  const friendAnims = useRef<Map<string, number>>(new Map());
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    const seen = new Set<string>();
    for (const f of friends) {
      if (!isValidLngLat(f.lng, f.lat)) continue;
      seen.add(f.user_id);
      const existing = friendMarkers.current.get(f.user_id);
      if (existing) {
        // Sync avatar if it became available (or changed) after the marker was created.
        const el = existing.getElement();
        const img = el.querySelector("img") as HTMLImageElement | null;
        if (f.avatar_url) {
          if (img) {
            if (img.src !== f.avatar_url) img.src = f.avatar_url;
          } else {
            const ring = el.querySelector("div[style*='border-radius:'][style*='overflow:hidden']") as HTMLElement | null;
            if (ring) {
              ring.innerHTML = "";
              const ni = document.createElement("img");
              ni.src = f.avatar_url; ni.alt = "";
              ni.style.cssText = "width:100%;height:100%;object-fit:cover;object-position:center center;display:block;aspect-ratio:1/1;background:transparent;";
              ring.appendChild(ni);
            }
          }
        }
        const cur = existing.getLngLat();
        if (Math.abs(cur.lng - f.lng) < 1e-7 && Math.abs(cur.lat - f.lat) < 1e-7) continue;
        const fromLng = cur.lng, fromLat = cur.lat;
        const toLng = f.lng, toLat = f.lat;
        const dur = 1200;
        const start = performance.now();
        const prev = friendAnims.current.get(f.user_id);
        if (prev) cancelAnimationFrame(prev);
        const tick = (t: number) => {
          const k = Math.min(1, (t - start) / dur);
          const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
          existing.setLngLat([fromLng + (toLng - fromLng) * e, fromLat + (toLat - fromLat) * e]);
          if (k < 1) friendAnims.current.set(f.user_id, requestAnimationFrame(tick));
          else friendAnims.current.delete(f.user_id);
        };
        friendAnims.current.set(f.user_id, requestAnimationFrame(tick));
        continue;
      }

      const wrap = document.createElement("div");
      wrap.style.cssText = "position:relative;display:flex;flex-direction:column;align-items:center;cursor:pointer;transform:translateY(-50%);z-index:10;";

      const accent = f.is_me ? "#ff3d8b" : "#00e5ff";
      const ringSize = f.is_me ? 56 : 44;
      const pulseSize = f.is_me ? 68 : 54;

      const pulse = document.createElement("div");
      pulse.style.cssText = `position:absolute;top:-4px;left:50%;transform:translateX(-50%);width:${pulseSize}px;height:${pulseSize}px;border-radius:9999px;background:${accent};opacity:0.35;animation:oxi-pulse-strong 1.8s ease-out infinite;pointer-events:none;`;
      wrap.appendChild(pulse);

      const ring = document.createElement("div");
      ring.style.cssText = `position:relative;width:${ringSize}px;height:${ringSize}px;border-radius:${f.is_me ? 18 : 14}px;border:2px solid ${accent};overflow:hidden;background:linear-gradient(135deg,#ff3d8b,#c724ff);box-shadow:0 0 14px ${accent},0 4px 12px rgba(0,0,0,0.55);aspect-ratio:1/1;`;
      if (f.avatar_url) {
        const img = document.createElement("img");
        img.src = f.avatar_url; img.alt = "";
        img.style.cssText = "width:100%;height:100%;object-fit:cover;object-position:center center;display:block;aspect-ratio:1/1;background:transparent;";
        ring.appendChild(img);
      } else {
        const ini = document.createElement("div");
        ini.textContent = ((f.handle ?? f.display_name ?? "?")[0] ?? "?").toUpperCase();
        ini.style.cssText = "width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-family:'DM Sans',sans-serif;font-size:14px;";
        ring.appendChild(ini);
      }
      wrap.appendChild(ring);

      const live = document.createElement("div");
      live.style.cssText = `position:absolute;top:-1px;right:-1px;width:10px;height:10px;border-radius:9999px;background:${accent};border:2px solid #06070a;box-shadow:0 0 8px ${accent};`;
      ring.appendChild(live);

      if (f.is_me) {
        const crown = document.createElement("div");
        crown.textContent = "TU";
        crown.style.cssText = "position:absolute;top:-10px;left:50%;transform:translateX(-50%);padding:1px 5px;border-radius:9999px;background:#ff3d8b;color:#fff;font-family:'DM Sans',sans-serif;font-weight:900;font-size:8px;letter-spacing:0.08em;border:1.5px solid #06070a;box-shadow:0 0 8px #ff3d8b;";
        wrap.appendChild(crown);
      }

      const labelText = f.display_name ?? (f.handle ? `@${f.handle}` : (f.is_me ? "tu" : "live"));
      const pill = document.createElement("div");
      pill.textContent = labelText;
      pill.style.cssText = `display:none;`;
      wrap.appendChild(pill);

      wrap.onclick = (e) => { e.stopPropagation(); navRef.current({ to: "/app/user/$id", params: { id: f.user_id } }); };
      const marker = new maplibregl.Marker({ element: wrap, anchor: "bottom" }).setLngLat([f.lng, f.lat]).addTo(map);
      friendMarkers.current.set(f.user_id, marker);
    }
    // remove markers (and cancel anims) for friends no longer present
    for (const [id, marker] of friendMarkers.current) {
      if (!seen.has(id)) {
        const a = friendAnims.current.get(id);
        if (a) { cancelAnimationFrame(a); friendAnims.current.delete(id); }
        marker.remove();
        friendMarkers.current.delete(id);
      }
    }
  }, [friends, retryKey]);

  const mePin = friends.find(f => f.is_me);

  const handleRecenter = useCallback(() => {
    const map = mapRef.current;
    if (!map || !mePin) return;
    map.easeTo({ center: [mePin.lng, mePin.lat], zoom: 13.5, duration: 550, essential: true });
  }, [mePin]);

  return (
    <div className="relative w-full h-[54vh] min-h-[400px] max-h-[560px] overflow-hidden bg-[#0d0b1e]">
      <style>{`
        @keyframes oxi-pulse-strong { 0% { transform: translateX(-50%) scale(0.6); opacity: 0.7; } 80% { transform: translateX(-50%) scale(1.5); opacity: 0; } 100% { opacity: 0; } }
        @keyframes oxi-scan { 0% { background-position: 0 0; } 100% { background-position: 0 100%; } }
        @keyframes oxi-radar-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes oxi-aurora-drift {
          0%   { transform: translate3d(-4%, -2%, 0) scale(1); }
          50%  { transform: translate3d(3%, 4%, 0) scale(1.08); }
          100% { transform: translate3d(-4%, -2%, 0) scale(1); }
        }
        @keyframes oxi-ring-ping { 0% { transform: scale(0.6); opacity: 0.5; } 80% { transform: scale(1.6); opacity: 0; } 100% { opacity: 0; } }
        @keyframes oxi-bottle-shatter {
          0%   { transform: translate(-50%,-50%) rotate(0deg) scale(1); opacity: 1; }
          15%  { transform: translate(-50%,-50%) rotate(calc(var(--rot) * 0.15)) scale(1.1); opacity: 1; }
          100% { transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) rotate(var(--rot)) scale(0.4); opacity: 0; }
        }
        .maplibregl-map { position:absolute !important; inset:0 !important; overflow:hidden !important; width:100% !important; height:100% !important; }
        .maplibregl-canvas-container, .maplibregl-canvas { position:absolute !important; inset:0 !important; width:100% !important; height:100% !important; }
        .maplibregl-canvas { outline:none !important; }
        .maplibregl-marker { position:absolute !important; top:0; left:0; will-change:transform; contain:layout paint style; z-index:2; }
        .oxi-map-moving .maplibregl-marker { visibility:hidden; pointer-events:none; }
        .maplibregl-ctrl-top-right { position:absolute; top:10px; right:10px; z-index:3; display:flex; flex-direction:column; gap:8px; }
        .maplibregl-ctrl-group { background: rgba(3,4,10,0.9) !important; border: 1px solid rgba(198,107,255,0.25) !important; }
        .maplibregl-ctrl-group button { background-color: transparent !important; }
        .maplibregl-ctrl-group button span { filter: invert(1) brightness(1.2); }
      `}</style>
      <div ref={containerRef} className="absolute inset-0" />
      {mapFailed && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-background/95 px-6 text-center">
          <div>
            <div className="font-display font-black text-xl">harta se reîncarcă</div>
            <div className="mt-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">telefonul a pierdut randarea hărții</div>
            <button
              onClick={() => { setMapFailed(false); setRetryKey(k => k + 1); }}
              className="mt-4 rounded-lg border border-neon-green/40 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-neon-green"
            >
              reîncarcă
            </button>
          </div>
        </div>
      )}

      {/* Zoom + recenter controls — stacked bottom-right */}
      <div className="absolute bottom-3 right-3 z-20 flex flex-col gap-2">
        <div className="flex flex-col rounded-full overflow-hidden backdrop-blur-xl bg-black/60 border border-white/15 shadow-lg shadow-black/40">
          <button
            onClick={() => mapRef.current?.zoomIn({ duration: 220 })}
            aria-label="Apropie harta"
            className="h-10 w-10 grid place-items-center text-white/90 active:scale-95 transition border-b border-white/10"
          >
            <Plus size={18} />
          </button>
          <button
            onClick={() => mapRef.current?.zoomOut({ duration: 220 })}
            aria-label="Depărtează harta"
            className="h-10 w-10 grid place-items-center text-white/90 active:scale-95 transition"
          >
            <Minus size={18} />
          </button>
        </div>
        {mePin && (
          <button
            onClick={handleRecenter}
            aria-label="Re-centrează pe poziția mea"
            className="h-10 w-10 grid place-items-center rounded-full backdrop-blur-xl bg-black/60 border border-white/15 text-white/90 active:scale-95 transition shadow-lg shadow-black/40"
          >
            <Crosshair size={18} />
          </button>
        )}
      </div>

      {/* Soft vignette only — no decorative blobs over the map. */}
      <div className="pointer-events-none absolute inset-0 z-[1]"
           style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 38%, rgba(3,4,10,0.28) 74%, rgba(3,4,10,0.82) 100%)" }} />
    </div>
  );
}

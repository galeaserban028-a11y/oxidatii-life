import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import maplibregl, { Map as MlMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

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
  club: "#c66bff",
  bar: "#ffb000",
  pub: "#ff8a3d",
  terasa: "#39ff88",
  "terasă": "#39ff88",
  after: "#ff3158",
};

function drawPinGlyph(ctx: CanvasRenderingContext2D, kind: string, cx: number, cy: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (kind === "club") {
    ctx.fillRect(cx - 15, cy - 8, 7, 16);
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy - 8);
    ctx.lineTo(cx + 2, cy - 15);
    ctx.lineTo(cx + 2, cy + 15);
    ctx.lineTo(cx - 8, cy + 8);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 7, cy, 8, -0.8, 0.8);
    ctx.arc(cx + 12, cy, 14, -0.7, 0.7);
    ctx.stroke();
  } else if (kind === "bar") {
    ctx.beginPath();
    ctx.moveTo(cx - 16, cy - 14);
    ctx.lineTo(cx + 16, cy - 14);
    ctx.lineTo(cx, cy + 3);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy + 3);
    ctx.lineTo(cx, cy + 17);
    ctx.moveTo(cx - 10, cy + 17);
    ctx.lineTo(cx + 10, cy + 17);
    ctx.stroke();
  } else if (kind === "pub") {
    ctx.strokeRect(cx - 11, cy - 8, 16, 21);
    ctx.beginPath();
    ctx.moveTo(cx + 5, cy - 2);
    ctx.quadraticCurveTo(cx + 17, cy - 2, cx + 15, cy + 8);
    ctx.quadraticCurveTo(cx + 15, cy + 15, cx + 5, cy + 13);
    ctx.moveTo(cx - 8, cy - 13);
    ctx.lineTo(cx + 2, cy - 13);
    ctx.stroke();
  } else if (kind === "terasa" || kind === "terasă") {
    ctx.beginPath();
    ctx.arc(cx, cy - 10, 16, Math.PI, 0);
    ctx.moveTo(cx, cy - 10);
    ctx.lineTo(cx, cy + 16);
    ctx.moveTo(cx - 10, cy + 16);
    ctx.lineTo(cx + 10, cy + 16);
    ctx.moveTo(cx - 14, cy - 10);
    ctx.lineTo(cx + 14, cy - 10);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(cx - 16, cy + 9);
    ctx.lineTo(cx - 11, cy - 11);
    ctx.lineTo(cx - 2, cy + 3);
    ctx.lineTo(cx + 8, cy - 13);
    ctx.lineTo(cx + 15, cy + 9);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 13, cy + 14);
    ctx.lineTo(cx + 13, cy + 14);
    ctx.stroke();
  }
  ctx.restore();
}

// Clean neon pin — compact transparent halo, dark glass circle and a simple
// line glyph. No emoji blobs, so the map stays crisp like the reference.
function makePinImage(color: string, kind: string): ImageData {
  const W = 96, H = 96;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const cx = W / 2, cy = H / 2;

  const halo = ctx.createRadialGradient(cx, cy, 15, cx, cy, 44);
  halo.addColorStop(0, color + "99");
  halo.addColorStop(0.55, color + "2f");
  halo.addColorStop(1, color + "00");
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, W, H);

  ctx.shadowColor = color;
  ctx.shadowBlur = 16;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, cy, 27, 0, Math.PI * 2);
  ctx.stroke();

  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.fillStyle = "rgba(8,10,20,0.86)";
  ctx.beginPath();
  ctx.arc(cx, cy, 23, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, 22, 0, Math.PI * 2);
  ctx.stroke();

  drawPinGlyph(ctx, kind, cx, cy, color);

  return ctx.getImageData(0, 0, W, H);
}


const VOYAGER_STYLE = {
  version: 8,
  sources: {
    "carto-dark": {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "© CARTO, © OpenStreetMap contributors",
      maxzoom: 19,
    },
  },
  layers: [
    { id: "background", type: "background", paint: { "background-color": "#080a12" } },
    { id: "carto-dark", type: "raster", source: "carto-dark", paint: { "raster-opacity": 0.98, "raster-saturation": -0.12, "raster-contrast": 0.18, "raster-brightness-min": 0.08, "raster-brightness-max": 0.92 } },
  ],
  sky: {
    "sky-color": "#03040a",
    "horizon-color": "#0a0a1f",
    "fog-color": "#000000",
    "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 6, 0.6, 10, 0],
  },
} as unknown as maplibregl.StyleSpecification;



const VENUES_SRC = "venues-src";
const HEAT_SRC = "venues-heat-src";

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
  const cityMarkers = useRef<Marker[]>([]);
  const friendMarkers = useRef<Map<string, Marker>>(new Map());
  const promotedMarkers = useRef<Map<string, Marker>>(new Map());
  const loadedRef = useRef(false);
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
        fadeDuration: 80,
        refreshExpiredTiles: false,
        maxPitch: isSmall ? 45 : 60,
        pixelRatio: isSmall ? Math.min(window.devicePixelRatio || 1, 1.5) : undefined,
        antialias: !isSmall,
      } as any);
    } catch (error) {
      console.warn("Map init failed", error);
      setMapFailed(true);
      return;
    }

    map.touchZoomRotate.disableRotation();
    map.dragRotate.disable();

    map.on("load", () => {
      loadedRef.current = true;
      setMapFailed(false);
      // GPU-rendered venue layer + clustering — handles thousands of points at 60fps
      map.addSource(VENUES_SRC, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterRadius: 86,
        clusterMaxZoom: 11,
      });

      // Very subtle energy source; kept low so the basemap roads/labels stay clean.
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

      // Register one neon pin icon per venue type.
      const pinTypes: Array<[string, string, string]> = [
        ["pin-club", TYPE_COLOR.club, "club"],
        ["pin-bar", TYPE_COLOR.bar, "bar"],
        ["pin-pub", TYPE_COLOR.pub, "pub"],
        ["pin-terasa", TYPE_COLOR.terasa, "terasa"],
        ["pin-after", TYPE_COLOR.after, "after"],
      ];
      for (const [name, color, kind] of pinTypes) {
        if (!map.hasImage(name)) {
          try { map.addImage(name, makePinImage(color, kind), { pixelRatio: 2 }); } catch {}
        }
      }

      map.addLayer({
        id: "venues-clusters-glow",
        type: "circle",
        source: VENUES_SRC,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step", ["get", "point_count"],
            "rgba(255,49,134,0.18)", 80,
            "rgba(198,107,255,0.20)", 240,
            "rgba(255,176,0,0.18)",
          ],
          "circle-radius": ["step", ["get", "point_count"], 26, 80, 34, 240, 42],
          "circle-blur": 0.75,
        },
      });
      map.addLayer({
        id: "venues-clusters",
        type: "circle",
        source: VENUES_SRC,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "rgba(12,14,24,0.82)",
          "circle-radius": ["step", ["get", "point_count"], 18, 80, 23, 240, 29],
          "circle-stroke-width": 2,
          "circle-stroke-color": [
            "step", ["get", "point_count"],
            "#ff3186", 80,
            "#c66bff", 240,
            "#ffb000",
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
          "text-size": ["step", ["get", "point_count"], 13, 80, 15, 240, 17],
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
          "text-allow-overlap": true,
        },
        paint: { "text-color": "rgba(255,255,255,0.94)", "text-halo-color": "rgba(0,0,0,0.7)", "text-halo-width": 1 },
      });

      // unclustered points → neon glowing emoji pins
      map.addLayer({
        id: "venues-points",
        type: "symbol",
        source: VENUES_SRC,
        filter: ["!", ["has", "point_count"]],
        layout: {
          "icon-image": [
            "match", ["get", "type"],
            "club", "pin-club",
            "bar", "pin-bar",
            "pub", "pin-pub",
            "terasa", "pin-terasa",
            "terasă", "pin-terasa",
            "after", "pin-after",
            "pin-bar",
          ],
          "icon-size": ["interpolate", ["linear"], ["zoom"], 3, 0.22, 6, 0.32, 10, 0.46, 14, 0.64, 17, 0.78],
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
        const addr = p.address ? `<div style="font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10px;color:#aaa;margin-top:2px;">${p.address}</div>` : "";
        const typeColor = TYPE_COLOR[p.type] ?? "#ffb000";
        const html = `<div style="width:220px;background:#06070a;color:#fff;border-radius:12px;overflow:hidden;border:1px solid ${typeColor}55;">
          ${cover}
          <div style="padding:10px 12px;">
            <div style="display:inline-block;padding:1px 6px;border-radius:9999px;background:${typeColor}22;color:${typeColor};border:1px solid ${typeColor}55;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:8px;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:4px;">${p.type ?? "loc"}</div>
            <div style="font-family:'Space Grotesk',sans-serif;font-weight:900;font-size:14px;line-height:1.15;">${p.name}</div>
            ${addr}
            <a href="/app/venue/${p.id}" data-oxi-venue="${p.id}" style="margin-top:8px;display:block;text-align:center;padding:6px 10px;border-radius:8px;background:${typeColor};color:#06070a;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;font-weight:700;text-decoration:none;">detalii →</a>
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
      cityMarkers.current.forEach(m => m.remove()); cityMarkers.current = [];
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
      src.setData({
        type: "FeatureCollection",
        features: venues
          .filter(v => isValidLngLat(v.lng, v.lat) && !promotedMeta[v.id])
          .map(v => ({
            type: "Feature",
            geometry: { type: "Point", coordinates: [Number(v.lng), Number(v.lat)] },
            properties: { id: v.id, name: v.name, type: v.type ?? "club", address: v.address ?? "", cover_url: v.cover_url ?? "" },
          })),
      });
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

  // Subtle pulse only; keep the reference-style road network readable.
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      if (!map.getLayer("venues-heat")) { raf = requestAnimationFrame(tick); return; }
      const k = (Math.sin((t - start) / 1400) + 1) / 2; // 0..1
      const intensity = 0.16 + k * 0.1;
      try { map.setPaintProperty("venues-heat", "heatmap-intensity", intensity); } catch {}
      raf = requestAnimationFrame(tick);
    };
    const onLoad = () => { raf = requestAnimationFrame(tick); };
    if (loadedRef.current) onLoad(); else map.once("load", onLoad);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [retryKey]);

  // PROMOTED VENUES → DOM markers with the brand cover/logo inside a glowing
  // halo. Replaces the bottle silhouette so paying businesses are instantly
  // recognizable on the map. Diff-only: only re-creates markers when the set
  // of promoted venues or their coordinates change.
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    const build = () => {
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
        const theme = meta.theme || "#ff3158";
        const wrap = document.createElement("div");
        wrap.style.cssText = "position:relative;width:32px;height:32px;cursor:pointer;transform:translateY(-50%);z-index:5;";

        const pulse = document.createElement("div");
        pulse.style.cssText = `position:absolute;inset:-3px;border-radius:9999px;background:${theme};opacity:0.18;animation:oxi-pulse-strong 2.4s ease-out infinite;pointer-events:none;`;
        wrap.appendChild(pulse);

        const ring = document.createElement("div");
        ring.style.cssText = `position:relative;width:32px;height:32px;border-radius:9999px;border:2px solid ${theme};overflow:hidden;background:#06070a;box-shadow:0 0 10px ${theme}88,0 4px 10px rgba(0,0,0,0.55);`;
        if (meta.cover) {
          const img = document.createElement("img");
          img.src = meta.cover; img.alt = "";
          img.loading = "lazy";
          img.style.cssText = "width:100%;height:100%;object-fit:cover;";
          ring.appendChild(img);
        } else {
          const ini = document.createElement("div");
          ini.textContent = (v.name?.[0] ?? "?").toUpperCase();
          ini.style.cssText = `width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:${theme};font-weight:900;font-family:'Space Grotesk',sans-serif;font-size:16px;`;
          ring.appendChild(ini);
        }
        wrap.appendChild(ring);

        const badge = document.createElement("div");
        badge.textContent = "";
        badge.style.cssText = `position:absolute;bottom:1px;right:1px;width:7px;height:7px;border-radius:9999px;background:${theme};border:1.5px solid #06070a;box-shadow:0 0 8px ${theme};`;
        wrap.appendChild(badge);

        // X dismiss button (top-right). Stops propagation so click doesn't
        // open the campaign; persists in sessionStorage and removes marker.
        const close = document.createElement("button");
        close.type = "button";
        close.setAttribute("aria-label", "Ascunde reclama");
        close.textContent = "×";
        close.style.cssText = `position:absolute;top:-5px;right:-5px;width:14px;height:14px;border-radius:9999px;background:#06070a;color:#fff;border:1px solid ${theme};font-family:'Space Grotesk',sans-serif;font-weight:900;font-size:11px;line-height:1;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;z-index:6;opacity:.78;`;
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
    cityMarkers.current.forEach(m => m.remove());
    cityMarkers.current = [];
    for (const c of cities) {
      if (!isValidLngLat(c.lng, c.lat)) continue;
      const big = c.chaos_level >= 9;
      if (!big) continue;
      const wrap = document.createElement("button");
      wrap.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;background:none;border:0;padding:0;transform:translate(-50%,-50%);";
      wrap.title = c.name;
      // City labels only — no marker icon. The neon emoji venue pins +
      // cluster bubbles from the GPU layer carry the visual weight, exactly
      // like the reference (Praha, Paris, Sarajevo… are pure text labels).
      const color = "#ff3158";
      const label = document.createElement("div");
      label.textContent = c.name;
      label.className = "oxi-city-label";
      label.style.cssText = `font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:10px;letter-spacing:0;color:rgba(255,255,255,0.82);text-shadow:0 0 5px ${color},0 1px 3px #000;white-space:nowrap;`;
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
  }, [cities, retryKey]);

  // FOCUS city programmatically (flyTo) when parent selects one
  useEffect(() => {
    const map = mapRef.current; if (!map || !focusCity) return;
    map.flyTo({ center: [focusCity.lng, focusCity.lat], zoom: focusCity.zoom ?? 12.4, pitch: 45, bearing: 0, duration: 1100, essential: true });
  }, [focusCity]);

  // FIT BOUNDS — used for country/region zoom
  useEffect(() => {
    const map = mapRef.current; if (!map || !fitBounds) return;
    const fit = () => {
      try {
        map.fitBounds(fitBounds, { padding: 60, duration: 900, pitch: 0, bearing: 0, maxZoom: 9 });
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
          // ease in-out
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

      const accent = f.is_me ? "#ff3158" : "#39ff88";
      const ringSize = f.is_me ? 44 : 34;
      const pulseSize = f.is_me ? 54 : 42;

      const pulse = document.createElement("div");
      pulse.style.cssText = `position:absolute;top:-4px;left:50%;transform:translateX(-50%);width:${pulseSize}px;height:${pulseSize}px;border-radius:9999px;background:${accent};opacity:0.35;animation:oxi-pulse-strong 1.8s ease-out infinite;pointer-events:none;`;
      wrap.appendChild(pulse);

      const ring = document.createElement("div");
      ring.style.cssText = `position:relative;width:${ringSize}px;height:${ringSize}px;border-radius:9999px;border:2px solid ${accent};overflow:hidden;background:linear-gradient(135deg,#ff3158,#c66bff);box-shadow:0 0 14px ${accent},0 4px 12px rgba(0,0,0,0.55);`;
      if (f.avatar_url) {
        const img = document.createElement("img");
        img.src = f.avatar_url; img.alt = "";
        img.style.cssText = "width:100%;height:100%;object-fit:cover;";
        ring.appendChild(img);
      } else {
        const ini = document.createElement("div");
        ini.textContent = ((f.handle ?? f.display_name ?? "?")[0] ?? "?").toUpperCase();
        ini.style.cssText = "width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-family:'Space Grotesk',sans-serif;font-size:14px;";
        ring.appendChild(ini);
      }
      wrap.appendChild(ring);

      const live = document.createElement("div");
      live.style.cssText = `position:absolute;top:-1px;right:-1px;width:9px;height:9px;border-radius:9999px;background:${accent};border:2px solid #06070a;box-shadow:0 0 8px ${accent};`;
      ring.appendChild(live);

      if (f.is_me) {
        const crown = document.createElement("div");
        crown.textContent = "TU";
        crown.style.cssText = "position:absolute;top:-10px;left:50%;transform:translateX(-50%);padding:1px 5px;border-radius:9999px;background:#ff3158;color:#fff;font-family:'Space Grotesk',sans-serif;font-weight:900;font-size:8px;letter-spacing:0.08em;border:1.5px solid #06070a;box-shadow:0 0 8px #ff3158;";
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

  return (
    <div className="relative w-full h-[54vh] min-h-[400px] max-h-[560px] rounded-3xl overflow-hidden border border-neon-purple/40 bg-[#03040a] shadow-[0_0_80px_-20px_var(--neon-purple),inset_0_0_120px_rgba(0,0,0,0.9)]">
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
        .maplibregl-map { position:absolute !important; inset:0 !important; overflow:hidden !important; width:100% !important; height:100% !important; }
        .maplibregl-canvas-container, .maplibregl-canvas { position:absolute !important; inset:0 !important; width:100% !important; height:100% !important; }
        .maplibregl-canvas { outline:none !important; }
        .maplibregl-marker { position:absolute !important; top:0; left:0; will-change:transform; z-index:2; }
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

      {/* Deep space vignette — frames the globe like a tiny planet */}
      <div className="pointer-events-none absolute inset-0 z-[1]"
           style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 22%, rgba(3,4,10,0.55) 55%, rgba(3,4,10,0.98) 95%)" }} />
      {/* Aurora drift — subtle living halos */}
      <div className="pointer-events-none absolute -inset-10 z-[1] opacity-40 blur-3xl mix-blend-screen"
           style={{
             background: "radial-gradient(circle at 30% 30%, rgba(57,255,136,0.18), transparent 50%), radial-gradient(circle at 75% 70%, rgba(255,49,88,0.20), transparent 55%)",
             animation: "oxi-aurora-drift 18s ease-in-out infinite",
           }} />

      <div className="absolute top-2 left-2 z-10 px-2.5 py-1 rounded-md bg-black/80 backdrop-blur font-mono text-[9px] uppercase tracking-widest text-neon-green pointer-events-none border border-neon-green/30">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-neon-green animate-pulse mr-1.5 align-middle" />
        live · {friends.length} oxidați activi
      </div>

      <div className="absolute bottom-2 left-2 right-2 z-10 rounded-xl bg-black/85 backdrop-blur border border-white/10 px-3 py-2 pointer-events-none flex items-center justify-between gap-2">
        <div className="font-display font-black text-xs leading-none tracking-tight text-white">
          {venues.length.toLocaleString("ro-RO")} <span className="text-white/50 font-mono text-[10px] uppercase tracking-widest">sticle · {cities.length} orașe</span>
        </div>
        <div className="font-mono text-[9px] uppercase tracking-widest flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border" style={{ color: "#c66bff", borderColor: "rgba(198,107,255,0.45)", boxShadow: "0 0 8px rgba(198,107,255,0.4)" }}>🔊 club</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border" style={{ color: "#ffb000", borderColor: "rgba(255,176,0,0.45)", boxShadow: "0 0 8px rgba(255,176,0,0.35)" }}>🍸 bar</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border" style={{ color: "#39ff88", borderColor: "rgba(57,255,136,0.45)", boxShadow: "0 0 8px rgba(57,255,136,0.4)" }}>🪑 terasă</span>
        </div>
      </div>
    </div>
  );
}

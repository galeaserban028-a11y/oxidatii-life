import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import maplibregl, { Map as MlMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Crosshair, Plus, Minus } from "lucide-react";

type City = {
  id: string;
  slug: string;
  name: string;
  lat: number;
  lng: number;
  chaos_level: number;
};
type Venue = {
  id: string;
  name: string;
  type?: string;
  lat: number | null;
  lng: number | null;
  address?: string | null;
  cover_url?: string | null;
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
  terasă: "#00e5ff",
  after: "#ff3d8b",
};

const NEON_BACKBONE_SRC = "oxi-neon-backbone";
const CRITICAL_STYLE_LAYERS = ["oxi-backbone-core", "admin-country", "roads-major"];

// Local fallback lines: even if vector tiles are late or WebGL restores only
// partially on mobile, the map still opens with visible neon structure.
const NEON_BACKBONE_GEOJSON = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { kind: "border" },
      geometry: {
        type: "LineString",
        coordinates: [
          [20.27, 46.18],
          [21.18, 46.08],
          [22.72, 47.65],
          [24.38, 47.96],
          [26.62, 48.25],
          [28.22, 45.47],
          [29.65, 44.17],
          [27.79, 43.75],
          [25.35, 43.65],
          [22.69, 44.22],
          [20.27, 46.18],
        ],
      },
    },
    {
      type: "Feature",
      properties: { kind: "route" },
      geometry: {
        type: "MultiLineString",
        coordinates: [
          [
            [20.63, 45.75],
            [21.23, 45.75],
            [22.9, 46.18],
            [23.59, 46.77],
            [24.15, 45.8],
            [25.59, 45.64],
            [26.1, 44.43],
          ],
          [
            [26.1, 44.43],
            [26.92, 44.93],
            [27.59, 47.16],
          ],
          [
            [26.1, 44.43],
            [28.63, 44.18],
          ],
          [
            [21.23, 45.75],
            [21.93, 47.05],
            [23.59, 46.77],
          ],
        ],
      },
    },
  ],
};

// Compact vector wine bottle. Kept non-circular so it reads as a bottle,
// not as the old glowing dots/clusters.
function makePinImage(color: string, lowEnd = false): ImageData {
  const W = lowEnd ? 80 : 112,
    H = W;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const cx = W / 2,
    cy = H / 2;
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

function buildNeonStyle(lowEnd: boolean): maplibregl.StyleSpecification {
  const glowBlur = lowEnd ? 3 : 6;
  const adminGlowBlur = lowEnd ? 3 : 6;
  const layers: any[] = [
    { id: "background", type: "background", paint: { "background-color": "#0d0b1e" } },
  ];
  if (!lowEnd) {
    layers.push(
      {
        id: "landcover",
        type: "fill",
        source: "openmaptiles",
        "source-layer": "landcover",
        paint: { "fill-color": "#15102a", "fill-opacity": 0.55 },
      },
      {
        id: "park",
        type: "fill",
        source: "openmaptiles",
        "source-layer": "park",
        paint: { "fill-color": "#1a1430", "fill-opacity": 0.6 },
      },
    );
  }
  layers.push({
    id: "water",
    type: "fill",
    source: "openmaptiles",
    "source-layer": "water",
    paint: { "fill-color": "#05030f", "fill-outline-color": "#2a1145" },
  });
  // Road glow — narrower/less blurred on mobile to keep frame budget healthy
  layers.push({
    id: "roads-glow",
    type: "line",
    source: "openmaptiles",
    "source-layer": "transportation",
    filter: ["in", "class", "motorway", "trunk", "primary"],
    minzoom: lowEnd ? 6 : 0,
    paint: {
      "line-color": "#ff3df0",
      "line-width": ["interpolate", ["linear"], ["zoom"], 5, 1.2, 10, 3, 14, 7, 18, 18],
      "line-blur": glowBlur,
      "line-opacity": lowEnd ? 0.4 : 0.55,
    },
  });
  layers.push({
    id: "roads-major",
    type: "line",
    source: "openmaptiles",
    "source-layer": "transportation",
    filter: ["in", "class", "motorway", "trunk", "primary"],
    paint: {
      "line-color": "#ff5cf0",
      "line-width": ["interpolate", ["linear"], ["zoom"], 5, 0.5, 10, 1.4, 14, 3, 18, 7],
      "line-opacity": 0.95,
    },
  });
  if (!lowEnd) {
    layers.push({
      id: "roads-secondary",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      filter: ["in", "class", "secondary", "tertiary"],
      minzoom: 8,
      paint: {
        "line-color": "#7a3df0",
        "line-width": ["interpolate", ["linear"], ["zoom"], 8, 0.4, 14, 1.4, 18, 4],
        "line-opacity": 0.75,
      },
    });
  }
  layers.push(
    {
      id: "oxi-backbone-glow",
      type: "line",
      source: NEON_BACKBONE_SRC,
      paint: {
        "line-color": ["match", ["get", "kind"], "border", "#ff3df0", "#00e5ff"],
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 2.5, 7, 5, 12, 11],
        "line-blur": lowEnd ? 3 : 6,
        "line-opacity": lowEnd ? 0.38 : 0.46,
      },
    },
    {
      id: "oxi-backbone-core",
      type: "line",
      source: NEON_BACKBONE_SRC,
      paint: {
        "line-color": ["match", ["get", "kind"], "border", "#ff5cf0", "#39ffd2"],
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 0.65, 7, 1.1, 12, 2.4],
        "line-opacity": 0.9,
      },
    },
    {
      id: "admin-glow",
      type: "line",
      source: "openmaptiles",
      "source-layer": "boundary",
      filter: ["<=", "admin_level", 2],
      paint: {
        "line-color": "#ff3df0",
        "line-width": lowEnd ? 4 : 6,
        "line-blur": adminGlowBlur,
        "line-opacity": lowEnd ? 0.45 : 0.55,
      },
    },
    {
      id: "admin-country",
      type: "line",
      source: "openmaptiles",
      "source-layer": "boundary",
      filter: ["<=", "admin_level", 2],
      paint: {
        "line-color": "#ff5cf0",
        "line-width": 1.5,
        "line-opacity": 1,
      },
    },
  );
  if (!lowEnd) {
    layers.push({
      id: "admin-region",
      type: "line",
      source: "openmaptiles",
      "source-layer": "boundary",
      filter: ["all", [">", "admin_level", 2], ["<=", "admin_level", 4]],
      minzoom: 5,
      paint: {
        "line-color": "#a855f7",
        "line-width": 0.8,
        "line-dasharray": [2, 2],
        "line-opacity": 0.7,
      },
    });
  }
  layers.push({
    id: "place-city",
    type: "symbol",
    source: "openmaptiles",
    "source-layer": "place",
    filter: ["in", "class", "city", "town"],
    minzoom: 4,
    layout: {
      "text-field": ["coalesce", ["get", "name:latin"], ["get", "name"]],
      "text-font": ["Noto Sans Regular"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 4, 10, 8, 13, 12, 17],
      "text-letter-spacing": 0.08,
      "text-transform": "uppercase",
    },
    paint: {
      "text-color": "#ffffff",
      "text-halo-color": "#ff3df0",
      "text-halo-width": lowEnd ? 1.2 : 2,
      "text-halo-blur": lowEnd ? 1.5 : 3,
    },
  });
  return {
    version: 8,
    glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
    sources: {
      openmaptiles: {
        type: "vector",
        url: "https://tiles.openfreemap.org/planet",
      },
      [NEON_BACKBONE_SRC]: {
        type: "geojson",
        data: NEON_BACKBONE_GEOJSON,
      },
    },
    layers,
  } as unknown as maplibregl.StyleSpecification;
}

const VENUES_SRC = "venues-src";
const HEAT_SRC = "venues-heat-src";
const SMALL_CITY_LIMIT = 18;
const DESKTOP_CITY_LIMIT = 42;

function isValidLngLat(lng: unknown, lat: unknown) {
  const x = Number(lng);
  const y = Number(lat);
  return Number.isFinite(x) && Number.isFinite(y) && x >= -180 && x <= 180 && y >= -85 && y <= 85;
}

function resolveCityLabelCollisions(container: HTMLElement | null, compact: boolean) {
  if (!container) return;
  const labels = Array.from(container.querySelectorAll<HTMLElement>(".oxi-city-label")).sort(
    (a, b) => Number(b.dataset.priority || 0) - Number(a.dataset.priority || 0),
  );
  const occupied: DOMRect[] = [];
  const pad = compact ? 9 : 6;

  for (const label of labels) {
    label.style.display = "inline-block";
    const rect = label.getBoundingClientRect();
    const overlaps = occupied.some(
      (other) =>
        !(
          rect.right + pad < other.left ||
          rect.left - pad > other.right ||
          rect.bottom + pad < other.top ||
          rect.top - pad > other.bottom
        ),
    );

    if (overlaps) {
      label.style.display = "none";
    } else {
      occupied.push(rect);
    }
  }
}

function mapHasCriticalLayers(map: MlMap) {
  return CRITICAL_STYLE_LAYERS.every((layer) => !!map.getLayer(layer));
}

function repaintMap(map: MlMap) {
  requestAnimationFrame(() => {
    try {
      map.resize();
      map.triggerRepaint();
    } catch {}
  });
}

export type HeatNowCell = {
  cell_id: string;
  lat: number;
  lng: number;
  heat_score: number;
};

export function RomaniaMap3D({
  cities,
  venues = [],
  friends = [],
  onCityClick,
  focusCity,
  fitBounds,
  promotedMeta = {},
  heatNowCells = [],
}: {
  cities: City[];
  venues?: Venue[];
  friends?: FriendPin[];
  onCityClick?: (city: City) => void;
  focusCity?: { lat: number; lng: number; zoom?: number } | null;
  fitBounds?: [[number, number], [number, number]] | null;
  promotedMeta?: Record<string, { theme: string; cover: string | null; campaignId?: string }>;
  heatNowCells?: HeatNowCell[];
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MlMap | null>(null);
  const cityMarkers = useRef<Map<string, Marker>>(new Map());
  const friendMarkers = useRef<Map<string, Marker>>(new Map());
  const promotedMarkers = useRef<Map<string, Marker>>(new Map());
  const loadedRef = useRef(false);
  const compactMapRef = useRef(false);
  const contextRetryTimerRef = useRef<number | null>(null);
  const onCityClickRef = useRef<typeof onCityClick>(onCityClick);
  const nav = useNavigate();
  const navRef = useRef(nav);
  const autoRetryCountRef = useRef(0);
  const [mapFailed, setMapFailed] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [mapReadyTick, setMapReadyTick] = useState(0);

  useEffect(() => {
    navRef.current = nav;
  }, [nav]);
  useEffect(() => {
    onCityClickRef.current = onCityClick;
  }, [onCityClick]);

  // INIT map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Defer init until the container has real dimensions. When the map is
    // mounted inside a route transition / animation the container can be
    // 0×0 for a frame or two — creating maplibre at that instant makes it
    // fetch tiles for the wrong viewport, and the user then has to zoom
    // in/out to force a correct re-fetch. Wait for a real size first.
    const initialRect = containerRef.current.getBoundingClientRect();
    if (initialRect.width < 40 || initialRect.height < 40) {
      const el = containerRef.current;
      const ro = new ResizeObserver(() => {
        const r = el.getBoundingClientRect();
        if (r.width >= 40 && r.height >= 40) {
          ro.disconnect();
          setRetryKey((k) => k + 1);
        }
      });
      ro.observe(el);
      return () => ro.disconnect();
    }

    setMapFailed(false);
    let map: MlMap;
    let resizeObserver: ResizeObserver | null = null;
    let contextRetryTimer: number | null = null;
    let loadWatchdog: number | null = null;
    let restoreHealthTimer: number | null = null;
    let contextWasLost = false;
    const isSmall = typeof window !== "undefined" && window.innerWidth < 720;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: buildNeonStyle(isSmall),
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
        pixelRatio: isSmall
          ? Math.min(window.devicePixelRatio || 1, 1)
          : Math.min(window.devicePixelRatio || 1, 1.75),
        antialias: !isSmall,
        maxTileCacheSize: isSmall ? 40 : 80,
        canvasContextAttributes: {
          alpha: false,
          antialias: !isSmall,
          desynchronized: true,
          failIfMajorPerformanceCaveat: false,
          powerPreference: "high-performance",
          preserveDrawingBuffer: false,
          contextType: isSmall ? "webgl" : undefined,
        },
      } as any);
    } catch (error) {
      console.warn("Map init failed", error);
      setMapFailed(true);
      return;
    }

    map.touchZoomRotate.disableRotation();
    map.dragRotate.disable();
    compactMapRef.current = isSmall;
    if (typeof ResizeObserver !== "undefined" && containerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(() => {
          try {
            map.resize();
            map.triggerRepaint();
          } catch {}
        });
      });
      resizeObserver.observe(containerRef.current);
    }
    // dragPan + scrollZoom rămân activate ca să se poată naviga și da zoom

    // As soon as the style JSON is parsed (fires well before "load"), force
    // an immediate resize so the tile fetcher requests tiles for the real
    // viewport instead of the transient container size at construction time.
    // This is what removes the "have to zoom in/out to see the map" bug.
    const onStyleData = () => {
      try {
        map.resize();
        map.triggerRepaint();
      } catch {}
    };
    map.on("styledata", onStyleData);
    map.once("sourcedata", onStyleData);

    loadWatchdog = window.setTimeout(() => {
      if (loadedRef.current) return;
      if (autoRetryCountRef.current < 2) {
        autoRetryCountRef.current += 1;
        setRetryKey((k) => k + 1);
      } else {
        setMapFailed(true);
      }
    }, 6500);

    const setupInteractiveLayers = () => {
      if (loadedRef.current || map.getSource(VENUES_SRC)) return;
      try {
        map.addSource(VENUES_SRC, {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
          cluster: true,
          clusterRadius: 48,
          clusterMaxZoom: 12,
        });
      } catch {
        window.setTimeout(setupInteractiveLayers, 120);
        return;
      }

      loadedRef.current = true;
      autoRetryCountRef.current = 0;
      if (loadWatchdog) {
        window.clearTimeout(loadWatchdog);
        loadWatchdog = null;
      }
      setMapFailed(false);
      // Multiple staggered resizes: catches late layout shifts from the
      // parent (sticky header, safe-area, address-bar collapse on mobile)
      // without forcing extra visual changes.
      repaintMap(map);
      window.setTimeout(() => repaintMap(map), 120);
      window.setTimeout(() => repaintMap(map), 480);

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
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0,
              "rgba(3,4,10,0)",
              0.18,
              "rgba(57,255,210,0.16)",
              0.45,
              "rgba(198,107,255,0.22)",
              0.75,
              "rgba(255,176,0,0.24)",
              1,
              "rgba(255,49,134,0.28)",
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
              "step",
              ["get", "point_count"],
              "rgba(255,43,214,0.42)",
              80,
              "rgba(255,255,255,0.28)",
              240,
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
            "step",
            ["get", "point_count"],
            "rgba(255,43,214,0.55)",
            80,
            "rgba(255,255,255,0.38)",
            240,
            "rgba(255,140,90,0.55)",
          ],
          "circle-radius": ["step", ["get", "point_count"], 14, 80, 17, 240, 20],
          "circle-blur": isSmall ? 0.2 : 0.45,
          "circle-opacity": isSmall ? 0.7 : 1,
        },
      });

      map.addLayer({
        id: "venues-clusters",
        type: "circle",
        source: VENUES_SRC,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step",
            ["get", "point_count"],
            "rgba(10,6,18,0.92)",
            80,
            "rgba(20,14,26,0.92)",
            240,
            "rgba(48,28,22,0.92)",
          ],
          "circle-radius": ["step", ["get", "point_count"], 10, 80, 12, 240, 14],
          "circle-stroke-width": 1.6,
          "circle-stroke-color": [
            "step",
            ["get", "point_count"],
            "#c724ff",
            80,
            "#ffffff",
            240,
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
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "rgba(0,0,0,0.85)",
          "text-halo-width": 1.2,
        },
      });

      // unclustered points → clear wine-bottle pins
      map.addLayer({
        id: "venues-points",
        type: "symbol",
        source: VENUES_SRC,
        filter: ["!", ["has", "point_count"]],
        layout: {
          "icon-image": [
            "match",
            ["get", "type"],
            "club",
            "pin-bottle-v3-club",
            "bar",
            "pin-bottle-v3-bar",
            "pub",
            "pin-bottle-v3-pub",
            "terasa",
            "pin-bottle-v3-terasa",
            "terasă",
            "pin-bottle-v3-terasa",
            "after",
            "pin-bottle-v3-after",
            "pin-bottle-v3-bar",
          ],
          "icon-size": [
            "interpolate",
            ["linear"],
            ["zoom"],
            3,
            0.5,
            6,
            0.7,
            10,
            0.95,
            14,
            1.2,
            17,
            1.5,
          ],
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
          "icon-anchor": "center",
          "symbol-sort-key": ["case", ["==", ["get", "type"], "club"], 1, 5],
          // Numele localului apare doar de la zoom 12+ ca să nu se aglomereze
          // harta la zoom mic.
          "text-field": ["step", ["zoom"], "", 12, ["get", "name"]],
          "text-font": ["Noto Sans Bold"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 12, 10, 16, 13],
          "text-offset": [0, 1.4],
          "text-anchor": "top",
          "text-optional": true,
          "text-letter-spacing": 0.04,
          "text-max-width": 8,
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "rgba(6,7,10,0.92)",
          "text-halo-width": 1.4,
          "text-halo-blur": 0.6,
        },
      });

      // click → zoom into cluster / navigate to venue
      map.on("click", "venues-clusters", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const id = (f.properties as any).cluster_id;
        (map.getSource(VENUES_SRC) as maplibregl.GeoJSONSource)
          .getClusterExpansionZoom(id)
          .then((zoom) => {
            map.easeTo({
              center: (f.geometry as any).coordinates,
              zoom: zoom + 0.2,
              duration: 500,
            });
          })
          .catch(() => {});
      });
      map.on("click", "venues-points", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const p = f.properties as any;
        const coords = (f.geometry as any).coordinates.slice();
        const cover = p.cover_url
          ? `<img src="${p.cover_url}" alt="" style="width:100%;height:120px;object-fit:cover;display:block;" loading="lazy"/>`
          : "";
        const addr = p.address
          ? `<div style="font-family:'DM Sans',sans-serif;font-size:10px;color:#aaa;margin-top:2px;">${p.address}</div>`
          : "";
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
        const popup = new maplibregl.Popup({
          closeButton: true,
          closeOnClick: true,
          offset: 14,
          maxWidth: "240px",
          className: "oxi-popup",
        })
          .setLngLat(coords)
          .setHTML(html)
          .addTo(map);
        const root = popup.getElement();
        const link = root?.querySelector<HTMLAnchorElement>("a[data-oxi-venue]");
        if (link)
          link.addEventListener("click", (ev) => {
            ev.preventDefault();
            popup.remove();
            navRef.current({ to: "/app/venue/$id", params: { id: p.id } });
          });
      });
      for (const layer of ["venues-clusters", "venues-points"]) {
        map.on("mouseenter", layer, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", layer, () => {
          map.getCanvas().style.cursor = "";
        });
      }

      // HEAT NOW overlay — live hotspots fed from get_heat_now RPC. Rendered as
      // pulsing glow + score circle so users see WHERE the night is happening.
      map.addSource("heat-now-src", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "heat-now-glow",
        type: "circle",
        source: "heat-now-src",
        paint: {
          "circle-color": [
            "interpolate",
            ["linear"],
            ["get", "score"],
            0,
            "rgba(57,255,210,0.35)",
            50,
            "rgba(255,176,0,0.55)",
            80,
            "rgba(255,61,139,0.75)",
            100,
            "rgba(255,234,0,0.85)",
          ],
          "circle-radius": ["interpolate", ["linear"], ["get", "score"], 0, 18, 100, 56],
          "circle-blur": 0.85,
          "circle-opacity": 0.9,
        },
      });
      map.addLayer({
        id: "heat-now-core",
        type: "circle",
        source: "heat-now-src",
        paint: {
          "circle-color": "rgba(10,6,18,0.92)",
          "circle-radius": ["interpolate", ["linear"], ["get", "score"], 0, 9, 100, 18],
          "circle-stroke-width": 2,
          "circle-stroke-color": [
            "interpolate",
            ["linear"],
            ["get", "score"],
            0,
            "#39ffd2",
            50,
            "#ffb000",
            80,
            "#ff3d8b",
            100,
            "#ffea00",
          ],
        },
      });
      map.addLayer({
        id: "heat-now-label",
        type: "symbol",
        source: "heat-now-src",
        layout: {
          "text-field": ["to-string", ["get", "score"]],
          "text-font": ["Noto Sans Bold"],
          "text-size": 11,
          "text-allow-overlap": true,
          "text-ignore-placement": true,
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "rgba(6,7,10,0.85)",
          "text-halo-width": 1.2,
        },
      });

      repaintMap(map);
      setMapReadyTick((tick) => tick + 1);
    };

    // Add OXIDAȚII overlays as soon as the style exists, not on full map
    // "load". Full load can wait on slow vector tiles/glyphs on mobile, which
    // caused the first seconds to show a different/empty map until zooming.
    map.once("style.load", setupInteractiveLayers);
    map.once("load", setupInteractiveLayers);
    window.setTimeout(setupInteractiveLayers, 260);

    map.on("idle", () => {
      if (!mapHasCriticalLayers(map) && autoRetryCountRef.current < 2) {
        autoRetryCountRef.current += 1;
        setRetryKey((k) => k + 1);
        return;
      }
      repaintMap(map);
    });

    map.on("error", (event) => {
      console.warn("Map tile error", event.error);
    });
    const refreshLabels = () =>
      requestAnimationFrame(() =>
        resolveCityLabelCollisions(containerRef.current, compactMapRef.current),
      );
    let moveIdleTimer: number | null = null;
    const onMoveStart = () => {
      containerRef.current?.classList.add("oxi-map-moving");
      if (moveIdleTimer) {
        clearTimeout(moveIdleTimer);
        moveIdleTimer = null;
      }
    };
    const onMoveEnd = () => {
      if (moveIdleTimer) clearTimeout(moveIdleTimer);
      moveIdleTimer = window.setTimeout(() => {
        containerRef.current?.classList.remove("oxi-map-moving");
      }, 120);
      refreshLabels();
    };
    map.on("movestart", onMoveStart);
    map.on("moveend", onMoveEnd);
    map.on("zoomend", refreshLabels);
    const canvas = map.getCanvas();
    const onLost = (event: Event) => {
      event.preventDefault();
      contextWasLost = true;
      containerRef.current?.classList.add("oxi-map-recovering");
      if (contextRetryTimer) window.clearTimeout(contextRetryTimer);
      contextRetryTimer = window.setTimeout(() => {
        if (!contextWasLost) return;
        setRetryKey((k) => k + 1);
      }, 2200);
      contextRetryTimerRef.current = contextRetryTimer;
    };
    const onRestored = () => {
      contextWasLost = false;
      containerRef.current?.classList.remove("oxi-map-recovering");
      if (contextRetryTimer) {
        window.clearTimeout(contextRetryTimer);
        contextRetryTimer = null;
      }
      contextRetryTimerRef.current = null;
      setMapFailed(false);
      repaintMap(map);
      if (restoreHealthTimer) window.clearTimeout(restoreHealthTimer);
      restoreHealthTimer = window.setTimeout(() => {
        if (!mapHasCriticalLayers(map) && autoRetryCountRef.current < 2) {
          autoRetryCountRef.current += 1;
          setRetryKey((k) => k + 1);
        } else {
          repaintMap(map);
        }
      }, 350);
    };
    canvas.addEventListener("webglcontextlost", onLost as any);
    canvas.addEventListener("webglcontextrestored", onRestored as any);

    const reviveMap = () => {
      if (document.visibilityState === "hidden") return;
      repaintMap(map);
      window.setTimeout(() => repaintMap(map), 180);
    };
    document.addEventListener("visibilitychange", reviveMap);
    window.addEventListener("pageshow", reviveMap);
    window.addEventListener("focus", reviveMap);

    mapRef.current = map;
    return () => {
      cityMarkers.current.forEach((m) => m.remove());
      cityMarkers.current.clear();
      friendMarkers.current.forEach((m) => m.remove());
      friendMarkers.current.clear();
      promotedMarkers.current.forEach((m) => m.remove());
      promotedMarkers.current.clear();
      try {
        if (contextRetryTimer) window.clearTimeout(contextRetryTimer);
        if (contextRetryTimerRef.current) window.clearTimeout(contextRetryTimerRef.current);
        if (loadWatchdog) window.clearTimeout(loadWatchdog);
        if (restoreHealthTimer) window.clearTimeout(restoreHealthTimer);
        document.removeEventListener("visibilitychange", reviveMap);
        window.removeEventListener("pageshow", reviveMap);
        window.removeEventListener("focus", reviveMap);
        canvas.removeEventListener("webglcontextlost", onLost as any);
        canvas.removeEventListener("webglcontextrestored", onRestored as any);
        map.remove();
      } catch {}
      contextRetryTimerRef.current = null;
      resizeObserver?.disconnect();
      mapRef.current = null;
      loadedRef.current = false;
    };
  }, [retryKey]);

  // VENUES → GeoJSON (GPU layer)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      const src = map.getSource(VENUES_SRC) as maplibregl.GeoJSONSource | undefined;
      if (!src) return;
      const visibleVenues = venues.filter(
        (v) => isValidLngLat(v.lng, v.lat) && !promotedMeta[v.id],
      );
      src.setData({
        type: "FeatureCollection",
        features: visibleVenues.map((v) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [Number(v.lng), Number(v.lat)] },
          properties: {
            id: v.id,
            name: v.name,
            type: v.type ?? "club",
            address: v.address ?? "",
            cover_url: v.cover_url ?? "",
          },
        })),
      });
      if (compactMapRef.current) return;
      const heat = map.getSource(HEAT_SRC) as maplibregl.GeoJSONSource | undefined;
      if (heat) {
        heat.setData({
          type: "FeatureCollection",
          features: venues
            .filter((v) => isValidLngLat(v.lng, v.lat))
            .map((v) => {
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
    if (loadedRef.current) apply();
    else map.once("load", apply);
  }, [venues, promotedMeta, retryKey]);

  // Heatmap pulse intentionally removed — it called setPaintProperty every
  // 120ms which forced a full WebGL repaint and dropped the whole map below
  // 60fps even when nothing else was happening. The base heatmap layer
  // already looks alive thanks to the cluster glow + DOM pulse animations.

  // HEAT NOW → live hot zones (overlay circles)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      const src = map.getSource("heat-now-src") as maplibregl.GeoJSONSource | undefined;
      if (!src) return;
      src.setData({
        type: "FeatureCollection",
        features: heatNowCells
          .filter((c) => isValidLngLat(c.lng, c.lat))
          .map((c) => ({
            type: "Feature" as const,
            geometry: { type: "Point" as const, coordinates: [Number(c.lng), Number(c.lat)] },
            properties: { score: Math.round(c.heat_score), id: c.cell_id },
          })),
      });
    };
    if (loadedRef.current) apply();
    else map.once("load", apply);
  }, [heatNowCells, retryKey]);

  // PROMOTED VENUES → DOM markers with the brand cover/logo inside a glowing
  // halo. Replaces the bottle silhouette so paying businesses are instantly
  // recognizable on the map. Diff-only: only re-creates markers when the set
  // of promoted venues or their coordinates change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const build = () => {
      if (
        compactMapRef.current &&
        promotedMarkers.current.size === 0 &&
        Object.keys(promotedMeta).length === 0
      )
        return;
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
        wrap.style.cssText =
          "position:relative;width:58px;height:58px;cursor:pointer;transform:translateY(-50%);z-index:5;";

        const pulse = document.createElement("div");
        pulse.style.cssText = `position:absolute;inset:-4px;border-radius:9999px;background:${theme};opacity:0.18;animation:oxi-pulse-strong 2.4s ease-out infinite;pointer-events:none;`;
        wrap.appendChild(pulse);

        const ring = document.createElement("div");
        ring.style.cssText = `position:relative;width:58px;height:58px;border-radius:9999px;border:2px solid ${theme};overflow:hidden;background:#06070a;box-shadow:0 0 14px ${theme}88,0 8px 16px rgba(0,0,0,0.58);animation:oxi-marker-pop 0.32s cubic-bezier(0.22,1,0.36,1) both;`;
        if (meta.cover) {
          const imgFrame = document.createElement("div");
          imgFrame.style.cssText =
            "position:absolute;inset:3px;border-radius:9999px;overflow:hidden;background:linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02));display:flex;align-items:center;justify-content:center;aspect-ratio:1/1;";
          const img = document.createElement("img");
          img.src = meta.cover;
          img.alt = "";
          img.loading = "lazy";
          img.style.cssText =
            "width:100%;height:100%;object-fit:cover;object-position:center center;display:block;aspect-ratio:1/1;background:transparent;";
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
              const cur = new Set<string>(
                JSON.parse(sessionStorage.getItem("oxi_dismissed_promos") || "[]"),
              );
              cur.add(meta.campaignId);
              sessionStorage.setItem("oxi_dismissed_promos", JSON.stringify([...cur]));
            } catch {}
          }
          const m = promotedMarkers.current.get(v.id);
          if (m) {
            m.remove();
            promotedMarkers.current.delete(v.id);
          }
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
        if (!seen.has(id)) {
          marker.remove();
          promotedMarkers.current.delete(id);
        }
      }
    };
    if (loadedRef.current) build();
    else map.once("load", build);
  }, [venues, promotedMeta, retryKey]);

  // CITIES → only the hottest cities get a tiny label; the basemap provides
  // the clean city/country typography, avoiding the previous label pile-up.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const markerCities = [...cities]
      .sort((a, b) => b.chaos_level - a.chaos_level)
      .slice(0, compactMapRef.current ? 12 : DESKTOP_CITY_LIMIT);
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
      const bottleSize = compactMapRef.current ? (big ? 17 : 14) : big ? 20 : 16;
      const wrap = document.createElement("button");
      wrap.style.cssText =
        "display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer;background:none;border:0;padding:0;transform:translate(-50%,-100%);position:relative;";
      wrap.title = c.name;

      const bottleStage = document.createElement("div");
      bottleStage.style.cssText =
        "position:relative;display:block;transition:transform 160ms ease;";
      bottleStage.innerHTML = bottleSVG(bottleSize, color);
      bottleStage.style.animation = "oxi-marker-pop 0.34s cubic-bezier(0.22,1,0.36,1) both";
      wrap.appendChild(bottleStage);

      let shattering = false;
      const shatter = () => {
        if (shattering) return;
        shattering = true;
        const original = bottleStage.firstElementChild as HTMLElement | null;
        if (original) {
          original.style.transition = "opacity 100ms, transform 100ms";
          original.style.opacity = "0";
          original.style.transform = "scale(0.6)";
        }
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
      const clear = () => {
        if (pressTimer) {
          clearTimeout(pressTimer);
          pressTimer = null;
        }
      };
      wrap.onpointerup = wrap.onpointerleave = wrap.onpointercancel = clear;
      wrap.onclick = (e) => {
        e.stopPropagation();
        clear();
        if (longPressed) return;
        shatter();
      };
      cityMarkers.current.set(
        c.id,
        new maplibregl.Marker({ element: wrap, anchor: "bottom" })
          .setLngLat([c.lng, c.lat])
          .addTo(map),
      );
    }
    // Remove markers for cities that disappeared from the list.
    for (const [id, marker] of cityMarkers.current) {
      if (!seen.has(id)) {
        marker.remove();
        cityMarkers.current.delete(id);
      }
    }
    requestAnimationFrame(() =>
      resolveCityLabelCollisions(containerRef.current, compactMapRef.current),
    );
  }, [cities, retryKey]);

  // FOCUS city programmatically. easeTo is lighter than flyTo on mobile GPUs.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusCity) return;
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
    const map = mapRef.current;
    if (!map || !fitBounds) return;
    const fit = () => {
      try {
        map.fitBounds(fitBounds, {
          padding: 60,
          duration: compactMapRef.current ? 450 : 800,
          pitch: 0,
          bearing: 0,
          maxZoom: 9,
        });
      } catch {}
    };
    if (loadedRef.current) fit();
    else map.once("load", fit);
  }, [fitBounds]);

  // FRIENDS → diff-only DOM markers. When a friend's coords change, smoothly
  // tween the marker between the old and new positions so it looks like they
  // are walking, not teleporting.
  const friendAnims = useRef<Map<string, number>>(new Map());
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
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
            const ring = el.querySelector(
              "div[style*='border-radius:'][style*='overflow:hidden']",
            ) as HTMLElement | null;
            if (ring) {
              ring.innerHTML = "";
              const ni = document.createElement("img");
              ni.src = f.avatar_url;
              ni.alt = "";
              ni.style.cssText =
                "width:100%;height:100%;object-fit:cover;object-position:center center;display:block;aspect-ratio:1/1;background:transparent;";
              ring.appendChild(ni);
            }
          }
        }
        const cur = existing.getLngLat();
        if (Math.abs(cur.lng - f.lng) < 1e-7 && Math.abs(cur.lat - f.lat) < 1e-7) continue;
        const fromLng = cur.lng,
          fromLat = cur.lat;
        const toLng = f.lng,
          toLat = f.lat;
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
      wrap.style.cssText =
        "position:relative;display:flex;flex-direction:column;align-items:center;cursor:pointer;transform:translateY(-50%);z-index:10;";

      const accent = f.is_me ? "#ff3d8b" : "#00e5ff";
      const ringSize = f.is_me ? 56 : 44;
      const pulseSize = f.is_me ? 68 : 54;

      const pulse = document.createElement("div");
      pulse.style.cssText = `position:absolute;top:-4px;left:50%;transform:translateX(-50%);width:${pulseSize}px;height:${pulseSize}px;border-radius:9999px;background:${accent};opacity:0.35;animation:oxi-pulse-strong 1.8s ease-out infinite;pointer-events:none;`;
      wrap.appendChild(pulse);

      const ring = document.createElement("div");
      ring.style.cssText = `position:relative;width:${ringSize}px;height:${ringSize}px;border-radius:9999px;border:2px solid ${accent};overflow:hidden;background:linear-gradient(135deg,#ff3d8b,#c724ff);box-shadow:0 0 14px ${accent},0 4px 12px rgba(0,0,0,0.55);aspect-ratio:1/1;animation:oxi-marker-pop 0.32s cubic-bezier(0.22,1,0.36,1) both;`;

      if (f.avatar_url) {
        const img = document.createElement("img");
        img.src = f.avatar_url;
        img.alt = "";
        img.style.cssText =
          "width:100%;height:100%;object-fit:cover;object-position:center center;display:block;aspect-ratio:1/1;background:transparent;";
        ring.appendChild(img);
      } else {
        const ini = document.createElement("div");
        ini.textContent = ((f.handle ?? f.display_name ?? "?")[0] ?? "?").toUpperCase();
        ini.style.cssText =
          "width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-family:'DM Sans',sans-serif;font-size:14px;";
        ring.appendChild(ini);
      }
      wrap.appendChild(ring);

      const live = document.createElement("div");
      live.style.cssText = `position:absolute;top:-1px;right:-1px;width:10px;height:10px;border-radius:9999px;background:${accent};border:2px solid #06070a;box-shadow:0 0 8px ${accent};`;
      ring.appendChild(live);

      if (f.is_me) {
        const crown = document.createElement("div");
        crown.textContent = "TU";
        crown.style.cssText =
          "position:absolute;top:-10px;left:50%;transform:translateX(-50%);padding:1px 5px;border-radius:9999px;background:#ff3d8b;color:#fff;font-family:'DM Sans',sans-serif;font-weight:900;font-size:8px;letter-spacing:0.08em;border:1.5px solid #06070a;box-shadow:0 0 8px #ff3d8b;";
        wrap.appendChild(crown);
      }

      const labelText = f.display_name ?? (f.handle ? `@${f.handle}` : f.is_me ? "tu" : "live");
      const pill = document.createElement("div");
      pill.textContent = labelText;
      pill.style.cssText = `display:none;`;
      wrap.appendChild(pill);

      wrap.onclick = (e) => {
        e.stopPropagation();
        navRef.current({ to: "/app/user/$id", params: { id: f.user_id } });
      };
      const marker = new maplibregl.Marker({ element: wrap, anchor: "bottom" })
        .setLngLat([f.lng, f.lat])
        .addTo(map);
      friendMarkers.current.set(f.user_id, marker);
    }
    // remove markers (and cancel anims) for friends no longer present
    for (const [id, marker] of friendMarkers.current) {
      if (!seen.has(id)) {
        const a = friendAnims.current.get(id);
        if (a) {
          cancelAnimationFrame(a);
          friendAnims.current.delete(id);
        }
        marker.remove();
        friendMarkers.current.delete(id);
      }
    }
  }, [friends, retryKey]);

  const mePin = friends.find((f) => f.is_me);

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
        @keyframes oxi-marker-pop {
          0%   { opacity: 0; transform: scale(0.6); }
          70%  { opacity: 1; transform: scale(1.08); }
          100% { opacity: 1; transform: scale(1); }
        }
        .maplibregl-map { position:absolute !important; inset:0 !important; overflow:hidden !important; width:100% !important; height:100% !important; background:#0d0b1e !important; }
        .maplibregl-canvas-container, .maplibregl-canvas { position:absolute !important; inset:0 !important; width:100% !important; height:100% !important; }
        .maplibregl-canvas { outline:none !important; background:#0d0b1e !important; }
        .maplibregl-marker { position:absolute !important; top:0; left:0; will-change:transform; z-index:2; }
        .oxi-map-recovering .maplibregl-canvas { opacity:0.001; }
        .maplibregl-ctrl-top-right { position:absolute; top:10px; right:10px; z-index:3; display:flex; flex-direction:column; gap:8px; }
        .maplibregl-ctrl-group { background: rgba(3,4,10,0.9) !important; border: 1px solid rgba(198,107,255,0.25) !important; }
        .maplibregl-ctrl-group button { background-color: transparent !important; }
        .maplibregl-ctrl-group button span { filter: invert(1) brightness(1.2); }
        .oxi-map-moving .maplibregl-marker * { animation-play-state: paused !important; }
        @media (prefers-reduced-motion: reduce) {
          .maplibregl-marker * { animation: none !important; }
        }
      `}</style>

      <div ref={containerRef} className="absolute inset-0" />
      {mapFailed && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-background/95 px-6 text-center">
          <div>
            <div className="font-display font-black text-xl">harta se reîncarcă</div>
            <div className="mt-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              telefonul a pierdut randarea hărții
            </div>
            <button
              onClick={() => {
                setMapFailed(false);
                setRetryKey((k) => k + 1);
              }}
              className="mt-4 rounded-lg border border-neon-green/40 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-neon-green"
            >
              reîncarcă
            </button>
          </div>
        </div>
      )}

      {/* Zoom + recenter controls — stacked bottom-right */}
      <div className="absolute bottom-3 right-3 z-20 flex flex-col gap-2">
        <div className="flex flex-col rounded-full overflow-hidden backdrop-blur-xl bg-black/60 border border-white/15 shadow-lg shadow-black/40 transition-colors hover:border-white/25">
          <button
            onClick={() => mapRef.current?.zoomIn({ duration: 220 })}
            aria-label="Apropie harta"
            className="h-10 w-10 grid place-items-center text-white/90 active:scale-95 transition-all duration-200 ease-out hover:scale-105 hover:bg-black/70 will-change-transform border-b border-white/10"
          >
            <Plus size={18} />
          </button>
          <button
            onClick={() => mapRef.current?.zoomOut({ duration: 220 })}
            aria-label="Depărtează harta"
            className="h-10 w-10 grid place-items-center text-white/90 active:scale-95 transition-all duration-200 ease-out hover:scale-105 hover:bg-black/70 will-change-transform"
          >
            <Minus size={18} />
          </button>
        </div>
        {mePin && (
          <button
            onClick={handleRecenter}
            aria-label="Re-centrează pe poziția mea"
            className="h-10 w-10 grid place-items-center rounded-full backdrop-blur-xl bg-black/60 border border-white/15 text-white/90 active:scale-95 transition-all duration-200 ease-out hover:scale-105 hover:bg-black/70 hover:border-white/25 will-change-transform shadow-lg shadow-black/40"
          >
            <Crosshair size={18} />
          </button>
        )}
      </div>

      {/* Subtle edge fade only; keep streets and venue pins visible. */}
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            "linear-gradient(180deg, rgba(3,4,10,0.18), transparent 24%, transparent 76%, rgba(3,4,10,0.22))",
        }}
      />
    </div>
  );
}

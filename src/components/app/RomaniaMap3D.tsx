import { useEffect, useRef } from "react";
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

const VENUE_ICON: Record<string, string> = {
  club: "🎧",
  bar: "🍷",
  pub: "🍺",
  terasa: "🍹",
  after: "🌅",
};

const CARTO_DARK_RASTER_STYLE = {
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
    { id: "background", type: "background", paint: { "background-color": "#050505" } },
    { id: "carto-dark", type: "raster", source: "carto-dark", paint: { "raster-opacity": 1 } },
  ],
} as maplibregl.StyleSpecification;

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
  const loadedRef = useRef(false);
  const nav = useNavigate();

  // INIT map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: CARTO_DARK_RASTER_STYLE,
      center: [25.0, 45.9],
      zoom: 5.6,
      pitch: 45,
      bearing: -8,
      attributionControl: { compact: true },
      cooperativeGestures: false,
    });

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
      // subtle neon glow on the country
      try {
        map.setPaintProperty("background", "background-color", "#06070a");
      } catch {}
      // resize fix after mount
      requestAnimationFrame(() => map.resize());
    });

    map.on("error", (event) => {
      console.warn("Map tile error", event.error);
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; loadedRef.current = false; };
  }, []);

  // RENDER markers whenever data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // ── CITIES — neon glow dot + label
    for (const c of cities) {
      const big = c.chaos_level >= 8;
      const wrap = document.createElement("button");
      wrap.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer;background:none;border:0;padding:0;transform:translateY(-50%);";
      wrap.title = c.name;

      const dot = document.createElement("div");
      const color = big ? "#ff3158" : "#c66bff";
      dot.style.cssText = `width:${big ? 16 : 11}px;height:${big ? 16 : 11}px;border-radius:9999px;background:${color};border:2px solid rgba(255,255,255,0.85);box-shadow:0 0 16px ${color},0 0 32px ${color};animation:oxi-pulse 2.4s ease-out infinite;`;
      wrap.appendChild(dot);

      const label = document.createElement("div");
      label.textContent = c.name.toUpperCase();
      label.style.cssText = `font-family:'Space Grotesk',sans-serif;font-weight:900;font-size:${big ? 11 : 9}px;letter-spacing:0.08em;color:#fff;text-shadow:0 0 6px #000,0 1px 3px #000;white-space:nowrap;`;
      wrap.appendChild(label);

      wrap.onclick = (e) => { e.stopPropagation(); nav({ to: "/app/city/$slug", params: { slug: c.slug } }); };
      markersRef.current.push(new maplibregl.Marker({ element: wrap, anchor: "bottom" }).setLngLat([c.lng, c.lat]).addTo(map));
    }

    // ── VENUES — emoji icons by type (capped for perf)
    const visibleVenues = venues.filter(v => v.lat != null && v.lng != null).slice(0, 600);
    for (const v of visibleVenues) {
      const type = v.type ?? "club";
      const emoji = VENUE_ICON[type] ?? "📍";
      const el = document.createElement("button");
      el.title = v.name;
      el.style.cssText = "width:28px;height:28px;border-radius:9999px;background:rgba(10,10,14,0.85);border:1.5px solid rgba(255,176,0,0.7);display:flex;align-items:center;justify-content:center;font-size:14px;cursor:pointer;box-shadow:0 0 10px rgba(255,176,0,0.45);transition:transform .15s;padding:0;";
      el.textContent = emoji;
      el.onmouseenter = () => { el.style.transform = "scale(1.25)"; };
      el.onmouseleave = () => { el.style.transform = "scale(1)"; };
      el.onclick = (e) => {
        e.stopPropagation();
        nav({ to: "/app/venue/$id", params: { id: v.id } });
      };
      markersRef.current.push(new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat([Number(v.lng), Number(v.lat)]).addTo(map));
    }

    // ── FRIENDS — Snapchat-style avatar bubbles with pulse
    for (const f of friends) {
      const wrap = document.createElement("div");
      wrap.style.cssText = "position:relative;display:flex;flex-direction:column;align-items:center;cursor:pointer;transform:translateY(-50%);";

      // pulsing ring
      const pulse = document.createElement("div");
      pulse.style.cssText = "position:absolute;top:-4px;left:50%;transform:translateX(-50%);width:54px;height:54px;border-radius:9999px;background:#39ff88;opacity:0.35;animation:oxi-pulse-strong 1.8s ease-out infinite;pointer-events:none;";
      wrap.appendChild(pulse);

      // avatar circle
      const ring = document.createElement("div");
      ring.style.cssText = "position:relative;width:44px;height:44px;border-radius:9999px;border:3px solid #39ff88;overflow:hidden;background:linear-gradient(135deg,#ff3158,#c66bff);box-shadow:0 0 18px #39ff88,0 4px 14px rgba(0,0,0,0.6);";
      if (f.avatar_url) {
        const img = document.createElement("img");
        img.src = f.avatar_url;
        img.alt = "";
        img.style.cssText = "width:100%;height:100%;object-fit:cover;";
        ring.appendChild(img);
      } else {
        const ini = document.createElement("div");
        ini.textContent = ((f.handle ?? f.display_name ?? "?")[0] ?? "?").toUpperCase();
        ini.style.cssText = "width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-family:'Space Grotesk',sans-serif;font-size:18px;";
        ring.appendChild(ini);
      }
      wrap.appendChild(ring);

      // live dot
      const live = document.createElement("div");
      live.style.cssText = "position:absolute;top:-2px;right:-2px;width:12px;height:12px;border-radius:9999px;background:#39ff88;border:2px solid #06070a;box-shadow:0 0 8px #39ff88;";
      ring.appendChild(live);

      // name pill
      const pill = document.createElement("div");
      pill.textContent = `@${f.handle ?? f.display_name ?? "live"}`;
      pill.style.cssText = "margin-top:4px;padding:2px 6px;border-radius:9999px;background:rgba(6,7,10,0.92);color:#39ff88;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:9px;letter-spacing:0.08em;text-transform:uppercase;white-space:nowrap;border:1px solid rgba(57,255,136,0.5);";
      wrap.appendChild(pill);

      wrap.onclick = (e) => { e.stopPropagation(); nav({ to: "/app/user/$id", params: { id: f.user_id } }); };
      markersRef.current.push(new maplibregl.Marker({ element: wrap, anchor: "bottom" }).setLngLat([f.lng, f.lat]).addTo(map));
    }
  }, [cities, venues, friends, nav]);

  return (
    <div className="relative w-full h-[62vh] min-h-[460px] max-h-[640px] rounded-2xl overflow-hidden border border-foreground/10 bg-black">
      <style>{`
        @keyframes oxi-pulse { 0% { transform: scale(0.9); opacity: 1; } 70% { transform: scale(1.6); opacity: 0; } 100% { opacity: 0; } }
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

      {/* top status pill */}
      <div className="absolute top-2 left-2 z-10 px-2.5 py-1 rounded-md bg-black/80 backdrop-blur font-mono text-[9px] uppercase tracking-widest text-neon-green pointer-events-none border border-neon-green/30">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-neon-green animate-pulse mr-1.5 align-middle" />
        live · {friends.length} oxidați activi
      </div>

      {/* bottom legend */}
      <div className="absolute bottom-2 left-2 right-2 z-10 rounded-xl bg-black/80 backdrop-blur border border-foreground/10 px-3 py-2 pointer-events-none flex items-center justify-between gap-2">
        <div className="font-display font-black text-xs leading-none">{venues.length} locuri · {cities.length} orașe</div>
        <div className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          <span>🎧 club</span><span>🍷 bar</span><span>🍺 pub</span><span>🍹 terasă</span>
        </div>
      </div>
    </div>
  );
}

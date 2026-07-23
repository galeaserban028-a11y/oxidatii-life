import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useMemo, useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RomaniaMap3D, type FriendPin } from "@/components/app/RomaniaMap3D";
import { useAuth } from "@/lib/auth";
import {
  MapPin,
  Clock,
  X,
  Beer,
  List,
  Settings,
  Ghost,
} from "lucide-react";
import { VenueFilters, type VenueTypeFilter } from "@/components/app/VenueFilters";
import { AddVenueSheet } from "@/components/app/AddVenueSheet";
import { MapSettingsSheet } from "@/components/app/MapSettingsSheet";
import { isOpenNow, nextOpenLabel, type OpeningHours } from "@/lib/openingHours";
import { type PromoMeta } from "@/components/app/map/PromoBanner";

import { venueNickname } from "@/lib/venueNickname";

export const Route = createFileRoute("/app/map")({
  head: () => ({ meta: [{ title: "Hartă · OXIDAȚII" }] }),
  validateSearch: (search: Record<string, unknown>): { venue?: string } => ({
    venue: typeof search.venue === "string" ? search.venue : undefined,
  }),
  component: MapPage,
});

type Venue = {
  id: string;
  name: string;
  type: string;
  lat: number | null;
  lng: number | null;
  city_id: string;
  address: string | null;
  opening_hours: OpeningHours | null;
  cover_url: string | null;
};

type City = {
  id: string;
  slug: string;
  name: string;
  lat: number;
  lng: number;
  chaos_level: number;
  country: string;
};
const EMPTY_CITIES: City[] = [];

type RawMapSettings = {
  map_ghost?: boolean | null;
  map_visibility?: string | null;
  map_precision?: string | null;
  map_auto_ghost_hours?: number | null;
};

function normalizeMapSettings(settings: RawMapSettings | null | undefined) {
  return {
    map_ghost: Boolean(settings?.map_ghost),
    map_visibility: settings?.map_visibility ?? "friends",
    map_precision:
      settings?.map_precision === "approx" || settings?.map_precision === "city"
        ? settings.map_precision
        : "exact",
    map_auto_ghost_hours: Number(settings?.map_auto_ghost_hours ?? 8),
  };
}

function cleanVenueName(name: unknown) {
  const cleaned = String(name ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length < 2) return null;
  if (/^(?::\/\/|about:?\s*blank|undefined|null)/i.test(cleaned)) return null;
  return cleaned;
}

function normalizeMapVenues(rows: Venue[]) {
  const normalized: Venue[] = [];
  for (const v of rows) {
    const name = cleanVenueName(v.name);
    const lat = v.lat === null ? null : Number(v.lat);
    const lng = v.lng === null ? null : Number(v.lng);
    if (!name || lat === null || lng === null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      continue;
    }
    normalized.push({
      ...v,
      name,
      lat,
      lng,
      address: v.address?.replace(/\s+/g, " ").trim() || null,
    });
  }
  return normalized;
}

function MapPage() {
  const { user } = useAuth();
  const search = Route.useSearch();

  // filter state
  const [query, setQuery] = useState("");
  const [type, setType] = useState<VenueTypeFilter>("all");
  const [country, setCountry] = useState<string | "all">("all");
  const [cityId, setCityId] = useState<string | "all">("all");
  const [visible, setVisible] = useState(40);
  const [focusCity, setFocusCity] = useState<{
    lat: number;
    lng: number;
    zoom?: number;
    nonce?: number;
  } | null>(null);
  const [fitBounds, setFitBounds] = useState<[[number, number], [number, number]] | null>(null);
  const focusedFromSearchRef = useRef<string | null>(null);
  const previousCountryRef = useRef<string | "all">("all");

  const { data: citiesData, isLoading } = useQuery({
    queryKey: ["cities"],
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cities")
        .select("id,slug,name,lat,lng,chaos_level,country")
        .order("chaos_level", { ascending: false });
      if (error) throw error;
      return data.map((c) => ({
        ...c,
        lat: Number(c.lat),
        lng: Number(c.lng),
        chaos_level: Number(c.chaos_level),
        country: (c as { country?: string | null }).country ?? "RO",
      }));
    },
  });
  const cities = citiesData ?? EMPTY_CITIES;
  const cityMap = useMemo(() => new Map(cities.map((c) => [c.id, c])), [cities]);

  // Toate venue-urile reale din DB (Europa), paginate peste limita de 1000.
  const { data: venues = [] } = useQuery({
    queryKey: ["map-venues-all"],
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    queryFn: async () => {
      const all: Venue[] = [];
      let from = 0;
      const step = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("venues")
          .select("id, name, type, lat, lng, city_id, address, opening_hours, cover_url")
          .not("lat", "is", null)
          .not("lng", "is", null)
          .order("name")
          .range(from, from + step - 1);
        if (error) throw error;
        const batch = (data ?? []) as Venue[];
        all.push(...batch);
        if (batch.length < step) break;
        from += step;
      }
      return normalizeMapVenues(all);
    },
  });

  // Focus map on a venue passed via ?venue=<id> in the URL.
  useEffect(() => {
    const id = search.venue;
    if (!id || !venues.length) return;
    if (focusedFromSearchRef.current === id) return;
    const v = venues.find((x) => x.id === id);
    if (v && v.lat != null && v.lng != null) {
      setFocusCity({ lat: Number(v.lat), lng: Number(v.lng), zoom: 13.2 });
      focusedFromSearchRef.current = id;
    }
  }, [search.venue, venues]);

  // Active venue-linked promo campaigns → "shining" pins on the map.
  // Pulls only the data needed to recognize a promoted venue + tint its halo
  // and show the brand logo in place of the bottle silhouette.
  const { data: promotedMeta = {} } = useQuery({
    queryKey: ["promoted-venues"],
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_active_campaigns", { _limit: 50 });
      if (error) throw error;
      const map: Record<
        string,
        {
          theme: string;
          cover: string | null;
          campaignId: string;
          title: string | null;
          venueName: string | null;
          tier: string;
        }
      > = {};
      type CampaignRow = {
        id: string;
        venue_id: string | null;
        theme_color?: string | null;
        image_urls?: string[] | null;
        business_logo_url?: string | null;
        business_cover_url?: string | null;
        title?: string | null;
        venue_name?: string | null;
        business_brand_name?: string | null;
      };
      for (const c of (data ?? []) as CampaignRow[]) {
        const vid = c.venue_id;
        if (!vid) continue;
        if (map[vid]) continue;
        const cover =
          (Array.isArray(c.image_urls) && c.image_urls[0]) ||
          c.business_logo_url ||
          c.business_cover_url ||
          null;
        map[vid] = {
          theme: c.theme_color ?? "#ff3d8b",
          cover,
          campaignId: c.id,
          title: c.title ?? null,
          venueName: c.venue_name ?? c.business_brand_name ?? null,
          tier: "starter",
        };
      }
      return map;
    },
    refetchInterval: 60_000,
  });

  // Venues-only map: no me/friends live pins (keeps the map smooth).
  const qc = useQueryClient();


  // Country chips from cities (not only venues) — full names, no flag-emoji blanks on Android.
  const countries = useMemo(() => {
    const NAMES: Record<string, string> = {
      RO: "România",
      GB: "UK",
      FR: "Franța",
      DE: "Germania",
      ES: "Spania",
      IT: "Italia",
      NL: "Olanda",
      BE: "Belgia",
      AT: "Austria",
      CZ: "Cehia",
      PL: "Polonia",
      HU: "Ungaria",
      GR: "Grecia",
      PT: "Portugalia",
      IE: "Irlanda",
      DK: "Danemarca",
      SE: "Suedia",
      NO: "Norvegia",
      CH: "Elveția",
      BG: "Bulgaria",
      HR: "Croația",
      RS: "Serbia",
      TR: "Turcia",
    };
    const counts = new Map<string, number>();
    // Count actual venues per country (via their city) — this is what the user sees on the map.
    for (const v of venues) {
      const cc = cityMap.get(v.city_id)?.country;
      if (!cc) continue;
      counts.set(cc, (counts.get(cc) ?? 0) + 1);
    }
    // Make sure every country that has cities still appears in the chip list, even with 0 venues.
    for (const c of cities) {
      if (!c.country) continue;
      if (!counts.has(c.country)) counts.set(c.country, 0);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([code, count]) => ({ code, count, label: NAMES[code] ?? code }));
  }, [cities, venues, cityMap]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return venues.filter((v) => {
      if (type !== "all" && v.type !== type) return false;
      if (country !== "all" && cityMap.get(v.city_id)?.country !== country) return false;
      if (cityId !== "all" && v.city_id !== cityId) return false;
      if (q) {
        const city = cityMap.get(v.city_id)?.name?.toLowerCase() ?? "";
        if (
          !v.name.toLowerCase().includes(q) &&
          !city.includes(q) &&
          !(v.address ?? "").toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [venues, query, type, country, cityId, cityMap]);

  // Cities scoped to selected country (for map markers + fit bounds)
  const citiesScoped = useMemo(
    () => (country === "all" ? cities : cities.filter((c) => c.country === country)),
    [cities, country],
  );

  // Pass every filtered venue to the map. Clustering in RomaniaMap3D keeps FPS
  // sane with ~4–5k points (web + Android) — do not slice here.
  const mapVenues = filtered;

  // All cities in scope — city markers are cheap DOM pins vs thousands of venues.
  const mapCities = useMemo(
    () => [...citiesScoped].sort((a, b) => b.chaos_level - a.chaos_level),
    [citiesScoped],
  );

  // Fit bounds only when the user actually changes country. Do not auto-animate
  // on initial data load; that made the map feel like it was jumping/bugging.
  useEffect(() => {
    const previousCountry = previousCountryRef.current;
    const countryChanged = previousCountry !== country;
    previousCountryRef.current = country;

    if (country === "all") {
      if (countryChanged) {
        // Whole Europe-ish bounds when the user intentionally resets the country filter.
        setFitBounds([
          [-12, 35],
          [42, 60],
        ]);
        setFocusCity(null);
      } else {
        setFitBounds(null);
      }
      return;
    }
    const pts = cities.filter((c) => c.country === country);
    if (pts.length === 0) return;
    let minLng = 180,
      minLat = 90,
      maxLng = -180,
      maxLat = -90;
    for (const p of pts) {
      if (p.lng < minLng) minLng = p.lng;
      if (p.lng > maxLng) maxLng = p.lng;
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
    }
    // pad a bit if single city
    const padLng = Math.max(0.5, (maxLng - minLng) * 0.2);
    const padLat = Math.max(0.5, (maxLat - minLat) * 0.2);
    setFitBounds([
      [minLng - padLng, minLat - padLat],
      [maxLng + padLng, maxLat + padLat],
    ]);
    if (countryChanged) setFocusCity(null);
  }, [country, cities]);

  useEffect(() => {
    setVisible(40);
  }, [query, type, country, cityId]);

  // Privacy settings for map ghost indicator / settings sheet.
  const privacyQ = useQuery({
    queryKey: ["map-privacy", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [pRes, stateRes, locRes] = await Promise.all([
        supabase.from("profiles").select("city_id").eq("id", user!.id).maybeSingle(),
        supabase.rpc("get_my_account_state"),
        supabase.from("private_locations").select("lat, lng, radius_m").eq("user_id", user!.id),
      ]);
      const stateRow = Array.isArray(stateRes.data)
        ? ((stateRes.data[0] ?? null) as RawMapSettings | null)
        : null;
      const merged = { ...(pRes.data ?? {}), ...(stateRow ?? {}) };
      return {
        settings: normalizeMapSettings(merged),
        privateLocs: (locRes.data ?? []) as { lat: number; lng: number; radius_m: number }[],
      };
    },
  });

  const [settingsOpen, setSettingsOpen] = useState(false);

  // No friend/me pins on the map anymore.
  const mapFriendPins: FriendPin[] = [];

  const activeCity = cityId !== "all" ? cityMap.get(cityId) : null;

  // Hotspots — top venues by live check-ins right now (public, not just friends)
  const { data: hotspots = [] } = useQuery({
    queryKey: ["map-hotspots"],
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const { data } = await supabase
        .from("check_ins")
        .select("venue_id, venues(id, name, lat, lng, city_id)")
        .gt("expires_at", nowIso)
        .not("venue_id", "is", null)
        .limit(400);
      type HotspotVenue = {
        id: string;
        name: string;
        lat: number | string | null;
        lng: number | string | null;
        city_id: string;
      };
      type HotspotRow = { venue_id: string; venues: HotspotVenue | null };
      const counts = new Map<string, { venue: HotspotVenue; count: number }>();
      for (const c of (data ?? []) as HotspotRow[]) {
        if (!c.venues) continue;
        const cur = counts.get(c.venue_id);
        if (cur) cur.count += 1;
        else counts.set(c.venue_id, { venue: c.venues, count: 1 });
      }
      return Array.from(counts.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
    },
    refetchInterval: 60_000,
  });

  const instrument = { fontFamily: '"Instrument Serif", serif', letterSpacing: "-0.02em" } as const;

  return (
    <div className="pb-32 bg-[#050505] min-h-screen text-white" data-header-bg="#050505">
      {/* Sticky header — cinema bento */}
      <header className="sticky top-0 z-30 px-4 pt-5 pb-3 bg-[#050505] border-b border-white/5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-[34px] leading-none tracking-tight" style={instrument}>
              HARTĂ<span className="text-[#ffea00]">.</span>
            </h1>
            <div className="mt-1.5 flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={10} className="text-white/40" />
                <span className="text-[10px] font-bold tracking-[0.18em] text-white/40 uppercase">
                  {venues.length} locuri
                </span>
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 pt-4 space-y-4">
        <VenueFilters
          query={query}
          setQuery={setQuery}
          type={type}
          setType={setType}
          cityId={cityId}
          setCityId={setCityId}
          cities={cities}
          country={country}
          setCountry={setCountry}
          countries={countries}
          count={filtered.length}
          maxKm={0}
          setMaxKm={() => {}}
          hasGeo={false}
          requestGeo={() => {}}
        />

        {/* Country chips */}
        <div className="-mx-4 px-4 overflow-x-auto oxi-scrollbar">
          <div className="flex items-center gap-2 pb-3">
            <button
              onClick={() => {
                setCountry("all");
                setCityId("all");
              }}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition ${country === "all" ? "bg-gradient-to-r from-[#ff3d8b] to-[#c724ff] text-white border-transparent shadow-lg shadow-[#ff3d8b]/25" : "bg-white/5 border-white/10 text-white/60"}`}
            >
              🌍 Toate
            </button>
            {countries.map((c) => (
              <button
                key={c.code}
                onClick={() => {
                  setCountry(c.code);
                  setCityId("all");
                }}
                className={`shrink-0 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition ${country === c.code ? "bg-gradient-to-r from-[#ff3d8b] to-[#c724ff] text-white border-transparent shadow-lg shadow-[#ff3d8b]/25" : "bg-white/5 border-white/10 text-white/60"}`}
              >
                {c.label}
                <span className="opacity-60 ml-1">{c.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Hotspots live rail */}
        {hotspots.length > 0 && (
          <div className="-mx-4">
            <div className="px-4 pb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base italic text-[#ffea00]" style={instrument}>
                  Hotspots
                </span>
                <span className="relative flex h-1.5 w-1.5">
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#c724ff]" />
                </span>
                <span className="text-[10px] tracking-[0.18em] uppercase text-white/40 font-bold">
                  acum
                </span>
              </div>
              <span className="text-[10px] text-white/30 uppercase tracking-wider">
                {hotspots.length} locuri
              </span>
            </div>
            <div className="px-4 overflow-x-auto no-scrollbar">
              <div className="flex gap-2 pb-1">
                {hotspots.map(({ venue, count }) => {
                  const heat = Math.min(1, count / 8);
                  return (
                    <button
                      key={venue.id}
                      onClick={() => {
                        if (venue.city_id) setCityId(venue.city_id);
                        if (venue.lat != null && venue.lng != null) {
                          setFocusCity({
                            lat: Number(venue.lat),
                            lng: Number(venue.lng),
                            zoom: 13.2,
                          });
                        }
                      }}
                      className="shrink-0 relative rounded-2xl border border-white/10 bg-[#111] overflow-hidden p-3 w-[160px] text-left active:scale-95 transition"
                    >
                      <div
                        className="absolute inset-x-0 top-0 h-12 pointer-events-none"
                        style={{
                          background: `linear-gradient(180deg, rgba(255,61,139,${0.15 + heat * 0.35}), transparent)`,
                        }}
                      />
                      <div className="relative flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-bold text-white truncate">
                            {venue.name}
                          </div>
                          <div className="text-[9px] uppercase tracking-widest text-white/40 mt-0.5 truncate">
                            {cityMap.get(venue.city_id)?.name ?? "—"}
                          </div>
                        </div>
                        <div className="shrink-0 bg-black/40 border border-white/10 rounded-full px-2 py-0.5 flex items-center gap-0.5">
                          <span className="text-[10px] font-bold text-[#ff3d8b]">{count}</span>
                          <span className="text-[9px]">🔥</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Map block — venues only (no me / friends live pins). */}
        <div className="relative overflow-hidden border-y border-white/10 bg-[#080a12] -mx-4">
          <RomaniaMap3D
            cities={mapCities}
            venues={mapVenues}
            promotedMeta={promotedMeta}
            friends={mapFriendPins}
            focusCity={focusCity}
            fitBounds={fitBounds}
            heatNowCells={[]}
            onCityClick={(c) => {
              setCityId(c.id);
              // Gentle city zoom — venue bottles appear from minzoom ~7.
              setFocusCity({ lat: c.lat, lng: c.lng, zoom: 11.8 });
            }}
          />

          {activeCity && (
            <div className="absolute top-3 left-3 z-40 flex items-center gap-2 rounded-2xl bg-black/85 border border-white/10 px-3 py-2 max-w-[calc(100%-6rem)]">
              <MapPin size={12} className="text-[#ffea00] shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[8px] uppercase tracking-[0.22em] text-[#ffea00] font-bold">
                  filtru
                </div>
                <div className="font-bold text-xs truncate text-white">{activeCity.name}</div>
              </div>
              <Link
                to="/app/city/$slug"
                params={{ slug: activeCity.slug }}
                className="shrink-0 text-[9px] uppercase tracking-widest text-[#ff3d8b] border border-[#ff3d8b]/40 rounded-full px-2 py-0.5 font-bold"
              >
                străzi →
              </Link>
              <button
                onClick={() => {
                  setCityId("all");
                  setFocusCity(null);
                }}
                aria-label="Șterge filtru"
                className="shrink-0 h-6 w-6 grid place-items-center rounded-full border border-white/15 text-white/60 bg-black/60"
              >
                <X size={11} />
              </button>
            </div>
          )}
          {/* Map settings button — top-right (safe-area aware) */}
          {user && (
            <button
              onClick={() => setSettingsOpen(true)}
              aria-label="Setări hartă"
              style={{
                top: "0.5rem",
                right: "0.5rem",
              }}
              className="absolute z-40 h-8 w-8 grid place-items-center rounded-full bg-black/70 border border-white/10 text-white/70 active:scale-95 transition"
            >

              {privacyQ.data?.settings?.map_ghost ? (
                <Ghost size={15} className="text-[#c724ff]" />
              ) : (
                <Settings size={15} />
              )}
            </button>
          )}

          {/* Heat overlay disabled on the map page — costly blur on Android WebView. */}
        </div>

        <MapSettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />

        <AddVenueSheet
          cities={cities}
          onAdded={() => qc.invalidateQueries({ queryKey: ["map-venues-all"] })}
        />

        {/* Venue list under the map */}
        <div className="flex items-center gap-1.5 py-2 px-1 text-[10px] uppercase tracking-widest font-bold text-white/50">
          <List size={11} /> locații · {filtered.length}
        </div>

        <section className="space-y-2">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-[11px] uppercase tracking-widest text-white/40 font-bold">
              {query.trim()
                ? "nimic găsit pentru căutare. încearcă alt nume sau dă reset."
                : "zero locații. dă reset la filtre."}
            </div>
          ) : (
            <>
              {filtered.slice(0, visible).map((v) => {
                const city = cityMap.get(v.city_id);
                const openState = isOpenNow(v.opening_hours);
                const nextOpen = openState === false ? nextOpenLabel(v.opening_hours) : null;
                return (
                  <div
                    key={v.id}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-[#111] border border-white/10"
                  >
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-[#ff3d8b]/20 to-[#c724ff]/10 border border-[#ff3d8b]/30 flex items-center justify-center shrink-0 text-[#ff3d8b]">
                      <Beer size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <div className="font-semibold text-sm truncate text-white">{v.name}</div>
                        {openState === true && (
                          <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#ff3d8b]/15 border border-[#ff3d8b]/40 text-[8px] uppercase tracking-wider text-[#ff3d8b] font-bold">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#ff3d8b] animate-pulse" />{" "}
                            open
                          </span>
                        )}
                        {openState === false && (
                          <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#c724ff]/15 border border-[#c724ff]/40 text-[8px] uppercase tracking-wider text-[#c724ff] font-bold">
                            <Clock size={8} /> {nextOpen ? nextOpen : "închis"}
                          </span>
                        )}
                      </div>
                      <div className="text-[9px] font-mono uppercase tracking-[0.22em] text-[#ff3d8b]/70 truncate mt-0.5">
                        // {venueNickname(v.name, v.type)}
                      </div>
                      <div className="text-[10px] uppercase tracking-[0.18em] text-white/40 truncate flex items-center gap-1 font-bold mt-0.5">
                        <MapPin size={9} /> {city?.name ?? "?"}
                        {v.address ? ` · ${v.address}` : ""}
                      </div>
                    </div>
                  </div>
                );
              })}
              {visible < filtered.length && (
                <button
                  onClick={() => setVisible((v) => v + 60)}
                  className="w-full mt-2 py-3 rounded-2xl border border-[#ff3d8b]/40 text-[#ff3d8b] text-[11px] uppercase tracking-widest active:scale-[0.98] font-bold"
                >
                  + arată încă {Math.min(60, filtered.length - visible)} (din{" "}
                  {filtered.length - visible})
                </button>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

// PromoBanner & BusinessVisibilityCTA extracted to @/components/app/map/PromoBanner

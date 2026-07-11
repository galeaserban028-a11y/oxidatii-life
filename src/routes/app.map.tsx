import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { throttle } from "@/lib/throttle";
import { RomaniaMap3D, type FriendPin, type HeatNowCell } from "@/components/app/RomaniaMap3D";
import { useAuth } from "@/lib/auth";
import {
  UserPlus,
  Users,
  MapPin,
  Clock,
  X,
  Beer,
  List,
  Navigation,
  Settings,
  Ghost,
} from "lucide-react";
import { VenueFilters, type VenueTypeFilter } from "@/components/app/VenueFilters";
import { AddVenueSheet } from "@/components/app/AddVenueSheet";
import { MapSettingsSheet } from "@/components/app/MapSettingsSheet";
import { HeatNowButton } from "@/components/app/HeatNowSheet";
import { FadeIn } from "@/components/app/FadeIn";
import { isOpenNow, nextOpenLabel, type OpeningHours } from "@/lib/openingHours";
import {
  PromoBanner,
  BusinessVisibilityCTA,
  type PromoMeta,
} from "@/components/app/map/PromoBanner";

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

function applyLocationPrivacy(
  lat: number,
  lng: number,
  settings: ReturnType<typeof normalizeMapSettings>,
  cityCenter: { lat: number; lng: number } | null | undefined,
) {
  if (settings.map_precision === "approx") {
    const j = 0.0018;
    return {
      lat: lat + (Math.random() * 2 - 1) * j,
      lng: lng + (Math.random() * 2 - 1) * j,
      exact: false,
    };
  }
  if (settings.map_precision === "city" && cityCenter) {
    return { lat: cityCenter.lat, lng: cityCenter.lng, exact: false };
  }
  return { lat, lng, exact: true };
}

type FriendshipRow = { requester_id: string; addressee_id: string; status: string };
type LiveLocRow = { user_id: string; lat: number | string; lng: number | string };
type CheckinRow = {
  user_id: string;
  venue_id: string | null;
  lat: number | string | null;
  lng: number | string | null;
  created_at: string;
};
type ProfileRow = {
  id: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
};
type VenueLite = {
  id: string;
  name: string;
  lat: number | string | null;
  lng: number | string | null;
};

async function loadFriendPins(userId: string): Promise<FriendPin[]> {
  const { data: rows } = await supabase
    .from("friendships")
    .select("requester_id, addressee_id, status")
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
  const friendIds = ((rows ?? []) as FriendshipRow[]).map((r) =>
    r.requester_id === userId ? r.addressee_id : r.requester_id,
  );

  // Always include the current user so they see their own pin on the map.
  const allIds = Array.from(new Set<string>([userId, ...friendIds]));

  const nowIso = new Date().toISOString();
  const [{ data: lives }, { data: checkins }] = await Promise.all([
    supabase
      .from("live_locations")
      .select("user_id, lat, lng, updated_at, expires_at")
      .in("user_id", allIds)
      .gt("expires_at", nowIso),
    supabase
      .from("check_ins")
      .select("user_id, venue_id, lat, lng, expires_at, created_at")
      .in("user_id", allIds)
      .gt("expires_at", nowIso)
      .order("created_at", { ascending: false }),
  ]);

  const liveMap = new Map<string, { lat: number; lng: number }>();
  for (const l of (lives ?? []) as LiveLocRow[]) {
    liveMap.set(l.user_id, { lat: Number(l.lat), lng: Number(l.lng) });
  }

  const seen = new Set<string>();
  const latestCheckin = ((checkins ?? []) as CheckinRow[]).filter((c) => {
    if (seen.has(c.user_id)) return false;
    seen.add(c.user_id);
    return true;
  });
  const checkinMap = new Map<string, CheckinRow>(latestCheckin.map((c) => [c.user_id, c]));

  const venueIds = Array.from(
    new Set(latestCheckin.map((c) => c.venue_id).filter((v): v is string => Boolean(v))),
  );
  const [{ data: profiles }, { data: venues }] = await Promise.all([
    supabase.from("profiles").select("id, handle, display_name, avatar_url").in("id", allIds),
    venueIds.length
      ? supabase.from("venues").select("id, name, lat, lng").in("id", venueIds)
      : Promise.resolve({ data: [] as VenueLite[] }),
  ]);
  const profMap = new Map<string, ProfileRow>(
    ((profiles ?? []) as ProfileRow[]).map((p) => [p.id, p]),
  );
  const venueMap = new Map<string, VenueLite>(
    ((venues ?? []) as VenueLite[]).map((v) => [v.id, v]),
  );

  const userIds = new Set<string>([...liveMap.keys(), ...checkinMap.keys()]);
  const pins: FriendPin[] = [];

  // Fallback for self: use only a previous GPS/live row or a check-in.
  // Never place "tu ești aici" on the city center — it feels imprecise.
  if (!userIds.has(userId)) {
    const [{ data: lastLive }, { data: lastCheckin }] = await Promise.all([
      supabase
        .from("live_locations")
        .select("lat, lng")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("check_ins")
        .select("venue_id, lat, lng")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    let lat: number | null = null,
      lng: number | null = null;
    if (lastLive) {
      const ll = lastLive as { lat: number | string; lng: number | string };
      lat = Number(ll.lat);
      lng = Number(ll.lng);
    } else if (lastCheckin) {
      const ck = lastCheckin as {
        lat: number | string | null;
        lng: number | string | null;
        venue_id: string | null;
      };
      if (ck.lat != null && ck.lng != null) {
        lat = Number(ck.lat);
        lng = Number(ck.lng);
      } else if (ck.venue_id) {
        const { data: v } = await supabase
          .from("venues")
          .select("lat,lng")
          .eq("id", ck.venue_id)
          .maybeSingle();
        if (v?.lat != null && v?.lng != null) {
          lat = Number(v.lat);
          lng = Number(v.lng);
        }
      }
    }
    if (lat != null && lng != null && isFinite(lat) && isFinite(lng)) {
      const me = profMap.get(userId);
      pins.push({
        user_id: userId,
        handle: me?.handle ?? null,
        display_name: me?.display_name ?? "tu",
        avatar_url: me?.avatar_url ?? null,
        lat,
        lng,
        venue_name: "tu ești aici",
        is_me: true,
      });
    }
  }

  for (const uid of userIds) {
    const live = liveMap.get(uid);
    const c = checkinMap.get(uid);
    const venue = c && c.venue_id ? venueMap.get(c.venue_id) : null;
    const lat = Number(live?.lat ?? c?.lat ?? venue?.lat);
    const lng = Number(live?.lng ?? c?.lng ?? venue?.lng);
    if (!isFinite(lat) || !isFinite(lng)) continue;
    const p = profMap.get(uid);
    const isMe = uid === userId;
    pins.push({
      user_id: uid,
      handle: p?.handle ?? null,
      display_name: p?.display_name ?? (isMe ? "tu" : null),
      avatar_url: p?.avatar_url ?? null,
      lat,
      lng,
      venue_name: isMe ? "tu ești aici" : (venue?.name ?? (live ? "în mișcare" : null)),
      is_me: isMe,
    });
  }
  return pins;
}

function getPrecisePosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Browser-ul tău n-are GPS."));
      return;
    }

    let best: GeolocationPosition | null = null;
    let settled = false;
    let watchId: number | null = null;
    let timeoutId: number | null = null;
    const maxAcceptedAccuracy = 80;

    const cleanup = () => {
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
      if (timeoutId != null) window.clearTimeout(timeoutId);
    };

    const fail = (error: GeolocationPositionError | Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };

    const finish = (pos?: GeolocationPosition) => {
      if (settled) return;
      const candidate = pos ?? best;
      if (!candidate) {
        fail(new Error("Nu am putut citi locația."));
        return;
      }
      if (candidate.coords.accuracy > maxAcceptedAccuracy) {
        fail(new Error("GPS-ul încă e prea aproximativ. Ieși lângă geam și încearcă din nou."));
        return;
      }
      settled = true;
      cleanup();
      resolve(candidate);
    };

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (!best || pos.coords.accuracy < best.coords.accuracy) best = pos;
        if (pos.coords.accuracy <= 35) finish(pos);
      },
      (error) => {
        if (best) finish(best);
        else fail(error);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 30_000 },
    );

    timeoutId = window.setTimeout(() => finish(), 25_000);
  });
}

function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const lat1 = (aLat * Math.PI) / 180;
  const lat2 = (bLat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
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
  const { user, profile, refreshProfile } = useAuth();
  const search = Route.useSearch();

  // filter state
  const [query, setQuery] = useState("");
  const [type, setType] = useState<VenueTypeFilter>("all");
  const [country, setCountry] = useState<string | "all">("all");
  const [cityId, setCityId] = useState<string | "all">("all");
  const [maxKm, setMaxKm] = useState(0);
  const [heatNowCells, setHeatNowCells] = useState<HeatNowCell[]>([]);
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [visible, setVisible] = useState(40);
  const [focusCity, setFocusCity] = useState<{ lat: number; lng: number; zoom?: number } | null>(
    null,
  );
  const [fitBounds, setFitBounds] = useState<[[number, number], [number, number]] | null>(null);
  const [autoLocated, setAutoLocated] = useState(false);
  const focusedFromSearchRef = useRef<string | null>(null);

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

  const { data: venues = [] } = useQuery({
    queryKey: ["map-venues-all"],
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    queryFn: async () => {
      // fetch ALL venues, paginating past the 1000 row default
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
      setFocusCity({ lat: Number(v.lat), lng: Number(v.lng), zoom: 16 });
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

  const { data: friendPins = [] } = useQuery({
    queryKey: ["friend-pins", user?.id],
    queryFn: () => loadFriendPins(user!.id),
    enabled: !!user,
    refetchInterval: 30_000,
  });

  // Realtime: refresh on check-ins AND live GPS updates from friends
  const qc = useQueryClient();
  useEffect(() => {
    if (!user?.id) return;
    const userId = user.id;
    const channelName = `live-presence:${userId}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
    // Throttle: under heavy load (many global check-ins) coalesce to 1 refetch / 2s
    const refresh = throttle(() => {
      qc.invalidateQueries({ queryKey: ["friend-pins", userId] });
    }, 2000);
    const ch = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "check_ins" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "live_locations" }, refresh)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id, qc]);

  const cityMap = useMemo(() => new Map(cities.map((c) => [c.id, c])), [cities]);

  // Country chip list (sorted by venue count desc)
  const countries = useMemo(() => {
    const NAMES: Record<string, string> = {
      RO: "🇷🇴 RO",
      GB: "🇬🇧 UK",
      FR: "🇫🇷 FR",
      DE: "🇩🇪 DE",
      ES: "🇪🇸 ES",
      IT: "🇮🇹 IT",
      NL: "🇳🇱 NL",
      BE: "🇧🇪 BE",
      AT: "🇦🇹 AT",
      CZ: "🇨🇿 CZ",
      PL: "🇵🇱 PL",
      HU: "🇭🇺 HU",
      GR: "🇬🇷 GR",
      PT: "🇵🇹 PT",
      IE: "🇮🇪 IE",
      DK: "🇩🇰 DK",
      SE: "🇸🇪 SE",
      NO: "🇳🇴 NO",
      CH: "🇨🇭 CH",
      BG: "🇧🇬 BG",
      HR: "🇭🇷 HR",
      RS: "🇷🇸 RS",
      TR: "🇹🇷 TR",
    };
    const cityCountryMap = new Map(cities.map((c) => [c.id, c.country as string]));
    const counts = new Map<string, number>();
    for (const v of venues) {
      const cc = cityCountryMap.get(v.city_id);
      if (!cc) continue;
      counts.set(cc, (counts.get(cc) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([code, count]) => ({ code, count, label: NAMES[code] ?? code }));
  }, [cities, venues]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = venues.filter((v) => {
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
      if (maxKm > 0 && geo && v.lat != null && v.lng != null) {
        if (distanceKm(geo.lat, geo.lng, v.lat, v.lng) > maxKm) return false;
      }
      return true;
    });
    if (geo) {
      list = [...list].sort((a, b) => {
        const da =
          a.lat != null && a.lng != null ? distanceKm(geo.lat, geo.lng, a.lat, a.lng) : 1e9;
        const db =
          b.lat != null && b.lng != null ? distanceKm(geo.lat, geo.lng, b.lat, b.lng) : 1e9;
        return da - db;
      });
    }
    return list;
  }, [venues, query, type, country, cityId, maxKm, geo, cityMap]);

  // Cities scoped to selected country (for map markers + fit bounds)
  const citiesScoped = useMemo(
    () => (country === "all" ? cities : cities.filter((c) => c.country === country)),
    [cities, country],
  );

  // Fit bounds when country changes (or reset to Europe when "all")
  useEffect(() => {
    if (country === "all") {
      // Whole Europe-ish bounds
      setFitBounds([
        [-12, 35],
        [42, 60],
      ]);
      setFocusCity(null);
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
    setFocusCity(null);
  }, [country, cities]);

  useEffect(() => {
    setVisible(40);
  }, [query, type, country, cityId, maxKm]);

  // Load user's privacy settings + private locations so we can apply them when publishing the pin.
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
      let cityCenter: { lat: number; lng: number } | null = null;
      if (pRes.data?.city_id) {
        const { data: c } = await supabase
          .from("cities")
          .select("lat, lng")
          .eq("id", pRes.data.city_id)
          .maybeSingle();
        if (c) cityCenter = { lat: Number(c.lat), lng: Number(c.lng) };
      }
      return {
        settings: normalizeMapSettings(merged),
        privateLocs: (locRes.data ?? []) as { lat: number; lng: number; radius_m: number }[],
        cityCenter,
      };
    },
  });

  const [settingsOpen, setSettingsOpen] = useState(false);

  const mapFriendPins = useMemo(() => {
    if (!user) return friendPins;
    const me = friendPins.find((f) => f.is_me);
    const pos =
      geo ??
      (me ? { lat: me.lat, lng: me.lng } : null) ??
      (privacyQ.data?.cityCenter
        ? { lat: privacyQ.data.cityCenter.lat, lng: privacyQ.data.cityCenter.lng }
        : null);
    if (!pos) return friendPins;
    return [
      {
        ...(me ?? {
          user_id: user.id,
          handle: profile?.handle ?? null,
          display_name: profile?.display_name ?? "tu",
          avatar_url: profile?.avatar_url ?? null,
        }),
        lat: pos.lat,
        lng: pos.lng,
        venue_name: geo ? "tu ești aici" : "în oraș",
        is_me: true,
      },
      ...friendPins.filter((f) => f.user_id !== user.id),
    ];
  }, [
    friendPins,
    geo,
    privacyQ.data?.cityCenter,
    profile?.avatar_url,
    profile?.display_name,
    profile?.handle,
    user,
  ]);

  const publishPosition = useCallback(
    async (pos: GeolocationPosition, ensureLive = false, recenter = false) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setGeo({ lat, lng });
      if (recenter || ensureLive) setFocusCity({ lat, lng, zoom: 16 });
      if (!user) return;

      if (ensureLive) {
        await supabase
          .from("profiles")
          .update({ location_consent: true, map_ghost: false, map_precision: "exact" })
          .eq("id", user.id);
        await refreshProfile();
        qc.invalidateQueries({ queryKey: ["map-privacy", user.id] });
      }

      const s = ensureLive
        ? normalizeMapSettings({ map_precision: "exact", map_auto_ghost_hours: 8 })
        : normalizeMapSettings(privacyQ.data?.settings);
      // Ghost mode or fully hidden → wipe and skip publishing.
      if (s?.map_ghost || s?.map_visibility === "nobody") {
        await supabase.from("live_locations").delete().eq("user_id", user.id);
        qc.invalidateQueries({ queryKey: ["friend-pins", user.id] });
        return;
      }
      // Inside a private location → skip.
      const inPrivate = (privacyQ.data?.privateLocs ?? []).some((pl) => {
        const dKm = distanceKm(lat, lng, Number(pl.lat), Number(pl.lng));
        return dKm * 1000 <= pl.radius_m;
      });
      if (inPrivate) {
        await supabase.from("live_locations").delete().eq("user_id", user.id);
        qc.invalidateQueries({ queryKey: ["friend-pins", user.id] });
        return;
      }
      // Apply precision.
      const out = applyLocationPrivacy(lat, lng, s, privacyQ.data?.cityCenter);
      const hours = Math.max(1, Math.min(24, s?.map_auto_ghost_hours ?? 8));
      await supabase.from("live_locations").upsert(
        {
          user_id: user.id,
          lat: out.lat,
          lng: out.lng,
          accuracy: out.exact ? (pos.coords.accuracy ?? null) : null,
          heading: out.exact ? (pos.coords.heading ?? null) : null,
          updated_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + hours * 60 * 60_000).toISOString(),
        },
        { onConflict: "user_id" },
      );
      qc.invalidateQueries({ queryKey: ["friend-pins", user.id] });
    },
    [
      privacyQ.data?.cityCenter,
      privacyQ.data?.privateLocs,
      privacyQ.data?.settings,
      qc,
      refreshProfile,
      user,
    ],
  );

  const requestGeo = () => {
    getPrecisePosition()
      .then((pos) => publishPosition(pos, true, true))
      .catch((error) =>
        alert(
          error instanceof Error
            ? error.message
            : "Nu am putut citi locația precisă. Verifică permisiunile și pornește GPS-ul.",
        ),
      );
  };

  useEffect(() => {
    if (autoLocated) return;
    setAutoLocated(true);

    // Only auto-trigger the OS prompt when permission is already granted.
    // Otherwise we'd re-pop the iOS "Allow Location" dialog on every map visit
    // until the user picks "Always Allow". When status is `prompt`/`denied`
    // we wait for an explicit tap on the live-OFF banner / consent button.
    const start = async () => {
      try {
        const perms = (
          navigator as Navigator & {
            permissions?: { query?: (d: PermissionDescriptor) => Promise<PermissionStatus> };
          }
        ).permissions;
        const status = perms?.query
          ? await perms.query({ name: "geolocation" as PermissionName }).catch(() => null)
          : null;
        const fallbackToCity = () => {
          const fallback = privacyQ.data?.cityCenter;
          if (fallback)
            setFocusCity((prev) => prev ?? { lat: fallback.lat, lng: fallback.lng, zoom: 12.5 });
        };
        if (status && status.state !== "granted") {
          fallbackToCity();
          return;
        }

        // Cheap, cached read — no prompt, no high-accuracy spin-up.
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            setGeo({ lat, lng });
            setFocusCity((prev) => prev ?? { lat, lng, zoom: 14 });
            if (
              user &&
              profile?.location_consent &&
              !privacyQ.data?.settings?.map_ghost &&
              privacyQ.data?.settings?.map_visibility !== "nobody"
            ) {
              publishPosition(pos).catch(() => {});
            }
          },
          () => fallbackToCity(),
          { enableHighAccuracy: false, maximumAge: 60_000, timeout: 8_000 },
        );
      } catch {
        /* silent */
      }
    };
    start();
    // Auto-locate runs once per mount; guarded by `autoLocated` above.
    // Keep deps minimal to avoid re-triggering when query data refs change
    // (caused a render loop on /app/map).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLocated]);

  const activeCity = cityId !== "all" ? cityMap.get(cityId) : null;
  const [tab, setTab] = useState<"locatii" | "live">("locatii");

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
    <div className="pb-32 bg-[#050505] min-h-screen text-white">
      {/* Sticky header — cinema bento */}
      <header className="sticky top-0 z-30 px-4 pt-5 pb-3 bg-[#050505]/85 backdrop-blur-xl border-b border-white/5">
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
              <span className="inline-flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff3d8b] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff3d8b]" />
                </span>
                <span className="text-[10px] font-bold tracking-[0.18em] text-[#ff3d8b] uppercase">
                  {friendPins.length} live
                </span>
              </span>
            </div>
          </div>
          <button
            onClick={requestGeo}
            aria-label="Locația mea"
            className={`h-10 w-10 grid place-items-center rounded-full border backdrop-blur active:scale-95 transition ${geo ? "border-transparent text-white bg-gradient-to-tr from-[#ff3d8b] to-[#c724ff] shadow-lg shadow-[#ff3d8b]/30" : "border-white/10 text-white/70 bg-white/5"}`}
          >
            <Navigation size={16} />
          </button>
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
          maxKm={maxKm}
          setMaxKm={setMaxKm}
          hasGeo={!!geo}
          requestGeo={requestGeo}
          count={filtered.length}
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
              🌍 toate
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
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#c724ff] opacity-75" />
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
                            zoom: 15,
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
                        <div className="shrink-0 backdrop-blur-xl bg-black/40 border border-white/10 rounded-full px-2 py-0.5 flex items-center gap-0.5">
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

        {/* Live OFF banner — when user hasn't consented to GPS or is in ghost mode,
            their pin never broadcasts. One-tap fix right here. */}
        {user && (!profile?.location_consent || privacyQ.data?.settings?.map_ghost) && (
          <button
            onClick={async () => {
              if (!navigator.geolocation) {
                alert("Browser-ul tău n-are GPS.");
                return;
              }
              getPrecisePosition()
                .then((pos) => publishPosition(pos, true, true))
                .catch((error) =>
                  alert(
                    error instanceof Error
                      ? error.message
                      : "Nu am putut citi locația precisă. Verifică permisiunile și pornește GPS-ul.",
                  ),
                );
            }}
            className="w-full flex items-center gap-3 rounded-2xl border border-[#ff3d8b]/40 bg-gradient-to-r from-[#ff3d8b]/15 to-[#c724ff]/10 px-4 py-3 text-left active:scale-[0.99] transition"
          >
            <span className="h-9 w-9 grid place-items-center rounded-xl bg-gradient-to-tr from-[#ff3d8b] to-[#c724ff] shrink-0 shadow-lg shadow-[#ff3d8b]/30">
              <Navigation size={16} className="text-white" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block uppercase text-sm leading-tight text-white font-bold tracking-tight">
                {privacyQ.data?.settings?.map_ghost ? "ești în ghost mode" : "live-ul e oprit"}
              </span>
              <span className="block text-[10px] uppercase tracking-[0.2em] text-white/50 mt-0.5 font-bold">
                apasă ca să apari pe hartă pentru prieteni
              </span>
            </span>
            <span className="text-[#ff3d8b] text-xl font-bold">→</span>
          </button>
        )}

        {/* Map block — clean reference-style map, no dashboard chrome over it. */}
        <div className="relative overflow-hidden border-y border-white/10 bg-[#080a12] -mx-4">
          <RomaniaMap3D
            cities={citiesScoped}
            venues={filtered}
            promotedMeta={promotedMeta}
            friends={mapFriendPins}
            focusCity={focusCity}
            fitBounds={fitBounds}
            heatNowCells={heatNowCells}
            onCityClick={(c) => {
              setCityId(c.id);
              setFocusCity({ lat: c.lat, lng: c.lng, zoom: 12.4 });
            }}
          />

          {activeCity && (
            <div className="absolute top-3 left-3 right-3 z-10 flex items-center gap-2 rounded-2xl backdrop-blur-xl bg-black/50 border border-white/10 px-3 py-2">
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
                className="text-[9px] uppercase tracking-widest text-[#ff3d8b] border border-[#ff3d8b]/40 rounded-full px-2 py-0.5 font-bold"
              >
                străzi →
              </Link>
              <button
                onClick={() => {
                  setCityId("all");
                  setFocusCity(null);
                }}
                aria-label="Șterge filtru"
                className="h-6 w-6 grid place-items-center rounded-full border border-white/15 text-white/60"
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
              className="absolute z-20 h-8 w-8 grid place-items-center rounded-full backdrop-blur-xl bg-black/45 border border-white/10 text-white/70 active:scale-95 transition"
            >
              {privacyQ.data?.settings?.map_ghost ? (
                <Ghost size={15} className="text-[#c724ff]" />
              ) : (
                <Settings size={15} />
              )}
            </button>
          )}

          <HeatNowButton
            cityId={cityId === "all" ? null : cityId}
            onFocus={(lat, lng) => setFocusCity({ lat, lng, zoom: 14.5 })}
            onCellsChange={setHeatNowCells}
          />
        </div>

        <MapSettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />

        <AddVenueSheet
          cities={cities}
          onAdded={() => qc.invalidateQueries({ queryKey: ["map-venues-all"] })}
        />

        {/* Friends CTA */}
        <Link
          to="/app/friends"
          className="group block rounded-2xl p-[1.5px] bg-gradient-to-r from-[#ff3d8b] via-[#ffea00] to-[#c724ff] active:scale-[0.99] transition shadow-lg shadow-[#ff3d8b]/20"
        >
          <div className="rounded-[14px] bg-[#0a0a0a] px-3.5 py-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-[#ff3d8b] to-[#c724ff] grid place-items-center shrink-0 shadow-lg shadow-[#ff3d8b]/30">
              <UserPlus className="text-white" size={18} strokeWidth={2.6} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="uppercase text-sm leading-tight text-white font-bold tracking-tight">
                cheamă oxidații
              </div>
              <div className="text-[9px] uppercase tracking-[0.2em] text-white/50 mt-0.5 font-bold">
                adaugă prieteni → vezi-i pe hartă
              </div>
            </div>
            <span className="text-[#ff3d8b] text-xl font-bold">→</span>
          </div>
        </Link>

        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-full bg-white/5 border border-white/10">
          <button
            onClick={() => setTab("locatii")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-[10px] uppercase tracking-widest font-bold transition ${tab === "locatii" ? "bg-gradient-to-r from-[#ff3d8b] to-[#c724ff] text-white shadow-lg shadow-[#ff3d8b]/25" : "text-white/50"}`}
          >
            <List size={11} /> locații · {filtered.length}
          </button>
          <button
            onClick={() => setTab("live")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-[10px] uppercase tracking-widest font-bold transition ${tab === "live" ? "bg-gradient-to-r from-[#ff3d8b] to-[#c724ff] text-white shadow-lg shadow-[#ff3d8b]/25" : "text-white/50"}`}
          >
            <Users size={11} /> live · {friendPins.length}
          </button>
        </div>

        {tab === "live" && (
          <section className="space-y-2">
            {friendPins.length === 0 ? (
              <div className="py-10 text-center text-[11px] uppercase tracking-widest text-white/40 font-bold">
                niciun oxidat live acum.
              </div>
            ) : (
              friendPins.map((f) => (
                <Link
                  key={f.user_id}
                  to="/app/user/$id"
                  params={{ id: f.user_id }}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-[#111] border border-white/10 active:scale-[0.99] transition"
                >
                  <div className="h-10 w-10 rounded-full overflow-hidden bg-gradient-to-br from-[#ff3d8b] to-[#c724ff] flex items-center justify-center text-sm font-bold shrink-0 text-white">
                    {f.avatar_url ? (
                      <img src={f.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      (f.handle ?? "?")[0]?.toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate text-white">
                      @{f.handle ?? f.display_name}
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/40 truncate font-bold mt-0.5">
                      📍 {f.venue_name ?? "în oraș"}
                    </div>
                  </div>
                  <span className="relative inline-flex h-2 w-2">
                    <span className="absolute inset-0 rounded-full bg-[#ff3d8b] animate-ping opacity-75" />
                    <span className="relative h-2 w-2 rounded-full bg-[#ff3d8b]" />
                  </span>
                </Link>
              ))
            )}
          </section>
        )}

        {tab === "locatii" && (
          <section className="space-y-2">
            {geo && (
              <div className="text-[9px] uppercase tracking-[0.18em] text-[#ff3d8b] flex items-center gap-1 font-bold">
                <Navigation size={10} /> sortat după distanță
              </div>
            )}
            {filtered.length === 0 ? (
              <div className="py-10 text-center text-[11px] uppercase tracking-widest text-white/40 font-bold">
                zero locații. dă reset la filtre.
              </div>
            ) : (
              <>
                {filtered.slice(0, visible).map((v) => {
                  const city = cityMap.get(v.city_id);
                  const dist =
                    geo && v.lat != null && v.lng != null
                      ? distanceKm(geo.lat, geo.lng, v.lat, v.lng)
                      : null;
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
                        <div className="text-[10px] uppercase tracking-[0.18em] text-white/40 truncate flex items-center gap-1 font-bold mt-0.5">
                          <MapPin size={9} /> {city?.name ?? "?"}
                          {v.address ? ` · ${v.address}` : ""}
                        </div>
                      </div>
                      {dist != null && (
                        <div className="text-[10px] uppercase tracking-widest text-[#ffea00] shrink-0 font-bold">
                          {dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`}
                        </div>
                      )}
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
        )}
      </div>
    </div>
  );
}

// PromoBanner & BusinessVisibilityCTA extracted to @/components/app/map/PromoBanner

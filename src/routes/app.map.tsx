import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RomaniaMap3D, type FriendPin } from "@/components/app/RomaniaMap3D";
import { useAuth } from "@/lib/auth";
import { UserPlus, Users, MapPin, Clock, X, Beer, List, Navigation } from "lucide-react";
import { VenueFilters, type VenueTypeFilter } from "@/components/app/VenueFilters";
import { AddVenueSheet } from "@/components/app/AddVenueSheet";
import { isOpenNow, nextOpenLabel, type OpeningHours } from "@/lib/openingHours";

export const Route = createFileRoute("/app/map")({
  head: () => ({ meta: [{ title: "Hartă · OXIDAȚII" }] }),
  component: MapPage,
});

type Venue = {
  id: string; name: string; type: string;
  lat: number | null; lng: number | null;
  city_id: string; address: string | null;
  opening_hours: OpeningHours | null;
  cover_url: string | null;
};

type City = { id: string; slug: string; name: string; lat: number; lng: number; chaos_level: number; country: string };
const EMPTY_CITIES: City[] = [];

async function loadFriendPins(userId: string): Promise<FriendPin[]> {
  const { data: rows } = await supabase
    .from("friendships")
    .select("requester_id, addressee_id, status")
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
  const friendIds = (rows ?? []).map((r: any) =>
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
  for (const l of lives ?? []) {
    liveMap.set((l as any).user_id, { lat: Number((l as any).lat), lng: Number((l as any).lng) });
  }

  const seen = new Set<string>();
  const latestCheckin = (checkins ?? []).filter((c: any) => {
    if (seen.has(c.user_id)) return false;
    seen.add(c.user_id);
    return true;
  });
  const checkinMap = new Map(latestCheckin.map((c: any) => [c.user_id, c]));

  const venueIds = Array.from(new Set(latestCheckin.map((c: any) => c.venue_id))).filter(Boolean);
  const [{ data: profiles }, { data: venues }] = await Promise.all([
    supabase.from("profiles").select("id, handle, display_name, avatar_url").in("id", allIds),
    venueIds.length
      ? supabase.from("venues").select("id, name, lat, lng").in("id", venueIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);
  const profMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
  const venueMap = new Map((venues ?? []).map((v: any) => [v.id, v]));

  const userIds = new Set<string>([...liveMap.keys(), ...checkinMap.keys()]);
  const pins: FriendPin[] = [];

  // Fallback for self: if no live row and no active check-in, use the most
  // recent (even expired) live_location, then last check-in venue, then city.
  if (!userIds.has(userId)) {
    const [{ data: lastLive }, { data: lastCheckin }, { data: meProfile }] = await Promise.all([
      supabase.from("live_locations").select("lat, lng").eq("user_id", userId).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("check_ins").select("venue_id, lat, lng").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("profiles").select("city_id").eq("id", userId).maybeSingle(),
    ]);
    let lat: number | null = null, lng: number | null = null;
    if (lastLive) { lat = Number((lastLive as any).lat); lng = Number((lastLive as any).lng); }
    else if (lastCheckin) {
      const ck: any = lastCheckin;
      if (ck.lat != null && ck.lng != null) { lat = Number(ck.lat); lng = Number(ck.lng); }
      else if (ck.venue_id) {
        const { data: v } = await supabase.from("venues").select("lat,lng").eq("id", ck.venue_id).maybeSingle();
        if (v?.lat != null && v?.lng != null) { lat = Number(v.lat); lng = Number(v.lng); }
      }
    }
    if ((lat == null || lng == null) && (meProfile as any)?.city_id) {
      const { data: city } = await supabase.from("cities").select("lat,lng").eq("id", (meProfile as any).city_id).maybeSingle();
      if (city) { lat = Number(city.lat); lng = Number(city.lng); }
    }
    if (lat != null && lng != null && isFinite(lat) && isFinite(lng)) {
      const me: any = profMap.get(userId);
      pins.push({
        user_id: userId,
        handle: me?.handle ?? null,
        display_name: me?.display_name ?? "tu",
        avatar_url: me?.avatar_url ?? null,
        lat, lng,
        venue_name: "tu ești aici",
        is_me: true,
      });
    }
  }

  for (const uid of userIds) {
    const live = liveMap.get(uid);
    const c: any = checkinMap.get(uid);
    const venue = c ? venueMap.get(c.venue_id) : null;
    const lat = Number(live?.lat ?? c?.lat ?? venue?.lat);
    const lng = Number(live?.lng ?? c?.lng ?? venue?.lng);
    if (!isFinite(lat) || !isFinite(lng)) continue;
    const p: any = profMap.get(uid);
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

function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371;
  const dLat = (bLat - aLat) * Math.PI / 180;
  const dLng = (bLng - aLng) * Math.PI / 180;
  const lat1 = aLat * Math.PI / 180;
  const lat2 = bLat * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function MapPage() {
  const { user } = useAuth();

  // filter state
  const [query, setQuery] = useState("");
  const [type, setType] = useState<VenueTypeFilter>("all");
  const [country, setCountry] = useState<string | "all">("all");
  const [cityId, setCityId] = useState<string | "all">("all");
  const [maxKm, setMaxKm] = useState(0);
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [visible, setVisible] = useState(40);
  const [focusCity, setFocusCity] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);
  const [fitBounds, setFitBounds] = useState<[[number, number], [number, number]] | null>(null);

  const { data: citiesData, isLoading } = useQuery({
    queryKey: ["cities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cities")
        .select("id,slug,name,lat,lng,chaos_level,country")
        .order("chaos_level", { ascending: false });
      if (error) throw error;
      return data.map(c => ({ ...c, lat: Number(c.lat), lng: Number(c.lng), chaos_level: Number(c.chaos_level), country: (c as any).country ?? "RO" }));
    },
  });
  const cities = citiesData ?? EMPTY_CITIES;

  const { data: venues = [] } = useQuery({
    queryKey: ["map-venues-all"],
    queryFn: async () => {
      // fetch ALL venues, paginating past the 1000 row default
      const all: Venue[] = [];
      let from = 0; const step = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("venues")
          .select("id, name, type, lat, lng, city_id, address, opening_hours, cover_url")
          .not("lat", "is", null).not("lng", "is", null)
          .order("name")
          .range(from, from + step - 1);
        if (error) throw error;
        const batch = (data ?? []) as Venue[];
        all.push(...batch);
        if (batch.length < step) break;
        from += step;
      }
      return all.map(v => ({ ...v, lat: v.lat === null ? null : Number(v.lat), lng: v.lng === null ? null : Number(v.lng) }));
    },
  });

  // Active venue-linked promo campaigns → "shining" pins on the map.
  // Pulls only the data needed to recognize a promoted venue + tint its halo
  // and show the brand logo in place of the bottle silhouette.
  const { data: promotedMeta = {} } = useQuery({
    queryKey: ["promoted-venues"],
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, title, venue_id, theme_color, image_urls, business_id, business_accounts!inner(venue_id, logo_url, cover_url, brand_name), venues(name)")
        .eq("status", "active")
        .lte("starts_at", nowIso)
        .or(`ends_at.is.null,ends_at.gt.${nowIso}`);
      if (error) throw error;
      const map: Record<string, { theme: string; cover: string | null; campaignId: string; title: string | null; venueName: string | null }> = {};
      for (const c of (data ?? []) as any[]) {
        const vid = c.venue_id ?? c.business_accounts?.venue_id;
        if (!vid) continue;
        if (map[vid]) continue;
        const cover = (c.image_urls?.[0] as string | undefined)
          ?? c.business_accounts?.logo_url
          ?? c.business_accounts?.cover_url
          ?? null;
        map[vid] = {
          theme: c.theme_color ?? "#ff3158",
          cover,
          campaignId: c.id,
          title: c.title ?? null,
          venueName: c.venues?.name ?? c.business_accounts?.brand_name ?? null,
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
    if (!user) return;
    const ch = supabase
      .channel("live-presence")
      .on("postgres_changes", { event: "*", schema: "public", table: "check_ins" }, () => {
        qc.invalidateQueries({ queryKey: ["friend-pins", user.id] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "live_locations" }, () => {
        qc.invalidateQueries({ queryKey: ["friend-pins", user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);

  const cityMap = useMemo(() => new Map(cities.map(c => [c.id, c])), [cities]);

  // Country chip list (sorted by venue count desc)
  const countries = useMemo(() => {
    const NAMES: Record<string, string> = {
      RO: "🇷🇴 RO", GB: "🇬🇧 UK", FR: "🇫🇷 FR", DE: "🇩🇪 DE", ES: "🇪🇸 ES",
      IT: "🇮🇹 IT", NL: "🇳🇱 NL", BE: "🇧🇪 BE", AT: "🇦🇹 AT", CZ: "🇨🇿 CZ",
      PL: "🇵🇱 PL", HU: "🇭🇺 HU", GR: "🇬🇷 GR", PT: "🇵🇹 PT", IE: "🇮🇪 IE",
      DK: "🇩🇰 DK", SE: "🇸🇪 SE", NO: "🇳🇴 NO", CH: "🇨🇭 CH", BG: "🇧🇬 BG",
      HR: "🇭🇷 HR", RS: "🇷🇸 RS", TR: "🇹🇷 TR",
    };
    const cityCountryMap = new Map(cities.map(c => [c.id, c.country as string]));
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
    let list = venues.filter(v => {
      if (type !== "all" && v.type !== type) return false;
      if (country !== "all" && cityMap.get(v.city_id)?.country !== country) return false;
      if (cityId !== "all" && v.city_id !== cityId) return false;
      if (q) {
        const city = cityMap.get(v.city_id)?.name?.toLowerCase() ?? "";
        if (!v.name.toLowerCase().includes(q) && !city.includes(q) && !(v.address ?? "").toLowerCase().includes(q)) return false;
      }
      if (maxKm > 0 && geo && v.lat != null && v.lng != null) {
        if (distanceKm(geo.lat, geo.lng, v.lat, v.lng) > maxKm) return false;
      }
      return true;
    });
    if (geo) {
      list = [...list].sort((a, b) => {
        const da = a.lat != null && a.lng != null ? distanceKm(geo.lat, geo.lng, a.lat, a.lng) : 1e9;
        const db = b.lat != null && b.lng != null ? distanceKm(geo.lat, geo.lng, b.lat, b.lng) : 1e9;
        return da - db;
      });
    }
    return list;
  }, [venues, query, type, country, cityId, maxKm, geo, cityMap]);

  // Cities scoped to selected country (for map markers + fit bounds)
  const citiesScoped = useMemo(
    () => country === "all" ? cities : cities.filter(c => c.country === country),
    [cities, country],
  );

  // Fit bounds when country changes (or reset to Europe when "all")
  useEffect(() => {
    if (country === "all") {
      // Whole Europe-ish bounds
      setFitBounds([[-12, 35], [42, 60]]);
      setFocusCity(null);
      return;
    }
    const pts = cities.filter(c => c.country === country);
    if (pts.length === 0) return;
    let minLng = 180, minLat = 90, maxLng = -180, maxLat = -90;
    for (const p of pts) {
      if (p.lng < minLng) minLng = p.lng;
      if (p.lng > maxLng) maxLng = p.lng;
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
    }
    // pad a bit if single city
    const padLng = Math.max(0.5, (maxLng - minLng) * 0.2);
    const padLat = Math.max(0.5, (maxLat - minLat) * 0.2);
    setFitBounds([[minLng - padLng, minLat - padLat], [maxLng + padLng, maxLat + padLat]]);
    setFocusCity(null);
  }, [country, cities]);

  useEffect(() => { setVisible(40); }, [query, type, country, cityId, maxKm]);

  const requestGeo = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setGeo({ lat, lng });
        setFocusCity({ lat, lng, zoom: 13 });
        // Publish own pin so it appears on the map immediately.
        if (user) {
          await supabase.from("live_locations").upsert(
            {
              user_id: user.id,
              lat,
              lng,
              accuracy: pos.coords.accuracy ?? null,
              heading: pos.coords.heading ?? null,
              updated_at: new Date().toISOString(),
              expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
            },
            { onConflict: "user_id" },
          );
          qc.invalidateQueries({ queryKey: ["friend-pins", user.id] });
        }
      },
      () => alert("Nu am putut citi locația. Verifică permisiunile."),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };


  const activeCity = cityId !== "all" ? cityMap.get(cityId) : null;
  const [tab, setTab] = useState<"locatii" | "live">("locatii");

  return (
    <div className="pb-4">
      {/* Sticky app-style header */}
      <header className="sticky top-0 z-30 -mx-0 px-5 pt-8 pb-6 bg-background/85 backdrop-blur-xl border-b border-foreground/5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="font-display font-black text-2xl tracking-tight lowercase">hartă</h1>
            <div className="mt-2 flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.25em] text-zinc-500">
                <MapPin size={10} /> {venues.length} locuri
              </span>
              <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.25em] text-neon-green">
                <span className="h-1.5 w-1.5 rounded-full bg-neon-green animate-pulse" /> {friendPins.length} live
              </span>
            </div>
          </div>
          <button
            onClick={requestGeo}
            aria-label="Locația mea"
            className={`h-11 w-11 grid place-items-center rounded-2xl border ${geo ? "border-neon-green/40 text-neon-green bg-neon-green/10" : "border-white/5 text-zinc-400 bg-zinc-900/30"} backdrop-blur active:scale-95 transition`}
          >
            <Navigation size={16} />
          </button>
        </div>
      </header>

      <div className="px-5 pt-6 space-y-5">
        <VenueFilters
          query={query} setQuery={setQuery}
          type={type} setType={setType}
          cityId={cityId} setCityId={setCityId}
          cities={cities}
          country={country} setCountry={setCountry}
          countries={countries}
          maxKm={maxKm} setMaxKm={setMaxKm}
          hasGeo={!!geo} requestGeo={requestGeo}
          count={filtered.length}
        />

        {/* Quick country chips strip */}
        <div className="-mx-5 px-5 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-2 pb-1">
            <button
              onClick={() => { setCountry("all"); setCityId("all"); }}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition ${country === "all" ? "bg-neon-crimson text-background border-neon-crimson" : "bg-zinc-900/30 border-white/5 text-zinc-400 hover:bg-zinc-800/40"}`}
            >🌍 toate</button>
            {countries.map(c => (
              <button
                key={c.code}
                onClick={() => { setCountry(c.code); setCityId("all"); }}
                className={`shrink-0 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition ${country === c.code ? "bg-neon-crimson text-background border-neon-crimson" : "bg-zinc-900/30 border-white/5 text-zinc-400 hover:bg-zinc-800/40"}`}
              >{c.label}<span className="opacity-60 ml-1">{c.count}</span></button>
            ))}
          </div>
        </div>

        {/* Map block */}
        <div className="relative rounded-2xl overflow-hidden border border-border bg-foreground/5">
          {isLoading ? (
            <div className="aspect-[5/4] animate-pulse" />
          ) : (
            <RomaniaMap3D
              cities={citiesScoped}
              venues={filtered}
              promotedMeta={promotedMeta}
              friends={friendPins}
              focusCity={focusCity}
              fitBounds={fitBounds}
              onCityClick={(c) => {
                setCityId(c.id);
                setFocusCity({ lat: c.lat, lng: c.lng, zoom: 12.4 });
              }}
            />
          )}
          {activeCity && (
            <div className="absolute top-2 left-2 right-2 z-10 flex items-center gap-2 rounded-xl bg-background/90 backdrop-blur border border-neon-purple/40 px-2.5 py-1.5">
              <MapPin size={12} className="text-neon-purple shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-mono text-[8px] uppercase tracking-widest text-neon-purple">filtru</div>
                <div className="font-display font-bold text-xs truncate">{activeCity.name}</div>
              </div>
              <Link
                to="/app/city/$slug"
                params={{ slug: activeCity.slug }}
                className="font-mono text-[9px] uppercase tracking-widest text-neon-green border border-neon-green/40 rounded-md px-1.5 py-0.5"
              >
                străzi →
              </Link>
              <button
                onClick={() => { setCityId("all"); setFocusCity(null); }}
                aria-label="Șterge filtru"
                className="h-6 w-6 grid place-items-center rounded-md border border-border text-muted-foreground"
              >
                <X size={11} />
              </button>
            </div>
          )}

          {/* Floating promo banner — bottom of map, dismissible */}
          <PromoBanner promotedMeta={promotedMeta} />
        </div>


        <AddVenueSheet cities={cities} onAdded={() => qc.invalidateQueries({ queryKey: ["map-venues-all"] })} />

        {/* Friends CTA — always visible under "add venue" */}
        <Link
          to="/app/friends"
          className="group block rounded-2xl p-[1.5px] bg-gradient-to-r from-neon-green via-neon-purple to-neon-crimson active:scale-[0.99] transition"
        >
          <div className="rounded-[14px] bg-background/95 px-3.5 py-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-neon-green/15 border border-neon-green/40 grid place-items-center shrink-0">
              <UserPlus className="text-neon-green" size={18} strokeWidth={2.6} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display font-black uppercase text-sm leading-tight">cheamă oxidații</div>
              <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground mt-0.5">
                adaugă prieteni → vezi-i pe hartă
              </div>
            </div>
            <span className="font-display text-neon-green text-xl">→</span>
          </div>
        </Link>


        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-foreground/5 border border-border">
          <button
            onClick={() => setTab("locatii")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-mono text-[10px] uppercase tracking-widest transition ${tab === "locatii" ? "bg-background text-foreground shadow" : "text-muted-foreground"}`}
          >
            <List size={11} /> locații · {filtered.length}
          </button>
          <button
            onClick={() => setTab("live")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-mono text-[10px] uppercase tracking-widest transition ${tab === "live" ? "bg-background text-neon-green shadow" : "text-muted-foreground"}`}
          >
            <Users size={11} /> live · {friendPins.length}
          </button>
        </div>

        {tab === "live" && (
          <section className="space-y-1.5">
            {friendPins.length === 0 ? (
              <div className="py-10 text-center font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                niciun oxidat live acum.
              </div>
            ) : friendPins.map((f) => (
              <Link
                key={f.user_id}
                to="/app/user/$id"
                params={{ id: f.user_id }}
                className="flex items-center gap-3 p-3 rounded-xl bg-foreground/[0.04] border border-neon-green/20 active:scale-[0.99] transition"
              >
                <div className="h-10 w-10 rounded-full overflow-hidden bg-gradient-to-br from-neon-crimson to-neon-purple flex items-center justify-center font-display text-sm shrink-0">
                  {f.avatar_url ? <img src={f.avatar_url} alt="" className="h-full w-full object-cover" /> : (f.handle ?? "?")[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-sm truncate">@{f.handle ?? f.display_name}</div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground truncate">
                    📍 {f.venue_name ?? "în oraș"}
                  </div>
                </div>
                <span className="relative inline-flex h-2 w-2">
                  <span className="absolute inset-0 rounded-full bg-neon-green animate-ping opacity-75" />
                  <span className="relative h-2 w-2 rounded-full bg-neon-green" />
                </span>
              </Link>
            ))}
          </section>
        )}

        {tab === "locatii" && (
          <section className="space-y-1.5">
            {geo && (
              <div className="font-mono text-[9px] uppercase tracking-widest text-neon-green flex items-center gap-1">
                <Navigation size={10} /> sortat după distanță
              </div>
            )}
            {filtered.length === 0 ? (
              <div className="py-10 text-center font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                zero locații. dă reset la filtre.
              </div>
            ) : (
              <>
                {filtered.slice(0, visible).map(v => {
                  const city = cityMap.get(v.city_id);
                  const dist = geo && v.lat != null && v.lng != null
                    ? distanceKm(geo.lat, geo.lng, v.lat, v.lng) : null;
                  const openState = isOpenNow(v.opening_hours);
                  const nextOpen = openState === false ? nextOpenLabel(v.opening_hours) : null;
                  return (
                    <div key={v.id} className="flex items-center gap-3 p-3 rounded-xl bg-foreground/5 border border-foreground/10">
                      <div className="h-10 w-10 rounded-lg bg-neon-green/10 border border-neon-green/30 flex items-center justify-center shrink-0 text-neon-green">
                        <Beer size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <div className="font-display font-bold text-sm truncate">{v.name}</div>
                          {openState === true && (
                            <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-neon-green/15 border border-neon-green/40 font-mono text-[8px] uppercase tracking-wider text-neon-green">
                              <span className="h-1.5 w-1.5 rounded-full bg-neon-green animate-pulse" /> open
                            </span>
                          )}
                          {openState === false && (
                            <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-neon-crimson/15 border border-neon-crimson/40 font-mono text-[8px] uppercase tracking-wider text-neon-crimson">
                              <Clock size={8} /> {nextOpen ? nextOpen : "închis"}
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground truncate flex items-center gap-1">
                          <MapPin size={9} /> {city?.name ?? "?"}{v.address ? ` · ${v.address}` : ""}
                        </div>
                      </div>
                      {dist != null && (
                        <div className="font-mono text-[10px] uppercase tracking-widest text-neon-purple shrink-0">
                          {dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`}
                        </div>
                      )}
                    </div>
                  );
                })}
                {visible < filtered.length && (
                  <button
                    onClick={() => setVisible(v => v + 60)}
                    className="w-full mt-2 py-3 rounded-xl border border-neon-green/40 text-neon-green font-mono text-[11px] uppercase tracking-widest active:scale-[0.98]"
                  >
                    + arată încă {Math.min(60, filtered.length - visible)} (din {filtered.length - visible})
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

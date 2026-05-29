import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RomaniaMap3D, type FriendPin } from "@/components/app/RomaniaMap3D";
import { useAuth } from "@/lib/auth";
import { UserPlus, Users, MapPin, Clock } from "lucide-react";
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
};

async function loadFriendPins(userId: string): Promise<FriendPin[]> {
  const { data: rows } = await supabase
    .from("friendships")
    .select("requester_id, addressee_id, status")
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
  const friendIds = (rows ?? []).map((r: any) =>
    r.requester_id === userId ? r.addressee_id : r.requester_id,
  );
  if (friendIds.length === 0) return [];

  const { data: checkins } = await supabase
    .from("check_ins")
    .select("user_id, venue_id, lat, lng, expires_at, created_at")
    .in("user_id", friendIds)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });
  if (!checkins || checkins.length === 0) return [];

  const seen = new Set<string>();
  const latest = checkins.filter((c: any) => {
    if (seen.has(c.user_id)) return false;
    seen.add(c.user_id);
    return true;
  });

  const venueIds = Array.from(new Set(latest.map((c: any) => c.venue_id)));
  const [{ data: profiles }, { data: venues }] = await Promise.all([
    supabase.from("profiles").select("id, handle, display_name, avatar_url").in("id", friendIds),
    venueIds.length
      ? supabase.from("venues").select("id, name, lat, lng").in("id", venueIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);
  const profMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
  const venueMap = new Map((venues ?? []).map((v: any) => [v.id, v]));

  const pins: FriendPin[] = [];
  for (const c of latest) {
    const venue = venueMap.get(c.venue_id);
    const lat = Number(c.lat ?? venue?.lat);
    const lng = Number(c.lng ?? venue?.lng);
    if (!isFinite(lat) || !isFinite(lng)) continue;
    const p = profMap.get(c.user_id);
    pins.push({
      user_id: c.user_id,
      handle: p?.handle ?? null,
      display_name: p?.display_name ?? null,
      avatar_url: p?.avatar_url ?? null,
      lat, lng,
      venue_name: venue?.name ?? null,
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
  const [cityId, setCityId] = useState<string | "all">("all");
  const [maxKm, setMaxKm] = useState(0);
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [visible, setVisible] = useState(40);

  const { data: cities = [], isLoading } = useQuery({
    queryKey: ["cities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cities")
        .select("id,slug,name,lat,lng,chaos_level")
        .order("chaos_level", { ascending: false });
      if (error) throw error;
      return data.map(c => ({ ...c, lat: Number(c.lat), lng: Number(c.lng), chaos_level: Number(c.chaos_level) }));
    },
  });

  const { data: venues = [] } = useQuery({
    queryKey: ["map-venues-all"],
    queryFn: async () => {
      // fetch ALL venues, paginating past the 1000 row default
      const all: Venue[] = [];
      let from = 0; const step = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("venues")
          .select("id, name, type, lat, lng, city_id, address, opening_hours")
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

  const { data: friendPins = [] } = useQuery({
    queryKey: ["friend-pins", user?.id],
    queryFn: () => loadFriendPins(user!.id),
    enabled: !!user,
    refetchInterval: 60_000,
  });

  // Realtime: instantly refresh when anyone checks in/out
  const qc = useQueryClient();
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("live-checkins")
      .on("postgres_changes", { event: "*", schema: "public", table: "check_ins" }, () => {
        qc.invalidateQueries({ queryKey: ["friend-pins", user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);

  const cityMap = useMemo(() => new Map(cities.map(c => [c.id, c])), [cities]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = venues.filter(v => {
      if (type !== "all" && v.type !== type) return false;
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
  }, [venues, query, type, cityId, maxKm, geo, cityMap]);

  useEffect(() => { setVisible(40); }, [query, type, cityId, maxKm]);

  const requestGeo = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => alert("Nu am putut citi locația. Verifică permisiunile."),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <header>
        <h1 className="font-display font-black text-2xl tracking-tight">hartă.</h1>
        <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest mt-0.5">
          {venues.length} cluburi · {friendPins.length} prieteni live
        </p>
      </header>

      <VenueFilters
        query={query} setQuery={setQuery}
        type={type} setType={setType}
        cityId={cityId} setCityId={setCityId}
        cities={cities}
        maxKm={maxKm} setMaxKm={setMaxKm}
        hasGeo={!!geo} requestGeo={requestGeo}
        count={filtered.length}
      />

      {isLoading ? (
        <div className="aspect-[5/4] rounded-2xl bg-foreground/5 animate-pulse" />
      ) : (
        <RomaniaMap3D cities={cities} venues={filtered} friends={friendPins} />
      )}

      <AddVenueSheet cities={cities} onAdded={() => qc.invalidateQueries({ queryKey: ["map-venues-all"] })} />


      {/* FRIENDS CTA */}
      <Link
        to="/app/friends"
        className="group block relative overflow-hidden rounded-2xl p-[2px] bg-gradient-to-r from-neon-green via-neon-purple to-neon-crimson active:scale-[0.98] transition"
      >
        <div className="relative rounded-[14px] bg-background/95 p-4 overflow-hidden">
          <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-neon-green/30 blur-3xl animate-pulse" />
          <div className="pointer-events-none absolute -bottom-12 -left-8 h-36 w-36 rounded-full bg-neon-crimson/25 blur-3xl animate-pulse" />
          <div className="relative flex items-center gap-3">
            <div className="relative h-14 w-14 rounded-2xl bg-neon-green/15 border border-neon-green/50 flex items-center justify-center shrink-0 shadow-[0_0_24px_-4px_var(--neon-green)]">
              <UserPlus className="text-neon-green" size={26} strokeWidth={2.6} />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="absolute inset-0 rounded-full bg-neon-green animate-ping opacity-80" />
                <span className="relative h-3 w-3 rounded-full bg-neon-green" />
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display font-black uppercase text-lg leading-none tracking-tight">
                cheamă oxidații la șprițtt
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-neon-green mt-1.5">
                adaugă prieteni → vezi-i pe hartă live
              </div>
            </div>
            <div className="font-display text-neon-green text-2xl group-active:translate-x-1 transition">→</div>
          </div>
          {friendPins.length === 0 && (
            <div className="relative mt-3 pt-3 border-t border-foreground/10">
              <p className="text-xs text-foreground/80 leading-snug">
                <span className="text-neon-crimson font-bold">0 oxidați</span> în haita ta. Nu mai bea singur ca un MDS — adaugă-ți gașca și vezi unde toarnă șpriț chiar acum.
              </p>
            </div>
          )}
        </div>
      </Link>

      {/* Live friends list */}
      {friendPins.length > 0 && (
        <section className="space-y-2">
          <div className="font-mono text-[10px] uppercase tracking-widest text-neon-green flex items-center gap-1.5">
            <Users size={11} /> live acum
          </div>
          {friendPins.map((f) => (
            <Link
              key={f.user_id}
              to="/app/user/$id"
              params={{ id: f.user_id }}
              className="flex items-center gap-3 p-3 rounded-lg bg-foreground/[0.04] border border-neon-green/20"
            >
              <div className="h-10 w-10 rounded-full overflow-hidden bg-gradient-to-br from-neon-crimson to-neon-purple flex items-center justify-center font-display text-sm">
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

      {/* FULL VENUES LIST */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            // locații ({filtered.length})
          </div>
          {geo && (
            <div className="font-mono text-[10px] uppercase tracking-widest text-neon-green">
              sortat după distanță
            </div>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="py-8 text-center font-mono text-xs uppercase tracking-widest text-muted-foreground">
            zero locații. dă reset la filtre.
          </div>
        ) : (
          <div className="space-y-1.5">
            {filtered.slice(0, visible).map(v => {
              const city = cityMap.get(v.city_id);
              const dist = geo && v.lat != null && v.lng != null
                ? distanceKm(geo.lat, geo.lng, v.lat, v.lng) : null;
              return (
                <div key={v.id} className="flex items-center gap-3 p-3 rounded-xl bg-foreground/5 border border-foreground/10">
                  <div className="h-10 w-10 rounded-lg bg-neon-green/10 border border-neon-green/30 flex items-center justify-center font-mono text-[9px] uppercase shrink-0 text-neon-green">
                    {v.type.slice(0, 4)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-bold text-sm truncate">{v.name}</div>
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
          </div>
        )}
      </section>
    </div>
  );
}

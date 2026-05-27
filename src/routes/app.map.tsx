import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RomaniaMap, type FriendPin } from "@/components/app/RomaniaMap";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/map")({
  head: () => ({ meta: [{ title: "Hartă · OXIDAȚII" }] }),
  component: MapPage,
});

async function loadFriendPins(userId: string): Promise<FriendPin[]> {
  // 1. accepted friendships
  const { data: rows } = await supabase
    .from("friendships")
    .select("requester_id, addressee_id, status")
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
  const friendIds = (rows ?? []).map((r: any) =>
    r.requester_id === userId ? r.addressee_id : r.requester_id,
  );
  if (friendIds.length === 0) return [];

  // 2. their live check-ins (expires_at > now())
  const { data: checkins } = await supabase
    .from("check_ins")
    .select("user_id, venue_id, lat, lng, expires_at, created_at")
    .in("user_id", friendIds)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });
  if (!checkins || checkins.length === 0) return [];

  // dedupe — most recent per user
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

function MapPage() {
  const { user, profile } = useAuth();
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

  const { data: friendPins = [] } = useQuery({
    queryKey: ["friend-pins", user?.id],
    queryFn: () => loadFriendPins(user!.id),
    enabled: !!user,
    refetchInterval: 60_000,
  });

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <header className="flex items-end justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-neon-green">// HARTĂ · ROMÂNIA</div>
          <h1 className="font-display font-black text-2xl mt-1">Cine-i în oraș.</h1>
        </div>
        <div className="text-right text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          salut, <span className="text-neon-purple">@{profile?.handle ?? "tu"}</span>
        </div>
      </header>

      {/* Friends CTA */}
      <Link to="/app/friends"
        className="flex items-center justify-between p-3 rounded-lg bg-foreground/[0.06] border border-foreground/10 hover:border-neon-green/40">
        <div>
          <div className="font-display uppercase text-sm">👥 Prieteni live <span className="text-neon-green">({friendPins.length})</span></div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">adaugă băieții → vezi-i pe hartă când ies</div>
        </div>
        <div className="font-mono text-xs text-neon-green">→</div>
      </Link>

      {isLoading ? (
        <div className="aspect-[5/4] rounded-2xl bg-foreground/5 animate-pulse" />
      ) : (
        <RomaniaMap cities={cities} friends={friendPins} />
      )}

      {/* Friends-live list */}
      {friendPins.length > 0 && (
        <section className="space-y-2">
          <div className="font-mono text-[10px] uppercase tracking-widest text-neon-green">// live acum</div>
          {friendPins.map((f) => (
            <div key={f.user_id} className="flex items-center gap-3 p-3 rounded-lg bg-foreground/[0.04] border border-neon-green/20">
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
            </div>
          ))}
        </section>
      )}

      <div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">// orașe</div>
        <div className="grid grid-cols-2 gap-2">
          {cities.map(c => (
            <Link key={c.id} to="/app/city/$slug" params={{ slug: c.slug }}
              className="rounded-xl bg-foreground/5 border border-foreground/10 p-3 active:scale-[0.98] transition">
              <div className="font-display font-bold text-sm">{c.name}</div>
              <div className="font-mono text-[10px] text-muted-foreground mt-0.5">chaos {c.chaos_level.toFixed(1)}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

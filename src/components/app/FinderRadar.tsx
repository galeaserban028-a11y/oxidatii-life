import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Radar, MapPin, Users, Navigation, Flame } from "lucide-react";

export function FinderRadar() {
  const { user, profile } = useAuth();
  const cityId = profile?.city_id;

  const { data: nearby = [] } = useQuery({
    queryKey: ["finder-nearby", cityId, user?.id],
    enabled: !!user && !!cityId,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, handle, display_name, avatar_url, rank")
        .eq("city_id", cityId!)
        .eq("is_public", true)
        .neq("id", user!.id)
        .limit(8);
      return data ?? [];
    },
  });

  const { data: activeFriends = [] } = useQuery({
    queryKey: ["finder-active", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const { data: friendships } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user!.id},addressee_id.eq.${user!.id}`);

      const friendIds = (friendships ?? []).map((r: any) =>
        r.requester_id === user!.id ? r.addressee_id : r.requester_id,
      );
      if (friendIds.length === 0) return [];

      const [{ data: checkins }, { data: lives }] = await Promise.all([
        supabase
          .from("check_ins")
          .select("user_id, venue_id, created_at")
          .in("user_id", friendIds)
          .gt("expires_at", nowIso)
          .order("created_at", { ascending: false }),
        supabase
          .from("live_locations")
          .select("user_id, updated_at")
          .in("user_id", friendIds)
          .gt("expires_at", nowIso),
      ]);

      const activeIds = new Set<string>();
      for (const c of checkins ?? []) activeIds.add((c as any).user_id);
      for (const l of lives ?? []) activeIds.add((l as any).user_id);
      if (activeIds.size === 0) return [];

      const { data: profs } = await supabase
        .from("profiles")
        .select("id, handle, display_name, avatar_url")
        .in("id", Array.from(activeIds))
        .limit(6);
      return profs ?? [];
    },
  });

  const hasAny = nearby.length > 0 || activeFriends.length > 0;

  return (
    <div className="mt-4 px-4">
      <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] overflow-hidden">
        {/* Header with radar animation */}
        <div className="relative p-4 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
            <div className="relative w-40 h-40">
              <div className="absolute inset-0 rounded-full border border-sunset-amber/30" />
              <div className="absolute inset-4 rounded-full border border-sunset-amber/20" />
              <div className="absolute inset-8 rounded-full border border-sunset-amber/10" />
              <div className="absolute inset-0 rounded-full border-2 border-sunset-amber/40 pulse-ring" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-sunset-amber" />
            </div>
          </div>

          <div className="relative flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sunset-orange/20 to-sunset-magenta/20 border border-sunset-orange/30 flex items-center justify-center shrink-0">
              <Radar size={18} className="text-sunset-orange" />
            </div>
            <div>
              <div className="font-display uppercase text-sm leading-tight">Radar OXIDAȚII</div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mt-0.5">
                {activeFriends.length > 0
                  ? `${activeFriends.length} activ acum`
                  : nearby.length > 0
                  ? `${nearby.length} în zonă`
                  : "caută oameni în teren"}
              </div>
            </div>
          </div>
        </div>

        {/* Active friends row */}
        {activeFriends.length > 0 && (
          <div className="px-4 pb-3">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="h-1.5 w-1.5 rounded-full bg-sunset-amber animate-pulse" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-sunset-amber">
                activi acum
              </span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              {activeFriends.map((p: any) => (
                <Link
                  key={p.id}
                  to="/app/user/$id"
                  params={{ id: p.id }}
                  className="flex flex-col items-center gap-1 min-w-[56px]"
                >
                  <div className="h-11 w-11 rounded-full overflow-hidden border-2 border-sunset-amber/50 bg-gradient-to-br from-sunset-orange to-sunset-magenta flex items-center justify-center text-white font-display text-xs shrink-0">
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      (p.handle ?? p.display_name ?? "?")[0]?.toUpperCase()
                    )}
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground truncate max-w-[56px]">
                    @{p.handle ?? p.display_name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Nearby people row */}
        {nearby.length > 0 && (
          <div className="px-4 pb-3">
            <div className="flex items-center gap-1.5 mb-2">
              <MapPin size={10} className="text-sunset-magenta" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-sunset-magenta">
                în orașul tău
              </span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              {nearby.map((p: any) => (
                <Link
                  key={p.id}
                  to="/app/user/$id"
                  params={{ id: p.id }}
                  className="flex flex-col items-center gap-1 min-w-[56px]"
                >
                  <div className="h-11 w-11 rounded-full overflow-hidden border border-foreground/20 bg-gradient-to-br from-sunset-indigo to-sunset-magenta flex items-center justify-center text-white font-display text-xs shrink-0">
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      (p.handle ?? p.display_name ?? "?")[0]?.toUpperCase()
                    )}
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground truncate max-w-[56px]">
                    @{p.handle ?? p.display_name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Empty + action links */}
        {!hasAny && (
          <div className="px-4 pb-4 text-center space-y-2">
            <p className="text-xs text-muted-foreground">
              Niciun oxidat activ în zonă acum.
            </p>
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Fii primul care iese în teren.
            </p>
          </div>
        )}

        {/* Quick links */}
        <div className="grid grid-cols-3 gap-px border-t border-foreground/10">
          <Link
            to="/app/map"
            className="flex items-center justify-center gap-1.5 py-3 text-[10px] font-mono uppercase tracking-widest text-muted-foreground hover:bg-foreground/5 transition"
          >
            <Navigation size={12} className="text-sunset-orange" /> hartă
          </Link>
          <Link
            to="/app/friends"
            className="flex items-center justify-center gap-1.5 py-3 text-[10px] font-mono uppercase tracking-widest text-muted-foreground hover:bg-foreground/5 transition border-x border-foreground/10"
          >
            <Users size={12} className="text-sunset-magenta" /> prieteni
          </Link>
          <Link
            to="/app/squad"
            className="flex items-center justify-center gap-1.5 py-3 text-[10px] font-mono uppercase tracking-widest text-muted-foreground hover:bg-foreground/5 transition"
          >
            <Flame size={12} className="text-sunset-amber" /> squad
          </Link>
        </div>
      </div>
    </div>
  );
}

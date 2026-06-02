import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Flame, MapPin, Users, Plus } from "lucide-react";
import logoLight from "@/assets/logo-oxidatii-light.png";
import { PromoTakeover } from "@/components/app/PromoTakeover";

type FeedItem = {
  id: string;
  kind: "photo" | "proof";
  created_at: string;
  photo_url: string;
  media_type: "image" | "video";
  caption: string | null;
  user_id: string;
  venue_id: string | null;
};

export const Route = createFileRoute("/app/")({
  head: () => ({ meta: [{ title: "Live · OXIDAȚII" }] }),
  component: AppFeed,
});

async function loadFeed() {
  const [{ data: photos }, { data: proofs }] = await Promise.all([
    supabase
      .from("venue_photos")
      .select("id, photo_url, media_type, caption, taken_at, user_id, venue_id")
      .order("taken_at", { ascending: false })
      .limit(30),
    supabase
      .from("sprit_proofs")
      .select("id, photo_url, media_type, created_at, user_id, venue_id, ai_verified")
      .eq("ai_verified", true)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const items: FeedItem[] = [
    ...(photos ?? []).map((p) => ({
      id: `ph-${p.id}`,
      kind: "photo" as const,
      created_at: p.taken_at,
      photo_url: p.photo_url,
      media_type: (p.media_type ?? "image") as "image" | "video",
      caption: p.caption,
      user_id: p.user_id,
      venue_id: p.venue_id,
    })),
    ...(proofs ?? []).map((p) => ({
      id: `sp-${p.id}`,
      kind: "proof" as const,
      created_at: p.created_at,
      photo_url: p.photo_url,
      media_type: (p.media_type ?? "image") as "image" | "video",
      caption: null,
      user_id: p.user_id,
      venue_id: p.venue_id,
    })),
  ].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));

  const userIds = Array.from(new Set(items.map((i) => i.user_id)));
  const venueIds = Array.from(
    new Set(items.map((i) => i.venue_id).filter((v): v is string => !!v)),
  );

  const [{ data: profilesData }, { data: venuesData }] = await Promise.all([
    userIds.length
      ? supabase.from("profiles").select("id, handle, display_name, rank, avatar_url").in("id", userIds)
      : Promise.resolve({ data: [] as any[] }),
    venueIds.length
      ? supabase
          .from("venues")
          .select("id, name, slug, address, city:cities(name, slug)")
          .in("id", venueIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const profilesMap = new Map((profilesData ?? []).map((p: any) => [p.id, p]));
  const venuesMap = new Map((venuesData ?? []).map((v: any) => [v.id, v]));

  return { items, profilesMap, venuesMap };
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - +new Date(iso)) / 1000);
  if (s < 60) return `acum ${s}s`;
  if (s < 3600) return `acum ${Math.floor(s / 60)}m`;
  if (s < 86400) return `acum ${Math.floor(s / 3600)}h`;
  return `acum ${Math.floor(s / 86400)}z`;
}

function AppFeed() {
  const { data, isLoading } = useQuery({
    queryKey: ["app-feed"],
    queryFn: loadFeed,
    refetchInterval: 60_000,
  });

  return (
    <div className="px-4 pt-4 pb-6 space-y-4">
      {/* Compact header */}
      <header className="space-y-2.5">
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest">
          <span className="text-neon-crimson flicker">● LIVE · ROMÂNIA</span>
          <span className="text-muted-foreground">{new Date().toLocaleDateString("ro-RO", { weekday: "long" })}</span>
        </div>
        <div className="flex items-center gap-2.5">
          <img src={logoLight} alt="" aria-hidden width={40} height={40} className="h-10 w-10 object-contain shrink-0" />
          <h1 className="font-display uppercase text-xl leading-[1.05] tracking-tight">
            Ce șprițuri sunt <span className="text-gradient-chaos">diseară</span>
          </h1>
        </div>

        {/* Quick actions row */}
        <div className="grid grid-cols-3 gap-1.5">
          <Link
            to="/app/scan"
            className="flex flex-col items-start gap-1 p-2.5 rounded-xl bg-neon-crimson/10 border border-neon-crimson/30 active:scale-[0.97] transition"
          >
            <Plus size={16} className="text-neon-crimson" strokeWidth={2.6} />
            <span className="font-display font-bold text-[11px] leading-tight">deschide șpriț</span>
          </Link>
          <Link
            to="/app/faze"
            className="flex flex-col items-start gap-1 p-2.5 rounded-xl bg-foreground/[0.05] border border-foreground/10 active:scale-[0.97] transition"
          >
            <span className="text-base leading-none">🎬</span>
            <span className="font-display font-bold text-[11px] leading-tight">faze din teren</span>
          </Link>
          <Link
            to="/app/squad"
            className="flex flex-col items-start gap-1 p-2.5 rounded-xl bg-foreground/[0.05] border border-foreground/10 active:scale-[0.97] transition"
          >
            <Users size={16} className="text-neon-purple" />
            <span className="font-display font-bold text-[11px] leading-tight">haita ta</span>
          </Link>
        </div>
      </header>

      <LiveSpritzStrip />

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-72 rounded-xl bg-foreground/[0.04] animate-pulse" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyFeed />
      ) : (
        <div className="space-y-4">
          {data.items.map((it) => {
            const profile = data.profilesMap.get(it.user_id);
            const venue = it.venue_id ? data.venuesMap.get(it.venue_id) : null;
            return <FeedCard key={it.id} item={it} profile={profile} venue={venue} />;
          })}
        </div>
      )}
    </div>
  );
}

function LiveSpritzStrip() {
  const { data: parties = [] } = useQuery({
    queryKey: ["home-live-spritz"],
    queryFn: async () => {
      const { data } = await supabase
        .from("parties")
        .select("id, host_id, title, location_text, spots_total, starts_at, vibe")
        .gt("expires_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(6);
      return data ?? [];
    },
    refetchInterval: 30_000,
  });

  const ids = parties.map((p: any) => p.id);
  const { data: joins = [] } = useQuery({
    queryKey: ["home-live-spritz-joins", ids.sort().join(",")],
    queryFn: async () => {
      if (!ids.length) return [];
      const { data } = await supabase.from("party_joins").select("party_id,user_id").in("party_id", ids);
      return data ?? [];
    },
    enabled: ids.length > 0,
    refetchInterval: 30_000,
  });

  // hide full parties unless user is already in
  const { user } = useAuth();
  const visibleParties = parties.filter((p: any) => {
    const taken = joins.filter((j: any) => j.party_id === p.id).length;
    const free = p.spots_total - taken;
    const inParty = !!user && joins.some((j: any) => j.party_id === p.id && j.user_id === user.id);
    const isHost = user?.id === p.host_id;
    return free > 0 || inParty || isHost;
  });

  if (visibleParties.length === 0) return null;

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.25em] text-neon-crimson">
          <Flame size={12} /> șprițuri deschise · {visibleParties.length}
        </div>
        <Link to="/app/squad" className="font-mono text-[10px] uppercase tracking-widest text-neon-purple">
          toate →
        </Link>
      </div>

      {(

        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 no-scrollbar pb-1">
          {visibleParties.map((p: any) => {
            const taken = joins.filter((j: any) => j.party_id === p.id).length;
            const free = Math.max(0, p.spots_total - taken);
            return (
              <Link
                key={p.id}
                to="/app/parties"
                className="shrink-0 w-[220px] p-3 rounded-xl border border-foreground/10 bg-foreground/[0.04] hover:border-neon-crimson/40 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-neon-crimson flex items-center gap-1">
                    <Flame size={10} /> șpriț
                  </span>
                  <span className={`font-mono text-[9px] uppercase tracking-widest ${free === 0 ? "text-neon-crimson" : "text-neon-green"}`}>
                    {free === 0 ? "plin" : `${free}/${p.spots_total} libere`}
                  </span>
                </div>
                <div className="font-display font-bold text-sm leading-tight line-clamp-2">{p.title}</div>
                <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                  <span className="flex items-center gap-1 truncate"><MapPin size={9} /> {p.location_text}</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  {p.vibe && <span className="font-mono text-[9px] uppercase tracking-widest text-neon-purple truncate">{p.vibe}</span>}
                  <span className="font-mono text-[9px] uppercase tracking-widest text-neon-green flex items-center gap-1 ml-auto">
                    <Users size={9} /> {taken} vin
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}



function FeedCard({ item, profile, venue }: { item: FeedItem; profile: any; venue: any }) {
  const handle = profile?.handle ?? profile?.display_name ?? "anonim";
  return (
    <article className="bg-foreground/[0.04] border border-foreground/10 rounded-xl overflow-hidden">
      {/* header */}
      <div className="flex items-center gap-3 p-3">
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-neon-crimson to-neon-purple flex items-center justify-center font-display text-sm shrink-0 overflow-hidden">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            handle[0]?.toUpperCase() ?? "?"
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-sm truncate">@{handle}</div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground truncate">
            {venue ? (
              <Link to="/app/venue/$id" params={{ id: venue.id }} className="hover:text-neon-purple">
                {venue.name} · {venue.city?.name ?? ""}
              </Link>
            ) : (
              "locație necunoscută"
            )}
          </div>
        </div>
        <div className="font-mono text-[10px] uppercase text-muted-foreground shrink-0">
          {timeAgo(item.created_at)}
        </div>
      </div>

      {/* media */}
      <div className="relative aspect-[4/5] bg-background">
        {item.media_type === "video" ? (
          <video
            src={item.photo_url}
            className="absolute inset-0 h-full w-full object-cover"
            controls
            playsInline
            preload="metadata"
          />
        ) : (
          <img src={item.photo_url} alt={item.caption ?? ""} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
        )}
        {item.media_type === "video" && (
          <div className="absolute top-2 right-2 px-2 py-1 rounded-sm bg-black/70 backdrop-blur-sm font-mono text-[9px] uppercase tracking-widest text-white">▶ clip</div>
        )}
        {item.kind === "proof" && (
          <div className="absolute top-2 left-2 px-2 py-1 rounded-sm bg-neon-green/20 border border-neon-green/40 backdrop-blur-sm">
            <span className="font-mono text-[9px] uppercase tracking-widest text-neon-green">● șpriț verificat AI</span>
          </div>
        )}
      </div>

      {item.caption && (
        <div className="p-3 text-sm text-foreground/90">{item.caption}</div>
      )}
    </article>
  );
}

function EmptyFeed() {
  return (
    <div className="rounded-2xl border border-dashed border-foreground/15 p-8 text-center space-y-3">
      <div className="text-5xl">🌃</div>
      <div className="font-display uppercase text-xl leading-tight">
        Șprițurile încă sunt active.
      </div>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
        Nimeni n-a postat încă. Nu inventăm conținut. Când oamenii reali încep să posteze, apar aici — nimic altceva.
      </p>
      <Link
        to="/app/scan"
        className="inline-flex mt-3 font-display uppercase text-xs tracking-[0.18em] px-5 py-3 rounded-md text-white"
        style={{ background: "var(--gradient-chaos)" }}
      >
        Fii primul → scanează un șpriț
      </Link>
    </div>
  );
}

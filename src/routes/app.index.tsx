import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Flame, MapPin, Users, Plus } from "lucide-react";
import logoLight from "@/assets/logo-oxidatii-light.png";

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
    <div className="px-4 pt-5 pb-6 space-y-4">
      <header className="space-y-2">
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest">
          <span className="text-neon-crimson flicker">● LIVE · ROMÂNIA</span>
          <span className="text-muted-foreground">{new Date().toLocaleDateString("ro-RO", { weekday: "long" })}</span>
        </div>
        <div className="flex items-end gap-3">
          <img src={logoLight} alt="" aria-hidden width={56} height={56} className="h-14 w-14 object-contain shrink-0 -mb-1" />
          <h1 className="font-display uppercase text-2xl leading-none tracking-tight">
            Ce șprițuri sunt în <span className="text-gradient-chaos">această seară</span>
          </h1>
        </div>
        <Link
          to="/app/faze"
          className="mt-2 flex items-center justify-between p-3 rounded-lg bg-foreground/[0.06] border border-foreground/10 hover:border-neon-crimson/40"
        >
          <div>
            <div className="font-display uppercase text-sm">🎬 Cele mai tari faze</div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">postează ce-ai prins în club / la șpriț</div>
          </div>
          <div className="font-mono text-xs text-neon-crimson">→</div>
        </Link>
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
        .select("id, title, location_text, spots_total, starts_at, vibe")
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
      const { data } = await supabase.from("party_joins").select("party_id").in("party_id", ids);
      return data ?? [];
    },
    enabled: ids.length > 0,
    refetchInterval: 30_000,
  });

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.25em] text-neon-crimson">
          <Flame size={12} /> șprițuri deschise · {parties.length}
        </div>
        <Link to="/app/squad" className="font-mono text-[10px] uppercase tracking-widest text-neon-purple">
          toate →
        </Link>
      </div>

      {parties.length === 0 ? (
        <Link
          to="/app/parties"
          className="flex items-center justify-between p-3 rounded-xl border border-dashed border-neon-crimson/40 bg-neon-crimson/[0.04]"
        >
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-neon-crimson/15 flex items-center justify-center">
              <Plus size={14} className="text-neon-crimson" strokeWidth={3} />
            </div>
            <div>
              <div className="font-display font-bold text-sm">deschide un șpriț</div>
              <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">cheamă haita la tine</div>
            </div>
          </div>
          <span className="font-mono text-[10px] text-neon-crimson">→</span>
        </Link>
      ) : (
        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 no-scrollbar pb-1">
          {parties.map((p: any) => {
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

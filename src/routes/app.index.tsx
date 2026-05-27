import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import logoLight from "@/assets/logo-oxidatii-light.png";

type FeedItem = {
  id: string;
  kind: "photo" | "proof";
  created_at: string;
  photo_url: string;
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
      .select("id, photo_url, caption, taken_at, user_id, venue_id")
      .order("taken_at", { ascending: false })
      .limit(30),
    supabase
      .from("sprit_proofs")
      .select("id, photo_url, created_at, user_id, venue_id, ai_verified")
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
      caption: p.caption,
      user_id: p.user_id,
      venue_id: p.venue_id,
    })),
    ...(proofs ?? []).map((p) => ({
      id: `sp-${p.id}`,
      kind: "proof" as const,
      created_at: p.created_at,
      photo_url: p.photo_url,
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
          <Link to="/app/top" className="text-muted-foreground">vezi top →</Link>
        </div>
        <div className="flex items-end gap-3">
          <img src={logoLight} alt="" aria-hidden width={56} height={56} className="h-14 w-14 object-contain shrink-0 -mb-1" />
          <h1 className="font-display uppercase text-2xl leading-none tracking-tight">
            Ce s-a întâmplat <span className="text-gradient-chaos">azi-noapte</span>
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

      {/* photo */}
      <div className="relative aspect-[4/5] bg-background">
        <img src={item.photo_url} alt={item.caption ?? ""} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
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
        Țara încă doarme.
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

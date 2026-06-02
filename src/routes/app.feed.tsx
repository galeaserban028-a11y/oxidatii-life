import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Lock, Sparkles, MapPin, Flame, Rocket } from "lucide-react";

export const Route = createFileRoute("/app/feed")({
  head: () => ({ meta: [{ title: "Feed privat · OXIDAȚII" }] }),
  component: FeedPage,
});

type Item = {
  kind: "photo" | "proof" | "party";
  id: string;
  created_at: string;
  user_id: string;
  photo_url?: string | null;
  caption?: string | null;
  venue_id?: string | null;
  title?: string | null;
  location_text?: string | null;
  vibe?: string | null;
};

async function loadFeed(userId: string) {
  // Cine te urmărește pe tine (cu accept) - aceștia pot vedea fazele tale.
  // Tu vezi: ale tale + ale celor pe care îi urmărești (accepted).
  const { data: following } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId)
    .eq("status", "accepted");

  const allowed = Array.from(new Set([userId, ...((following ?? []).map((f) => f.following_id))]));

  const [photosRes, proofsRes, partiesRes] = await Promise.all([
    supabase
      .from("venue_photos")
      .select("id, photo_url, caption, taken_at, user_id, venue_id")
      .in("user_id", allowed)
      .order("taken_at", { ascending: false })
      .limit(40),
    supabase
      .from("sprit_proofs")
      .select("id, photo_url, created_at, user_id, venue_id, ai_verified")
      .in("user_id", allowed)
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("parties")
      .select("id, host_id, title, location_text, vibe, starts_at, created_at, expires_at")
      .in("host_id", allowed)
      .gt("expires_at", new Date().toISOString())
      .order("starts_at", { ascending: false })
      .limit(20),
  ]);

  const items: Item[] = [
    ...((photosRes.data ?? []).map((p): Item => ({
      kind: "photo",
      id: p.id,
      created_at: p.taken_at,
      user_id: p.user_id,
      photo_url: p.photo_url,
      caption: p.caption,
      venue_id: p.venue_id,
    }))),
    ...((proofsRes.data ?? []).map((p): Item => ({
      kind: "proof",
      id: p.id,
      created_at: p.created_at,
      user_id: p.user_id,
      photo_url: p.photo_url,
      venue_id: p.venue_id,
    }))),
    ...((partiesRes.data ?? []).map((p): Item => ({
      kind: "party",
      id: p.id,
      created_at: p.created_at,
      user_id: p.host_id,
      title: p.title,
      location_text: p.location_text,
      vibe: p.vibe,
    }))),
  ].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));

  const userIds = Array.from(new Set(items.map((i) => i.user_id)));
  const venueIds = Array.from(
    new Set(items.map((i) => i.venue_id).filter(Boolean) as string[]),
  );
  const [{ data: profs }, { data: venues }] = await Promise.all([
    userIds.length
      ? supabase.from("profiles").select("id, handle, display_name, avatar_url").in("id", userIds)
      : Promise.resolve({ data: [] as any[] }),
    venueIds.length
      ? supabase.from("venues").select("id, name, slug").in("id", venueIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);
  const profMap = new Map((profs ?? []).map((p: any) => [p.id, p]));
  const venueMap = new Map((venues ?? []).map((v: any) => [v.id, v]));
  return { items, profMap, venueMap, followingCount: (following ?? []).length };
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - +new Date(iso)) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}z`;
}

function FeedPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["app-private-feed", user?.id],
    enabled: !!user,
    queryFn: () => loadFeed(user!.id),
    refetchInterval: 60_000,
  });

  if (!user) {
    return (
      <div className="px-4 pt-6 text-center text-sm text-muted-foreground">
        Fă-ți cont ca să vezi feed-ul privat.
      </div>
    );
  }

  return (
    <div className="px-4 pt-5 pb-24 space-y-4">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <Lock size={11} className="text-neon-crimson" />
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-neon-crimson">
            // FEED PRIVAT
          </span>
        </div>
        <h1 className="font-display uppercase text-2xl leading-none tracking-tight">
          Doar tu <span className="text-gradient-chaos">& trupa ta.</span>
        </h1>
        <p className="text-xs text-muted-foreground">
          Cele mai tari momente și recomandări de la oamenii pe care îi urmărești cu accept.
          Doar voi vedeți astea.
        </p>
      </header>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 rounded-2xl bg-foreground/[0.04] animate-pulse" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-foreground/15 p-8 text-center space-y-3">
          <div className="text-4xl">🌌</div>
          <div className="font-display uppercase">Feed gol.</div>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            {data?.followingCount === 0
              ? "Nu urmărești pe nimeni încă. Adaugă oameni ca să vezi ce fac în teren."
              : "Trupa ta nu a postat nimic recent. Mai dă un refresh în câteva ore."}
          </p>
          <Link
            to="/app/friends"
            className="inline-block font-mono text-[10px] uppercase tracking-widest px-4 py-2 rounded-md border border-foreground/20 hover:border-neon-crimson mt-1"
          >
            găsește oameni →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {data.items.map((it) => {
            const p = data.profMap.get(it.user_id);
            const v = it.venue_id ? data.venueMap.get(it.venue_id) : null;
            const handle = p?.handle ?? p?.display_name ?? "anonim";
            return (
              <article
                key={`${it.kind}-${it.id}`}
                className="rounded-2xl overflow-hidden bg-foreground/[0.03] border border-foreground/10"
              >
                <header className="flex items-center gap-2.5 p-3">
                  <div className="h-9 w-9 rounded-full bg-foreground/10 overflow-hidden flex items-center justify-center shrink-0">
                    {p?.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="font-display text-xs text-muted-foreground">
                        {handle.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      to="/app/user/$id"
                      params={{ id: it.user_id }}
                      className="font-display text-sm truncate block"
                    >
                      @{handle}
                    </Link>
                    <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground truncate">
                      {it.kind === "photo" && "fază nouă"}
                      {it.kind === "proof" && "șpriț verificat"}
                      {it.kind === "party" && "deschide șpriț"}
                      {" · "}
                      {timeAgo(it.created_at)}
                    </div>
                  </div>
                  {it.kind === "proof" && (
                    <span className="text-[9px] font-mono uppercase px-2 py-1 rounded-md bg-neon-green/15 text-neon-green border border-neon-green/30">
                      <Sparkles size={9} className="inline mr-0.5" /> verificat
                    </span>
                  )}
                  {it.kind === "party" && (
                    <span className="text-[9px] font-mono uppercase px-2 py-1 rounded-md bg-neon-crimson/15 text-neon-crimson border border-neon-crimson/30">
                      <Flame size={9} className="inline mr-0.5" /> live
                    </span>
                  )}
                </header>

                {it.photo_url && (
                  v ? (
                    <Link to="/app/venue/$id" params={{ id: v.id }}>
                      <img
                        src={it.photo_url}
                        alt={it.caption ?? ""}
                        className="w-full aspect-[4/5] object-cover bg-foreground/5"
                        loading="lazy"
                      />
                    </Link>
                  ) : (
                    <img
                      src={it.photo_url}
                      alt={it.caption ?? ""}
                      className="w-full aspect-[4/5] object-cover bg-foreground/5"
                      loading="lazy"
                    />
                  )
                )}

                {it.kind === "party" && (
                  <div className="px-4 py-4 space-y-1 bg-gradient-to-br from-neon-crimson/5 to-neon-purple/5">
                    <div className="font-display uppercase text-lg leading-tight">{it.title}</div>
                    {it.vibe && (
                      <div className="font-mono text-[10px] uppercase tracking-widest text-neon-purple">
                        vibe: {it.vibe}
                      </div>
                    )}
                  </div>
                )}

                <div className="px-3 py-2.5 space-y-1">
                  {it.caption && <p className="text-sm">{it.caption}</p>}
                  {(v || it.location_text) && (
                    <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                      <MapPin size={10} />
                      {v ? v.name : it.location_text}
                    </div>
                  )}
                  {it.kind === "party" && (
                    <Link
                      to="/app/squad"
                      className="inline-block mt-1.5 font-display uppercase text-[10px] tracking-widest px-3 py-1.5 rounded-md text-white"
                      style={{ background: "var(--gradient-chaos)" }}
                    >
                      intră în șpriț →
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

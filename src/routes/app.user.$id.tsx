import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, MapPin } from "lucide-react";

export const Route = createFileRoute("/app/user/$id")({
  head: () => ({ meta: [{ title: "Profil · OXIDAȚII" }] }),
  component: UserPage,
});

function UserPage() {
  const { id } = Route.useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["user-detail", id],
    queryFn: async () => {
      const [profRes, photosRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, handle, display_name, avatar_url, bio, rank, aura, lifetime_sprits, current_streak, longest_streak, city:cities(name, slug)")
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("venue_photos")
          .select("id, photo_url, caption, taken_at, venue:venues(id, name, city:cities(name))")
          .eq("user_id", id)
          .order("taken_at", { ascending: false })
          .limit(60),
      ]);
      return { profile: profRes.data, photos: photosRes.data ?? [] };
    },
  });

  const profile = data?.profile as any;
  const photos = data?.photos ?? [];
  const handle = profile?.handle ?? profile?.display_name ?? "anonim";

  // Venue tally
  const venueCounts = new Map<string, { name: string; city?: string; count: number }>();
  for (const p of photos as any[]) {
    if (!p.venue) continue;
    const v = venueCounts.get(p.venue.id) ?? { name: p.venue.name, city: p.venue.city?.name, count: 0 };
    v.count++;
    venueCounts.set(p.venue.id, v);
  }
  const topVenues = Array.from(venueCounts.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);

  return (
    <div className="px-5 pt-5 pb-10 max-w-xl mx-auto space-y-5">
      <Link to="/app/top" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <ArrowLeft size={14} /> înapoi la top
      </Link>

      {isLoading || !profile ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          {isLoading ? "Se încarcă..." : "Profil indisponibil."}
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-full overflow-hidden bg-gradient-to-br from-sunset-orange to-sunset-magenta flex items-center justify-center text-white font-display font-bold text-3xl shrink-0">
                {profile.avatar_url
                  ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                  : handle[0]?.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display font-bold text-2xl truncate">@{handle}</div>
                {profile.city?.name && (
                  <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <MapPin size={11} /> {profile.city.name}
                  </div>
                )}
                {profile.bio && (
                  <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">{profile.bio}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-5">
              <Stat label="șprițuri" value={photos.length} highlight />
              <Stat label="streak" value={profile.current_streak ?? 0} />
              <Stat label="record" value={profile.longest_streak ?? 0} />
            </div>
          </div>

          {/* Top venues */}
          {topVenues.length > 0 && (
            <section className="space-y-2">
              <h2 className="font-display font-semibold text-sm uppercase tracking-[0.18em] text-muted-foreground">
                Locurile preferate
              </h2>
              <div className="space-y-1.5">
                {topVenues.map(([vid, v], i) => (
                  <Link
                    key={vid}
                    to="/app/venue/$id"
                    params={{ id: vid }}
                    className="flex items-center justify-between p-3 rounded-2xl bg-card border border-border active:scale-[0.99] transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="font-display font-bold text-muted-foreground w-5 text-center text-sm">{i + 1}</div>
                      <div className="min-w-0">
                        <div className="font-display font-semibold text-sm truncate">{v.name}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{v.city ?? "—"}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-display font-bold">{v.count}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* History grid */}
          <section className="space-y-2">
            <h2 className="font-display font-semibold text-sm uppercase tracking-[0.18em] text-muted-foreground">
              Istoric șprițuri
            </h2>
            {photos.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
                Niciun șpriț încă.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {(photos as any[]).map((p) => (
                  <div key={p.id} className="relative aspect-square overflow-hidden rounded-lg bg-card border border-border">
                    <img src={p.photo_url} alt={p.caption ?? ""} loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover" />
                    {p.venue?.name && (
                      <div className="absolute bottom-0 inset-x-0 p-1.5 bg-gradient-to-t from-black/85 to-transparent">
                        <div className="text-[9px] uppercase tracking-wider text-white truncate font-medium">
                          {p.venue.name}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number | string; highlight?: boolean }) {
  return (
    <div className="rounded-xl bg-secondary border border-border p-3 text-center">
      <div className={`font-display font-bold text-2xl leading-none ${highlight ? "text-gradient-sunset" : "text-foreground"}`}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

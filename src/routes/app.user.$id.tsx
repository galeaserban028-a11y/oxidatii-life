import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { openOrCreateDM } from "@/lib/chat";
import { ArrowLeft, MapPin, MessageCircle, Loader2, Lock, UserPlus, UserCheck, Clock, ShieldOff, MoreVertical } from "lucide-react";
import { useFollowStats, useFollowStatus, useFollowMutations } from "@/lib/follows";
import { useIsBlocked, useBlockMutations } from "@/lib/blocks";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { ReputationCard } from "@/components/app/ReputationCard";
import { PremiumBadge } from "@/components/app/PremiumBadge";
import { getTheme } from "@/lib/premium-themes";

export const Route = createFileRoute("/app/user/$id")({
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("profiles")
      .select("id,username,display_name,bio,avatar_url")
      .eq("id", params.id)
      .maybeSingle();
    return { profile: data };
  },
  head: ({ params, loaderData }) => {
    const p: any = loaderData?.profile;
    const handle = p?.username ? `@${p.username}` : p?.display_name ?? "Profil";
    const display = p?.display_name ?? p?.username ?? "Profil";
    const title = `${display} (${handle}) — OXIDAȚII`;
    const desc = p?.bio
      ? String(p.bio).slice(0, 155)
      : `Profilul ${handle} pe OXIDAȚII — check-in-uri, rating-uri și momente din nightlife.`;
    const url = `https://oxidatii.lovable.app/app/user/${params.id}`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { property: "og:type", content: "profile" },
        ...(p?.avatar_url ? [
          { property: "og:image", content: p.avatar_url },
          { name: "twitter:image", content: p.avatar_url },
        ] : []),
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: UserPage,
});

function UserPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [opening, setOpening] = useState(false);
  const isMe = user?.id === id;

  const openDM = async () => {
    if (!user || isMe) return;
    setOpening(true);
    try {
      const cid = await openOrCreateDM(user.id, id);
      nav({ to: "/app/chat/$id", params: { id: cid } });
    } catch (e: any) { alert(e.message ?? "Eroare"); setOpening(false); }
  };

  const { data, isLoading } = useQuery({
    queryKey: ["user-detail", id],
    queryFn: async () => {
      const profRes = await supabase
        .from("profiles")
        .select("id, handle, display_name, avatar_url, bio, rank, aura, lifetime_sprits, current_streak, longest_streak, is_public, premium_tier, premium_until, profile_theme_id, music_clip_url, profile_bg_url, boost_until, city:cities(name, slug)")
        .eq("id", id)
        .maybeSingle();
      return { profile: profRes.data };
    },
  });

  const profile = data?.profile as any;
  const handle = profile?.handle ?? profile?.display_name ?? "anonim";
  const isPublic = profile?.is_public ?? true;

  const { data: stats } = useFollowStats(id);
  const { data: followStatus = "none" } = useFollowStatus(user?.id, id);
  const { follow, unfollow } = useFollowMutations(user?.id, id);
  const { data: blockState } = useIsBlocked(user?.id, id);
  const { block, unblock } = useBlockMutations(user?.id, id);
  const isBlocking = !!blockState?.blocking;
  const isBlockedBy = !!blockState?.blockedBy;
  const [confirmBlock, setConfirmBlock] = useState<"block" | "unblock" | null>(null);

  const canViewContent =
    isMe || ((isPublic || followStatus === "accepted") && !isBlocking && !isBlockedBy);

  const { data: photos = [] } = useQuery({
    queryKey: ["user-photos", id, canViewContent],
    enabled: !!profile && canViewContent,
    queryFn: async () => {
      const { data } = await supabase
        .from("venue_photos")
        .select("id, photo_url, caption, taken_at, venue:venues(id, name, city:cities(name))")
        .eq("user_id", id)
        .order("taken_at", { ascending: false })
        .limit(60);
      return data ?? [];
    },
  });

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
        <ArrowLeft size={14} /> înapoi
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
                <div className="font-display font-bold text-2xl truncate flex items-center gap-1.5 flex-wrap">
                  @{handle}
                  {!isPublic && <Lock size={14} className="text-neon-crimson shrink-0" />}
                  <PremiumBadge tier={profile.premium_tier} size="sm" asLink={false} />
                </div>
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

            <div className="grid grid-cols-4 gap-2 mt-5">
              <Stat label="șprițuri" value={profile.lifetime_sprits ?? 0} highlight />
              <Stat label="followers" value={stats?.followers ?? 0} />
              <Stat label="urmărește" value={stats?.following ?? 0} />
              <Stat label="streak" value={profile.current_streak ?? 0} />
            </div>

            {!isMe && user && (
              <div className="mt-4 flex gap-2">
                {isBlocking ? (
                  <button
                    onClick={() => setConfirmBlock("unblock")}
                    className="flex-1 py-3 rounded-xl bg-secondary border border-border text-foreground font-display font-bold uppercase text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition"
                  >
                    <ShieldOff size={16} /> deblochează
                  </button>
                ) : isBlockedBy ? (
                  <div className="flex-1 py-3 rounded-xl bg-secondary border border-border text-muted-foreground font-display font-bold uppercase text-sm flex items-center justify-center gap-2">
                    <ShieldOff size={16} /> indisponibil
                  </div>
                ) : followStatus === "accepted" ? (
                  <button
                    onClick={() => unfollow.mutate()}
                    disabled={unfollow.isPending}
                    className="flex-1 py-3 rounded-xl bg-secondary border border-border text-foreground font-display font-bold uppercase text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-40"
                  >
                    <UserCheck size={16} /> urmărești
                  </button>
                ) : followStatus === "pending" ? (
                  <button
                    onClick={() => unfollow.mutate()}
                    disabled={unfollow.isPending}
                    className="flex-1 py-3 rounded-xl bg-secondary border border-border text-muted-foreground font-display font-bold uppercase text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-40"
                  >
                    <Clock size={16} /> cerere trimisă
                  </button>
                ) : (
                  <button
                    onClick={() => follow.mutate()}
                    disabled={follow.isPending}
                    className="flex-1 py-3 rounded-xl bg-neon-crimson text-white font-display font-black uppercase text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-40"
                  >
                    <UserPlus size={16} strokeWidth={2.6} />
                    {isPublic ? "urmărește" : "trimite cerere"}
                  </button>
                )}
                {!isBlocking && !isBlockedBy && (
                  <button
                    onClick={openDM}
                    disabled={opening}
                    className="px-4 py-3 rounded-xl bg-neon-green text-background font-display font-black flex items-center justify-center active:scale-[0.98] transition disabled:opacity-40"
                    aria-label="Mesaj"
                  >
                    {opening ? <Loader2 className="animate-spin" size={18} /> : <MessageCircle size={18} strokeWidth={2.6} />}
                  </button>
                )}
                {!isBlocking && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="px-3 py-3 rounded-xl bg-secondary border border-border text-foreground flex items-center justify-center active:scale-[0.98] transition"
                        aria-label="Mai multe"
                      >
                        <MoreVertical size={18} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => setConfirmBlock("block")}
                        className="text-neon-crimson focus:text-neon-crimson"
                      >
                        <ShieldOff size={14} className="mr-2" /> Blochează @{handle}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            )}
          </div>

          {/* Reputație + rating */}
          <ReputationCard
            userId={profile.id}
            sprits={profile.lifetime_sprits ?? 0}
            streak={profile.current_streak ?? 0}
            longestStreak={profile.longest_streak ?? 0}
            followers={stats?.followers ?? 0}
            following={stats?.following ?? 0}
            aura={profile.aura ?? 0}
            hasAvatar={!!profile.avatar_url}
            hasBio={!!profile.bio}
            createdAt={profile.created_at}
            allowRating={!isMe && !isBlocking && !isBlockedBy}
          />


          {/* Private / blocked gate */}
          {!canViewContent ? (
            <div className="rounded-3xl border border-dashed border-foreground/20 bg-card p-10 text-center space-y-3">
              <div className="mx-auto h-14 w-14 rounded-full bg-neon-crimson/15 flex items-center justify-center">
                {isBlocking || isBlockedBy ? (
                  <ShieldOff className="text-neon-crimson" size={26} />
                ) : (
                  <Lock className="text-neon-crimson" size={26} />
                )}
              </div>
              <div className="font-display uppercase text-lg">
                {isBlocking
                  ? "Ai blocat acest cont"
                  : isBlockedBy
                  ? "Conținut indisponibil"
                  : "Cont privat"}
              </div>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                {isBlocking
                  ? "Deblochează-l ca să-i poți vedea profilul."
                  : isBlockedBy
                  ? "Nu poți vedea ce postează acest utilizator."
                  : followStatus === "pending"
                  ? "Cererea ta a fost trimisă. Aștepți accept."
                  : "Urmărește-l ca să-i vezi șprițurile."}
              </p>
            </div>
          ) : (
            <>
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
                  Cele mai tari momente
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
        </>
      )}

      <AlertDialog open={!!confirmBlock} onOpenChange={(o) => !o && setConfirmBlock(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmBlock === "block" ? `Blochează @${handle}?` : `Deblochează @${handle}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmBlock === "block"
                ? "Nu îți va mai putea trimite cereri de urmărire sau mesaje și nu îți va vedea profilul. Orice urmărire existentă va fi ștearsă."
                : "Va putea din nou să-ți trimită cereri și mesaje și să-ți vadă profilul."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmBlock === "block") {
                  block.mutate(undefined, {
                    onSuccess: () => toast.success(`@${handle} a fost blocat`),
                    onError: (e: any) => toast.error(e.message ?? "Eroare"),
                  });
                } else if (confirmBlock === "unblock") {
                  unblock.mutate(undefined, {
                    onSuccess: () => toast.success(`@${handle} a fost deblocat`),
                    onError: (e: any) => toast.error(e.message ?? "Eroare"),
                  });
                }
                setConfirmBlock(null);
              }}
              className={
                confirmBlock === "block"
                  ? "bg-neon-crimson text-white hover:bg-neon-crimson/90"
                  : ""
              }
            >
              {confirmBlock === "block" ? "Blochează" : "Deblochează"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number | string; highlight?: boolean }) {
  return (
    <div className="rounded-xl bg-secondary border border-border p-2.5 text-center">
      <div className={`font-display font-bold text-xl leading-none ${highlight ? "text-gradient-sunset" : "text-foreground"}`}>
        {value}
      </div>
      <div className="text-[9px] uppercase tracking-widest text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

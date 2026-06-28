import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { openOrCreateDM } from "@/lib/chat";
import {
  ArrowLeft,
  MapPin,
  MessageCircle,
  Loader2,
  Lock,
  UserPlus,
  UserCheck,
  Clock,
  ShieldOff,
  MoreVertical,
} from "lucide-react";
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
import { LastCallButton } from "@/components/app/LastCallButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { ReputationCard } from "@/components/app/ReputationCard";
import { PremiumBadge } from "@/components/app/PremiumBadge";
import { ReportDialog } from "@/components/app/ReportDialog";
import { getTheme } from "@/lib/premium-themes";
import { ThemeAtmosphere } from "@/components/app/ThemeAtmosphere";
import { AvatarAura } from "@/components/app/AvatarAura";
import { SignatureReveal } from "@/components/app/SignatureReveal";
import { AvatarFrame } from "@/components/app/AvatarFrame";
import { TipCreatorButton, CreatorEarningsBadge } from "@/components/app/TipCreatorDialog";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VIDEO_URL_RE = /\.(mp4|webm|mov|m4v)(\?.*)?$/i;

function isVideoUrl(url?: string | null) {
  return !!url && VIDEO_URL_RE.test(url);
}

export const Route = createFileRoute("/app/user/$id")({
  loader: async ({ params }) => {
    const isUuid = UUID_RE.test(params.id);
    const q = supabase.from("profiles").select("id,handle,display_name,bio,avatar_url");
    const { data } = isUuid
      ? await q.eq("id", params.id).maybeSingle()
      : await q.eq("handle", params.id.toLowerCase()).maybeSingle();
    return { profile: data };
  },
  head: ({ params, loaderData }) => {
    const p: any = loaderData?.profile;
    const handle = p?.username ? `@${p.username}` : (p?.display_name ?? "Profil");
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
        ...(p?.avatar_url
          ? [
              { property: "og:image", content: p.avatar_url },
              { name: "twitter:image", content: p.avatar_url },
            ]
          : []),
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: UserPage,
});

function UserPage() {
  const { id: slug } = Route.useParams();
  const isUuid = UUID_RE.test(slug);
  const { user } = useAuth();
  const nav = useNavigate();
  const [opening, setOpening] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["user-detail", slug],
    queryFn: async () => {
      const sel =
        "id, handle, display_name, avatar_url, bio, rank, aura, lifetime_sprits, current_streak, longest_streak, is_public, active_frame_id, profile_theme_id, theme_intensity, music_clip_url, profile_bg_url, city:cities(name, slug)";
      const q = supabase.from("profiles").select(sel);
      const res = isUuid
        ? await q.eq("id", slug).maybeSingle()
        : await q.eq("handle", slug.toLowerCase()).maybeSingle();
      if (res.data) return { profile: res.data, minimal: false };
      // RLS hides private profiles entirely; fetch minimal card so the
      // viewer can still see the handle/avatar and send a follow request.
      if (isUuid) {
        const { data: card } = await supabase.rpc("get_profile_card", { _id: slug });
        const row = Array.isArray(card) ? card[0] : card;
        if (row) return { profile: row, minimal: true };
      }
      return { profile: null, minimal: false };
    },
  });

  const profile = data?.profile as any;
  const id = profile?.id ?? (isUuid ? slug : "");
  const isMe = !!user && !!id && user.id === id;

  const { data: badge } = useQuery({
    queryKey: ["user-premium-badge", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase.rpc("get_user_premium_badge", { _user_id: id });
      const row = Array.isArray(data) ? (data[0] as any) : null;
      return row ?? null;
    },
  });

  // Track profile visit (debounced server-side to 1/hour)
  useEffect(() => {
    if (!user || !id || isMe) return;
    supabase.rpc("record_profile_visit", { _profile_id: id }).then(() => {});
  }, [user?.id, id, isMe]);

  const handle = profile?.handle ?? profile?.display_name ?? "anonim";
  const isPublic = profile?.is_public ?? true;

  const openDM = async () => {
    if (!user || isMe || !id) return;
    setOpening(true);
    try {
      const cid = await openOrCreateDM(user.id, id);
      nav({ to: "/app/chat/$id", params: { id: cid } });
    } catch (e: any) {
      alert(e.message ?? "Eroare");
      setOpening(false);
    }
  };

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
        .select(
          "id, photo_url, media_type, caption, taken_at, venue:venues(id, name, city:cities(name))",
        )
        .eq("user_id", id)
        .order("taken_at", { ascending: false })
        .limit(60);
      return data ?? [];
    },
  });

  const { data: reposts = [] } = useQuery({
    queryKey: ["user-reposts", id, canViewContent],
    enabled: !!profile && canViewContent,
    queryFn: async () => {
      const { data: rep } = await supabase
        .from("photo_reposts")
        .select("photo_id, created_at")
        .eq("user_id", id)
        .order("created_at", { ascending: false })
        .limit(40);
      const ids = (rep ?? []).map((r) => r.photo_id);
      if (!ids.length) return [];
      const { data: pics } = await supabase
        .from("venue_photos")
        .select(
          "id, photo_url, media_type, caption, user_id, venue:venues(id, name, city:cities(name))",
        )
        .in("id", ids);
      const map = new Map((pics ?? []).map((p: any) => [p.id, p]));
      return (rep ?? [])
        .map((r) => ({ repostedAt: r.created_at, photo: map.get(r.photo_id) }))
        .filter((x) => x.photo);
    },
  });

  // Venue tally
  const venueCounts = new Map<string, { name: string; city?: string; count: number }>();
  for (const p of photos as any[]) {
    if (!p.venue) continue;
    const v = venueCounts.get(p.venue.id) ?? {
      name: p.venue.name,
      city: p.venue.city?.name,
      count: 0,
    };
    v.count++;
    venueCounts.set(p.venue.id, v);
  }
  const topVenues = Array.from(venueCounts.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);

  const pageTheme = profile ? getTheme(profile.profile_theme_id) : null;

  return (
    <div className="relative min-h-screen">
      {pageTheme && (
        <ThemeAtmosphere theme={pageTheme} intensity={(profile as any)?.theme_intensity} />
      )}
      {pageTheme && profile?.handle && (
        <SignatureReveal
          theme={pageTheme}
          handle={profile.handle}
          storageKey={`u:${profile.handle}`}
        />
      )}
      <div className="relative z-10 px-5 pt-5 pb-10 max-w-xl mx-auto space-y-5">
        <Link
          to="/app/top"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          <ArrowLeft size={14} /> înapoi
        </Link>

        {isLoading || !profile ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            {isLoading ? "Se încarcă..." : "Profil indisponibil."}
          </div>
        ) : (
          <>
            {/* Header */}
            {(() => {
              const theme = getTheme(profile.profile_theme_id);
              const isPremium = !!badge?.has_active_premium;
              const bgUrl: string | null = isPremium ? (profile.profile_bg_url ?? null) : null;
              const activeFrameId = profile.active_frame_id ?? null;

              const isVideo = bgUrl ? /\.(mp4|webm|mov)$/i.test(bgUrl) : false;
              return (
                <div
                  className="relative rounded-3xl border p-5 shadow-[var(--shadow-card)] overflow-hidden"
                  style={
                    theme ? { background: theme.cardBg, borderColor: theme.cardBorder } : undefined
                  }
                >
                  {bgUrl && (
                    <div className="absolute inset-0 -z-0 opacity-50 pointer-events-none">
                      {isVideo ? (
                        <video
                          src={bgUrl}
                          autoPlay
                          loop
                          muted
                          playsInline
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img src={bgUrl} alt="" className="w-full h-full object-cover" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background/80" />
                    </div>
                  )}
                  <div className="relative z-10">
                    <div className="flex items-center gap-4">
                      {theme ? (
                        <AvatarAura theme={theme} size={80}>
                          <AvatarFrame
                            frameId={activeFrameId}
                            className="h-full w-full"
                            innerClassName="bg-gradient-to-br from-sunset-orange to-sunset-magenta flex items-center justify-center text-white font-display font-bold text-3xl"
                          >
                            {profile.avatar_url ? (
                              <img
                                src={profile.avatar_url}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              handle[0]?.toUpperCase()
                            )}
                          </AvatarFrame>
                        </AvatarAura>
                      ) : (
                        <AvatarFrame
                          frameId={activeFrameId}
                          size={80}
                          innerClassName="bg-gradient-to-br from-sunset-orange to-sunset-magenta flex items-center justify-center text-white font-display font-bold text-3xl"
                        >
                          {profile.avatar_url ? (
                            <img
                              src={profile.avatar_url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            handle[0]?.toUpperCase()
                          )}
                        </AvatarFrame>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-display font-bold text-2xl truncate flex items-center gap-1.5 flex-wrap">
                          @{handle}
                          {!isPublic && <Lock size={14} className="text-neon-crimson shrink-0" />}
                          <PremiumBadge
                            tier={badge?.premium_tier ?? null}
                            size="sm"
                            asLink={false}
                          />
                        </div>
                        {profile.city?.name && (
                          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <MapPin size={11} /> {profile.city.name}
                          </div>
                        )}
                        {profile.bio && (
                          <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">
                            {profile.bio}
                          </p>
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
                            {opening ? (
                              <Loader2 className="animate-spin" size={18} />
                            ) : (
                              <MessageCircle size={18} strokeWidth={2.6} />
                            )}
                          </button>
                        )}
                        {!isBlocking && !isBlockedBy && (
                          <LastCallButton
                            targetId={profile.id}
                            targetName={profile.display_name ?? profile.handle}
                          />
                        )}
                        {!isBlocking && !isBlockedBy && (
                          <TipCreatorButton
                            recipientId={profile.id}
                            recipientName={profile.display_name ?? profile.handle}
                          />
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
                              <ReportDialog
                                targetType="user"
                                targetId={profile.id}
                                variant="menu-item"
                                label={`Raportează @${handle}`}
                              />
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
                    {isPremium && profile.music_clip_url && (
                      <div className="mt-4 pt-4 border-t border-foreground/10">
                        <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1.5">
                          🎵 music clip
                        </div>
                        <audio src={profile.music_clip_url} controls className="w-full h-9" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

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
                            <div className="font-display font-bold text-muted-foreground w-5 text-center text-sm">
                              {i + 1}
                            </div>
                            <div className="min-w-0">
                              <div className="font-display font-semibold text-sm truncate">
                                {v.name}
                              </div>
                              <div className="text-[11px] text-muted-foreground truncate">
                                {v.city ?? "—"}
                              </div>
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
                      {(photos as any[]).map((p) => {
                        const isVideo = p.media_type === "video" || isVideoUrl(p.photo_url);
                        return (
                          <div
                            key={p.id}
                            className="relative aspect-square overflow-hidden rounded-lg bg-card border border-border"
                          >
                            {isVideo ? (
                              <>
                                <video
                                  src={`${p.photo_url}#t=0.5`}
                                  muted
                                  playsInline
                                  preload="metadata"
                                  onLoadedMetadata={(e) => {
                                    try {
                                      e.currentTarget.currentTime = 0.5;
                                    } catch {}
                                  }}
                                  className="absolute inset-0 h-full w-full object-cover"
                                />
                                <div className="absolute inset-0 grid place-items-center bg-black/10">
                                  <span className="grid size-8 place-items-center rounded-full bg-black/55 border border-white/25 text-white shadow-lg">
                                    <svg
                                      viewBox="0 0 24 24"
                                      className="ml-0.5 size-3.5 fill-current"
                                    >
                                      <path d="M8 5v14l11-7z" />
                                    </svg>
                                  </span>
                                </div>
                              </>
                            ) : (
                              <img
                                src={p.photo_url}
                                alt={p.caption ?? ""}
                                loading="lazy"
                                className="absolute inset-0 h-full w-full object-cover"
                              />
                            )}
                            {p.venue?.name && (
                              <div className="absolute bottom-0 inset-x-0 p-1.5 bg-gradient-to-t from-black/85 to-transparent">
                                <div className="text-[9px] uppercase tracking-wider text-white truncate font-medium">
                                  {p.venue.name}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                {/* Reposts (TikTok style) */}
                {reposts.length > 0 && (
                  <section className="space-y-2">
                    <h2 className="font-display font-semibold text-sm uppercase tracking-[0.18em] text-muted-foreground inline-flex items-center gap-2">
                      <svg
                        viewBox="0 0 24 24"
                        className="size-4 fill-none stroke-emerald-400"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M4 7h13l-3-3" />
                        <path d="M20 17H7l3 3" />
                      </svg>
                      Repostate
                      <span className="text-foreground/60 font-mono text-[10px]">
                        ({reposts.length})
                      </span>
                    </h2>
                    <div className="grid grid-cols-3 gap-1.5">
                      {reposts.map((r: any) => {
                        const isVideo =
                          r.photo.media_type === "video" || isVideoUrl(r.photo.photo_url);
                        return (
                          <div
                            key={r.photo.id}
                            className="relative aspect-square overflow-hidden rounded-lg bg-card border border-border"
                          >
                            {isVideo ? (
                              <>
                                <video
                                  src={`${r.photo.photo_url}#t=0.5`}
                                  muted
                                  playsInline
                                  preload="metadata"
                                  onLoadedMetadata={(e) => {
                                    try {
                                      e.currentTarget.currentTime = 0.5;
                                    } catch {}
                                  }}
                                  className="absolute inset-0 h-full w-full object-cover"
                                />
                                <div className="absolute inset-0 grid place-items-center bg-black/10">
                                  <span className="grid size-8 place-items-center rounded-full bg-black/55 border border-white/25 text-white shadow-lg">
                                    <svg
                                      viewBox="0 0 24 24"
                                      className="ml-0.5 size-3.5 fill-current"
                                    >
                                      <path d="M8 5v14l11-7z" />
                                    </svg>
                                  </span>
                                </div>
                              </>
                            ) : (
                              <img
                                src={r.photo.photo_url}
                                alt={r.photo.caption ?? ""}
                                loading="lazy"
                                className="absolute inset-0 h-full w-full object-cover"
                              />
                            )}
                            <div className="absolute top-1 left-1 size-5 rounded-full bg-emerald-400/90 text-black flex items-center justify-center">
                              <svg
                                viewBox="0 0 24 24"
                                className="size-3 fill-none stroke-black"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M4 7h13l-3-3" />
                                <path d="M20 17H7l3 3" />
                              </svg>
                            </div>
                            {r.photo.venue?.name && (
                              <div className="absolute bottom-0 inset-x-0 p-1.5 bg-gradient-to-t from-black/85 to-transparent">
                                <div className="text-[9px] uppercase tracking-wider text-white truncate font-medium">
                                  {r.photo.venue.name}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}
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
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number | string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl bg-secondary border border-border p-2.5 text-center">
      <div
        className={`font-display font-bold text-xl leading-none ${highlight ? "text-gradient-sunset" : "text-foreground"}`}
      >
        {value}
      </div>
      <div className="text-[9px] uppercase tracking-widest text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

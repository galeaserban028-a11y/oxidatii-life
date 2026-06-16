import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  generateAITitle,
  nightWindow,
  previousNightDate,
  type NightStats,
} from "@/lib/night-wrap.server";

type WrapResult =
  | { wrap: any; created: boolean }
  | { wrap: null; reason: string };

// Dedupe concurrent generations per (user, night) so a double-mount or
// retried request reuses one DB+AI run instead of racing.
const WRAP_INFLIGHT = new Map<string, Promise<WrapResult>>();

export const getOrCreateNightWrap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const data = (input ?? {}) as { nightDate?: unknown };
    const nightDate =
      typeof data.nightDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(data.nightDate)
        ? data.nightDate
        : previousNightDate();
    return { nightDate };
  })
  .handler(async ({ data, context }): Promise<WrapResult> => {
    const { supabase, userId } = context;
    const { nightDate } = data;
    const dedupeKey = `${userId}:${nightDate}`;
    const existingInflight = WRAP_INFLIGHT.get(dedupeKey);
    if (existingInflight) return existingInflight;

    const work = (async (): Promise<WrapResult> => {

    // 1. existing wrap?
    const { data: existing } = await supabase
      .from("night_wraps")
      .select("*")
      .eq("user_id", userId)
      .eq("night_date", nightDate)
      .maybeSingle();
    if (existing) return { wrap: existing, created: false };

    // 2. gather activity in night window
    const { from, to } = nightWindow(nightDate);

    const [checkInsRes, photosRes, partiesRes] = await Promise.all([
      supabase
        .from("check_ins")
        .select("id, venue_id, created_at")
        .eq("user_id", userId)
        .gte("created_at", from)
        .lt("created_at", to),
      supabase
        .from("sprit_proofs")
        .select("id, photo_url, venue_id, created_at")
        .eq("user_id", userId)
        .gte("created_at", from)
        .lt("created_at", to)
        .order("created_at", { ascending: false }),
      supabase
        .from("party_joins")
        .select("id, party_id, created_at")
        .eq("user_id", userId)
        .gte("created_at", from)
        .lt("created_at", to),
    ]);

    const checkIns = checkInsRes.data ?? [];
    const photos = photosRes.data ?? [];
    const parties = partiesRes.data ?? [];

    if (checkIns.length === 0 && photos.length === 0 && parties.length === 0) {
      return { wrap: null, reason: "no_activity" };
    }

    // likes received on these photos
    const photoIds = photos.map((p: any) => p.id);
    const { data: likesData } = photoIds.length
      ? await supabase.from("photo_likes").select("photo_id").in("photo_id", photoIds)
      : { data: [] as any[] };
    const likesReceived = likesData?.length ?? 0;

    // ratings received in window
    const { data: ratingsData } = await supabase
      .from("user_ratings")
      .select("id")
      .eq("rated_id", userId)
      .gte("created_at", from)
      .lt("created_at", to);
    const ratingsReceived = ratingsData?.length ?? 0;

    // top venue + peak hour
    const venueCounts = new Map<string, number>();
    const hourCounts = new Map<number, number>();
    for (const c of checkIns) {
      if (c.venue_id) venueCounts.set(c.venue_id, (venueCounts.get(c.venue_id) ?? 0) + 1);
      const h = new Date(c.created_at).getUTCHours();
      hourCounts.set(h, (hourCounts.get(h) ?? 0) + 1);
    }
    for (const p of photos) {
      if (p.venue_id) venueCounts.set(p.venue_id, (venueCounts.get(p.venue_id) ?? 0) + 1);
      const h = new Date(p.created_at).getUTCHours();
      hourCounts.set(h, (hourCounts.get(h) ?? 0) + 1);
    }
    let topVenueId: string | null = null;
    let topMax = 0;
    for (const [vid, n] of venueCounts) if (n > topMax) { topMax = n; topVenueId = vid; }
    let peakHour: number | null = null;
    let peakMax = 0;
    for (const [h, n] of hourCounts) if (n > peakMax) { peakMax = n; peakHour = h; }
    // shift back to Bucharest hour
    if (peakHour !== null) peakHour = (peakHour + 2) % 24;

    let topVenueName: string | null = null;
    if (topVenueId) {
      const { data: v } = await supabase
        .from("venues")
        .select("name")
        .eq("id", topVenueId)
        .maybeSingle();
      topVenueName = v?.name ?? null;
    }

    // friends present: distinct users with check-ins/photos at same venue in window who are friends
    let friendsPresent = 0;
    let crewIds: string[] = [];
    if (topVenueId) {
      const [{ data: friendCheckIns }] = await Promise.all([
        supabase
          .from("check_ins")
          .select("user_id")
          .eq("venue_id", topVenueId)
          .gte("created_at", from)
          .lt("created_at", to)
          .neq("user_id", userId),
      ]);
      const candidateIds = Array.from(new Set((friendCheckIns ?? []).map((c: any) => c.user_id)));
      if (candidateIds.length) {
        const { data: friendships } = await supabase
          .from("friendships")
          .select("requester_id, addressee_id, status")
          .eq("status", "accepted")
          .or(
            `and(requester_id.eq.${userId},addressee_id.in.(${candidateIds.join(",")})),and(addressee_id.eq.${userId},requester_id.in.(${candidateIds.join(",")}))`,
          );
        const friendSet = new Set<string>();
        for (const f of friendships ?? []) {
          friendSet.add(f.requester_id === userId ? f.addressee_id : f.requester_id);
        }
        crewIds = candidateIds.filter((id) => friendSet.has(id)).slice(0, 6);
        friendsPresent = crewIds.length;
      }
    }

    const stats: NightStats = {
      check_ins: checkIns.length,
      photos: photos.length,
      likes_received: likesReceived,
      friends_present: friendsPresent,
      parties_joined: parties.length,
      ratings_received: ratingsReceived,
      top_venue_name: topVenueName,
      peak_hour: peakHour,
      venues_visited: venueCounts.size,
    };

    const ai = await generateAITitle(stats);

    const photoUrls = photos.slice(0, 4).map((p: any) => p.photo_url).filter(Boolean);

    const { data: inserted, error: insertErr } = await supabase
      .from("night_wraps")
      .insert({
        user_id: userId,
        night_date: nightDate,
        title: ai.title,
        tagline: ai.tagline,
        vibe_emoji: ai.vibe_emoji,
        stats,
        photo_urls: photoUrls,
        crew_user_ids: crewIds,
        top_venue_id: topVenueId,
        peak_hour: peakHour,
      })
      .select("*")
      .single();

    if (insertErr) {
      console.error("[night-wrap] insert failed", insertErr);
      return { wrap: null, reason: "insert_failed" };
    }
    return { wrap: inserted, created: true };
  });

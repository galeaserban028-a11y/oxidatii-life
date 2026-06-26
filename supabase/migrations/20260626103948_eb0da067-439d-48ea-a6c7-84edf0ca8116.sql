
-- 1) daily_intents: restrict cross-user reads to owner only
DROP POLICY IF EXISTS "Authenticated users can read daily_intents" ON public.daily_intents;
DROP POLICY IF EXISTS "daily_intents_authenticated_read" ON public.daily_intents;
DROP POLICY IF EXISTS "daily_intents_owner_read" ON public.daily_intents;

CREATE POLICY "daily_intents_owner_read"
ON public.daily_intents
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 2) Aggregation RPCs so the app keeps working without exposing rows
CREATE OR REPLACE FUNCTION public.count_intents_for_date(_date date)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int FROM public.daily_intents WHERE intent_date = _date;
$$;
REVOKE EXECUTE ON FUNCTION public.count_intents_for_date(date) FROM public;
GRANT EXECUTE ON FUNCTION public.count_intents_for_date(date) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_hot_venues_for_date(_date date, _limit int DEFAULT 5)
RETURNS TABLE(venue_id uuid, name text, count integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT di.venue_id, v.name, COUNT(*)::int AS count
  FROM public.daily_intents di
  JOIN public.venues v ON v.id = di.venue_id
  WHERE di.intent_date = _date AND di.venue_id IS NOT NULL
  GROUP BY di.venue_id, v.name
  ORDER BY COUNT(*) DESC
  LIMIT GREATEST(1, LEAST(_limit, 50));
$$;
REVOKE EXECUTE ON FUNCTION public.get_hot_venues_for_date(date, int) FROM public;
GRANT EXECUTE ON FUNCTION public.get_hot_venues_for_date(date, int) TO authenticated;

-- 3) profiles: drop cross-user readability of personal/operational columns
REVOKE SELECT ON public.profiles FROM authenticated;
REVOKE SELECT ON public.profiles FROM anon;

GRANT SELECT (
  id, handle, display_name, city_id, avatar_url, bio, rank, aura,
  lifetime_sprits, created_at, updated_at,
  is_public, current_streak, longest_streak, last_streak_week,
  active_frame_id, profile_theme_id, music_clip_url, profile_bg_url,
  theme_intensity
) ON public.profiles TO authenticated;

GRANT SELECT (
  id, handle, display_name, city_id, avatar_url, bio, rank, aura,
  lifetime_sprits, is_public, current_streak, longest_streak,
  active_frame_id, profile_theme_id, music_clip_url, profile_bg_url,
  theme_intensity
) ON public.profiles TO anon;

-- 4) Extend the owner-only account-state RPC with the now-private fields
DROP FUNCTION IF EXISTS public.get_my_account_state();

CREATE OR REPLACE FUNCTION public.get_my_account_state()
RETURNS TABLE(
  coin_balance integer,
  last_boost_at timestamp with time zone,
  boost_until timestamp with time zone,
  premium_tier text,
  premium_until timestamp with time zone,
  birthdate date,
  map_ghost boolean,
  map_visibility text,
  map_precision text,
  location_consent boolean,
  onboarded boolean,
  tutorial_seen boolean,
  map_auto_ghost_hours integer,
  map_hide_from_live_list boolean,
  map_require_reciprocity boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.coin_balance,
         p.last_boost_at,
         p.boost_until,
         p.premium_tier::text,
         p.premium_until,
         p.birthdate,
         p.map_ghost,
         p.map_visibility::text,
         p.map_precision::text,
         p.location_consent,
         p.onboarded,
         p.tutorial_seen,
         p.map_auto_ghost_hours,
         p.map_hide_from_live_list,
         p.map_require_reciprocity
  FROM public.profiles p
  WHERE p.id = auth.uid();
$$;
REVOKE EXECUTE ON FUNCTION public.get_my_account_state() FROM public;
GRANT EXECUTE ON FUNCTION public.get_my_account_state() TO authenticated;

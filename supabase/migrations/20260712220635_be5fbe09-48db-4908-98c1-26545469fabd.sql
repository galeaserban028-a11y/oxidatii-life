-- 1. Set immutable search_path on pgmq wrapper functions (fix function_search_path_mutable).
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;

-- 2. Restrict sensitive profile columns from direct client SELECT.
-- Self-reads flow through the SECURITY DEFINER RPC public.get_my_account_state();
-- server-side privileged code uses supabaseAdmin (service_role), which bypasses column ACLs.
REVOKE SELECT (
  birthdate,
  coin_balance,
  premium_tier,
  premium_until,
  referral_code,
  referred_by,
  map_visibility,
  map_precision,
  map_ghost,
  map_auto_ghost_hours,
  map_hide_from_live_list,
  map_require_reciprocity,
  location_consent,
  last_boost_at,
  boost_until
) ON public.profiles FROM anon, authenticated;

-- Explicitly grant SELECT on the remaining (safe / display) columns so PostgREST can still return them.
GRANT SELECT (
  id,
  handle,
  display_name,
  avatar_url,
  bio,
  rank,
  aura,
  lifetime_sprits,
  current_streak,
  longest_streak,
  is_public,
  active_frame_id,
  profile_theme_id,
  music_clip_url,
  profile_bg_url,
  theme_intensity,
  city_id,
  last_streak_week,
  onboarded,
  tutorial_seen,
  created_at,
  updated_at
) ON public.profiles TO authenticated;

GRANT SELECT (
  id,
  handle,
  display_name,
  avatar_url,
  bio,
  rank,
  aura,
  lifetime_sprits,
  current_streak,
  longest_streak,
  is_public,
  active_frame_id,
  profile_theme_id,
  music_clip_url,
  profile_bg_url,
  theme_intensity,
  city_id
) ON public.profiles TO anon;
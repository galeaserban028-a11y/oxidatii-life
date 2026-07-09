
-- Restrict cross-user visibility of sensitive profile columns.
-- Users read their own sensitive fields via the get_my_account_state() SECURITY DEFINER RPC.
-- Admin/service_role clients (service role, admin RPCs) bypass column privileges as needed.

REVOKE SELECT (
  birthdate,
  coin_balance,
  referral_code,
  referred_by,
  premium_tier,
  premium_until,
  location_consent,
  map_ghost,
  map_visibility,
  map_precision,
  map_auto_ghost_hours,
  map_hide_from_live_list,
  map_require_reciprocity,
  boost_until,
  last_boost_at,
  last_streak_week,
  tutorial_seen
) ON public.profiles FROM authenticated, anon;

-- Ensure safe presentation columns remain readable by authenticated users.
GRANT SELECT (
  id, handle, display_name, avatar_url, bio, city_id, rank,
  aura, lifetime_sprits, current_streak, longest_streak,
  is_public, onboarded, active_frame_id, profile_theme_id,
  music_clip_url, profile_bg_url, theme_intensity,
  created_at, updated_at
) ON public.profiles TO authenticated;

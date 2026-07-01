-- Defense in depth: cement column-level revokes on sensitive profile columns.
REVOKE SELECT (
  birthdate,
  coin_balance,
  premium_tier,
  premium_until,
  referral_code,
  referred_by,
  map_precision,
  map_visibility,
  map_ghost,
  map_auto_ghost_hours,
  map_require_reciprocity,
  map_hide_from_live_list,
  location_consent
) ON public.profiles FROM authenticated, anon;

-- Reaffirm safe public columns for peer discovery
GRANT SELECT (
  id, handle, display_name, city_id, avatar_url, bio, rank, aura,
  lifetime_sprits, onboarded, created_at, updated_at, is_public,
  current_streak, longest_streak, active_frame_id, profile_theme_id,
  music_clip_url, profile_bg_url, boost_until, theme_intensity
) ON public.profiles TO authenticated;
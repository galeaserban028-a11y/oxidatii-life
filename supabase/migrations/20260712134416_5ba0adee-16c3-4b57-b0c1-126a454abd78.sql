-- Restrict cross-user exposure of sensitive profile columns.
-- Owners still read these via SECURITY DEFINER RPCs (get_my_account_state,
-- get_my_referral_stats, has_active_premium, can_view_live_location, etc.).
REVOKE SELECT (
  birthdate,
  coin_balance,
  premium_tier,
  premium_until,
  referral_code,
  referred_by,
  boost_until,
  last_boost_at,
  map_ghost,
  map_visibility,
  map_precision,
  map_auto_ghost_hours,
  map_hide_from_live_list,
  map_require_reciprocity,
  location_consent,
  onboarded,
  tutorial_seen,
  last_streak_week
) ON public.profiles FROM anon, authenticated;

-- service_role keeps full access implicitly via GRANT ALL, but ensure it explicitly.
GRANT SELECT ON public.profiles TO service_role;
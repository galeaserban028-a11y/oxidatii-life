
-- Restore broad SELECT (safe columns only via column privileges below)
DROP POLICY IF EXISTS profiles_self_read ON public.profiles;

CREATE POLICY profiles_authenticated_read ON public.profiles
  FOR SELECT TO authenticated
  USING (
    is_public = true
    OR auth.uid() = id
    OR public.can_view_profile(auth.uid(), id)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'moderator'::app_role)
  );

-- Column-level lockdown: sensitive fields not readable by client roles.
-- Owner reads own sensitive data via get_my_account_state() RPC (SECURITY DEFINER).
REVOKE SELECT (
  birthdate, coin_balance, premium_tier, premium_until,
  referral_code, referred_by, location_consent,
  map_visibility, map_ghost, map_precision,
  map_require_reciprocity, map_hide_from_live_list,
  map_auto_ghost_hours, tutorial_seen,
  boost_until, last_boost_at, last_streak_week
) ON public.profiles FROM authenticated, anon;

-- Service role keeps full access (bypasses column privileges via ALL).
GRANT ALL ON public.profiles TO service_role;


-- 1. business_accounts: revoke SELECT on sensitive columns from authenticated/anon
REVOKE SELECT (
  contact_email,
  contact_phone,
  wallet_balance_cents,
  monthly_credits_cents,
  monthly_price_cents,
  tier_renews_at,
  tier_started_at,
  pro_until,
  suspended_until
) ON public.business_accounts FROM authenticated, anon;

-- 2. campaign_events: revoke SELECT on user_id from authenticated
REVOKE SELECT (user_id) ON public.campaign_events FROM authenticated, anon;

-- 3. profile_visits: explicit restrictive SELECT policy (admin-only)
DROP POLICY IF EXISTS "profile_visits_admin_only_read" ON public.profile_visits;
CREATE POLICY "profile_visits_admin_only_read"
  ON public.profile_visits
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

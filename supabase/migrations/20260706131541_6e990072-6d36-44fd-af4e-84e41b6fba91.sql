-- 1) Revoke column-level SELECT on Stripe session id columns from authenticated
REVOKE SELECT (sender_stripe_session_id, reveal_stripe_session_id)
  ON public.last_call_pings FROM authenticated;

-- Ensure other columns remain readable (grant explicit column set to authenticated)
GRANT SELECT (
  id, sender_id, target_id, created_at, expires_at, revealed_at
) ON public.last_call_pings TO authenticated;

-- service_role keeps full access (already granted via GRANT ALL earlier); reassert just in case
GRANT ALL ON public.last_call_pings TO service_role;

-- 2) Allow crew members to SELECT night_wraps where they are tagged
CREATE POLICY "Crew members can view tagged night wraps"
  ON public.night_wraps
  FOR SELECT
  TO authenticated
  USING (auth.uid() = ANY (crew_user_ids));

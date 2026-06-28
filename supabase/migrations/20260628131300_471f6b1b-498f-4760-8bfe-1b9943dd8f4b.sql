
-- 1) business_accounts: replace blanket true read policy; keep non-sensitive cols accessible to authenticated, exclude suspended unless owner/admin.
DROP POLICY IF EXISTS business_accounts_auth_read ON public.business_accounts;
CREATE POLICY business_accounts_auth_read ON public.business_accounts
  FOR SELECT TO authenticated
  USING (
    owner_user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR (suspended_until IS NULL OR suspended_until <= now())
  );
-- Reaffirm column-level revokes so sensitive cols never reach non-owners.
REVOKE SELECT (contact_email, contact_phone, wallet_balance_cents, monthly_credits_cents,
               pro_until, tier_started_at, tier_renews_at, monthly_price_cents, suspended_until)
  ON public.business_accounts FROM authenticated, anon;

-- 2) last_call_pings: prevent stripe session ID leakage by revoking those columns from authenticated.
REVOKE SELECT (sender_stripe_session_id, reveal_stripe_session_id)
  ON public.last_call_pings FROM authenticated, anon;
-- Add target read policy so recipients can see pings exist (sender_id stays masked via get_my_last_calls RPC).
DROP POLICY IF EXISTS "Target can view received pings" ON public.last_call_pings;
CREATE POLICY "Target can view received pings" ON public.last_call_pings
  FOR SELECT TO authenticated
  USING (auth.uid() = target_id);

-- 3) profiles: restrict anon SELECT to safe surface columns only.
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (id, handle, display_name, avatar_url, bio, rank, aura,
              lifetime_sprits, is_public, created_at, active_frame_id,
              profile_theme_id, profile_bg_url, music_clip_url,
              current_streak, longest_streak, referral_code)
  ON public.profiles TO anon;

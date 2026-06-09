
-- 1. business_accounts: revoke column SELECT on wallet/credit columns from authenticated
REVOKE SELECT (wallet_balance_cents, monthly_credits_cents) ON public.business_accounts FROM authenticated;
-- owner/admin still reach these via SECURITY DEFINER get_business_wallet()

-- 2. coin_boosts: explicit INSERT/DELETE policies (used directly by client in shop)
CREATE POLICY "coin_boosts_self_insert" ON public.coin_boosts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "coin_boosts_self_delete" ON public.coin_boosts
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 3. user_frames: explicit INSERT (used directly by client in shop buyFrame)
CREATE POLICY "user_frames_self_insert" ON public.user_frames
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_frames_self_delete" ON public.user_frames
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 4. follows: scope accepted reads to involved parties OR public target profiles
DROP POLICY IF EXISTS follows_auth_accepted_read ON public.follows;

CREATE POLICY "follows_accepted_read_scoped" ON public.follows
  FOR SELECT TO authenticated
  USING (
    status = 'accepted'
    AND (
      auth.uid() = follower_id
      OR auth.uid() = following_id
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = follows.following_id AND p.is_public = true
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = follows.follower_id AND p.is_public = true
      )
    )
  );

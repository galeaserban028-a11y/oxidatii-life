
-- 1. check_ins: restrict to self + friends (mirror live_locations pattern)
DROP POLICY IF EXISTS check_ins_auth_live_read ON public.check_ins;
CREATE POLICY check_ins_friends_read ON public.check_ins
  FOR SELECT TO authenticated
  USING (
    expires_at > now()
    AND (auth.uid() = user_id OR public.are_friends(auth.uid(), user_id))
  );

-- 2. coin_boosts: restrict to authenticated users only
DROP POLICY IF EXISTS coin_boosts_public_read_active ON public.coin_boosts;
REVOKE SELECT ON public.coin_boosts FROM anon;
CREATE POLICY coin_boosts_auth_read_active ON public.coin_boosts
  FOR SELECT TO authenticated
  USING (expires_at > now());

-- 3. user_ratings: restrict reads to authenticated users
DROP POLICY IF EXISTS user_ratings_public_read ON public.user_ratings;
REVOKE SELECT ON public.user_ratings FROM anon;
CREATE POLICY user_ratings_auth_read ON public.user_ratings
  FOR SELECT TO authenticated
  USING (true);

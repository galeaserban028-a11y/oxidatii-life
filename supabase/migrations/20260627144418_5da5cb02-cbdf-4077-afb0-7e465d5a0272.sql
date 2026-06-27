
-- 1. business_accounts: restrict authenticated SELECT to safe columns via column grants
REVOKE SELECT ON public.business_accounts FROM authenticated;
REVOKE SELECT ON public.business_accounts FROM anon;
GRANT SELECT (
  id, owner_user_id, brand_name, slug, logo_url, verified, tier,
  type, city_id, is_exclusive_slot, exclusive_city_id, venue_id,
  created_at, updated_at
) ON public.business_accounts TO authenticated;

-- Owner full-read RPC (so owners can see their own sensitive fields)
CREATE OR REPLACE FUNCTION public.get_my_business_accounts()
RETURNS SETOF public.business_accounts
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.business_accounts WHERE owner_user_id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.get_my_business_accounts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_business_accounts() TO authenticated;

-- 2. campaign_likes: drop public read, restrict to authenticated
DROP POLICY IF EXISTS "Anyone can view campaign likes" ON public.campaign_likes;
CREATE POLICY "Authenticated can view campaign likes"
  ON public.campaign_likes
  FOR SELECT
  TO authenticated
  USING (true);
REVOKE SELECT ON public.campaign_likes FROM anon;

-- 3. last_call_pings: revoke client read of stripe session ids
REVOKE SELECT ON public.last_call_pings FROM authenticated;
REVOKE SELECT ON public.last_call_pings FROM anon;
GRANT SELECT (
  id, sender_id, target_id, created_at, expires_at, revealed_at
) ON public.last_call_pings TO authenticated;

-- 4. profiles: restrict anon SELECT to safe display columns only
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (
  id, handle, display_name, avatar_url, bio, aura, rank,
  lifetime_sprits, current_streak, longest_streak,
  active_frame_id, profile_theme_id, music_clip_url, profile_bg_url,
  theme_intensity, is_public, created_at
) ON public.profiles TO anon;


ALTER VIEW public.business_accounts_public SET (security_invoker = true);

CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = true) AS
SELECT
  p.id,
  p.handle,
  p.display_name,
  p.avatar_url,
  p.bio,
  p.rank,
  p.aura,
  p.city_id,
  p.is_public,
  p.active_frame_id,
  p.lifetime_sprits,
  p.current_streak,
  p.longest_streak,
  p.profile_theme_id,
  p.profile_bg_url,
  p.music_clip_url,
  p.onboarded,
  p.created_at
FROM public.profiles p;

GRANT SELECT ON public.profiles_public TO authenticated;
GRANT SELECT ON public.profiles_public TO anon;

DROP POLICY IF EXISTS profiles_authenticated_read ON public.profiles;

CREATE POLICY profiles_self_read ON public.profiles
  FOR SELECT TO authenticated
  USING (
    auth.uid() = id
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'moderator'::app_role)
    OR public.are_friends(auth.uid(), id)
    OR EXISTS (
      SELECT 1 FROM public.follows f
      WHERE f.follower_id = auth.uid()
        AND f.following_id = profiles.id
        AND f.status = 'accepted'
    )
  );

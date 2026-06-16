
-- Fix 1: Stories — restrict reads to owner, public profiles, or accepted followers
DROP POLICY IF EXISTS "Anyone authenticated can view active stories" ON public.stories;

CREATE POLICY "Visible stories respect profile privacy"
  ON public.stories FOR SELECT
  TO authenticated
  USING (
    expires_at > now()
    AND (
      user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = stories.user_id AND p.is_public = true)
      OR EXISTS (
        SELECT 1 FROM public.follows f
        WHERE f.follower_id = auth.uid()
          AND f.following_id = stories.user_id
          AND f.status = 'accepted'
      )
    )
  );

-- Fix 2: campaign_events — do not expose user_id column to business owners
REVOKE SELECT (user_id) ON public.campaign_events FROM authenticated;


DROP POLICY IF EXISTS user_ratings_auth_read ON public.user_ratings;

CREATE POLICY "user_ratings_read_scoped" ON public.user_ratings
  FOR SELECT TO authenticated
  USING (
    auth.uid() = rater_id
    OR auth.uid() = rated_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = user_ratings.rated_id AND p.is_public = true
    )
  );

DROP POLICY IF EXISTS "Users like as themselves" ON public.campaign_likes;
DROP POLICY IF EXISTS "Users unlike their own" ON public.campaign_likes;

CREATE POLICY "Users like as themselves"
  ON public.campaign_likes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users unlike their own"
  ON public.campaign_likes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
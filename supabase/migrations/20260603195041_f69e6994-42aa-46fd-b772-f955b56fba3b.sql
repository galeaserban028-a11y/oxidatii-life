
CREATE POLICY "conv_creator_read" ON public.conversations
  FOR SELECT TO authenticated
  USING (auth.uid() = created_by);

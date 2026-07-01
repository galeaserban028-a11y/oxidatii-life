
ALTER TABLE public.photo_comments
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.photo_comments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS photo_comments_parent_idx ON public.photo_comments(parent_id) WHERE parent_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.photo_comment_likes (
  comment_id uuid NOT NULL REFERENCES public.photo_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.photo_comment_likes TO authenticated;
GRANT ALL ON public.photo_comment_likes TO service_role;

ALTER TABLE public.photo_comment_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cmnt_likes_read" ON public.photo_comment_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "cmnt_likes_insert_self" ON public.photo_comment_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cmnt_likes_delete_self" ON public.photo_comment_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS photo_comment_likes_comment_idx ON public.photo_comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS photo_comment_likes_user_idx ON public.photo_comment_likes(user_id);

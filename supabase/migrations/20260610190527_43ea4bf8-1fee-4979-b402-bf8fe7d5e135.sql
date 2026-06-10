
-- LIKES
CREATE TABLE public.photo_likes (
  photo_id uuid NOT NULL REFERENCES public.venue_photos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (photo_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.photo_likes TO authenticated;
GRANT ALL ON public.photo_likes TO service_role;
ALTER TABLE public.photo_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "photo_likes_read" ON public.photo_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "photo_likes_insert_self" ON public.photo_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "photo_likes_delete_self" ON public.photo_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX photo_likes_photo_idx ON public.photo_likes(photo_id);
CREATE INDEX photo_likes_user_idx ON public.photo_likes(user_id);

-- COMMENTS
CREATE TABLE public.photo_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id uuid NOT NULL REFERENCES public.venue_photos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.photo_comments TO authenticated;
GRANT ALL ON public.photo_comments TO service_role;
ALTER TABLE public.photo_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "photo_comments_read" ON public.photo_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "photo_comments_insert_self" ON public.photo_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "photo_comments_delete_self" ON public.photo_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX photo_comments_photo_idx ON public.photo_comments(photo_id, created_at DESC);

-- REPOSTS
CREATE TABLE public.photo_reposts (
  photo_id uuid NOT NULL REFERENCES public.venue_photos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (photo_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.photo_reposts TO authenticated;
GRANT ALL ON public.photo_reposts TO service_role;
ALTER TABLE public.photo_reposts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "photo_reposts_read" ON public.photo_reposts FOR SELECT TO authenticated USING (true);
CREATE POLICY "photo_reposts_insert_self" ON public.photo_reposts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "photo_reposts_delete_self" ON public.photo_reposts FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX photo_reposts_user_idx ON public.photo_reposts(user_id, created_at DESC);
CREATE INDEX photo_reposts_photo_idx ON public.photo_reposts(photo_id);

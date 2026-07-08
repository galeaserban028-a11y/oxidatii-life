
-- Scope engagement reads to only photos whose owner is viewable by the requester
DROP POLICY IF EXISTS "photo_likes_read" ON public.photo_likes;
CREATE POLICY "photo_likes_read" ON public.photo_likes FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.venue_photos vp
    WHERE vp.id = photo_likes.photo_id
      AND (vp.user_id = auth.uid() OR public.can_view_profile(auth.uid(), vp.user_id))
  )
);

DROP POLICY IF EXISTS "photo_comments_read" ON public.photo_comments;
CREATE POLICY "photo_comments_read" ON public.photo_comments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.venue_photos vp
    WHERE vp.id = photo_comments.photo_id
      AND (vp.user_id = auth.uid() OR public.can_view_profile(auth.uid(), vp.user_id))
  )
);

DROP POLICY IF EXISTS "photo_reposts_read" ON public.photo_reposts;
CREATE POLICY "photo_reposts_read" ON public.photo_reposts FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.venue_photos vp
    WHERE vp.id = photo_reposts.photo_id
      AND (vp.user_id = auth.uid() OR public.can_view_profile(auth.uid(), vp.user_id))
  )
);

DROP POLICY IF EXISTS "cmnt_likes_read" ON public.photo_comment_likes;
CREATE POLICY "cmnt_likes_read" ON public.photo_comment_likes FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.photo_comments pc
    JOIN public.venue_photos vp ON vp.id = pc.photo_id
    WHERE pc.id = photo_comment_likes.comment_id
      AND (vp.user_id = auth.uid() OR public.can_view_profile(auth.uid(), vp.user_id))
  )
);

-- Restrict profile-media bucket read to owner or viewable profiles
DROP POLICY IF EXISTS "profile-media public read" ON storage.objects;
CREATE POLICY "profile-media scoped read" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'profile-media'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.can_view_profile(auth.uid(), ((storage.foldername(name))[1])::uuid)
  )
);

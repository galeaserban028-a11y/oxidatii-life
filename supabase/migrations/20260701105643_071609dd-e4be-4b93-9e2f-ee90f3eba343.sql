CREATE OR REPLACE FUNCTION public.can_view_profile(_viewer uuid, _target uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    _viewer = _target
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = _target AND is_public = true)
    OR EXISTS (
      SELECT 1 FROM public.follows
      WHERE follower_id = _viewer AND following_id = _target AND status = 'accepted'
    )
    OR EXISTS (
      SELECT 1 FROM public.friendships
      WHERE status = 'accepted'
        AND (
          (requester_id = _viewer AND addressee_id = _target)
          OR (requester_id = _target AND addressee_id = _viewer)
        )
    );
$function$;
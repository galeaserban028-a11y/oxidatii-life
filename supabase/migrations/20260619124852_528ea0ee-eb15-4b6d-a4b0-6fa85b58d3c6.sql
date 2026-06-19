
-- 1. Restrict birthdate column: revoke direct SELECT, expose via SECURITY DEFINER RPC for owner.
REVOKE SELECT (birthdate) ON public.profiles FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_my_birthdate()
RETURNS date
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT birthdate FROM public.profiles WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_birthdate() TO authenticated;

-- 2. Add scoped SELECT policy on sprit_proofs so feed/Spritz-of-the-day queries
-- can return rows from other users without opening up the full table.
-- Visible: viewer can see the profile (followers/friends/public), OR row is
-- recent (last 24h) and belongs to a public profile (Spritz of the day).
CREATE POLICY "sprit_proofs_scoped_feed_read"
ON public.sprit_proofs
FOR SELECT
TO authenticated
USING (
  public.can_view_profile(auth.uid(), user_id)
  OR (
    created_at > (now() - interval '24 hours')
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = sprit_proofs.user_id AND p.is_public = true
    )
  )
);

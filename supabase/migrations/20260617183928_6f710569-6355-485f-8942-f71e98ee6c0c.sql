
CREATE OR REPLACE FUNCTION public.cleanup_old_spritz()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Keep sprit_proofs for leaderboard counts; only purge profile photos
  DELETE FROM public.venue_photos WHERE created_at < now() - INTERVAL '12 hours';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cleanup_old_spritz() FROM PUBLIC, anon, authenticated;

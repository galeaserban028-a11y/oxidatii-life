CREATE OR REPLACE FUNCTION public.grant_crystal_ball_unlock(_user_id uuid, _days int DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active record;
  new_expires timestamptz;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'missing_user');
  END IF;

  SELECT * INTO active FROM public.crystal_ball_unlocks
   WHERE user_id = _user_id AND expires_at > now()
   ORDER BY expires_at DESC LIMIT 1;

  IF FOUND THEN
    new_expires := active.expires_at + make_interval(days => _days);
    UPDATE public.crystal_ball_unlocks SET expires_at = new_expires WHERE id = active.id;
    RETURN jsonb_build_object('ok', true, 'extended', true, 'expires_at', new_expires);
  END IF;

  new_expires := now() + make_interval(days => _days);
  INSERT INTO public.crystal_ball_unlocks (user_id, expires_at, price_coins)
    VALUES (_user_id, new_expires, 0);

  RETURN jsonb_build_object('ok', true, 'expires_at', new_expires);
END $$;

REVOKE ALL ON FUNCTION public.grant_crystal_ball_unlock(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_crystal_ball_unlock(uuid, int) TO service_role;
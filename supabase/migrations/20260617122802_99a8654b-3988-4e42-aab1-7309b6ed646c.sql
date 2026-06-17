
CREATE OR REPLACE FUNCTION public.unlock_crystal_ball()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  active record;
  price int := 15;
  new_expires timestamptz;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO active FROM public.crystal_ball_unlocks
   WHERE user_id = uid AND expires_at > now()
   ORDER BY expires_at DESC LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('ok', true, 'already_active', true, 'expires_at', active.expires_at);
  END IF;

  PERFORM public.spend_coins(price, 'crystal_ball', NULL);

  new_expires := now() + interval '7 days';
  INSERT INTO public.crystal_ball_unlocks (user_id, expires_at, price_coins)
    VALUES (uid, new_expires, price);

  RETURN jsonb_build_object('ok', true, 'expires_at', new_expires, 'price_coins', price);
END $$;

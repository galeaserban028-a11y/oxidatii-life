CREATE OR REPLACE FUNCTION public.buy_frame(_frame_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  price int;
  current_balance int;
  new_bal int;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Trebuie să fii autentificat';
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_frames WHERE user_id = uid AND frame_id = _frame_id) THEN
    UPDATE public.profiles SET active_frame_id = _frame_id WHERE id = uid;
    RETURN jsonb_build_object('ok', true, 'already_owned', true);
  END IF;

  SELECT price_coins INTO price FROM public.avatar_frames WHERE id = _frame_id;
  IF price IS NULL THEN
    RAISE EXCEPTION 'Ramă inexistentă';
  END IF;

  IF price < 0 THEN
    RAISE EXCEPTION 'Preț invalid';
  END IF;

  IF price = 0 THEN
    SELECT coin_balance INTO current_balance FROM public.profiles WHERE id = uid;
    IF current_balance IS NULL THEN
      RAISE EXCEPTION 'Profil inexistent';
    END IF;
    new_bal := current_balance;
  ELSE
    new_bal := public.spend_coins(price, 'frame', _frame_id);
  END IF;

  INSERT INTO public.user_frames (user_id, frame_id) VALUES (uid, _frame_id);
  UPDATE public.profiles SET active_frame_id = _frame_id WHERE id = uid;

  RETURN jsonb_build_object('ok', true, 'balance', new_bal);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.buy_frame(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.buy_frame(text) TO authenticated;